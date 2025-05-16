/**
 * Error definitions for Token Buying Order action provider
 */

export enum TokenBuyingOrderErrors {
  WRONG_NETWORK = 'WRONG_NETWORK',
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  ORDER_NOT_FOUND = 'ORDER_NOT_FOUND',
  INVALID_TOKEN = 'INVALID_TOKEN',
  UNAUTHORIZED = 'UNAUTHORIZED',
  ORDER_ALREADY_CANCELLED = 'ORDER_ALREADY_CANCELLED',
  ORDER_ALREADY_FILLED = 'ORDER_ALREADY_FILLED',
  ORDER_EXPIRED = 'ORDER_EXPIRED',
  INVALID_ORDER_ID = 'INVALID_ORDER_ID',
  INVALID_QR_CODE = 'INVALID_QR_CODE',
  QR_CODE_EXPIRED = 'QR_CODE_EXPIRED',
  QR_CODE_ALREADY_USED = 'QR_CODE_ALREADY_USED',
  INVALID_QR_AMOUNT = 'INVALID_QR_AMOUNT',
}

/**
 * Base error class for all Token Buying Order errors
 */
export class TokenBuyingOrderError extends Error {
  code: TokenBuyingOrderErrors;
  details?: any;

  constructor(code: TokenBuyingOrderErrors, message: string, details?: any) {
    super(message);
    this.name = 'TokenBuyingOrderError';
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, TokenBuyingOrderError.prototype);
  }
}

/**
 * Thrown when the wallet is connected to the wrong network
 */
export class WrongNetworkError extends TokenBuyingOrderError {
  constructor(currentNetwork: string, requiredNetwork: string) {
    super(
      TokenBuyingOrderErrors.WRONG_NETWORK,
      `Wrong network detected. Currently on ${currentNetwork}, but ${requiredNetwork} is required.`,
      { currentNetwork, requiredNetwork }
    );
    Object.setPrototypeOf(this, WrongNetworkError.prototype);
  }
}

/**
 * Thrown when the order amount is invalid
 */
export class InvalidAmountError extends TokenBuyingOrderError {
  constructor(amount: string, minAmount: string, maxAmount: string) {
    super(
      TokenBuyingOrderErrors.INVALID_AMOUNT,
      `Invalid amount. Amount must be between ${minAmount} and ${maxAmount} MXN.`,
      { amount, minAmount, maxAmount }
    );
    Object.setPrototypeOf(this, InvalidAmountError.prototype);
  }
}

/**
 * Thrown when a transaction fails
 */
export class TransactionFailedError extends TokenBuyingOrderError {
  constructor(details?: string) {
    super(
      TokenBuyingOrderErrors.TRANSACTION_FAILED,
      `Transaction failed${details ? `: ${details}` : '.'}`,
      { details }
    );
    Object.setPrototypeOf(this, TransactionFailedError.prototype);
  }
}

/**
 * Thrown when an order is not found
 */
export class OrderNotFoundError extends TokenBuyingOrderError {
  constructor(orderId: string) {
    super(
      TokenBuyingOrderErrors.ORDER_NOT_FOUND,
      `Order with ID ${orderId} not found.`,
      { orderId }
    );
    Object.setPrototypeOf(this, OrderNotFoundError.prototype);
  }
}

/**
 * Thrown when an invalid token is used
 */
export class InvalidTokenError extends TokenBuyingOrderError {
  constructor(tokenSymbol: string) {
    super(
      TokenBuyingOrderErrors.INVALID_TOKEN,
      `Invalid token symbol: ${tokenSymbol}. Supported tokens are XOC, MXNe, and USDC.`,
      { tokenSymbol }
    );
    Object.setPrototypeOf(this, InvalidTokenError.prototype);
  }
}

/**
 * Thrown when user tries to act on someone else's order
 */
