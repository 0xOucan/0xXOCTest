// API configuration
export const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000'; // Falls back to localhost for development

// Base blockchain configuration
export const BASE_RPC_URL = 'https://mainnet.base.org';
export const BASE_EXPLORER_URL = 'https://basescan.org';
export const BASE_CHAIN_ID = 8453;

// 🏢 Token Contract Addresses on Base
export const XOC_TOKEN = "0x4C432421E24D67e30a0ff478c0ab36cB1d9A997C"; // XOC on Base
export const MXNE_TOKEN = "0x5C7F8A570EE4E89C1C2E6881170d90B229C355e9"; // MXNe on Base
export const USDC_TOKEN = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // USDC on Base

// Default wallet address to check (replace with your wallet address)
export const DEFAULT_WALLET_ADDRESS = "0x9c77c6fafc1eb0821F1De12972Ef0199C97C6e45";

// 💰 Token Decimals
export const TOKEN_DECIMALS = {
  [XOC_TOKEN]: 18,
  [MXNE_TOKEN]: 6,
  [USDC_TOKEN]: 6,
  "ETH": 18,
};

// 💲 Approximate token prices in USD (fallback if oracle is unavailable)
export const TOKEN_PRICES_USD = {
  [XOC_TOKEN]: 0.03,  // $0.03 per XOC
  [MXNE_TOKEN]: 0.058, // $0.058 per MXNe
  [USDC_TOKEN]: 1.00,  // $1.00 per USDC
  "ETH": 3400.00,     // $3400 per ETH (estimated)
};

// Token Icons
export const tokenIcons = {
  ETH: '💎',
  XOC: '🇲🇽',
  MXNe: '💰',
  USDC: '💵',
}; 

// 📋 Tracked tokens for balance checking
export const TRACKED_TOKENS = [
  {
    symbol: "ETH",
    address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", // Placeholder for native ETH
    decimals: 18,
    isNative: true,
    price: TOKEN_PRICES_USD["ETH"],
    icon: "💎",
  },
  {
    symbol: "XOC",
    address: XOC_TOKEN,
    decimals: 18,
    isNative: false,
    price: TOKEN_PRICES_USD[XOC_TOKEN],
    icon: "🇲🇽",
  },
  {
    symbol: "MXNe",
    address: MXNE_TOKEN,
    decimals: 6,
    isNative: false,
    price: TOKEN_PRICES_USD[MXNE_TOKEN],
    icon: "💰",
  },
  {
    symbol: "USDC",
    address: USDC_TOKEN,
    decimals: 6,
    isNative: false,
    price: TOKEN_PRICES_USD[USDC_TOKEN],
    icon: "💵",
  },
]; 

// 🔑 Privy Authentication
// Access Vite's environment variables properly
export const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID || "clw6cwf3c00r0l80hq9sknplt"; 