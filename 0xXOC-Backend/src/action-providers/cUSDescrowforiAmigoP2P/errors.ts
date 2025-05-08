/**
 * Base error class for cUSDescrowforiAmigoP2P action provider
 */
export enum cUSDescrowErrors {
    SENDING_TRANSACTION_FAILED = 'SENDING_TRANSACTION_FAILED',
    INVALID_ESCROW_WALLET = 'INVALID_ESCROW_WALLET',
    INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
    QR_CODE_PARSING_FAILED = 'QR_CODE_PARSING_FAILED',
    INVALID_PARAMS = 'INVALID_PARAMS',
    TRANSACTION_FAILED = 'TRANSACTION_FAILED',
    NO_ACTIVE_SELLING_ORDERS = 'NO_ACTIVE_SELLING_ORDERS',
    INSUFFICIENT_SELLING_ORDERS = 'INSUFFICIENT_SELLING_ORDERS',
    RECEIPT_NOT_FOUND = 'RECEIPT_NOT_FOUND',
    NO_RECENT_TRANSACTIONS = 'NO_RECENT_TRANSACTIONS',
}

export class CUSDEscrowError extends Error {
    code: cUSDescrowErrors;
    details?: any;

    constructor(code: cUSDescrowErrors, message: string, details?: any) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'CUSDEscrowError';
    }
}

/**
 * Error when a wrong network is detected
 */
export class WrongNetworkError extends CUSDEscrowError {
  constructor() {
    super(cUSDescrowErrors.INVALID_ESCROW_WALLET, 'This action provider is configured for the Celo network. Please switch your network to Celo.');
    this.name = 'WrongNetworkError';
  }
}

/**
 * Error for insufficient balance
 */
export class InsufficientBalanceError extends CUSDEscrowError {
  constructor(balance: string, requiredAmount: string) {
    super(cUSDescrowErrors.INSUFFICIENT_BALANCE, `Insufficient cUSD balance. You have ${balance} cUSD but need at least ${requiredAmount} cUSD.`);
    this.name = 'InsufficientBalanceError';
  }
}

/**
 * Error for invalid order amount
 */
export class InvalidOrderAmountError extends CUSDEscrowError {
  constructor(amount: string, minAmount: string, maxAmount: string) {
    super(cUSDescrowErrors.INVALID_PARAMS, `Invalid order amount: ${amount} cUSD. Amount must be between ${minAmount} and ${maxAmount} cUSD.`);
    this.name = 'InvalidOrderAmountError';
  }
}

/**
 * Error for transaction failure
 */
export class TransactionFailedError extends CUSDEscrowError {
  constructor(details?: string) {
    super(cUSDescrowErrors.TRANSACTION_FAILED, `Transaction failed. ${details || ''}`);
    this.name = 'TransactionFailedError';
  }
}

/**
 * Error for invalid QR code format
 */
export class InvalidQRCodeError extends CUSDEscrowError {
  constructor(details?: string) {
    super(cUSDescrowErrors.QR_CODE_PARSING_FAILED, `Invalid QR code format. ${details || 'The QR code could not be parsed.'}`);
    this.name = 'InvalidQRCodeError';
  }
}

/**
 * Error for expired QR code
 */
export class ExpiredQRCodeError extends CUSDEscrowError {
  constructor(expDate?: string) {
    super(cUSDescrowErrors.INVALID_PARAMS, `This QR code has expired${expDate ? ` on ${expDate}` : ''}.`);
    this.name = 'ExpiredQRCodeError';
  }
}

/**
 * Error for insufficient escrow balance
 */
export class InsufficientEscrowBalanceError extends CUSDEscrowError {
  constructor(balance: string, requiredAmount: string) {
    super(cUSDescrowErrors.INSUFFICIENT_BALANCE, `Insufficient balance in escrow wallet. Available: ${balance} cUSD, Required: ${requiredAmount} cUSD.`);
    this.name = 'InsufficientEscrowBalanceError';
  }
}

export function getErrorMessage(error: cUSDescrowErrors): string {
    switch (error) {
        case cUSDescrowErrors.SENDING_TRANSACTION_FAILED:
            return 'Failed to send transaction. Please check your wallet configuration and try again.';
        case cUSDescrowErrors.INVALID_ESCROW_WALLET:
            return 'Invalid escrow wallet configuration. Please check your environment variables.';
        case cUSDescrowErrors.INSUFFICIENT_BALANCE:
            return 'Insufficient balance in the wallet to complete this transaction.';
        case cUSDescrowErrors.QR_CODE_PARSING_FAILED:
            return 'Failed to parse QR code. Please provide a valid OXXO Spin QR code.';
        case cUSDescrowErrors.INVALID_PARAMS:
            return 'Invalid parameters provided for the operation.';
        case cUSDescrowErrors.TRANSACTION_FAILED:
            return 'The transaction failed to complete.';
        case cUSDescrowErrors.NO_ACTIVE_SELLING_ORDERS:
            return 'No active selling orders found in the escrow.';
        case cUSDescrowErrors.INSUFFICIENT_SELLING_ORDERS:
            return 'Insufficient funds in selling orders to fulfill the buying request.';
        case cUSDescrowErrors.RECEIPT_NOT_FOUND:
            return 'No receipt found for the specified transaction ID.';
        case cUSDescrowErrors.NO_RECENT_TRANSACTIONS:
            return 'No recent transactions found to generate a receipt.';
        default:
            return 'An unknown error occurred.';
    }
} 