import React, { useEffect, useState } from 'react';
import { CoinIcon, LoadingIcon } from './Icons';
import { createPublicClient, http, formatUnits } from 'viem';
import { base, arbitrum, mantle, zkSync } from 'viem/chains';

// Token addresses
const XOC_TOKEN_ADDRESS = "0xa411c9Aa00E020e4f88Bc19996d29c5B7ADB4ACf"; // XOC on Base
const MXNB_TOKEN_ADDRESS = "0xF197FFC28c23E0309B5559e7a166f2c6164C80aA"; // MXNB on Arbitrum
const USDT_MANTLE_TOKEN_ADDRESS = "0x201EBa5CC46D216Ce6DC03F6a759e8E766e956aE"; // USDT on Mantle
const USDT_ZKSYNC_ERA_TOKEN_ADDRESS = "0x493257fD37EDB34451f62EDf8D2a0C418852bA4C"; // USDT on zkSync Era

// Token decimals for formatting
const XOC_DECIMALS = 18;
const MXNB_DECIMALS = 6;
const USDT_MANTLE_DECIMALS = 6;
const USDT_ZKSYNC_ERA_DECIMALS = 6;

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

// Chain clients
const chainClients = {
  base: createPublicClient({
    chain: base,
    transport: http(base.rpcUrls.default.http[0]),
  }),
  arbitrum: createPublicClient({
    chain: arbitrum,
    transport: http(arbitrum.rpcUrls.default.http[0]),
  }),
  mantle: createPublicClient({
    chain: mantle,
    transport: http(mantle.rpcUrls.default.http[0]),
  }),
  zksync: createPublicClient({
    chain: zkSync,
    transport: http(zkSync.rpcUrls.default.http[0]),
  }),
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

export default function LiquidityMonitor() {
  // Use a hardcoded address if environment variable is not available
  const ESCROW_WALLET_ADDRESS = import.meta.env.VITE_ESCROW_WALLET_ADDRESS || "0x9c77c6fafc1eb0821F1De12972Ef0199C97C6e45";
  
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [totalValue, setTotalValue] = useState<string>('$0.00');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Track expanded chain sections
  const [expandedChains, setExpandedChains] = useState<Record<string, boolean>>({
    base: true,
    arbitrum: true,
    mantle: true,
    zksync: true
  });
  
  // Get ERC20 token balance for a chain
  const getTokenBalance = async (
    chain: 'base' | 'arbitrum' | 'mantle' | 'zksync',
    tokenAddress: string,
    walletAddress: string
  ) => {
    try {
      const client = chainClients[chain];
      const balance = await client.readContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [walletAddress as `0x${string}`],
      });
      return balance as bigint;
    } catch (error) {
      console.error(`Error getting token balance on ${chain}:`, error);
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
    
    // Apply conversion rates based on token
    if (symbol === 'XOC' || symbol === 'MXNB') {
      // 1 XOC or MXNB = 1 MXN = 0.05 USD (20 tokens = 1 USD)
      return (numAmount / 20).toFixed(2);
    } else if (symbol === 'USDT') {
      // 1 USDT = 1 USD
      return numAmount.toFixed(2);
    }
    
    return '0.00';
  };

  const fetchBalances = async () => {    
    setIsLoading(true);
    setError(null);
    
    try {
      const results: TokenBalance[] = [];
      let totalUsdValue = 0;
      
      // Define tokens to check (excluding ETH)
      const tokensToCheck = [
        // Base tokens
        {
          chain: 'base' as const,
          symbol: 'XOC',
          address: XOC_TOKEN_ADDRESS,
          decimals: XOC_DECIMALS,
          isNative: false,
          icon: '🇲🇽'
        },
        // Arbitrum tokens
        {
          chain: 'arbitrum' as const,
          symbol: 'MXNB',
          address: MXNB_TOKEN_ADDRESS,
          decimals: MXNB_DECIMALS,
          isNative: false,
          icon: '🇲🇽'
        },
        // Mantle tokens
        {
          chain: 'mantle' as const,
          symbol: 'USDT',
          address: USDT_MANTLE_TOKEN_ADDRESS,
          decimals: USDT_MANTLE_DECIMALS,
          isNative: false,
          icon: '💲'
        },
        // zkSync tokens
        {
          chain: 'zksync' as const,
          symbol: 'USDT',
          address: USDT_ZKSYNC_ERA_TOKEN_ADDRESS,
          decimals: USDT_ZKSYNC_ERA_DECIMALS,
          isNative: false,
          icon: '💲'
        }
      ];
      
      // Fetch balances for all tokens
      for (const token of tokensToCheck) {
        const balance = await getTokenBalance(token.chain, token.address, ESCROW_WALLET_ADDRESS);
        
        const formattedBalance = formatAmount(balance, token.decimals);
        const usdValue = getUsdValue(formattedBalance, token.symbol);
        
        results.push({
          symbol: token.symbol,
          address: token.address,
          balance: balance.toString(),
          balanceFormatted: formattedBalance,
          balanceUsd: `$${usdValue}`,
          decimals: token.decimals,
          isNative: token.isNative,
          icon: token.icon,
          chain: token.chain
        });
        
        totalUsdValue += parseFloat(usdValue);
      }
      
      // Sort by USD value, highest first
      results.sort((a, b) => {
        const aValue = parseFloat(a.balanceUsd.replace('$', ''));
        const bValue = parseFloat(b.balanceUsd.replace('$', ''));
        return bValue - aValue;
      });
      
      setBalances(results);
      setTotalValue(`$${totalUsdValue.toFixed(2)}`);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching balances:', err);
      setError('Failed to fetch escrow wallet balances. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch balances on component mount
  useEffect(() => {
    fetchBalances();
    // Set up automatic refresh every 5 minutes
    const intervalId = setInterval(fetchBalances, 5 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, []);

  // Function to shorten wallet address for display
  const shortenAddress = (address: string): string => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Get chain name for display
  const getChainName = (chain: string): string => {
    switch (chain) {
      case 'base': return 'BASE';
      case 'arbitrum': return 'ARBITRUM';
      case 'mantle': return 'MANTLE';
      case 'zksync': return 'ZKSYNC ERA';
      default: return chain.toUpperCase();
    }
  };

  // Group balances by chain
  const groupBalancesByChain = () => {
    const grouped: Record<string, TokenBalance[]> = {};
    
    for (const balance of balances) {
      if (!grouped[balance.chain]) {
        grouped[balance.chain] = [];
      }
      grouped[balance.chain].push(balance);
    }
    
    return grouped;
  };
  
  // Toggle expansion of a chain section
  const toggleChainExpansion = (chain: string) => {
    setExpandedChains(prev => ({
      ...prev,
      [chain]: !prev[chain]
    }));
  };

  return (
    <div className="bg-mictlai-obsidian border-3 border-mictlai-gold shadow-pixel-lg pixel-panel">
      <div className="p-4 bg-black border-b-3 border-mictlai-gold/70 flex justify-between items-center">
        <h2 className="text-lg font-bold flex items-center font-pixel text-mictlai-gold">
          <CoinIcon className="w-5 h-5 mr-2" />
          ESCROW LIQUIDITY
        </h2>
        
        <button 
          onClick={fetchBalances}
          disabled={isLoading}
          className="p-1.5 border-2 border-mictlai-gold/70 hover:bg-mictlai-blood transition-colors shadow-pixel disabled:opacity-50 disabled:cursor-not-allowed"
          title="Refresh balances"
        >
          {isLoading ? (
            <LoadingIcon className="w-4 h-4 text-mictlai-gold" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" className="w-4 h-4 text-mictlai-gold">
              <rect x="7" y="1" width="2" height="2" fill="currentColor" />
              <rect x="9" y="3" width="2" height="2" fill="currentColor" />
              <rect x="11" y="5" width="2" height="2" fill="currentColor" />
              <rect x="13" y="7" width="2" height="2" fill="currentColor" />
              <rect x="3" y="7" width="2" height="2" fill="currentColor" />
              <rect x="5" y="9" width="2" height="2" fill="currentColor" />
              <rect x="7" y="11" width="2" height="2" fill="currentColor" />
              <rect x="9" y="13" width="2" height="2" fill="currentColor" />
              <rect x="11" y="11" width="2" height="2" fill="currentColor" />
              <rect x="13" y="9" width="2" height="2" fill="currentColor" />
              <rect x="1" y="9" width="2" height="2" fill="currentColor" />
              <rect x="3" y="11" width="2" height="2" fill="currentColor" />
            </svg>
          )}
        </button>
      </div>
      
      <div className="p-4">
        {isLoading && balances.length === 0 ? (
          <div className="py-4 flex flex-col items-center justify-center">
            <LoadingIcon className="w-6 h-6 text-mictlai-gold mb-2" />
            <p className="text-mictlai-bone font-pixel text-sm">FETCHING ESCROW BALANCES...</p>
          </div>
        ) : error ? (
          <div className="text-mictlai-blood text-center py-2 font-pixel border-2 border-mictlai-blood p-3">
            {error}
          </div>
        ) : (
          <>
            <div className="mb-4 px-3 py-2 bg-black border-3 border-mictlai-gold/50 text-center shadow-pixel-inner">
              <div className="text-xs text-mictlai-bone/70 mb-1 font-pixel">ESCROW WALLET</div>
              <div className="flex justify-center items-center mb-2">
                <span className="text-mictlai-turquoise font-pixel text-sm">{shortenAddress(ESCROW_WALLET_ADDRESS)}</span>
              </div>
              
              <a 
                href={`https://debank.com/profile/${ESCROW_WALLET_ADDRESS}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block text-center border-2 border-mictlai-turquoise text-mictlai-turquoise font-pixel text-xs px-3 py-1 hover:bg-mictlai-turquoise/20 shadow-pixel transition-colors"
              >
                VIEW ON DEBANK 🔍
              </a>
              
              <div className="mt-3 border-t-2 border-mictlai-gold/30 pt-2">
                <div className="text-xs text-mictlai-bone/70 font-pixel">TOTAL VALUE</div>
                <div className="text-mictlai-gold font-pixel text-lg">{totalValue}</div>
              </div>
            </div>
            
            <div className="space-y-3">
              {Object.entries(groupBalancesByChain()).map(([chain, chainBalances]) => (
                <div 
                  key={chain}
                  className="border-3 border-mictlai-gold/50 bg-black overflow-hidden shadow-pixel"
                >
                  <div 
                    className="px-3 py-2 bg-mictlai-obsidian border-b-2 border-mictlai-gold/50 flex justify-between items-center cursor-pointer"
                    onClick={() => toggleChainExpansion(chain)}
                  >
                    <div className="font-pixel text-mictlai-gold text-sm">{getChainName(chain)}</div>
                    <div className="flex items-center space-x-2">
                      <div className="text-mictlai-bone font-pixel text-xs">
                        {chainBalances.length} TOKEN{chainBalances.length !== 1 ? 'S' : ''}
                      </div>
                      <div className="w-4 h-4 flex items-center justify-center text-mictlai-gold">
                        {expandedChains[chain] ? '▼' : '▶'}
                      </div>
                    </div>
                  </div>
                  
                  {expandedChains[chain] && (
                    <div className="divide-y-2 divide-mictlai-gold/20">
                      {chainBalances.map((token) => (
                        <div key={token.address} className="p-3 flex justify-between items-center">
                          <div className="flex items-center">
                            <span className="mr-2 text-lg">{token.icon}</span>
                            <div>
                              <div className="font-pixel text-mictlai-bone">{token.symbol}</div>
                              <div className="text-xs text-mictlai-bone/50 font-pixel">
                                {parseFloat(token.balanceFormatted).toFixed(4)}
                              </div>
                            </div>
                          </div>
                          <div className="text-mictlai-gold font-pixel">
                            {token.balanceUsd}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {lastUpdated && (
              <div className="mt-3 text-center text-xs text-mictlai-bone/50 font-pixel">
                LAST UPDATED: {lastUpdated.toLocaleTimeString()}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
} 