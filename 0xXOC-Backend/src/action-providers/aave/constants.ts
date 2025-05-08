// 🏦 AAVE Protocol Contract Addresses on Celo
export const AAVE_LENDING_POOL = "0x3E59A31363E2ad014dcbc521c4a0d5757d9f3402";
export const CELO_TOKEN = "0x471EcE3750Da237f93B8E339c536989b8978a438";
export const USDC_TOKEN = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C";
export const cUSD_TOKEN = "0x765DE816845861e75A25fCA122bb6898B8B1282a";
export const cEUR_TOKEN = "0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73";
export const USDT_TOKEN = "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e"; // Tether USD on Celo

// New: Wallet Balance Provider contract
export const AAVE_WALLET_BALANCE_PROVIDER = "0xB91DA65093d54a1a7cb0fe684860F568A5E57123";

// AAVE Pool Addresses Provider
export const AAVE_POOL_ADDRESSES_PROVIDER = "0x9F7Cf9417D5251C59fE94fB9147feEe1aAd9Cea5";

/**
 * 🪙 Supported AAVE tokens
 */
export enum AaveToken {
  CELO = "CELO",
  USDC = "USDC",
  cUSD = "cUSD",
  cEUR = "cEUR",
  USDT = "USDT"
}

// AAVE aTokens (tokens you get when you supply to AAVE)
export const CELO_A_TOKEN = "0xC3e77dC389537Db1EEc7C33B95Cf3beECA71A209";
export const USDC_A_TOKEN = "0xFF8309b9e99bfd2D4021bc71a362aBD93dBd4785";
export const cUSD_A_TOKEN = "0xBba98352628B0B0c4b40583F593fFCb630935a45";
export const cEUR_A_TOKEN = "0x34c02571094e08E935B8cf8dC10F1Ad6795f1f81";
export const USDT_A_TOKEN = "0xDeE98402A302e4D707fB9bf2bac66fAEEc31e8Df";

// AAVE Debt Tokens (tokens representing your borrows)
export const CELO_VARIABLE_DEBT_TOKEN = "0xaEa37B42955De2Ba2E4AF6581E46349bCD3Ea2d6";
export const USDC_VARIABLE_DEBT_TOKEN = "0xDbe517c0FA6467873B684eCcbED77217E471E862";
export const cUSD_VARIABLE_DEBT_TOKEN = "0x05Ee3d1fBACbDbA1259946033cd7A42FDFcCcF0d";
export const cEUR_VARIABLE_DEBT_TOKEN = "0x5C2B7EB5886B3cEc5CCE1019E34493da33291aF5";
export const USDT_VARIABLE_DEBT_TOKEN = "0xE15324a9887999803b931Ac45aa89a94A9750052";

// AAVE protocol contracts
export const AAVE_DATA_PROVIDER = "0x33b7d355613110b4E842f5f7057Ccd36fb4cee28";
export const AAVE_PRICE_ORACLE = "0x1e693D088ceFD1E95ba4c4a5F7EeA41a1Ec37e8b";
export const AAVE_POOL = "0x3E59A31363E2ad014dcbc521c4a0d5757d9f3402";

// 🚫 Tokens not available as collateral
export const NON_COLLATERAL_TOKENS: AaveToken[] = [
  AaveToken.cUSD,
  AaveToken.cEUR
];

/**
 * 🎨 Token icons
 */
export const TOKEN_ICONS: Record<string, string> = {
  CELO: '🟡',
  USDC: '💵',
  USDT: '💲',
  cUSD: '💰',
  cEUR: '💶',
};

/**
 * 💲 Default referral code for AAVE
 */
export const DEFAULT_REFERRAL_CODE = 0;

/**
 * ⚡ Interest rate modes
 */
export enum InterestRateMode {
  NONE = 0,
  STABLE = 1,
  VARIABLE = 2
}

/**
 * 🔄 AAVE Lending Pool ABI
 */
export const AAVE_LENDING_POOL_ABI = [
  {
    inputs: [
      { internalType: "address", name: "asset", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "address", name: "onBehalfOf", type: "address" },
      { internalType: "uint16", name: "referralCode", type: "uint16" },
    ],
    name: "supply",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "asset", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "uint256", name: "interestRateMode", type: "uint256" },
      { internalType: "uint16", name: "referralCode", type: "uint16" },
      { internalType: "address", name: "onBehalfOf", type: "address" },
    ],
    name: "borrow",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "asset", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "uint256", name: "interestRateMode", type: "uint256" },
      { internalType: "address", name: "onBehalfOf", type: "address" },
    ],
    name: "repay",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "asset", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "address", name: "to", type: "address" },
    ],
    name: "withdraw",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getUserAccountData",
    outputs: [
      { internalType: "uint256", name: "totalCollateralETH", type: "uint256" },
      { internalType: "uint256", name: "totalDebtETH", type: "uint256" },
      { internalType: "uint256", name: "availableBorrowsETH", type: "uint256" },
      { internalType: "uint256", name: "currentLiquidationThreshold", type: "uint256" },
      { internalType: "uint256", name: "ltv", type: "uint256" },
      { internalType: "uint256", name: "healthFactor", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  }
];

