// Constants for Token Selling Order Filler

// Import base constants from token-selling-order to ensure consistency
import {
  XOC_TOKEN_ADDRESS,
  MXNE_TOKEN_ADDRESS,
  USDC_TOKEN_ADDRESS,
  XOC_DECIMALS,
  MXNE_DECIMALS,
  USDC_DECIMALS,
  BASESCAN_TX_URL,
  BASESCAN_ADDRESS_URL,
  ESCROW_WALLET_ADDRESS,
  MIN_MXN_AMOUNT,
  MAX_MXN_AMOUNT,
  SUPPORTED_TOKENS
} from '../token-selling-order/constants';

// Re-export common constants
export {
  XOC_TOKEN_ADDRESS,
  MXNE_TOKEN_ADDRESS,
  USDC_TOKEN_ADDRESS,
  XOC_DECIMALS,
  MXNE_DECIMALS,
  USDC_DECIMALS,
  BASESCAN_TX_URL,
  BASESCAN_ADDRESS_URL,
  ESCROW_WALLET_ADDRESS,
  MIN_MXN_AMOUNT,
  MAX_MXN_AMOUNT,
  SUPPORTED_TOKENS
};

// Base network chain ID
export const BASE_CHAIN_ID = '8453';

// Fill status constants
export const FILL_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  EXPIRED: 'expired'
} as const;

// QR code validation constants
export const QR_CODE_VALIDATION = {
  VALID: 'valid',
  INVALID: 'invalid',
  EXPIRED: 'expired',
  ALREADY_USED: 'already_used'
} as const;

// Maximum time difference allowed between order MXN amount and QR code amount (percentage)
export const MAX_MXN_AMOUNT_DIFFERENCE_PERCENT = 5;

// Maximum time to complete a fill (milliseconds) - 15 minutes
export const MAX_FILL_TIME_MS = 15 * 60 * 1000;

// Fee percentage for facilitating the filling process (0.5%)
export const FILL_FEE_PERCENTAGE = 0.5; 