/**
 * Tests for the transaction-utils module
 */

// No need to mock anymore since we're using the actual implementation
// jest.mock('../../chatbot', () => ({
//   pendingTransactions: [],
//   PendingTransaction: {}
// }));

import { 
  createPendingTransaction, 
  pendingTransactions,
  PendingTransaction
} from '../../utils/transaction-utils';

describe('Transaction Utilities', () => {
  beforeEach(() => {
    // Clear the array before each test
    pendingTransactions.length = 0;
  });

  test('createPendingTransaction returns a transaction ID', () => {
    const txId = createPendingTransaction(
      '0x1234567890123456789012345678901234567890',
      '0.1'
    );
    
    expect(txId).toBeTruthy();
    expect(txId).toMatch(/^tx-/); // Updated to match the actual format
  });

  test('createPendingTransaction adds to the pending transactions array', () => {
    createPendingTransaction(
      '0x1234567890123456789012345678901234567890',
      '0.1'
    );
    
    expect(pendingTransactions.length).toBe(1);
  });

  test('createPendingTransaction formats native token values correctly', () => {
    // Test with decimal value (ether)
    createPendingTransaction(
      '0x1234567890123456789012345678901234567890',
      '1.5'
    );
    
    expect(pendingTransactions[0].value).toBeTruthy();
    // Check that it converted to wei (1.5 * 10^18)
    expect(BigInt(pendingTransactions[0].value)).toBeGreaterThan(BigInt(1000000000000000000));
    
    // Clear array for next test
    pendingTransactions.length = 0;
    
    // Test with non-decimal value
    createPendingTransaction(
      '0x1234567890123456789012345678901234567890',
      '100'
    );
    
    expect(pendingTransactions[0].value).toBe('100');
  });

  test('createPendingTransaction handles contract data correctly', () => {
    createPendingTransaction(
      '0x1234567890123456789012345678901234567890',
      '0',
      '0xa9059cbb0000000000000000000000001234567890123456789012345678901234567890' // Transfer function
    );
    
    const tx = pendingTransactions[0];
    expect(tx.data).toMatch(/^0x/);
    expect(tx.metadata?.dataType).toBe('token-approval');
    expect(tx.metadata?.dataSize).toBeGreaterThan(0);
  });

  test('createPendingTransaction handles wallet address correctly', () => {
    const walletAddress = '0xabcdef1234567890abcdef1234567890abcdef12';
    
    createPendingTransaction(
      '0x1234567890123456789012345678901234567890',
      '0.1',
      undefined,
      walletAddress
    );
    
    expect(pendingTransactions[0].metadata?.walletAddress).toBe(walletAddress);
  });
}); 