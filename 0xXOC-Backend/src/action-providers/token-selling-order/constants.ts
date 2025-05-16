// Token constants for Base network
export const BASE_CHAIN_ID = '8453';

// Token addresses
export const XOC_TOKEN_ADDRESS = '0xa411c9Aa00E020e4f88Bc19996d29c5B7ADB4ACf';
export const MXNE_TOKEN_ADDRESS = '0x269caE7Dc59803e5C596c95756faEeBb6030E0aF';
export const USDC_TOKEN_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

// Token decimals
export const XOC_DECIMALS = 18;
export const MXNE_DECIMALS = 6;
export const USDC_DECIMALS = 6;

// Explorer URLs
export const BASESCAN_TX_URL = 'https://basescan.org/tx/';
export const BASESCAN_ADDRESS_URL = 'https://basescan.org/address/';

// Escrow wallet address (fallback to env var)
export const ESCROW_WALLET_ADDRESS = process.env.WALLET_ADDRESS || '0x9c77c6fafc1eb0821F1De12972Ef0199C97C6e45';

// Order status constants
export const ORDER_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  FILLED: 'filled',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired'
} as const;

// Standard ERC20 ABI for common functions
export const ERC20_ABI = [
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
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// Token configurations
export const SUPPORTED_TOKENS = {
  XOC: {
    symbol: 'XOC',
    name: 'XOC Token',
    address: XOC_TOKEN_ADDRESS,
    decimals: XOC_DECIMALS,
    icon: '💰',
  },
  MXNE: {
    symbol: 'MXNe',
    name: 'MXN Electronic',
    address: MXNE_TOKEN_ADDRESS,
    decimals: MXNE_DECIMALS,
    icon: '🇲🇽',
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    address: USDC_TOKEN_ADDRESS,
    decimals: USDC_DECIMALS,
    icon: '💵',
  },
} as const;

// Min order amount in USD equivalent
export const MIN_ORDER_AMOUNT_USD = 0.1;

// Max order amount in USD equivalent
export const MAX_ORDER_AMOUNT_USD = 10000;

// Min MXN amount 
export const MIN_MXN_AMOUNT = 5;

// Max MXN amount
export const MAX_MXN_AMOUNT = 100000;

// Default order expiration time in seconds (7 days)
export const DEFAULT_ORDER_EXPIRATION = 7 * 24 * 60 * 60; 