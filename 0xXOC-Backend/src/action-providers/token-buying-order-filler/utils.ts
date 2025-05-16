import { formatUnits, parseUnits } from 'viem';
import { FillerTransaction } from './schemas';
import { 
  getBuyingOrderById, 
  updateBuyingOrderStatus
} from '../token-buying-order/utils';

// In-memory storage for filler transactions
export const fillerTransactions: Map<string, FillerTransaction> = new Map();

/**
 * Store a filler transaction
 */
export function storeFillerTransaction(transaction: FillerTransaction): FillerTransaction {
  fillerTransactions.set(transaction.orderId, transaction);
  return transaction;
}

/**
 * Get a filler transaction by order ID
 */
export function getFillerTransactionByOrderId(orderId: string): FillerTransaction | null {
  const transaction = fillerTransactions.get(orderId);
  return transaction || null;
}

/**
 * Update a filler transaction
 */
export function updateFillerTransaction(
  orderId: string,
  updateData: Partial<FillerTransaction>
): FillerTransaction | null {
  const transaction = fillerTransactions.get(orderId);
  
  if (!transaction) {
    return null;
  }
  
  const updatedTransaction = {
    ...transaction,
    ...updateData
  };
  
  fillerTransactions.set(orderId, updatedTransaction);
  return updatedTransaction;
}

/**
 * Get all filler transactions for a specific filler address
 */
export function getFillerTransactions(
  fillerAddress: string,
  token: 'XOC' | 'MXNe' | 'USDC' | 'ALL' = 'ALL',
  limit: number = 10
): FillerTransaction[] {
  const transactions = Array.from(fillerTransactions.values()).filter(tx => {
    // Filter by filler address
    if (tx.filler.toLowerCase() !== fillerAddress.toLowerCase()) {
      return false;
    }
    
    // Filter by token if specified
    if (token !== 'ALL' && tx.token !== token) {
      return false;
    }
    
    return true;
  });
  
  // Sort by filled date, newest first
  const sortedTransactions = transactions.sort((a, b) => b.filledAt - a.filledAt);
  
  // Apply limit
  return sortedTransactions.slice(0, limit);
}

/**
 * Mark an order as filled by a specific user
 */
export function markOrderAsFilled(
  orderId: string,
  fillerAddress: string,
  txHash: string
): boolean {
  // Get the buying order
  const order = getBuyingOrderById(orderId);
  
  if (!order) {
    console.error(`Failed to mark order as filled: Order with ID ${orderId} not found.`);
    return false;
  }
  
  console.log(`Marking order ${orderId} as filled by ${fillerAddress} with transaction ${txHash}`);
  
  // Update the order status to filled and add filler information
  const updatedOrder = updateBuyingOrderStatus(
    orderId,
    'filled',
    {
      filledBy: fillerAddress,
      filledAt: Date.now(),
      fillerTxHash: txHash,
      onChainTxHash: txHash // Ensure this is set for transaction verification
    }
  );
  
  if (!updatedOrder) {
    console.error(`Failed to update order ${orderId} status to filled.`);
    return false;
  }
  
  // Update transaction status in the pending transactions
  try {
    const { updateTransactionStatus } = require('../../utils/transaction-utils');
    updateTransactionStatus(txHash, 'completed', txHash);
    console.log(`Updated transaction ${txHash} status to completed.`);
  } catch (error) {
    console.error(`Error updating transaction status: ${error instanceof Error ? error.message : String(error)}`);
    // Continue even if transaction status update fails
    // The important part is that the order is marked as filled
  }
  
  // Store the filler transaction
  storeFillerTransaction({
    orderId,
    filler: fillerAddress,
    filledAt: Date.now(),
    txHash,
    token: order.token,
    tokenAmount: order.tokenAmount,
    mxnAmount: order.mxnAmount,
    qrCodeDownloaded: false,
    buyerId: order.buyer
  });
  
  console.log(`Successfully marked order ${orderId} as filled and stored filler transaction.`);
  
  return true;
}

/**
 * Generate QR code download URL for a filled order
 */
export function generateQRCodeDownloadUrl(orderId: string): string | null {
  // Get the buying order
  const order = getBuyingOrderById(orderId);
  
  if (!order || !order.imageFileId || !order.imageFileExt) {
    return null;
  }
  
  // Generate a secure, time-limited URL for downloading the QR code
  // This will be a server endpoint that validates the request and serves the image
  const timestamp = Date.now();
  const expirationTime = timestamp + (5 * 60 * 1000); // 5 minutes
  
  return `/api/order/${orderId}/qr-image-download?expires=${expirationTime}&imageId=${order.imageFileId}`;
}

/**
 * Mark QR code as downloaded
 */
export function markQRCodeAsDownloaded(orderId: string): boolean {
  // Update the filler transaction
  const updatedTransaction = updateFillerTransaction(orderId, {
    qrCodeDownloaded: true
  });
  
  // Update the buying order to track that the QR code was downloaded
  updateBuyingOrderStatus(
    orderId,
    'filled',
    {
      qrCodeDownloaded: true,
      qrCodeDownloadedAt: Date.now()
    }
  );
  
  return !!updatedTransaction;
}

/**
 * Format a token amount with the correct number of decimals
 */
export function formatTokenAmount(amount: string, decimals: number): string {
  try {
    return formatUnits(parseUnits(amount, decimals), decimals);
  } catch (error) {
    console.error('Error formatting token amount:', error);
    return amount;
  }
}

/**
 * Validate if an order can be filled
 */
export function validateOrderForFilling(orderId: string, fillerAddress: string): { 
  valid: boolean; 
  order?: any; 
  errorCode?: string; 
  errorMessage?: string; 
} {
  // Get the buying order
  const order = getBuyingOrderById(orderId);
  
  if (!order) {
    return { 
      valid: false, 
      errorCode: 'ORDER_NOT_FOUND',
      errorMessage: `Order with ID ${orderId} not found.`
    };
  }
  
  // Check if the order is already filled
  if (order.status === 'filled') {
    return { 
      valid: false, 
      order,
      errorCode: 'ALREADY_FILLED',
      errorMessage: `Order ${orderId} has already been filled.`
    };
  }
  
  // Check if the order is expired
  if (order.status === 'expired' || order.expiresAt < Date.now()) {
    return { 
      valid: false, 
      order,
      errorCode: 'EXPIRED_ORDER',
      errorMessage: `Order ${orderId} has expired.`
    };
  }
  
  // Check if the order is cancelled
  if (order.status === 'cancelled') {
    return { 
      valid: false, 
      order,
      errorCode: 'CANCELLED_ORDER',
      errorMessage: `Order ${orderId} has been cancelled.`
    };
  }
  
  // Check if the order is active
  if (order.status !== 'active') {
    return { 
      valid: false, 
      order,
      errorCode: 'INVALID_ORDER_STATUS',
      errorMessage: `Cannot fill order ${orderId} with status: ${order.status}. Only active orders can be filled.`
    };
  }
  
  // Check if the filler is trying to fill their own order
  if (order.buyer.toLowerCase() === fillerAddress.toLowerCase()) {
    return { 
      valid: false, 
      order,
      errorCode: 'SAME_USER',
      errorMessage: `You cannot fill your own buying order (${orderId}).`
    };
  }
  
  // All validations passed
  return { valid: true, order };
}

/**
 * Shorten an Ethereum address for display
 */
export function shortenAddress(address: string): string {
  if (!address || address.length < 10) {
    return address || '';
  }
  
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
} 