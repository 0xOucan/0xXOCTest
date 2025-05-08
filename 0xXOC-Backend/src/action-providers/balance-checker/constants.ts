// 🏢 Token Contract Addresses on Celo
export const CELO_TOKEN = "0x471EcE3750Da237f93B8E339c536989b8978a438"; // Native CELO
export const USDC_TOKEN = "0xceba9300f2b948710d2653dd7b07f33a8b32118c"; // USDC on Celo
export const USDT_TOKEN = "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e"; // Tether USD on Celo
export const CUSD_TOKEN = "0x765DE816845861e75A25fCA122bb6898B8B1282a"; // cUSD (Celo Dollar)
export const CEUR_TOKEN = "0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73"; // cEUR (Celo Euro)

// 💰 Token Decimals
export const TOKEN_DECIMALS = {
  [CELO_TOKEN]: 18,
  [USDC_TOKEN]: 6,
  [USDT_TOKEN]: 6,
  [CUSD_TOKEN]: 18,
  [CEUR_TOKEN]: 18,
};

// 🏷️ Token Symbols
export const TOKEN_SYMBOLS = {
  [CELO_TOKEN]: "CELO",
  [USDC_TOKEN]: "USDC",
  [USDT_TOKEN]: "USDT",
  [CUSD_TOKEN]: "cUSD",
  [CEUR_TOKEN]: "cEUR",
};

// 💲 Approximate token prices in USD (fallback if oracle is unavailable)
export const TOKEN_PRICES_USD = {
  [CELO_TOKEN]: 0.50,  // $0.50 per CELO
  [USDC_TOKEN]: 1.00,  // $1.00 per USDC
  [USDT_TOKEN]: 1.00,  // $1.00 per USDT
  [CUSD_TOKEN]: 1.00,  // $1.00 per cUSD
  [CEUR_TOKEN]: 1.08,  // $1.08 per cEUR (based on EUR/USD exchange rate)
};

// 🔄 ERC20 Token ABI
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
] as const;

// 📋 Tracked tokens for balance checking
export const TRACKED_TOKENS = [
  {
    symbol: "CELO",
    address: CELO_TOKEN,
    decimals: 18,
    isNative: true,
    price: 0.50,
    icon: "🟡",
  },
  {
    symbol: "USDC",
    address: USDC_TOKEN,
    decimals: 6,
    isNative: false,
    price: 1.00,
    icon: "💵",
  },
  {
    symbol: "USDT",
    address: USDT_TOKEN,
    decimals: 6,
    isNative: false,
    price: 1.00,
    icon: "💵",
  },
  {
    symbol: "cUSD",
    address: CUSD_TOKEN,
    decimals: 18,
    isNative: false,
    price: 1.00,
    icon: "💲",
  },
  {
    symbol: "cEUR",
    address: CEUR_TOKEN,
    decimals: 18,
    isNative: false,
    price: 1.08,
    icon: "💶",
  },
]; 