/**
 * Network and blockchain related constants
 */

// Chain ID in both decimal and hex formats
export const CELO_CHAIN_ID = 42220;
export const CELO_CHAIN_HEX = `0x${CELO_CHAIN_ID.toString(16)}`;

// RPC URLs in priority order
export const CELO_RPC_URLS = [
  'https://forno.celo.org',
  'https://rpc.ankr.com/celo',
  'https://celo-mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161' // Public Infura endpoint
];

// Chain IDs for Base and Arbitrum
export const BASE_CHAIN_ID = 8453;
export const BASE_CHAIN_HEX = `0x${BASE_CHAIN_ID.toString(16)}`;
export const ARBITRUM_CHAIN_ID = 42161;
export const ARBITRUM_CHAIN_HEX = `0x${ARBITRUM_CHAIN_ID.toString(16)}`;
export const MANTLE_CHAIN_ID = 5000;
export const MANTLE_CHAIN_HEX = `0x${MANTLE_CHAIN_ID.toString(16)}`;
export const ZKSYNC_CHAIN_ID = 324;
export const ZKSYNC_CHAIN_HEX = `0x${ZKSYNC_CHAIN_ID.toString(16)}`;

// RPC URLs for Base, Arbitrum, and Mantle
export const BASE_RPC_URLS = [
  'https://mainnet.base.org',
  'https://base-mainnet.public.blastapi.io'
];

export const ARBITRUM_RPC_URLS = [
  'https://arb1.arbitrum.io/rpc',
  'https://arbitrum-one.public.blastapi.io'
];

export const MANTLE_RPC_URLS = [
  'https://rpc.mantle.xyz',
  'https://mantle-mainnet.public.blastapi.io'
];

export const ZKSYNC_RPC_URLS = [
  'https://mainnet.era.zksync.io',
  'https://zksync-era.blockpi.network/v1/rpc/public'
];

// Network parameters for wallet addition
export const CELO_NETWORK_PARAMS = {
  chainId: CELO_CHAIN_HEX,
  chainName: 'Celo Mainnet',
  nativeCurrency: {
    name: 'CELO',
    symbol: 'CELO',
    decimals: 18
  },
  rpcUrls: CELO_RPC_URLS,
  blockExplorerUrls: ['https://celoscan.io/']
};

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

// Network parameters for Arbitrum
export const ARBITRUM_NETWORK_PARAMS = {
  chainId: ARBITRUM_CHAIN_HEX,
  chainName: 'Arbitrum One',
  nativeCurrency: {
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18
  },
  rpcUrls: ARBITRUM_RPC_URLS,
  blockExplorerUrls: ['https://arbiscan.io/']
};

// Network parameters for Mantle
export const MANTLE_NETWORK_PARAMS = {
  chainId: MANTLE_CHAIN_HEX,
  chainName: 'Mantle Mainnet',
  nativeCurrency: {
    name: 'MNT',
    symbol: 'MNT',
    decimals: 18
  },
  rpcUrls: MANTLE_RPC_URLS,
  blockExplorerUrls: ['https://explorer.mantle.xyz/']
};

// Network parameters for zkSync Era
export const ZKSYNC_NETWORK_PARAMS = {
  chainId: ZKSYNC_CHAIN_HEX,
  chainName: 'zkSync Era Mainnet',
  nativeCurrency: {
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18
  },
  rpcUrls: ZKSYNC_RPC_URLS,
  blockExplorerUrls: ['https://explorer.zksync.io/']
};

// Explorer URL formatters
export const getExplorerAddressUrl = (address: string, network: 'celo' | 'base' | 'arbitrum' | 'mantle' | 'zksync' = 'celo'): string => {
  switch (network) {
    case 'base':
      return `https://basescan.org/address/${address}`;
    case 'arbitrum':
      return `https://arbiscan.io/address/${address}`;
    case 'mantle':
      return `https://explorer.mantle.xyz/address/${address}`;
    case 'zksync':
      return `https://explorer.zksync.io/address/${address}`;
    case 'celo':
    default:
      return `https://celoscan.io/address/${address}`;
  }
};

export const getExplorerTxUrl = (txHash: string, network: 'celo' | 'base' | 'arbitrum' | 'mantle' | 'zksync' = 'celo'): string => {
  switch (network) {
    case 'base':
      return `https://basescan.org/tx/${txHash}`;
    case 'arbitrum':
      return `https://arbiscan.io/tx/${txHash}`;
    case 'mantle':
      return `https://explorer.mantle.xyz/tx/${txHash}`;
    case 'zksync':
      return `https://explorer.zksync.io/tx/${txHash}`;
    case 'celo':
    default:
      return `https://celoscan.io/tx/${txHash}`;
  }
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
  CELO: {
    name: 'Celoscan',
    url: 'https://celoscan.io',
    tx: (hash: string) => `https://celoscan.io/tx/${hash}`,
    address: (address: string) => `https://celoscan.io/address/${address}`,
    token: (address: string) => `https://celoscan.io/token/${address}`
  },
  BASE: {
    name: 'Basescan',
    url: 'https://basescan.org',
    tx: (hash: string) => `https://basescan.org/tx/${hash}`,
    address: (address: string) => `https://basescan.org/address/${address}`,
    token: (address: string) => `https://basescan.org/token/${address}`
  },
  ARBITRUM: {
    name: 'Arbiscan',
    url: 'https://arbiscan.io',
    tx: (hash: string) => `https://arbiscan.io/tx/${hash}`,
    address: (address: string) => `https://arbiscan.io/address/${address}`,
    token: (address: string) => `https://arbiscan.io/token/${address}`
  },
  MANTLE: {
    name: 'Mantle Explorer',
    url: 'https://explorer.mantle.xyz',
    tx: (hash: string) => `https://explorer.mantle.xyz/tx/${hash}`,
    address: (address: string) => `https://explorer.mantle.xyz/address/${address}`,
    token: (address: string) => `https://explorer.mantle.xyz/token/${address}`
  },
  ZKSYNC: {
    name: 'zkSync Explorer',
    url: 'https://explorer.zksync.io',
    tx: (hash: string) => `https://explorer.zksync.io/tx/${hash}`,
    address: (address: string) => `https://explorer.zksync.io/address/${address}`,
    token: (address: string) => `https://explorer.zksync.io/token/${address}`
  }
}; 