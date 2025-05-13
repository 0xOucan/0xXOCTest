import React, { useEffect, useState } from 'react';
import { WalletIcon, LoadingIcon, CoinIcon } from './Icons';
import { useWallet } from '../providers/WalletContext';
import { createPublicClient, http, formatUnits } from 'viem';
import { base } from 'viem/chains';
import WalletConnect from './WalletConnect';

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
  const [expandedChains, setExpandedChains] = useState<{[key: string]: boolean}>({
    base: true
  });
  
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

  // Group balances by chain
  const groupedBalances: { [key: string]: TokenBalance[] } = balances.reduce((acc, balance) => {
    if (!acc[balance.chain]) {
      acc[balance.chain] = [];
    }
    acc[balance.chain].push(balance);
    return acc;
  }, {} as { [key: string]: TokenBalance[] });

  // Toggle chain expansion
  const toggleChainExpansion = (chain: string) => {
    setExpandedChains(prev => ({
      ...prev,
      [chain]: !prev[chain]
    }));
  };

  // Get chain summary
  const getChainSummary = (chainBalances: TokenBalance[]) => {
    const totalUsd = chainBalances.reduce((sum, item) => sum + parseFloat(item.balanceUsd), 0).toFixed(2);
    return { totalUsd };
  };

  // Get chain name
  const getChainName = (chain: string): string => {
    switch (chain) {
      case 'base': return 'Base';
      default: return chain.charAt(0).toUpperCase() + chain.slice(1);
    }
  };

  // Filter visible balances
  const visibleBalances = showAllTokens 
    ? balances 
    : balances.filter(b => parseFloat(b.balanceFormatted) > 0);

  return (
    <div className="bg-light-surface dark:bg-dark-surface border-3 border-base-blue shadow-pixel-lg overflow-hidden">
      <div className="p-4 bg-light-card dark:bg-dark-card border-b-3 border-base-blue/70 flex justify-between items-center">
        <h2 className="text-lg font-bold font-pixel text-base-blue dark:text-base-blue-light">
          <CoinIcon className="w-5 h-5 mr-2" />
          WALLET BALANCES
        </h2>
        
        <button 
          onClick={fetchBalances}
          className="text-base-blue dark:text-base-blue-light hover:text-base-blue-light"
          title="Refresh balances"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
      
      <div className="p-4">
        {!isConnected ? (
          <div className="text-center py-8">
            <p className="text-light-secondary dark:text-dark-secondary mb-4">Connect your wallet to view balances</p>
            <WalletConnect />
          </div>
        ) : isLoading ? (
          <div className="flex justify-center py-8">
            <LoadingIcon className="h-8 w-8 text-base-blue dark:text-base-blue-light animate-spin" />
          </div>
        ) : balances.length === 0 ? (
          <div className="text-center py-6 text-light-secondary dark:text-dark-secondary">
            No token balances found
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedBalances).map(([chain, chainBalances]) => {
              const { totalUsd } = getChainSummary(chainBalances);
              
              return (
                <div key={chain} className="border-2 border-base-blue/30 bg-light-card/20 dark:bg-dark-card/20">
                  <div 
                    className="flex justify-between items-center p-3 cursor-pointer hover:bg-light-card dark:hover:bg-dark-card"
                    onClick={() => toggleChainExpansion(chain)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 flex items-center justify-center">
                        {chain === 'base' && <span className="text-base">🔵</span>}
                      </div>
                      <span className="font-pixel text-light-text dark:text-dark-text">
                        {getChainName(chain)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-base-blue dark:text-base-blue-light font-pixel">
                        ${totalUsd} USD
                      </span>
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className={`h-5 w-5 transition-transform duration-200 ${expandedChains[chain] ? 'rotate-180' : ''}`} 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  
                  {expandedChains[chain] && (
                    <div className="border-t border-base-blue/20">
                      <table className="w-full">
                        <thead className="bg-light-card/30 dark:bg-dark-card/30">
                          <tr className="text-left text-light-secondary dark:text-dark-secondary">
                            <th className="p-2 text-xs font-pixel">TOKEN</th>
                            <th className="p-2 text-xs font-pixel">BALANCE</th>
                            <th className="p-2 text-xs font-pixel">VALUE (USD)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {chainBalances.map((balance, index) => (
                            <tr 
                              key={balance.symbol}
                              className={`
                                ${index % 2 === 0 ? 'bg-light-card/10 dark:bg-dark-card/10' : 'bg-light-card/20 dark:bg-dark-card/20'}
                                hover:bg-base-blue/10
                              `}
                            >
                              <td className="p-2 flex items-center gap-2">
                                <span className="text-base">{balance.icon}</span>
                                <span className="text-light-text dark:text-dark-text font-pixel">{balance.symbol}</span>
                              </td>
                              <td className="p-2 font-mono text-light-text dark:text-dark-text">
                                {balance.balanceFormatted}
                              </td>
                              <td className="p-2 font-mono text-base-blue dark:text-base-blue-light">
                                ${balance.balanceUsd}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
} 