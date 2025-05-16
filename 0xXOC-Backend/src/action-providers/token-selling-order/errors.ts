/**
 * Error definitions for Token Selling Order action provider
 */

export enum TokenSellingOrderErrors {
  WRONG_NETWORK = 'WRONG_NETWORK',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  INVALID_MXN_AMOUNT = 'INVALID_MXN_AMOUNT',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  ORDER_NOT_FOUND = 'ORDER_NOT_FOUND',
  INVALID_TOKEN = 'INVALID_TOKEN',
  UNAUTHORIZED = 'UNAUTHORIZED',
  ORDER_ALREADY_CANCELLED = 'ORDER_ALREADY_CANCELLED',
  ORDER_ALREADY_FILLED = 'ORDER_ALREADY_FILLED',
  ORDER_EXPIRED = 'ORDER_EXPIRED',
  ESCROW_UNAVAILABLE = 'ESCROW_UNAVAILABLE',
  INVALID_ORDER_ID = 'INVALID_ORDER_ID',
}

/**
 * Base error class for all Token Selling Order errors
 */
export class TokenSellingOrderError extends Error {
  code: TokenSellingOrderErrors;
  details?: any;

  constructor(code: TokenSellingOrderErrors, message: string, details?: any) {
    super(message);
    this.name = 'TokenSellingOrderError';
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, TokenSellingOrderError.prototype);
  }
}

/**
 * Thrown when the wallet is connected to the wrong network
 */
export class WrongNetworkError extends TokenSellingOrderError {
  constructor(currentNetwork: string, requiredNetwork: string) {
    super(
      TokenSellingOrderErrors.WRONG_NETWORK,
      `Wrong network detected. Currently on ${currentNetwork}, but ${requiredNetwork} is required.`,
      { currentNetwork, requiredNetwork }
    );
    Object.setPrototypeOf(this, WrongNetworkError.prototype);
  }
}

/**
 * Thrown when the wallet has insufficient balance
 */
export class InsufficientBalanceError extends TokenSellingOrderError {
  constructor(balance: string, requiredAmount: string, tokenSymbol: string) {
    super(
      TokenSellingOrderErrors.INSUFFICIENT_BALANCE,
      `Insufficient balance. You have ${balance} ${tokenSymbol}, but ${requiredAmount} ${tokenSymbol} is required.`,
      { balance, requiredAmount, tokenSymbol }
    );
    Object.setPrototypeOf(this, InsufficientBalanceError.prototype);
  }
}

/**
 * Thrown when the order amount is invalid
 */
export class InvalidAmountError extends TokenSellingOrderError {
  constructor(amount: string, minAmount: string, maxAmount: string, tokenSymbol: string) {
    super(
      TokenSellingOrderErrors.INVALID_AMOUNT,
      `Invalid amount. Amount must be between ${minAmount} and ${maxAmount} ${tokenSymbol}.`,
      { amount, minAmount, maxAmount, tokenSymbol }
    );
    Object.setPrototypeOf(this, InvalidAmountError.prototype);
  }
}

/**
 * Thrown when the MXN amount is invalid
 */
export class InvalidMXNAmountError extends TokenSellingOrderError {
  constructor(amount: string, minAmount: string, maxAmount: string) {
    super(
      TokenSellingOrderErrors.INVALID_MXN_AMOUNT,
      `Invalid MXN amount. Amount must be between ${minAmount} and ${maxAmount} MXN.`,
      { amount, minAmount, maxAmount }
    );
    Object.setPrototypeOf(this, InvalidMXNAmountError.prototype);
  }
}

/**
 * Thrown when a transaction fails
 */
export class TransactionFailedError extends TokenSellingOrderError {
  constructor(details?: string) {
    super(
      TokenSellingOrderErrors.TRANSACTION_FAILED,
      `Transaction failed${details ? `: ${details}` : '.'}`,
      { details }
    );
    Object.setPrototypeOf(this, TransactionFailedError.prototype);
  }
}

/**
 * Thrown when an order is not found
 */
export class OrderNotFoundError extends TokenSellingOrderError {
  constructor(orderId: string) {
    super(
      TokenSellingOrderErrors.ORDER_NOT_FOUND,
      `Order with ID ${orderId} not found.`,
      { orderId }
    );
    Object.setPrototypeOf(this, OrderNotFoundError.prototype);
  }
}

