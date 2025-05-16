/**
 * Error definitions for Token Selling Order Filler action provider
 */

export enum TokenSellingOrderFillerErrors {
  WRONG_NETWORK = 'WRONG_NETWORK',
  ORDER_NOT_FOUND = 'ORDER_NOT_FOUND',
  ORDER_NOT_ACTIVE = 'ORDER_NOT_ACTIVE',
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_QR_CODE = 'INVALID_QR_CODE',
  QR_CODE_EXPIRED = 'QR_CODE_EXPIRED',
  QR_CODE_ALREADY_USED = 'QR_CODE_ALREADY_USED',
  AMOUNT_MISMATCH = 'AMOUNT_MISMATCH',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  FILL_ALREADY_INITIATED = 'FILL_ALREADY_INITIATED',
  FILL_EXPIRED = 'FILL_EXPIRED',
  QR_STORAGE_FAILED = 'QR_STORAGE_FAILED',
  FILL_NOT_FOUND = 'FILL_NOT_FOUND'
}

/**
 * Base error class for all Token Selling Order Filler errors
 */
export class TokenSellingOrderFillerError extends Error {
  code: TokenSellingOrderFillerErrors;
  details?: any;

  constructor(code: TokenSellingOrderFillerErrors, message: string, details?: any) {
    super(message);
    this.name = 'TokenSellingOrderFillerError';
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, TokenSellingOrderFillerError.prototype);
  }
}

/**
 * Thrown when the wallet is connected to the wrong network
 */
export class WrongNetworkError extends TokenSellingOrderFillerError {
  constructor(currentNetwork: string, requiredNetwork: string) {
    super(
      TokenSellingOrderFillerErrors.WRONG_NETWORK,
      `Wrong network detected. Currently on ${currentNetwork}, but ${requiredNetwork} is required.`,
      { currentNetwork, requiredNetwork }
    );
    Object.setPrototypeOf(this, WrongNetworkError.prototype);
  }
}

/**
 * Thrown when an order is not found
 */
export class OrderNotFoundError extends TokenSellingOrderFillerError {
  constructor(orderId: string) {
    super(
      TokenSellingOrderFillerErrors.ORDER_NOT_FOUND,
      `Selling order with ID ${orderId} not found.`,
      { orderId }
    );
    Object.setPrototypeOf(this, OrderNotFoundError.prototype);
  }
}

/**
 * Thrown when an order is not in active status
 */
export class OrderNotActiveError extends TokenSellingOrderFillerError {
  constructor(orderId: string, currentStatus: string) {
    super(
      TokenSellingOrderFillerErrors.ORDER_NOT_ACTIVE,
      `Order ${orderId} is not active. Current status: ${currentStatus}.`,
      { orderId, currentStatus }
    );
    Object.setPrototypeOf(this, OrderNotActiveError.prototype);
  }
}

/**
 * Thrown when a user is not authorized to fill an order
 */
