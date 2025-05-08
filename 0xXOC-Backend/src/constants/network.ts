/**
 * Network related constants used throughout the application
 */

// Network identifiers
export const CELO_NETWORK_ID = 'celo';
export const CELO_CHAIN_ID = '42220';

// Gas multipliers
export const GAS_LIMIT_MULTIPLIER = 1.2;
export const FEE_PER_GAS_MULTIPLIER = 1.1;

// RPC configuration
export const RPC_RETRY_COUNT = 3;
export const RPC_RETRY_DELAY = 100; // ms
export const RPC_TIMEOUT = 30_000; // 30 seconds

// Explorer URLs
export const CELOSCAN_TX_URL = 'https://celoscan.io/tx/';
export const CELOSCAN_ADDRESS_URL = 'https://celoscan.io/address/';

// Transaction status
export const TX_STATUS = {
  PENDING: 'pending',
  SIGNED: 'signed',
  REJECTED: 'rejected',
  COMPLETED: 'completed'
} as const;

// Token prices fallback (when price feed is not available)
export const TOKEN_PRICES_USD = {
  CELO: 0.75,
  cUSD: 1.0,
  cEUR: 1.07,
  USDC: 1.0,
} as const; 