export class UnauthorizedError extends TokenBuyingOrderError {
  constructor(message: string) {
    super(
      TokenBuyingOrderErrors.UNAUTHORIZED,
      message,
      { message }
    );
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

/**
 * Thrown when trying to cancel an already cancelled order
 */
export class OrderAlreadyCancelledError extends TokenBuyingOrderError {
  constructor(orderId: string) {
    super(
      TokenBuyingOrderErrors.ORDER_ALREADY_CANCELLED,
      `Order ${orderId} has already been cancelled.`,
      { orderId }
    );
    Object.setPrototypeOf(this, OrderAlreadyCancelledError.prototype);
  }
}

/**
 * Thrown when trying to modify a filled order
 */
export class OrderAlreadyFilledError extends TokenBuyingOrderError {
  constructor(orderId: string) {
    super(
      TokenBuyingOrderErrors.ORDER_ALREADY_FILLED,
      `Order ${orderId} has already been filled.`,
      { orderId }
    );
    Object.setPrototypeOf(this, OrderAlreadyFilledError.prototype);
  }
}

/**
 * Thrown when trying to interact with an expired order
 */
export class OrderExpiredError extends TokenBuyingOrderError {
  constructor(orderId: string, expirationDate: Date) {
    super(
      TokenBuyingOrderErrors.ORDER_EXPIRED,
      `Order ${orderId} expired on ${expirationDate.toLocaleString()}.`,
      { orderId, expirationDate }
    );
    Object.setPrototypeOf(this, OrderExpiredError.prototype);
  }
}

/**
 * Thrown when the QR code is invalid
 */
export class InvalidQRCodeError extends TokenBuyingOrderError {
  constructor(details?: string) {
    super(
      TokenBuyingOrderErrors.INVALID_QR_CODE,
      `Invalid OXXO Spin QR code${details ? `: ${details}` : '.'}`,
      { details }
    );
    Object.setPrototypeOf(this, InvalidQRCodeError.prototype);
  }
}

/**
 * Thrown when the QR code has expired
 */
export class QRCodeExpiredError extends TokenBuyingOrderError {
  constructor(expirationDate: string) {
    super(
      TokenBuyingOrderErrors.QR_CODE_EXPIRED,
      `OXXO Spin QR code expired on ${expirationDate}.`,
      { expirationDate }
    );
    Object.setPrototypeOf(this, QRCodeExpiredError.prototype);
  }
}

/**
 * Thrown when the QR code has already been used
 */
export class QRCodeAlreadyUsedError extends TokenBuyingOrderError {
  constructor(referenceCode: string) {
    super(
      TokenBuyingOrderErrors.QR_CODE_ALREADY_USED,
      `OXXO Spin QR code with reference ${referenceCode} has already been used.`,
      { referenceCode }
    );
    Object.setPrototypeOf(this, QRCodeAlreadyUsedError.prototype);
  }
}

/**
 * Thrown when the QR amount is invalid
 */
export class InvalidQRAmountError extends TokenBuyingOrderError {
  constructor(amount: number, minAmount: number, maxAmount: number) {
    super(
      TokenBuyingOrderErrors.INVALID_QR_AMOUNT,
      `Invalid QR code amount. Amount must be between ${minAmount} and ${maxAmount} MXN.`,
      { amount, minAmount, maxAmount }
    );
    Object.setPrototypeOf(this, InvalidQRAmountError.prototype);
  }
}

/**
 * Get a user-friendly error message for the given error code
 */
export function getErrorMessage(error: TokenBuyingOrderErrors): string {
  switch (error) {
    case TokenBuyingOrderErrors.WRONG_NETWORK:
      return "You're connected to the wrong network. Please switch to Base network and try again.";
    case TokenBuyingOrderErrors.INVALID_AMOUNT:
      return "The amount you specified is invalid. Please check the minimum and maximum limits.";
    case TokenBuyingOrderErrors.TRANSACTION_FAILED:
      return "The transaction failed. Please check your wallet and try again.";
    case TokenBuyingOrderErrors.ORDER_NOT_FOUND:
      return "The specified order couldn't be found.";
    case TokenBuyingOrderErrors.INVALID_TOKEN:
      return "The token you specified is not supported for buying orders.";
    case TokenBuyingOrderErrors.UNAUTHORIZED:
      return "You're not authorized to perform this action on the order.";
    case TokenBuyingOrderErrors.ORDER_ALREADY_CANCELLED:
      return "This order has already been cancelled.";
    case TokenBuyingOrderErrors.ORDER_ALREADY_FILLED:
      return "This order has already been filled.";
    case TokenBuyingOrderErrors.ORDER_EXPIRED:
      return "This order has expired.";
    case TokenBuyingOrderErrors.INVALID_ORDER_ID:
      return "The order ID is invalid.";
    case TokenBuyingOrderErrors.INVALID_QR_CODE:
      return "The OXXO Spin QR code is invalid or in an incorrect format.";
    case TokenBuyingOrderErrors.QR_CODE_EXPIRED:
      return "The OXXO Spin QR code has expired.";
    case TokenBuyingOrderErrors.QR_CODE_ALREADY_USED:
      return "This OXXO Spin QR code has already been used for an order.";
    case TokenBuyingOrderErrors.INVALID_QR_AMOUNT:
      return "The amount in the QR code is outside the allowed range.";
    default:
      return "An unknown error occurred with the token buying order.";
  }
} 