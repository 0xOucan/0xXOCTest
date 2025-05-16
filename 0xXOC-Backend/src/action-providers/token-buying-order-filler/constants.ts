// Chain ID for Base network
export const BASE_CHAIN_ID = 8453;

// Base Explorer URL for transactions
export const BASESCAN_TX_URL = 'https://basescan.org/tx/';

// Escrow wallet address (fallback to env var)
export const ESCROW_WALLET_ADDRESS = process.env.ESCROW_WALLET_ADDRESS || '0x9c77c6fafc1eb0821F1De12972Ef0199C97C6e45';

// Time to wait for transaction confirmation (in milliseconds)
export const TX_CONFIRMATION_TIMEOUT = 300000; // 5 minutes

// Default gas limit for token transfer transactions
export const DEFAULT_GAS_LIMIT = 200000;

// Default gas price for token transfer transactions (in gwei)
export const DEFAULT_GAS_PRICE = '1.5';

// ERC20 ABI for token transfers
export const ERC20_ABI = [
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function"
  }
]; 