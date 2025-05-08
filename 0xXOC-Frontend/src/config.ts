// API configuration
export const apiUrl = 'http://localhost:4000'; // Use your actual API endpoint

// Celo blockchain configuration
export const CELO_RPC_URL = 'https://forno.celo.org'; // Celo mainnet RPC URL
export const CELO_EXPLORER_URL = 'https://celoscan.io';
export const CELO_CHAIN_ID = 42220;

// Base blockchain configuration
export const BASE_RPC_URL = 'https://mainnet.base.org';
export const BASE_EXPLORER_URL = 'https://basescan.org';
export const BASE_CHAIN_ID = 8453;

// Arbitrum blockchain configuration
export const ARBITRUM_RPC_URL = 'https://arb1.arbitrum.io/rpc';
export const ARBITRUM_EXPLORER_URL = 'https://arbiscan.io';
export const ARBITRUM_CHAIN_ID = 42161;

// Mantle blockchain configuration
export const MANTLE_RPC_URL = 'https://rpc.mantle.xyz';
export const MANTLE_EXPLORER_URL = 'https://explorer.mantle.xyz';
export const MANTLE_CHAIN_ID = 5000;

// zkSync Era blockchain configuration
export const ZKSYNC_RPC_URL = 'https://mainnet.era.zksync.io';
export const ZKSYNC_EXPLORER_URL = 'https://explorer.zksync.io';
export const ZKSYNC_CHAIN_ID = 324;

// 🏢 Token Contract Addresses on Celo
export const CELO_TOKEN = "0x471EcE3750Da237f93B8E339c536989b8978a438"; // Native CELO
export const USDC_TOKEN = "0xceba9300f2b948710d2653dd7b07f33a8b32118c"; // USDC on Celo
export const USDT_TOKEN = "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e"; // Tether USD on Celo
export const CUSD_TOKEN = "0x765DE816845861e75A25fCA122bb6898B8B1282a"; // cUSD (Celo Dollar)
export const CEUR_TOKEN = "0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73"; // cEUR (Celo Euro)

// 🏢 Token Contract Addresses on zkSync Era
export const ZKSYNC_USDT_TOKEN = "0x493257fd37edb34451f62edf8d2a0c418852ba4c"; // USDT on zkSync Era

// Default wallet address to check (replace with your wallet address)
export const DEFAULT_WALLET_ADDRESS = "0x9c77c6fafc1eb0821F1De12972Ef0199C97C6e45";

// 💰 Token Decimals
export const TOKEN_DECIMALS = {
  [CELO_TOKEN]: 18,
  [USDC_TOKEN]: 6,
  [USDT_TOKEN]: 6,
  [CUSD_TOKEN]: 18,
  [CEUR_TOKEN]: 18,
};

// 💲 Approximate token prices in USD (fallback if oracle is unavailable)
export const TOKEN_PRICES_USD = {
  [CELO_TOKEN]: 0.28,  // $0.28 per CELO
  [USDC_TOKEN]: 1.00,  // $1.00 per USDC
  [USDT_TOKEN]: 1.00,  // $1.00 per USDT
  [CUSD_TOKEN]: 1.00,  // $1.00 per cUSD
  [CEUR_TOKEN]: 1.14,  // $1.14 per cEUR (based on EUR/USD exchange rate)
  [ZKSYNC_USDT_TOKEN]: 1.00, // $1.00 per USDT on zkSync Era
};

// Token Icons
export const tokenIcons = {
  CELO: '🟡',
  USDT: '💵',
  USDC: '💵',
  'cUSD': '💲',
  'cEUR': '💶',
}; 

// 📋 Tracked tokens for balance checking
export const TRACKED_TOKENS = [
  {
    symbol: "CELO",
    address: CELO_TOKEN,
    decimals: 18,
    isNative: true,
    price: TOKEN_PRICES_USD[CELO_TOKEN],
    icon: "🟡",
  },
  {
    symbol: "USDC",
    address: USDC_TOKEN,
    decimals: 6,
    isNative: false,
    price: TOKEN_PRICES_USD[USDC_TOKEN],
    icon: "💵",
  },
  {
    symbol: "USDT",
    address: USDT_TOKEN,
    decimals: 6,
    isNative: false,
    price: TOKEN_PRICES_USD[USDT_TOKEN],
    icon: "💵",
  },
  {
    symbol: "cUSD",
    address: CUSD_TOKEN,
    decimals: 18,
    isNative: false,
    price: TOKEN_PRICES_USD[CUSD_TOKEN],
    icon: "💲",
  },
  {
    symbol: "cEUR",
    address: CEUR_TOKEN,
    decimals: 18,
    isNative: false,
    price: TOKEN_PRICES_USD[CEUR_TOKEN],
    icon: "💶",
  },
  {
    symbol: "USDT-zkSync",
    address: ZKSYNC_USDT_TOKEN,
    decimals: 6,
    isNative: false,
    price: 1.00, // Standard stablecoin price
    icon: "💱",
  },
]; 

// 🔑 Privy Authentication
// Access Vite's environment variables properly
export const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID || "clw6cwf3c00r0l80hq9sknplt"; 