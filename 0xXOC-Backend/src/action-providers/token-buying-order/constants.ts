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

// Order status constants
export const ORDER_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  FILLED: 'filled',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired'
} as const;

// OXXO Spin constants
export const OXXO_SPIN_EMISOR_ID = '101'; // Expected emisor ID for validation
export const OXXO_SPIN_OPERATION_TYPE = '0004'; // Expected operation type for validation

// Min order amount in MXN
export const MIN_ORDER_AMOUNT_MXN = 5;

// Max order amount in MXN
export const MAX_ORDER_AMOUNT_MXN = 10000;

// Default order expiration time in seconds (7 days)
export const DEFAULT_ORDER_EXPIRATION = 7 * 24 * 60 * 60;

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
    icon: '��',
  },
} as const; 