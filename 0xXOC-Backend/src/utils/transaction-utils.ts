/**
 * Utility functions for handling blockchain transactions
 */

// Store pending transactions that can be accessed across modules
export interface PendingTransaction {
  id: string;
  to: string;
  value: string;
  data?: string;
  status: 'pending' | 'signed' | 'rejected' | 'completed';
  hash?: string;
  timestamp: number;
  metadata?: {
    source: string;
    walletAddress: string;
    requiresSignature: boolean;
    dataSize: number;
    dataType: string;
    chain?: 'celo' | 'base' | 'arbitrum' | 'mantle' | 'zksync';
  };
}

// Global store for pending transactions - can be imported by other modules
export const pendingTransactions: PendingTransaction[] = [];

/**
 * Creates a pending transaction record and adds it to the global pendingTransactions array
 * 
 * @param to Target address
 * @param value Transaction value
 * @param data Optional transaction data
 * @param walletAddress Optional wallet address (for frontend wallet tracking)
 * @param chain Optional chain identifier (celo, base, arbitrum, mantle, zksync)
 * @returns Transaction ID
 */
export const createPendingTransaction = (
  to: string, 
  value: string, 
  data?: string,
  walletAddress?: string,
  chain?: 'celo' | 'base' | 'arbitrum' | 'mantle' | 'zksync'
): string => {
  const txId = `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  
  // Ensure addresses are properly formatted
  const formattedTo = to.startsWith('0x') ? to : `0x${to}`;
  
  // Format transaction value to ensure it's valid
  let formattedValue = value || '0';
  if (formattedValue.startsWith('0x')) {
    // Value is already in hex, keep as is
  } else {
    // Try to parse as number and convert to BigInt string
    try {
      // If it has decimal points, it needs to be converted to wei
      if (formattedValue.includes('.')) {
        const valueInEther = parseFloat(formattedValue);
        // Convert to wei (1 ether = 10^18 wei)
        formattedValue = (BigInt(Math.floor(valueInEther * 10**18))).toString();
      } else {
        // Parse as BigInt directly if no decimal
        formattedValue = BigInt(formattedValue).toString();
      }
    } catch (error) {
      console.error('Error formatting transaction value:', error);
      formattedValue = '0';
    }
  }
  
  // Format the data field properly
  let formattedData = data || undefined;
  if (formattedData && !formattedData.startsWith('0x')) {
    formattedData = `0x${formattedData}`;
  }

  // Determine the chain if not provided
  let determinedChain = chain;
  if (!determinedChain) {
    // Try to detect chain from token address
    const toAddressLower = formattedTo.toLowerCase();
    if (toAddressLower === "0xa411c9aa00e020e4f88bc19996d29c5b7adb4acf") { // XOC on Base
      determinedChain = 'base';
      console.log('Auto-detected Base chain transaction');
    } else if (toAddressLower === "0xf197ffc28c23e0309b5559e7a166f2c6164c80aa") { // MXNB on Arbitrum
      determinedChain = 'arbitrum';
      console.log('Auto-detected Arbitrum chain transaction');
    } else if (toAddressLower === "0x201eba5cc46d216ce6dc03f6a759e8e766e956ae") { // USDT on Mantle
      determinedChain = 'mantle';
      console.log('Auto-detected Mantle chain transaction');
    } else if (toAddressLower === "0x493257fd37edb34451f62edf8d2a0c418852ba4c") { // USDT on zkSync Era
      determinedChain = 'zksync';
      console.log('Auto-detected zkSync Era chain transaction');
    } else {
      // Default to Base for new transactions
      determinedChain = 'base';
    }
  }

  // Create transaction object
  const pendingTx: PendingTransaction = {
    id: txId,
    to: formattedTo,
    value: formattedValue,
    data: formattedData,
    status: 'pending',
    timestamp: Date.now(),
    // Add additional metadata for better tracking
    metadata: {
      source: walletAddress ? 'frontend-wallet' : 'backend-wallet',
      walletAddress: walletAddress || formattedTo,
      requiresSignature: !!walletAddress,
      dataSize: formattedData ? formattedData.length : 0,
      dataType: formattedData ? 
        (formattedData.startsWith('0x6') ? 'contract-call' : 
         formattedData.startsWith('0xa9') ? 'token-approval' : 'unknown') 
        : 'native-transfer',
      chain: determinedChain
    }
  };
  
  // Add to global pending transactions
  pendingTransactions.push(pendingTx);
  
  console.log(`✅ Transaction created with ID: ${txId}`);
  if (walletAddress) {
    console.log(`⏳ Waiting for wallet signature from ${walletAddress}...`);
  }
  
  return txId;
};

/**
 * Update the status of a pending transaction
 * 
 * @param txId Transaction ID
 * @param status New status
 * @param txHash Optional transaction hash (for completed transactions)
 * @returns Updated transaction or undefined if not found
 */
export function updateTransactionStatus(
  txId: string, 
  status: 'pending' | 'signed' | 'rejected' | 'completed',
  txHash?: string
): PendingTransaction | undefined {
  const index = pendingTransactions.findIndex(tx => tx.id === txId);
  if (index === -1) return undefined;
  
  pendingTransactions[index].status = status;
  if (txHash) {
    pendingTransactions[index].hash = txHash;
  }
  
  return pendingTransactions[index];
}

/**
 * Get all pending transactions
 * 
 * @param status Optional status filter
 * @returns Array of pending transactions
 */
export function getTransactions(status?: 'pending' | 'signed' | 'rejected' | 'completed'): PendingTransaction[] {
  if (status) {
    return pendingTransactions.filter(tx => tx.status === status);
  }
  return [...pendingTransactions];
}

/**
 * Get transaction by ID
 * 
 * @param txId Transaction ID
 * @returns Transaction or undefined if not found
 */
export function getTransactionById(txId: string): PendingTransaction | undefined {
  return pendingTransactions.find(tx => tx.id === txId);
}

/**
 * Format transaction value to ether (from wei)
 * 
 * @param value Transaction value in wei
 * @returns Formatted value in ether
 */
export function formatValueToEther(value: string): string {
  try {
    const valueBigInt = BigInt(value);
    return (Number(valueBigInt) / 10**18).toFixed(6);
  } catch (error) {
    console.error('Error formatting value to ether:', error);
    return '0';
  }
} 