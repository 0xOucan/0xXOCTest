/**
 * Error codes for token buying order filler
 */
export enum TokenBuyingOrderFillerErrors {
  WRONG_NETWORK = 'WRONG_NETWORK',
  ORDER_NOT_FOUND = 'ORDER_NOT_FOUND',
  ALREADY_FILLED = 'ALREADY_FILLED',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  EXPIRED_ORDER = 'EXPIRED_ORDER',
  CANCELLED_ORDER = 'CANCELLED_ORDER',
  INVALID_ORDER_STATUS = 'INVALID_ORDER_STATUS',
  UNAUTHORIZED = 'UNAUTHORIZED',
  SAME_USER = 'SAME_USER',
}

/**
 * Base error class for token buying order filler
 */
export class TokenBuyingOrderFillerError extends Error {
  code: TokenBuyingOrderFillerErrors;
  details: Record<string, any>;

  constructor(
    code: TokenBuyingOrderFillerErrors,
    message: string,
    details: Record<string, any> = {}
  ) {
    super(message);
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, TokenBuyingOrderFillerError.prototype);
  }
}

/**
 * Thrown when the user's wallet is connected to the wrong network
 */
export class WrongNetworkError extends TokenBuyingOrderFillerError {
  constructor(currentChainId: string | number, requiredNetwork: string) {
    super(
      TokenBuyingOrderFillerErrors.WRONG_NETWORK,
      `You are connected to network with ID ${currentChainId}. Please switch to ${requiredNetwork} network.`,
      { currentChainId, requiredNetwork }
    );
    Object.setPrototypeOf(this, WrongNetworkError.prototype);
  }
}

/**
 * Thrown when an order is not found
 */
export class OrderNotFoundError extends TokenBuyingOrderFillerError {
  constructor(orderId: string) {
    super(
      TokenBuyingOrderFillerErrors.ORDER_NOT_FOUND,
      `Order with ID ${orderId} not found.`,
      { orderId }
    );
    Object.setPrototypeOf(this, OrderNotFoundError.prototype);
  }
}

/**
 * Thrown when trying to fill an already filled order
 */
export class OrderAlreadyFilledError extends TokenBuyingOrderFillerError {
  constructor(orderId: string) {
    super(
      TokenBuyingOrderFillerErrors.ALREADY_FILLED,
      `Order ${orderId} has already been filled.`,
      { orderId }
    );
    Object.setPrototypeOf(this, OrderAlreadyFilledError.prototype);
  }
}

/**
 * Thrown when the user has insufficient token balance to fill an order
 */
export class InsufficientBalanceError extends TokenBuyingOrderFillerError {
  constructor(token: string, required: string, available: string) {
    super(
      TokenBuyingOrderFillerErrors.INSUFFICIENT_BALANCE,
      `Insufficient ${token} balance. Required: ${required}, Available: ${available}.`,
      { token, required, available }
    );
    Object.setPrototypeOf(this, InsufficientBalanceError.prototype);
  }
}

/**
 * Thrown when a transaction fails
 */
export class TransactionFailedError extends TokenBuyingOrderFillerError {
  constructor(message: string, details: Record<string, any> = {}) {
    super(
      TokenBuyingOrderFillerErrors.TRANSACTION_FAILED,
      `Transaction failed: ${message}`,
      details
    );
    Object.setPrototypeOf(this, TransactionFailedError.prototype);
  }
}

/**
 * Thrown when trying to fill an expired order
 */
export class OrderExpiredError extends TokenBuyingOrderFillerError {
  constructor(orderId: string, expirationDate: Date | number) {
    const dateStr = expirationDate instanceof Date 
      ? expirationDate.toLocaleString() 
      : new Date(expirationDate).toLocaleString();
    
    super(
      TokenBuyingOrderFillerErrors.EXPIRED_ORDER,
      `Order ${orderId} expired on ${dateStr}.`,
      { orderId, expirationDate }
    );
    Object.setPrototypeOf(this, OrderExpiredError.prototype);
  }
}

/**
 * Thrown when trying to fill a cancelled order
 */
export class OrderCancelledError extends TokenBuyingOrderFillerError {
  constructor(orderId: string) {
    super(
      TokenBuyingOrderFillerErrors.CANCELLED_ORDER,
      `Order ${orderId} has been cancelled.`,
      { orderId }
    );
    Object.setPrototypeOf(this, OrderCancelledError.prototype);
  }
}

/**
 * Thrown when trying to fill an order with invalid status
 */
export class InvalidOrderStatusError extends TokenBuyingOrderFillerError {
  constructor(orderId: string, status: string) {
    super(
      TokenBuyingOrderFillerErrors.INVALID_ORDER_STATUS,
      `Cannot fill order ${orderId} with status: ${status}. Only active orders can be filled.`,
      { orderId, status }
    );
    Object.setPrototypeOf(this, InvalidOrderStatusError.prototype);
  }
}

/**
 * Thrown when the buyer tries to fill their own order
 */
export class SameUserError extends TokenBuyingOrderFillerError {
  constructor(orderId: string) {
    super(
      TokenBuyingOrderFillerErrors.SAME_USER,
      `You cannot fill your own buying order (${orderId}).`,
      { orderId }
    );
    Object.setPrototypeOf(this, SameUserError.prototype);
  }
} 