/**
 * 🔄 AAVE Data Provider ABI
 */
export const AAVE_DATA_PROVIDER_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "asset", "type": "address"}],
    "name": "getATokenTotalSupply",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllATokens",
    "outputs": [{"components": [{"internalType": "string", "name": "symbol", "type": "string"}, {"internalType": "address", "name": "tokenAddress", "type": "address"}], "internalType": "struct IPoolDataProvider.TokenData[]", "name": "", "type": "tuple[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllReservesTokens",
    "outputs": [{"components": [{"internalType": "string", "name": "symbol", "type": "string"}, {"internalType": "address", "name": "tokenAddress", "type": "address"}], "internalType": "struct IPoolDataProvider.TokenData[]", "name": "", "type": "tuple[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "asset", "type": "address"}],
    "name": "getReserveData",
    "outputs": [
      {"internalType": "uint256", "name": "unbacked", "type": "uint256"},
      {"internalType": "uint256", "name": "accruedToTreasuryScaled", "type": "uint256"},
      {"internalType": "uint256", "name": "totalAToken", "type": "uint256"},
      {"internalType": "uint256", "name": "", "type": "uint256"},
      {"internalType": "uint256", "name": "totalVariableDebt", "type": "uint256"},
      {"internalType": "uint256", "name": "liquidityRate", "type": "uint256"},
      {"internalType": "uint256", "name": "variableBorrowRate", "type": "uint256"},
      {"internalType": "uint256", "name": "", "type": "uint256"},
      {"internalType": "uint256", "name": "", "type": "uint256"},
      {"internalType": "uint256", "name": "liquidityIndex", "type": "uint256"},
      {"internalType": "uint256", "name": "variableBorrowIndex", "type": "uint256"},
      {"internalType": "uint40", "name": "lastUpdateTimestamp", "type": "uint40"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "asset", "type": "address"}],
    "name": "getReserveTokensAddresses",
    "outputs": [
      {"internalType": "address", "name": "aTokenAddress", "type": "address"},
      {"internalType": "address", "name": "stableDebtTokenAddress", "type": "address"},
      {"internalType": "address", "name": "variableDebtTokenAddress", "type": "address"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "asset", "type": "address"}, {"internalType": "address", "name": "user", "type": "address"}],
    "name": "getUserReserveData",
    "outputs": [
      {"internalType": "uint256", "name": "currentATokenBalance", "type": "uint256"},
      {"internalType": "uint256", "name": "currentStableDebt", "type": "uint256"},
      {"internalType": "uint256", "name": "currentVariableDebt", "type": "uint256"},
      {"internalType": "uint256", "name": "principalStableDebt", "type": "uint256"},
      {"internalType": "uint256", "name": "scaledVariableDebt", "type": "uint256"},
      {"internalType": "uint256", "name": "stableBorrowRate", "type": "uint256"},
      {"internalType": "uint256", "name": "liquidityRate", "type": "uint256"},
      {"internalType": "uint40", "name": "stableRateLastUpdated", "type": "uint40"},
      {"internalType": "bool", "name": "usageAsCollateralEnabled", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

/**
 * 🔄 AAVE Price Oracle ABI
 */
export const AAVE_PRICE_ORACLE_ABI = [
  {
    inputs: [{ internalType: "address", name: "asset", type: "address" }],
    name: "getAssetPrice",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "address[]", name: "assets", type: "address[]" }],
    name: "getAssetsPrices",
    outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function"
  }
];

/**
 * 💰 Standard ERC20 Token ABI
 */
export const ERC20_ABI = [
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "balanceOf",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "approve",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
    ],
    name: "allowance",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [
      {
        internalType: "uint8",
        name: "",
        type: "uint8",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

// Add Wallet Balance Provider ABI
export const AAVE_WALLET_BALANCE_PROVIDER_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "user", "type": "address"},
      {"internalType": "address", "name": "token", "type": "address"}
    ],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address[]", "name": "users", "type": "address[]"},
      {"internalType": "address[]", "name": "tokens", "type": "address[]"}
    ],
    "name": "batchBalanceOf",
    "outputs": [{"internalType": "uint256[]", "name": "", "type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "provider", "type": "address"},
      {"internalType": "address", "name": "user", "type": "address"}
    ],
    "name": "getUserWalletBalances",
    "outputs": [
      {"internalType": "address[]", "name": "", "type": "address[]"},
      {"internalType": "uint256[]", "name": "", "type": "uint256[]"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
]; 