/**
 * Thrown when an invalid token is used
 */
export class InvalidTokenError extends TokenSellingOrderError {
  constructor(tokenSymbol: string) {
    super(
      TokenSellingOrderErrors.INVALID_TOKEN,
      `Invalid token symbol: ${tokenSymbol}. Supported tokens are XOC, MXNe, and USDC.`,
      { tokenSymbol }
    );
    Object.setPrototypeOf(this, InvalidTokenError.prototype);
  }
}

/**
 * Thrown when user tries to act on someone else's order
 */
export class UnauthorizedError extends TokenSellingOrderError {
  constructor(orderId: string, userAddress: string) {
    super(
      TokenSellingOrderErrors.UNAUTHORIZED,
      `You are not authorized to manage order ${orderId}. Only the creator can manage this order.`,
      { orderId, userAddress }
    );
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

/**
 * Thrown when trying to cancel an already cancelled order
 */
export class OrderAlreadyCancelledError extends TokenSellingOrderError {
  constructor(orderId: string) {
    super(
      TokenSellingOrderErrors.ORDER_ALREADY_CANCELLED,
      `Order ${orderId} has already been cancelled.`,
      { orderId }
    );
    Object.setPrototypeOf(this, OrderAlreadyCancelledError.prototype);
  }
}

/**
 * Thrown when trying to modify a filled order
 */
export class OrderAlreadyFilledError extends TokenSellingOrderError {
  constructor(orderId: string) {
    super(
      TokenSellingOrderErrors.ORDER_ALREADY_FILLED,
      `Order ${orderId} has already been filled.`,
      { orderId }
    );
    Object.setPrototypeOf(this, OrderAlreadyFilledError.prototype);
  }
}

/**
 * Thrown when trying to interact with an expired order
 */
export class OrderExpiredError extends TokenSellingOrderError {
  constructor(orderId: string, expirationDate: Date) {
    super(
      TokenSellingOrderErrors.ORDER_EXPIRED,
      `Order ${orderId} expired on ${expirationDate.toLocaleString()}.`,
      { orderId, expirationDate }
    );
    Object.setPrototypeOf(this, OrderExpiredError.prototype);
  }
}

/**
 * Get a user-friendly error message for the given error code
 */
export function getErrorMessage(error: TokenSellingOrderErrors): string {
  switch (error) {
    case TokenSellingOrderErrors.WRONG_NETWORK:
      return "You're connected to the wrong network. Please switch to Base network and try again.";
    case TokenSellingOrderErrors.INSUFFICIENT_BALANCE:
      return "Your wallet doesn't have enough tokens for this operation.";
    case TokenSellingOrderErrors.INVALID_AMOUNT:
      return "The amount you specified is invalid. Please check the minimum and maximum limits.";
    case TokenSellingOrderErrors.INVALID_MXN_AMOUNT:
      return "The MXN amount you specified is invalid. Please check the minimum and maximum limits.";
    case TokenSellingOrderErrors.TRANSACTION_FAILED:
      return "The transaction failed. Please check your wallet and try again.";
    case TokenSellingOrderErrors.ORDER_NOT_FOUND:
      return "The specified order couldn't be found.";
    case TokenSellingOrderErrors.INVALID_TOKEN:
      return "The token you specified is not supported for selling orders.";
    case TokenSellingOrderErrors.UNAUTHORIZED:
      return "You're not authorized to perform this action on the order.";
    case TokenSellingOrderErrors.ORDER_ALREADY_CANCELLED:
      return "This order has already been cancelled.";
    case TokenSellingOrderErrors.ORDER_ALREADY_FILLED:
      return "This order has already been filled.";
    case TokenSellingOrderErrors.ORDER_EXPIRED:
      return "This order has expired.";
    case TokenSellingOrderErrors.ESCROW_UNAVAILABLE:
      return "The escrow service is temporarily unavailable. Please try again later.";
    case TokenSellingOrderErrors.INVALID_ORDER_ID:
      return "The order ID is invalid.";
    default:
      return "An unknown error occurred with the token selling order.";
  }
} 