export class UnauthorizedError extends TokenSellingOrderFillerError {
  constructor(message: string, details?: any) {
    super(
      TokenSellingOrderFillerErrors.UNAUTHORIZED,
      message,
      details
    );
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

/**
 * Thrown when a QR code is invalid
 */
export class InvalidQRCodeError extends TokenSellingOrderFillerError {
  constructor(details?: string) {
    super(
      TokenSellingOrderFillerErrors.INVALID_QR_CODE,
      `Invalid QR code format or content${details ? `: ${details}` : '.'}`,
      { details }
    );
    Object.setPrototypeOf(this, InvalidQRCodeError.prototype);
  }
}

/**
 * Thrown when a QR code has expired
 */
export class QRCodeExpiredError extends TokenSellingOrderFillerError {
  constructor(expirationDate: string) {
    super(
      TokenSellingOrderFillerErrors.QR_CODE_EXPIRED,
      `The QR code has expired on ${expirationDate}.`,
      { expirationDate }
    );
    Object.setPrototypeOf(this, QRCodeExpiredError.prototype);
  }
}

/**
 * Thrown when a QR code has already been used
 */
export class QRCodeAlreadyUsedError extends TokenSellingOrderFillerError {
  constructor(referenceCode: string) {
    super(
      TokenSellingOrderFillerErrors.QR_CODE_ALREADY_USED,
      `The QR code with reference ${referenceCode} has already been used.`,
      { referenceCode }
    );
    Object.setPrototypeOf(this, QRCodeAlreadyUsedError.prototype);
  }
}

/**
 * Thrown when the QR code amount doesn't match the order amount
 */
export class AmountMismatchError extends TokenSellingOrderFillerError {
  constructor(qrAmount: number, orderAmount: string) {
    super(
      TokenSellingOrderFillerErrors.AMOUNT_MISMATCH,
      `The QR code amount (${qrAmount} MXN) doesn't match the order amount (${orderAmount} MXN).`,
      { qrAmount, orderAmount }
    );
    Object.setPrototypeOf(this, AmountMismatchError.prototype);
  }
}

/**
 * Thrown when a transaction fails
 */
export class TransactionFailedError extends TokenSellingOrderFillerError {
  constructor(details?: string) {
    super(
      TokenSellingOrderFillerErrors.TRANSACTION_FAILED,
      `Transaction failed${details ? `: ${details}` : '.'}`,
      { details }
    );
    Object.setPrototypeOf(this, TransactionFailedError.prototype);
  }
}

/**
 * Thrown when a fill has already been initiated
 */
export class FillAlreadyInitiatedError extends TokenSellingOrderFillerError {
  constructor(orderId: string, fillerId: string) {
    super(
      TokenSellingOrderFillerErrors.FILL_ALREADY_INITIATED,
      `A fill for order ${orderId} has already been initiated by ${fillerId}.`,
      { orderId, fillerId }
    );
    Object.setPrototypeOf(this, FillAlreadyInitiatedError.prototype);
  }
}

/**
 * Thrown when a fill has expired
 */
export class FillExpiredError extends TokenSellingOrderFillerError {
  constructor(orderId: string, expirationDate: Date) {
    super(
      TokenSellingOrderFillerErrors.FILL_EXPIRED,
      `Fill attempt for order ${orderId} has expired at ${expirationDate.toLocaleString()}.`,
      { orderId, expirationDate }
    );
    Object.setPrototypeOf(this, FillExpiredError.prototype);
  }
}

/**
 * Thrown when QR storage on the blockchain fails
 */
export class QRStorageFailedError extends TokenSellingOrderFillerError {
  constructor(details?: string) {
    super(
      TokenSellingOrderFillerErrors.QR_STORAGE_FAILED,
      `Failed to store QR data on the blockchain${details ? `: ${details}` : '.'}`,
      { details }
    );
    Object.setPrototypeOf(this, QRStorageFailedError.prototype);
  }
}

/**
 * Thrown when a fill is not found
 */
export class FillNotFoundError extends TokenSellingOrderFillerError {
  constructor(fillId: string, orderId: string) {
    super(
      TokenSellingOrderFillerErrors.FILL_NOT_FOUND,
      `Fill ${fillId} for order ${orderId} not found.`,
      { fillId, orderId }
    );
    Object.setPrototypeOf(this, FillNotFoundError.prototype);
  }
}

/**
 * Get a user-friendly error message for the given error code
 */
export function getErrorMessage(error: TokenSellingOrderFillerErrors): string {
  switch (error) {
    case TokenSellingOrderFillerErrors.WRONG_NETWORK:
      return "You're connected to the wrong network. Please switch to Base network and try again.";
    case TokenSellingOrderFillerErrors.ORDER_NOT_FOUND:
      return "The selling order couldn't be found.";
    case TokenSellingOrderFillerErrors.ORDER_NOT_ACTIVE:
      return "This order is not active and cannot be filled.";
    case TokenSellingOrderFillerErrors.UNAUTHORIZED:
      return "You're not authorized to perform this action.";
    case TokenSellingOrderFillerErrors.INVALID_QR_CODE:
      return "The QR code is invalid or malformed.";
    case TokenSellingOrderFillerErrors.QR_CODE_EXPIRED:
      return "The QR code has expired and cannot be used.";
    case TokenSellingOrderFillerErrors.QR_CODE_ALREADY_USED:
      return "This QR code has already been used for another order.";
    case TokenSellingOrderFillerErrors.AMOUNT_MISMATCH:
      return "The QR code amount doesn't match the order amount.";
    case TokenSellingOrderFillerErrors.TRANSACTION_FAILED:
      return "The transaction failed. Please check your wallet and try again.";
    case TokenSellingOrderFillerErrors.FILL_ALREADY_INITIATED:
      return "A fill for this order has already been initiated.";
    case TokenSellingOrderFillerErrors.FILL_EXPIRED:
      return "The fill attempt has expired.";
    case TokenSellingOrderFillerErrors.QR_STORAGE_FAILED:
      return "Failed to store the QR code data on the blockchain.";
    case TokenSellingOrderFillerErrors.FILL_NOT_FOUND:
      return "The fill record couldn't be found.";
    default:
      return "An unknown error occurred with the token selling order filler.";
  }
} 