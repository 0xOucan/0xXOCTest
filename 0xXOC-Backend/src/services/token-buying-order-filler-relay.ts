import { pendingTransactions } from '../utils/transaction-utils';
import { markOrderAsFilled } from '../action-providers/token-buying-order-filler/utils';
import { getBuyingOrderById, buyingOrders } from '../action-providers/token-buying-order/utils';
import { PendingTransaction } from '../utils/transaction-utils';
import { BuyingOrder } from '../action-providers/token-buying-order/schemas';

// Interval for checking transactions (milliseconds)
const CHECK_INTERVAL = 20000; // 20 seconds

/**
 * Check for fill transactions that need to be processed
 */
async function checkAndProcessFillTransactions() {
  // Get all fill buying order transactions - include all statuses to monitor progress
  const fillTransactions = pendingTransactions.filter(
    tx => tx.metadata?.type === 'fill_buying_order'
  );
  
  if (fillTransactions.length > 0) {
    console.log(`Monitoring ${fillTransactions.length} token fill transactions...`);
    console.log(`Transaction statuses: ${fillTransactions.map(tx => `${tx.id}: ${tx.status}`).join(', ')}`);
    
    for (const tx of fillTransactions) {
      try {
        // Get the order ID from the transaction metadata
        const orderId = tx.metadata?.orderId;
        
        if (!orderId) {
          console.error(`Fill transaction ${tx.id} has no order ID in metadata`);
          continue;
        }
        
        // Get the filler address from transaction metadata
        const fillerAddress = tx.metadata?.walletAddress;
        
        if (!fillerAddress) {
          console.error(`Fill transaction ${tx.id} has no wallet address in metadata`);
          continue;
        }
        
        // Get the current order
        const order = getBuyingOrderById(orderId);
        if (!order) {
          console.error(`Order ${orderId} not found for transaction ${tx.id}`);
          continue;
        }
        
        console.log(`Processing fill transaction ${tx.id} for order ${orderId} - Status: ${tx.status}, Order status: ${order.status}`);
        
        // If transaction is confirmed/completed and order not yet filled, mark it as filled
        if (['confirmed', 'completed', 'signed'].includes(tx.status) && order.status !== 'filled') {
          console.log(`Fill transaction ${tx.id} for order ${orderId} is ${tx.status} - marking as filled`);
          
          // Mark the order as filled
          const success = markOrderAsFilled(orderId, fillerAddress, tx.hash || tx.id);
          
          if (success) {
            console.log(`Order ${orderId} marked as filled by ${fillerAddress}`);
            
            // Check if order has image available for download
            const updatedOrder = getBuyingOrderById(orderId);
            if (updatedOrder && updatedOrder.imageFileId && updatedOrder.imageFileExt) {
              console.log(`Order ${orderId} has image available for download: ${updatedOrder.imageFileId}${updatedOrder.imageFileExt}`);
            }
          } else {
            console.error(`Failed to mark order ${orderId} as filled`);
          }
        } else if (order.status === 'filled') {
          // If order is already filled, log this
          console.log(`Order ${orderId} already filled - transaction status: ${tx.status}`);
          
          // Ensure the transaction status is marked as completed if the order is filled
          if (tx.status !== 'completed' && tx.hash) {
            console.log(`Updating transaction ${tx.id} to completed status`);
            const { updateTransactionStatus } = await import('../utils/transaction-utils');
            updateTransactionStatus(tx.id, 'completed', tx.hash);
          }
        }
        
        // If transaction is rejected or failed, log the error
        if (['rejected', 'failed'].includes(tx.status)) {
          console.log(`Fill transaction ${tx.id} for order ${orderId} has failed or been rejected`);
          
          // We don't need to do anything with the order, as it remains in active status
        }
      } catch (error) {
        console.error(`Error processing fill transaction ${tx.id}:`, error);
      }
    }
  } else {
    // No fill transactions - check if there are any orders that should have associated transactions
    const filledOrders = Array.from(buyingOrders.values())
      .filter(order => order.status === 'filled' && order.filledBy);
    
    if (filledOrders.length > 0) {
      console.log(`Found ${filledOrders.length} filled orders - checking QR code download status`);
      
      for (const order of filledOrders) {
        if (order.imageFileId && order.imageFileExt && !order.downloadStarted) {
          console.log(`Order ${order.orderId} has image available for download: ${order.imageFileId}${order.imageFileExt}`);
        }
      }
    }
  }
}

/**
 * Start the token buying order filler relay service
 */
export function startTokenBuyingOrderFillerRelay() {
  console.log('Starting token buying order filler relay service...');
  
  // Run immediately on startup
  checkAndProcessFillTransactions().catch(err => {
    console.error('Error in token buying order filler relay:', err);
  });
  
  // Then run periodically
  const intervalId = setInterval(() => {
    checkAndProcessFillTransactions().catch(err => {
      console.error('Error in token buying order filler relay:', err);
    });
  }, CHECK_INTERVAL);
  
  // Return a function to stop the relay if needed
  return () => {
    console.log('Stopping token buying order filler relay service...');
    clearInterval(intervalId);
  };
}

// Add a function to manually trigger the relay check (useful for testing)
export async function manuallyCheckFillTransactions() {
  console.log('Manually checking token buying order fill transactions...');
  await checkAndProcessFillTransactions();
  console.log('Manual check completed');
} 