// 🛑 Base error class for AAVE protocol
export class AaveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AaveError';
  }
}

// 💸 Error for insufficient balance
export class InsufficientBalanceError extends AaveError {
  constructor(token: string, balance: string, required: string) {
    super(`Insufficient ${token} balance. You have ${balance} but need ${required}`);
    this.name = 'InsufficientBalanceError';
  }
}

// 🔒 Error for insufficient allowance
export class InsufficientAllowanceError extends AaveError {
  constructor(token: string, allowance: string, required: string) {
    super(`Insufficient ${token} allowance. Current allowance is ${allowance} but need ${required}`);
    this.name = 'InsufficientAllowanceError';
  }
}

// 🌐 Error for wrong network
export class WrongNetworkError extends AaveError {
  constructor() {
    super("This AAVE action provider is configured for Celo. Please switch your network to Celo.");
    this.name = 'WrongNetworkError';
  }
}

// ❌ Error for failed transactions
export class TransactionFailedError extends AaveError {
  constructor(message: string) {
    super(`Transaction failed: ${message}`);
    this.name = 'TransactionFailedError';
  }
}

// 🔐 Error for collateral not available
export class NonCollateralTokenError extends AaveError {
  constructor(token: string) {
    super(`${token} is not available to be used as collateral in AAVE on Celo.`);
    this.name = 'NonCollateralTokenError';
  }
}

// 💔 Error for health factor too low
export class HealthFactorTooLowError extends AaveError {
  constructor(currentHF: string) {
    super(`Health factor is too low (${currentHF}). Cannot perform this action as it would risk liquidation.`);
    this.name = 'HealthFactorTooLowError';
  }
} 