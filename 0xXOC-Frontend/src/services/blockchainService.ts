import { createPublicClient, http, formatUnits } from 'viem';
import { base } from 'viem/chains';
import { 
  DEFAULT_WALLET_ADDRESS, 
  TOKEN_PRICES_USD,
  apiUrl,
  BASE_RPC_URL
} from '../config';

// ERC20 ABI (minimal for balance checking)
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
] as const;

// Define the token balance interface
export interface TokenBalance {
  symbol: string;
  balance: string;
  balanceFormatted: string;
  balanceUsd: string;
  icon: string;
}

// Base token addresses
export const XOC_TOKEN = "0x4C432421E24D67e30a0ff478c0ab36cB1d9A997C"; // XOC on Base
export const MXNE_TOKEN = "0x5C7F8A570EE4E89C1C2E6881170d90B229C355e9"; // MXNe on Base
export const USDC_TOKEN = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // USDC on Base

// Token Decimals
export const TOKEN_DECIMALS = {
  [XOC_TOKEN]: 18,
  [MXNE_TOKEN]: 6,
  [USDC_TOKEN]: 6,
};

// Approximate token prices in USD
export const BASE_TOKEN_PRICES_USD = {
  [XOC_TOKEN]: 0.03,  // $0.03 per XOC
  [MXNE_TOKEN]: 0.058, // $0.058 per MXNe
  [USDC_TOKEN]: 1.00,  // $1.00 per USDC
  "ETH": 3400.00      // $3400 per ETH (estimated)
};

// Tracked tokens for balance checking
export const BASE_TRACKED_TOKENS = [
  {
    symbol: "ETH",
    address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", // Placeholder for native ETH
    decimals: 18,
    isNative: true,
    price: BASE_TOKEN_PRICES_USD["ETH"],
    icon: "💎",
  },
  {
    symbol: "XOC",
    address: XOC_TOKEN,
    decimals: 18,
    isNative: false,
    price: BASE_TOKEN_PRICES_USD[XOC_TOKEN],
    icon: "🇲🇽",
  },
  {
    symbol: "MXNe",
    address: MXNE_TOKEN,
    decimals: 6,
    isNative: false,
    price: BASE_TOKEN_PRICES_USD[MXNE_TOKEN],
    icon: "💰",
  },
  {
    symbol: "USDC",
    address: USDC_TOKEN,
    decimals: 6,
    isNative: false,
    price: BASE_TOKEN_PRICES_USD[USDC_TOKEN],
    icon: "💵",
  },
];

// Create public client for Base
const baseClient = createPublicClient({
  chain: base,
  transport: http(BASE_RPC_URL),
});

// Create a client mapping for easy access
export const chainClients = {
  base: baseClient
};

/**
 * Get wallet address from backend
 */
export const getWalletAddress = async (): Promise<string> => {
  try {
    // Try with portfolio query
    const portfolioResponse = await fetch(`${apiUrl}/api/agent/portfolio`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (portfolioResponse.ok) {
      const portfolioData = await portfolioResponse.json();
      if (portfolioData.address && 
          portfolioData.address.startsWith('0x') && 
          portfolioData.address.length === 42) {
        return portfolioData.address;
      }
    }
    
    // Fallback to default address
    return DEFAULT_WALLET_ADDRESS;
  } catch (error) {
    console.error('Error getting wallet address from backend:', error);
    // Fallback to default address
    return DEFAULT_WALLET_ADDRESS;
  }
};

/**
 * Get native token balance on Base chain
 */
export const getNativeBalance = async (
  address: string = DEFAULT_WALLET_ADDRESS
): Promise<bigint> => {
  try {
    const balance = await baseClient.getBalance({
      address: address as `0x${string}`,
    });
    return balance;
  } catch (error) {
    console.error(`Error getting native ETH balance:`, error);
    return BigInt(0);
  }
};

/**
 * Get ERC20 token balance on Base chain
 */
export const getTokenBalance = async (
  tokenAddress: string,
  walletAddress: string = DEFAULT_WALLET_ADDRESS
): Promise<bigint> => {
  try {
    // Use readContract instead of getContract().read
    const balance = await baseClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [walletAddress as `0x${string}`],
    });
    
    return balance as bigint;
  } catch (error) {
    console.error(`Error getting balance for token ${tokenAddress}:`, error);
    return BigInt(0);
  }
};

/**
 * Format token balance with proper decimals
 */
export const formatTokenBalance = (
  balance: bigint,
  decimals: number
): string => {
  return formatUnits(balance, decimals);
};

/**
 * Calculate USD value of token amount
 */
export const calculateUsdValue = (
  formattedBalance: string,
  tokenSymbol: string
): string => {
  let price;
  
  if (tokenSymbol === "ETH") {
    price = BASE_TOKEN_PRICES_USD["ETH"];
  } else if (tokenSymbol === "XOC") {
    price = BASE_TOKEN_PRICES_USD[XOC_TOKEN];
  } else if (tokenSymbol === "MXNe") {
    price = BASE_TOKEN_PRICES_USD[MXNE_TOKEN];
  } else if (tokenSymbol === "USDC") {
    price = BASE_TOKEN_PRICES_USD[USDC_TOKEN];
  } else {
    price = 0;
  }
  
  const usdValue = Number(formattedBalance) * price;
  return usdValue.toFixed(2);
};

/**
 * Get all token balances for a wallet
 */
export const getAllTokenBalances = async (
  walletAddress?: string
): Promise<TokenBalance[]> => {
  try {
    // If no valid wallet address is provided, try to get it from the backend
    let address = walletAddress;
    
    // Validate the address format
    if (!address || !address.startsWith('0x') || address.length !== 42) {
      console.log('Invalid wallet address provided to getAllTokenBalances, falling back to backend address');
      address = await getWalletAddress();
    } else {
      console.log('Using provided wallet address for balance check:', address);
    }
    
    const result: TokenBalance[] = [];
    
    // Get balances for all Base tokens in parallel
    const balancePromises = BASE_TRACKED_TOKENS.map(async (token) => {
      let balance: bigint;
      
      if (token.isNative) {
        balance = await getNativeBalance(address);
      } else {
        balance = await getTokenBalance(token.address, address);
      }
      
      // Always include the token, even if balance is 0
      const formattedBalance = formatTokenBalance(balance, token.decimals);
      const balanceUsd = calculateUsdValue(formattedBalance, token.symbol);
      
      result.push({
        symbol: token.symbol,
        balance: balance.toString(),
        balanceFormatted: formattedBalance,
        balanceUsd: `$${balanceUsd}`,
        icon: token.icon
      });
    });
    
    await Promise.all(balancePromises);
    
    // Sort by USD value, highest first
    return result.sort((a, b) => {
      const aValue = Number(a.balanceUsd.replace('$', ''));
      const bValue = Number(b.balanceUsd.replace('$', ''));
      return bValue - aValue;
    });
  } catch (error) {
    console.error('Error getting all token balances:', error);
    return [];
  }
}; 