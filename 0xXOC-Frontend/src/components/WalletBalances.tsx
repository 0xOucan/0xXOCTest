import React, { useEffect, useState } from 'react';
import { WalletIcon, LoadingIcon, CoinIcon } from './Icons';
import { useWallet } from '../providers/WalletContext';
import { createPublicClient, http, formatUnits } from 'viem';
import { base } from 'viem/chains';

// Token addresses
const XOC_TOKEN_ADDRESS = "0xa411c9Aa00E020e4f88Bc19996d29c5B7ADB4ACf"; // XOC on Base
const MXNE_TOKEN_ADDRESS = "0x269caE7Dc59803e5C596c95756faEeBb6030E0aF"; // MXNe on Base
const USDC_TOKEN_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // USDC on Base

// Token decimals for formatting
const XOC_DECIMALS = 18;
const MXNE_DECIMALS = 6;
const USDC_DECIMALS = 6;

// Standard ERC20 ABI for balance queries
const ERC20_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  }
] as const;

// Chain client
const baseClient = createPublicClient({
  chain: base,
  transport: http(),
});

// Token price estimates for USD value calculation
const TOKEN_PRICES = {
  XOC: 0.05,     // $0.05 per XOC
  MXNe: 0.055,   // $0.055 per MXNe
  USDC: 1.0,     // $1.00 per USDC
  ETH: 2500      // $2500 per ETH (example value, should be updated dynamically)
};

// Define interface for token balance
interface TokenBalance {
  symbol: string;
  address: string;
  balance: string;
  balanceFormatted: string;
  balanceUsd: string;
  decimals: number;
  isNative: boolean;
  icon: string;
  chain: string;
}

