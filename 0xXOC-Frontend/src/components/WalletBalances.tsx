import React, { useEffect, useState } from 'react';
import { WalletIcon, LoadingIcon, CoinIcon } from './Icons';
import { useWallet } from '../providers/WalletContext';
import { createPublicClient, http, formatUnits } from 'viem';
import { base, arbitrum, mantle, zkSync } from 'viem/chains';

// Token addresses from backend constants
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

export default function WalletBalances() {
  const { connectedAddress, isConnected } = useWallet();
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [totalValue, setTotalValue] = useState<string>('$0.00');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Track expanded chain sections
  const [expandedChains, setExpandedChains] = useState<Record<string, boolean>>({
    base: false,
    arbitrum: false,
    mantle: false,
    zksync: false
  });
  
  // Get native token balance for a chain
  const getNativeBalance = async (chain: 'base' | 'arbitrum' | 'mantle' | 'zksync', address: string) => {
    try {
      const client = chainClients[chain];
      const balance = await client.getBalance({ address: address as `0x${string}` });
      return balance;
    } catch (error) {
      console.error(`Error getting native balance on ${chain}:`, error);
      return BigInt(0);
    }
  };
  
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
    } else if (symbol === 'ETH') {
      // Hardcoded ETH price
      return (numAmount * 1826).toFixed(2);
    } else if (symbol === 'MNT') {
      // Placeholder price for Mantle
      return (numAmount * 0.5).toFixed(2);
    }
    
    return '0.00';
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
        // Base tokens
        {
          chain: 'base' as const,
          symbol: 'ETH',
          address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
          decimals: 18,
          isNative: true,
          icon: '💠'
        },
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
          symbol: 'ETH',
          address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
          decimals: 18,
          isNative: true,
          icon: '💠'
        },
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
          symbol: 'MNT',
          address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
          decimals: 18,
          isNative: true,
          icon: '🔷'
        },
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
          symbol: 'ETH',
          address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
          decimals: 18,
          isNative: true,
          icon: '💠'
        },
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
        let balance: bigint;
        
        if (token.isNative) {
          balance = await getNativeBalance(token.chain, connectedAddress);
        } else {
          balance = await getTokenBalance(token.chain, token.address, connectedAddress);
        }
        
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
      setError('Failed to fetch wallet balances. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch balances when connected wallet changes
  useEffect(() => {
    if (isConnected && connectedAddress) {
      fetchBalances();
    }
  }, [connectedAddress, isConnected]);

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
  
  // Calculate chain value summary
  const getChainSummary = (chainBalances: TokenBalance[]) => {
    let totalChainValue = 0;
    let summaryText = '';
    
    // Native token balance
    const nativeToken = chainBalances.find(t => t.isNative);
    // Non-native tokens with balance
    const tokens = chainBalances.filter(t => !t.isNative && parseFloat(t.balanceFormatted) > 0);
    
    if (nativeToken && parseFloat(nativeToken.balanceFormatted) > 0) {
      totalChainValue += parseFloat(nativeToken.balanceUsd.replace('$', ''));
      summaryText += `${nativeToken.icon} ${parseFloat(nativeToken.balanceFormatted).toFixed(4)} `;
    }
    
    // Add non-native tokens
    tokens.forEach(token => {
      totalChainValue += parseFloat(token.balanceUsd.replace('$', ''));
      summaryText += `${token.icon} ${parseFloat(token.balanceFormatted).toFixed(4)} `;
    });
    
    return {
      totalValue: `$${totalChainValue.toFixed(2)}`,
      summary: summaryText || 'No tokens'
    };
  };

  return (
    <div className="bg-mictlai-obsidian border-3 border-mictlai-gold shadow-pixel-lg pixel-panel">
      <div className="p-4 bg-black border-b-3 border-mictlai-gold/70 flex justify-between items-center">
        <h2 className="text-lg font-bold flex items-center font-pixel text-mictlai-gold">
          <CoinIcon className="w-5 h-5 mr-2" />
          MULTICHAIN BALANCES
        </h2>
        
        <button 
          onClick={fetchBalances}
          disabled={isLoading || !isConnected}
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
            <p className="text-mictlai-bone font-pixel text-sm">FETCHING BALANCES FROM MULTIPLE CHAINS...</p>
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
            <div className="mb-4 px-3 py-2 bg-black border-3 border-mictlai-gold/50 text-center shadow-pixel-inner">
              <div className="text-xs text-mictlai-bone/70 mb-1 font-pixel">CONNECTED WALLET</div>
              <a 
                href={connectedAddress ? `https://debank.com/profile/${connectedAddress}` : '#'}
                target="_blank" 
                rel="noopener noreferrer"
                className="text-mictlai-turquoise font-pixel text-sm hover:text-mictlai-gold"
                title={connectedAddress || ''}
              >
                {connectedAddress ? shortenAddress(connectedAddress) : ''}
              </a>
            </div>
            
            {Object.entries(groupBalancesByChain()).map(([chain, chainBalances]) => {
              const { totalValue, summary } = getChainSummary(chainBalances);
              const hasTokens = chainBalances.some(token => parseFloat(token.balanceFormatted) > 0);
              
              return (
                <div key={chain} className="mb-4">
                  <div 
                    className={`bg-black border-3 border-mictlai-gold/50 px-3 py-2 mb-2 shadow-pixel-inner flex justify-between items-center cursor-pointer ${hasTokens ? 'hover:bg-mictlai-gold/10' : ''}`}
                    onClick={() => hasTokens && toggleChainExpansion(chain)}
                  >
                    <div className="flex flex-1">
                      <h3 className="text-mictlai-gold font-pixel text-sm">{getChainName(chain)} NETWORK</h3>
                      
                      {!expandedChains[chain] && hasTokens && (
                        <div className="ml-4 text-mictlai-bone/80 font-pixel text-xs truncate max-w-xs">
                          {summary}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center">
                      {hasTokens && (
                        <span className="text-mictlai-turquoise mr-2 font-pixel">{totalValue}</span>
                      )}
                      {hasTokens && (
                        <span className="text-mictlai-gold">
                          {expandedChains[chain] ? '▲' : '▼'}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {expandedChains[chain] && (
                    <div className="space-y-2 mb-4 transition-all duration-200 ease-in-out">
                      {chainBalances.map((token, index) => (
                        parseFloat(token.balanceFormatted) > 0 && (
                          <div key={`${chain}-${token.symbol}`} className="flex items-center justify-between p-3 hover:bg-black/40 border-3 border-mictlai-gold/50 shadow-pixel">
                            <div className="flex items-center">
                              <span className="text-xl mr-3 pixel-pulse">{token.icon}</span>
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
                            <div className="text-lg font-bold text-mictlai-turquoise font-pixel">{token.balanceUsd}</div>
                          </div>
                        )
                      ))}
                    </div>
                  )}
                  
                  {!expandedChains[chain] && !hasTokens && (
                    <div className="text-mictlai-bone/50 text-center py-2 font-pixel text-sm border border-mictlai-bone/20 p-2">
                      NO TOKENS FOUND ON {getChainName(chain)}
                    </div>
                  )}
                </div>
              );
            })}
            
            <div className="mt-6 p-3 bg-black border-3 border-mictlai-gold/70 text-center shadow-pixel">
              <div className="text-sm text-mictlai-bone/70 font-pixel">TOTAL PORTFOLIO VALUE</div>
              <div className="text-2xl font-bold text-mictlai-gold font-pixel">{totalValue}</div>
            </div>
            
            {lastUpdated && (
              <div className="mt-4 text-xs text-center text-mictlai-bone/50 font-pixel">
                LAST UPDATED: {lastUpdated.toLocaleTimeString()}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
} 