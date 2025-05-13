import React, { useEffect, useState } from 'react';
import { CoinIcon, LoadingIcon } from './Icons';
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
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
];

// Create Viem clients
const baseClient = createPublicClient({
  chain: base,
  transport: http(),
});

// Escrow wallet addresses
const BASE_ESCROW_ADDRESS = "0x9c77c6fafc1eb0821F1De12972Ef0199C97C6e45";

// Token price estimates for USD value calculation
const TOKEN_PRICES = {
  XOC: 0.05,     // $0.05 per XOC
  MXNE: 0.055,   // $0.055 per MXNe
  USDC: 1.0,     // $1.00 per USDC
  ETH: 2500      // $2500 per ETH (example value, should be updated dynamically)
};

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
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedChains, setExpandedChains] = useState<Record<string, boolean>>({
    base: true
  });
  
  // Get token balance
  const getTokenBalance = async (
    chain: 'base',
    tokenAddress: string,
    walletAddress: string
  ) => {
    try {
      const client = baseClient;
      const balance = await client.readContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [walletAddress],
      });
      
      return balance as bigint;
    } catch (error) {
      console.error(`Error fetching token balance for ${tokenAddress}:`, error);
      return BigInt(0);
    }
  };
  
  // Format token amount
  const formatAmount = (amount: bigint, decimals: number): string => {
    return parseFloat(formatUnits(amount, decimals)).toFixed(4);
  };
  
  // Calculate USD value
  const getUsdValue = (amount: string, symbol: string): string => {
    const value = parseFloat(amount) * (TOKEN_PRICES[symbol as keyof typeof TOKEN_PRICES] || 0);
    return value.toFixed(2);
  };
  
  // Fetch token balances
  const fetchBalances = async () => {    
    setIsLoading(true);
    
    try {
      const balancePromises: Promise<TokenBalance>[] = [];
      
      // Base chain balances
      const basePromises = [
        // Native ETH
        baseClient.getBalance({ address: BASE_ESCROW_ADDRESS as `0x${string}` })
          .then(balance => ({
            symbol: 'ETH',
            address: 'native',
            balance: balance.toString(),
            balanceFormatted: formatAmount(balance, 18),
            balanceUsd: getUsdValue(formatAmount(balance, 18), 'ETH'),
            decimals: 18,
            isNative: true,
            icon: '💎',
            chain: 'base'
          }))
          .catch(() => ({
            symbol: 'ETH',
            address: 'native',
            balance: '0',
            balanceFormatted: '0.0000',
            balanceUsd: '0.00',
            decimals: 18,
            isNative: true,
            icon: '💎',
            chain: 'base'
          })),
        
        // XOC Token
        getTokenBalance('base', XOC_TOKEN_ADDRESS, BASE_ESCROW_ADDRESS)
          .then(balance => ({
            symbol: 'XOC',
            address: XOC_TOKEN_ADDRESS,
            balance: balance.toString(),
            balanceFormatted: formatAmount(balance, XOC_DECIMALS),
            balanceUsd: getUsdValue(formatAmount(balance, XOC_DECIMALS), 'XOC'),
            decimals: XOC_DECIMALS,
            isNative: false,
            icon: '🍫',
            chain: 'base'
          })),
        
        // MXNe Token
        getTokenBalance('base', MXNE_TOKEN_ADDRESS, BASE_ESCROW_ADDRESS)
          .then(balance => ({
            symbol: 'MXNe',
            address: MXNE_TOKEN_ADDRESS,
            balance: balance.toString(),
            balanceFormatted: formatAmount(balance, MXNE_DECIMALS),
            balanceUsd: getUsdValue(formatAmount(balance, MXNE_DECIMALS), 'MXNE'),
            decimals: MXNE_DECIMALS,
            isNative: false,
            icon: '🪙',
            chain: 'base'
          })),
        
        // USDC Token
        getTokenBalance('base', USDC_TOKEN_ADDRESS, BASE_ESCROW_ADDRESS)
          .then(balance => ({
            symbol: 'USDC',
            address: USDC_TOKEN_ADDRESS,
            balance: balance.toString(),
            balanceFormatted: formatAmount(balance, USDC_DECIMALS),
            balanceUsd: getUsdValue(formatAmount(balance, USDC_DECIMALS), 'USDC'),
            decimals: USDC_DECIMALS,
            isNative: false,
            icon: '💵',
            chain: 'base'
          })),
      ];
      
      balancePromises.push(...basePromises);
      
      // Resolve all promises
      const results = await Promise.all(balancePromises);
      
      // Filter out any failed queries
      const validBalances = results.filter(b => b !== null);
      
      setBalances(validBalances);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching balances:', error);
      setIsLoading(false);
    }
  };
  
  // Fetch balances on component mount and every 30 seconds
  useEffect(() => {
    fetchBalances();
    
    const intervalId = setInterval(() => {
      fetchBalances();
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Format address for display
  const shortenAddress = (address: string): string => {
    if (!address || address === 'native') return 'Native';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  // Get chain name
  const getChainName = (chain: string): string => {
    switch (chain) {
      case 'base':
        return 'BASE';
      default:
        return chain.toUpperCase();
    }
  };
  
  // Group balances by chain
  const groupBalancesByChain = () => {
    const grouped: Record<string, TokenBalance[]> = {};
    
    balances.forEach(balance => {
      if (!grouped[balance.chain]) {
        grouped[balance.chain] = [];
      }
      grouped[balance.chain].push(balance);
    });
    
    return grouped;
  };
  
  // Toggle chain expansion
  const toggleChainExpansion = (chain: string) => {
    setExpandedChains(prev => ({
      ...prev,
      [chain]: !prev[chain]
    }));
  };
  
  // Calculate chain totals
  const getChainSummary = (chainBalances: TokenBalance[]) => {
    let totalUsd = 0;
    
    chainBalances.forEach(balance => {
      totalUsd += parseFloat(balance.balanceUsd);
    });
    
    return {
      totalUsd: totalUsd.toFixed(2)
    };
  };
  
  const groupedBalances = groupBalancesByChain();
  
  return (
    <div className="bg-mictlai-obsidian border-3 border-mictlai-gold shadow-pixel-lg overflow-hidden">
      <div className="p-4 bg-black border-b-3 border-mictlai-gold/70 flex justify-between items-center">
        <h2 className="text-lg font-bold font-pixel text-mictlai-gold">
          ESCROW LIQUIDITY
        </h2>
        <button 
          onClick={fetchBalances}
          className="text-mictlai-gold hover:text-mictlai-turquoise"
          title="Refresh balances"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
      
      <div className="p-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <LoadingIcon className="h-8 w-8 text-mictlai-gold animate-spin" />
          </div>
        ) : balances.length === 0 ? (
          <div className="text-center py-6 text-mictlai-bone/70">
            No liquidity data available
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedBalances).map(([chain, chainBalances]) => {
              const { totalUsd } = getChainSummary(chainBalances);
              
              return (
                <div key={chain} className="border-2 border-mictlai-gold/30 bg-black/20">
                  <div 
                    className="flex justify-between items-center p-3 cursor-pointer hover:bg-black/30"
                    onClick={() => toggleChainExpansion(chain)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 flex items-center justify-center">
                        {chain === 'base' && <span className="text-base">🔵</span>}
                      </div>
                      <span className="font-pixel text-mictlai-bone">
                        {getChainName(chain)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-mictlai-gold font-pixel">
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
                    <div className="border-t border-mictlai-gold/20">
                      <table className="w-full">
                        <thead className="bg-black/30">
                          <tr className="text-left text-mictlai-bone/70">
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
                                ${index % 2 === 0 ? 'bg-black/10' : 'bg-black/20'}
                                hover:bg-mictlai-gold/10
                              `}
                            >
                              <td className="p-2 flex items-center gap-2">
                                <span className="text-base">{balance.icon}</span>
                                <span className="text-mictlai-bone font-pixel">{balance.symbol}</span>
                              </td>
                              <td className="p-2 font-mono text-mictlai-bone">
                                {balance.balanceFormatted}
                              </td>
                              <td className="p-2 font-mono text-mictlai-gold">
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