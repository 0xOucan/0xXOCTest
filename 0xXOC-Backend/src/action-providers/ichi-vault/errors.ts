// 🛑 Base error class for ICHI vault
export class IchiVaultError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IchiVaultError';
  }
}

// 💸 Error for insufficient balance
export class InsufficientBalanceError extends IchiVaultError {
  constructor(token: string, available: string, required: string) {
    super(`Insufficient ${token} balance. You have ${available} ${token}, but the operation requires ${required} ${token}.`);
    this.name = 'InsufficientBalanceError';
  }
}

// 🔒 Error for insufficient allowance
export class InsufficientAllowanceError extends IchiVaultError {
  constructor(token: string, available: string, required: string) {
    super(`Insufficient ${token} allowance. You have approved ${available} ${token}, but the operation requires ${required} ${token}. Please approve more tokens.`);
    this.name = 'InsufficientAllowanceError';
  }
}

// 🌐 Error for wrong network
export class WrongNetworkError extends IchiVaultError {
  constructor() {
    super("ICHI vaults on this action provider are configured for Celo. Please switch your network to Celo.");
    this.name = 'WrongNetworkError';
  }
}

// ❌ Error for failed transactions
export class TransactionFailedError extends IchiVaultError {
  constructor(message: string) {
    super(`Transaction failed: ${message}`);
    this.name = 'TransactionFailedError';
  }
} 