export default function WalletBalances() {
  const { connectedAddress, isConnected } = useWallet();
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [totalValue, setTotalValue] = useState<string>('$0.00');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAllTokens, setShowAllTokens] = useState<boolean>(false);
  
  // Get native token balance
  const getNativeBalance = async (address: string) => {
    try {
      const balance = await baseClient.getBalance({ address: address as `0x${string}` });
      return balance;
    } catch (error) {
      console.error(`Error getting native balance:`, error);
      return BigInt(0);
    }
  };
  
  // Get ERC20 token balance
  const getTokenBalance = async (
    tokenAddress: string,
    walletAddress: string
  ) => {
    try {
      const balance = await baseClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [walletAddress as `0x${string}`],
      });
      return balance as bigint;
    } catch (error) {
      console.error(`Error getting token balance:`, error);
      return BigInt(0);
    }
  };

  // Format amount with proper decimals
  const formatAmount = (amount: bigint, decimals: number): string => {
    return formatUnits(amount, decimals);
  };
  
  // Convert token value to USD
  const getUsdValue = (amount: string, symbol: string): string => {
    const numAmount = parseFloat(amount);
    const price = TOKEN_PRICES[symbol as keyof typeof TOKEN_PRICES] || 0;
    return (numAmount * price).toFixed(2);
  };

  const fetchBalances = async () => {
    if (!isConnected || !connectedAddress) {
      setError('Please connect your wallet first');
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const results: TokenBalance[] = [];
      let totalUsdValue = 0;
      
      // Define tokens to check
      const tokensToCheck = [
        // Base native ETH
        {
          symbol: 'ETH',
          address: 'native',
          decimals: 18,
          isNative: true,
          icon: '💎'
        },
        // XOC Token
        {
          symbol: 'XOC',
          address: XOC_TOKEN_ADDRESS,
          decimals: XOC_DECIMALS,
          isNative: false,
          icon: '🍫'
        },
        // MXNe Token
        {
          symbol: 'MXNe',
          address: MXNE_TOKEN_ADDRESS,
          decimals: MXNE_DECIMALS,
          isNative: false,
          icon: '🪙'
        },
        // USDC Token
        {
          symbol: 'USDC',
          address: USDC_TOKEN_ADDRESS,
          decimals: USDC_DECIMALS,
          isNative: false,
          icon: '💵'
        }
      ];
      
      // Fetch balances for all tokens
      for (const token of tokensToCheck) {
        let balance: bigint;
        
        if (token.isNative) {
          balance = await getNativeBalance(connectedAddress);
        } else {
          balance = await getTokenBalance(token.address, connectedAddress);
        }
        
        const formattedBalance = formatAmount(balance, token.decimals);
        const usdValue = getUsdValue(formattedBalance, token.symbol);
        
        results.push({
          symbol: token.symbol,
          address: token.address,
          balance: balance.toString(),
          balanceFormatted: formattedBalance,
          balanceUsd: usdValue,
          decimals: token.decimals,
          isNative: token.isNative,
          icon: token.icon,
          chain: 'base'
        });
        
        totalUsdValue += parseFloat(usdValue);
      }
      
      // Sort by USD value, highest first
      results.sort((a, b) => {
        const aValue = parseFloat(a.balanceUsd);
        const bValue = parseFloat(b.balanceUsd);
        return bValue - aValue;
      });
      
      setBalances(results);
      setTotalValue(`$${totalUsdValue.toFixed(2)}`);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching balances:', err);
      setError('Failed to fetch wallet balances. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch balances when connected wallet changes
  useEffect(() => {
    if (isConnected && connectedAddress) {
      fetchBalances();
      
      // Set up refresh interval
      const intervalId = setInterval(() => {
        fetchBalances();
      }, 30000); // Refresh every 30 seconds
      
      return () => clearInterval(intervalId);
    }
  }, [connectedAddress, isConnected]);

  // Function to shorten wallet address for display
  const shortenAddress = (address: string): string => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Filter visible balances
  const visibleBalances = showAllTokens 
    ? balances 
    : balances.filter(b => parseFloat(b.balanceFormatted) > 0);

  return (
    <div className="bg-mictlai-obsidian border-3 border-mictlai-gold shadow-pixel-lg overflow-hidden">
      <div className="p-4 bg-black border-b-3 border-mictlai-gold/70 flex justify-between items-center">
        <h2 className="text-lg font-bold flex items-center font-pixel text-mictlai-gold">
          <CoinIcon className="w-5 h-5 mr-2" />
          WALLET BALANCES
        </h2>
        
        <button 
          onClick={fetchBalances}
          disabled={isLoading || !isConnected}
          className="text-mictlai-gold hover:text-mictlai-turquoise"
          title="Refresh balances"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
      
      <div className="p-4">
        {isLoading && balances.length === 0 ? (
          <div className="flex justify-center py-8">
            <LoadingIcon className="h-8 w-8 text-mictlai-gold animate-spin" />
          </div>
        ) : error ? (
          <div className="text-mictlai-blood text-center py-2 font-pixel border-2 border-mictlai-blood p-3">
            {error}
          </div>
        ) : !isConnected ? (
          <div className="text-mictlai-gold text-center py-4 font-pixel border-3 border-mictlai-gold/50 p-3">
            CONNECT WALLET TO VIEW BALANCES
          </div>
        ) : (
          <>
            <div className="mb-4 px-3 py-2 bg-black border-2 border-mictlai-gold/50 text-center">
              <div className="text-xs text-mictlai-bone/70 mb-1 font-pixel">CONNECTED WALLET</div>
              <a 
                href={connectedAddress ? `https://basescan.org/address/${connectedAddress}` : '#'}
                target="_blank" 
                rel="noopener noreferrer"
                className="text-mictlai-turquoise font-pixel text-sm hover:text-mictlai-gold"
                title={connectedAddress || ''}
              >
                {connectedAddress ? shortenAddress(connectedAddress) : ''}
              </a>
            </div>
            
            {visibleBalances.length === 0 ? (
              <div className="text-mictlai-bone/50 text-center py-4 font-pixel text-sm border border-mictlai-bone/20 p-2">
                NO TOKENS FOUND ON BASE NETWORK
              </div>
            ) : (
              <div className="space-y-2 mb-4">
                {visibleBalances.map((token) => (
                  <div key={token.address} className="flex items-center justify-between p-3 hover:bg-black/20 border-2 border-mictlai-gold/30 bg-black/10">
                    <div className="flex items-center">
                      <span className="text-xl mr-3">{token.icon}</span>
                      <div>
                        <div className="font-bold text-mictlai-gold font-pixel">{token.symbol}</div>
                        <div className="text-sm text-mictlai-bone/80 font-pixel">
                          {
                            // Format to 6 decimal places max
                            parseFloat(token.balanceFormatted).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 6
                            })
                          }
                        </div>
                      </div>
                    </div>
                    <div className="text-lg font-bold text-mictlai-turquoise font-pixel">${token.balanceUsd}</div>
                  </div>
                ))}
              </div>
            )}
            
            {balances.length > 0 && (
              <>
                <div className="mt-4 flex justify-center">
                  <button
                    onClick={() => setShowAllTokens(prev => !prev)}
                    className="px-3 py-1 text-xs text-mictlai-gold hover:text-mictlai-turquoise font-pixel"
                  >
                    {showAllTokens ? 'HIDE EMPTY BALANCES' : 'SHOW ALL TOKENS'}
                  </button>
                </div>
                
                <div className="mt-6 p-3 bg-black/30 border-2 border-mictlai-gold/50 text-center">
                  <div className="text-sm text-mictlai-bone/70 font-pixel">TOTAL VALUE</div>
                  <div className="text-2xl font-bold text-mictlai-gold font-pixel">{totalValue}</div>
                </div>
                
                {lastUpdated && (
                  <div className="mt-2 text-xs text-center text-mictlai-bone/50 font-pixel">
                    LAST UPDATED: {lastUpdated.toLocaleTimeString()}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
} 