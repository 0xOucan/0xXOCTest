/**
 * Network and blockchain related constants
 */

// Chain ID in both decimal and hex formats
export const BASE_CHAIN_ID = 8453;
export const BASE_CHAIN_HEX = `0x${BASE_CHAIN_ID.toString(16)}`;

// RPC URLs for Base
export const BASE_RPC_URLS = [
  'https://mainnet.base.org',
  'https://base-mainnet.public.blastapi.io'
];

// Network parameters for Base
export const BASE_NETWORK_PARAMS = {
  chainId: BASE_CHAIN_HEX,
  chainName: 'Base Mainnet',
  nativeCurrency: {
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18
  },
  rpcUrls: BASE_RPC_URLS,
  blockExplorerUrls: ['https://basescan.org/']
};

// Explorer URL formatters
export const getExplorerAddressUrl = (address: string): string => {
  return `https://basescan.org/address/${address}`;
};

export const getExplorerTxUrl = (txHash: string): string => {
  return `https://basescan.org/tx/${txHash}`;
};

// Transaction status enum
export enum TransactionStatus {
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  CONFIRMED = 'confirmed',
  REJECTED = 'rejected',
  FAILED = 'failed'
}

// Error types
export enum NetworkErrorType {
  CONNECTION_FAILED = 'connection_failed',
  CHAIN_ADD_FAILED = 'chain_add_failed',
  NETWORK_SWITCH_FAILED = 'network_switch_failed',
  UNSUPPORTED_CHAIN = 'unsupported_chain',
  ACCOUNT_ACCESS_DENIED = 'account_access_denied',
  WALLET_NOT_FOUND = 'wallet_not_found',
  UNKNOWN = 'unknown'
}

// Gas price settings
export const GAS_PRICE_MULTIPLIER = 1.1; // 10% buffer
export const GAS_LIMIT_MULTIPLIER = 1.2; // 20% buffer

// RPC error codes
export const RPC_ERROR_CODES = {
  USER_REJECTED: 4001,
  UNAUTHORIZED: 4100,
  UNSUPPORTED_METHOD: 4200,
  DISCONNECTED: 4900,
  CHAIN_DISCONNECTED: 4901,
  CHAIN_NOT_ADDED: 4902
};

// Blockchain explorers
export const EXPLORERS = {
  BASE: {
    name: 'Basescan',
    url: 'https://basescan.org',
    tx: (hash: string) => `https://basescan.org/tx/${hash}`,
    address: (address: string) => `https://basescan.org/address/${address}`,
    token: (address: string) => `https://basescan.org/token/${address}`
  }
}; 