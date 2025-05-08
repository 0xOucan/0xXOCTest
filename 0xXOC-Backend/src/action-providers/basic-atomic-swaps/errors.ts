/**
 * Error definitions for the Basic Atomic Swaps action provider
 */

export enum AtomicSwapErrors {
  WRONG_NETWORK = 'WRONG_NETWORK',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  CROSS_CHAIN_ERROR = 'CROSS_CHAIN_ERROR',
  INSUFFICIENT_ESCROW_BALANCE = 'INSUFFICIENT_ESCROW_BALANCE',
  LIQUIDITY_PROVISION_FAILED = 'LIQUIDITY_PROVISION_FAILED',
}

/**
 * Base error class for all Atomic Swap errors
 */
export class AtomicSwapError extends Error {
  code: AtomicSwapErrors;
  details?: any;

  constructor(code: AtomicSwapErrors, message: string, details?: any) {
    super(message);
    this.name = 'AtomicSwapError';
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AtomicSwapError.prototype);
  }
}

/**
 * Thrown when the wallet is connected to the wrong network
 */
export class WrongNetworkError extends AtomicSwapError {
  constructor(currentNetwork: string, requiredNetwork: string) {
    super(
      AtomicSwapErrors.WRONG_NETWORK,
      `Wrong network detected. Currently on ${currentNetwork}, but ${requiredNetwork} is required.`,
      { currentNetwork, requiredNetwork }
    );
    Object.setPrototypeOf(this, WrongNetworkError.prototype);
  }
}

/**
 * Thrown when the wallet has insufficient balance
 */
export class InsufficientBalanceError extends AtomicSwapError {
  constructor(balance: string, requiredAmount: string, tokenSymbol: string) {
    super(
      AtomicSwapErrors.INSUFFICIENT_BALANCE,
      `Insufficient balance. You have ${balance} ${tokenSymbol}, but ${requiredAmount} ${tokenSymbol} is required.`,
      { balance, requiredAmount, tokenSymbol }
    );
    Object.setPrototypeOf(this, InsufficientBalanceError.prototype);
  }
}

/**
 * Thrown when the swap amount is invalid
 */
export class InvalidAmountError extends AtomicSwapError {
  constructor(amount: string, minAmount: string, maxAmount: string, tokenSymbol: string) {
    super(
      AtomicSwapErrors.INVALID_AMOUNT,
      `Invalid amount. Amount must be between ${minAmount} and ${maxAmount} ${tokenSymbol}.`,
      { amount, minAmount, maxAmount, tokenSymbol }
    );
    Object.setPrototypeOf(this, InvalidAmountError.prototype);
  }
}

/**
 * Thrown when a transaction fails
 */
export class TransactionFailedError extends AtomicSwapError {
  constructor(details?: string) {
    super(
      AtomicSwapErrors.TRANSACTION_FAILED,
      `Transaction failed${details ? `: ${details}` : '.'}`,
      { details }
    );
    Object.setPrototypeOf(this, TransactionFailedError.prototype);
  }
}

/**
 * Thrown when there's an error with cross-chain operations
 */
export class CrossChainError extends AtomicSwapError {
  constructor(fromChain: string, toChain: string, details?: string) {
    super(
      AtomicSwapErrors.CROSS_CHAIN_ERROR,
      `Cross-chain operation from ${fromChain} to ${toChain} failed${details ? `: ${details}` : '.'}`,
      { fromChain, toChain, details }
    );
    Object.setPrototypeOf(this, CrossChainError.prototype);
  }
}

/**
 * Thrown when the escrow wallet has insufficient balance
 */
export class InsufficientEscrowBalanceError extends AtomicSwapError {
  constructor(balance: string, requiredAmount: string, tokenSymbol: string, chainName: string) {
    super(
      AtomicSwapErrors.INSUFFICIENT_ESCROW_BALANCE,
      `Insufficient escrow balance on ${chainName}. Escrow has ${balance} ${tokenSymbol}, but ${requiredAmount} ${tokenSymbol} is required.`,
      { balance, requiredAmount, tokenSymbol, chainName }
    );
    Object.setPrototypeOf(this, InsufficientEscrowBalanceError.prototype);
  }
}

/**
 * Get a user-friendly error message for the given error code
 */
export function getErrorMessage(error: AtomicSwapErrors): string {
  switch (error) {
    case AtomicSwapErrors.WRONG_NETWORK:
      return "You're connected to the wrong network. Please switch to the required network and try again.";
    case AtomicSwapErrors.INSUFFICIENT_BALANCE:
      return "Your wallet doesn't have enough balance for this operation.";
    case AtomicSwapErrors.INVALID_AMOUNT:
      return "The amount you specified is invalid. Please check the minimum and maximum limits.";
    case AtomicSwapErrors.TRANSACTION_FAILED:
      return "The transaction failed. Please check your wallet and try again.";
    case AtomicSwapErrors.CROSS_CHAIN_ERROR:
      return "There was an error with the cross-chain operation. Please try again later.";
    case AtomicSwapErrors.INSUFFICIENT_ESCROW_BALANCE:
      return "The escrow wallet doesn't have enough balance to complete this operation.";
    case AtomicSwapErrors.LIQUIDITY_PROVISION_FAILED:
      return "Failed to provide liquidity. Please check your inputs and try again.";
    default:
      return "An unknown error occurred with the atomic swap operation.";
  }
} 