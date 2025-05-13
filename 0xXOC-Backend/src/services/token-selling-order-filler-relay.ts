import { pendingTransactions, updateTransactionStatus } from '../utils/transaction-utils';
import { 
  sellingOrderFills,
  updateFillStatus,
  getFillById,
  completeFill,
  checkAndUpdateExpiredFills
} from '../action-providers/token-selling-order-filler/utils';

// Interval for checking transaction status (milliseconds)
const CHECK_INTERVAL = 30000; // 30 seconds

/**
 * Check for confirmed transactions and update fill status
 */
async function checkAndUpdateFillTransactions() {
  // First check for expired fills
  checkAndUpdateExpiredFills();
  
  console.log('Checking pending transactions for selling order fills...');
  
  // Get all pending transactions
  for (const tx of pendingTransactions) {
    // Only process transactions related to selling order fills
    if (tx.metadata?.type !== 'fill_selling_order') {
      continue;
    }
    
    const orderId = tx.metadata.orderId;
    const fillId = tx.metadata.fillId;
    
    if (!orderId || !fillId) {
      console.warn(`Transaction ${tx.id} is missing orderId or fillId`);
      continue;
    }
    
    // Get the fill
    const fill = getFillById(fillId);
    
    if (!fill) {
      console.warn(`Fill ${fillId} not found for transaction ${tx.id}`);
      continue;
    }
    
    console.log(`Processing fill transaction ${tx.id} for order ${orderId}, fill ${fillId}`);
    
    // If transaction is confirmed or completed
    if (['confirmed', 'completed'].includes(tx.status)) {
      console.log(`Fill transaction ${tx.id} is confirmed/completed`);
      
      // If transaction has a real hash, mark the fill as completed
      if (tx.hash) {
        console.log(`Completing fill ${fillId} with transaction hash ${tx.hash}`);
        
        // Mark the fill as completed and update the order
        const completedFill = completeFill(fillId, tx.hash);
        
        if (completedFill) {
          console.log(`Fill ${fillId} for order ${orderId} marked as completed`);
        } else {
          console.error(`Failed to complete fill ${fillId} for order ${orderId}`);
        }
      } else {
        // No hash available, but still update the fill status
        updateFillStatus(fillId, 'completed', {
          completedAt: Date.now()
        });
        console.log(`Fill ${fillId} for order ${orderId} marked as completed (no hash available)`);
      }
    }
    
    // If transaction is rejected or failed
    if (['rejected', 'failed'].includes(tx.status)) {
      console.log(`Fill transaction ${tx.id} is rejected/failed`);
      
      // Update fill status
      updateFillStatus(fillId, 'failed', {
        error: 'Transaction failed or was rejected'
      });
      console.log(`Fill ${fillId} for order ${orderId} marked as failed due to failed transaction`);
    }
  }
}

/**
 * Start the token selling order filler relay service
 */
export function startTokenSellingOrderFillerRelay() {
  console.log('Starting token selling order filler relay service...');
  
  // Run immediately on startup
  checkAndUpdateFillTransactions().catch(err => {
    console.error('Error in token selling order filler relay:', err);
  });
  
  // Then run periodically
  const intervalId = setInterval(() => {
    checkAndUpdateFillTransactions().catch(err => {
      console.error('Error in token selling order filler relay:', err);
    });
  }, CHECK_INTERVAL);
  
  // Return a function to stop the relay if needed
  return () => {
    console.log('Stopping token selling order filler relay service...');
    clearInterval(intervalId);
  };
}

// Add a function to manually trigger the relay check (useful for testing)
export async function manuallyCheckFillTransactions() {
  console.log('Manually checking token selling order fill transactions...');
  await checkAndUpdateFillTransactions();
  console.log('Manual check completed');
} 