import { createPublicClient, http, formatUnits } from 'viem';
import { base } from 'viem/chains';
import { pendingTransactions } from '../utils/transaction-utils';
import { 
  sellingOrders, 
  updateSellingOrderStatus,
  checkAndUpdateExpiredOrders
} from '../action-providers/token-selling-order/utils';
import { ERC20_ABI } from '../action-providers/token-selling-order/constants';

// Interval for checking transaction status (milliseconds)
const CHECK_INTERVAL = 30000; // 30 seconds

// Create base client
const baseClient = createPublicClient({
  chain: base,
  transport: http(base.rpcUrls.default.http[0]),
});

/**
 * Check for confirmed transactions and update order status
 */
async function checkAndUpdateOrderTransactions() {
  // First check for expired orders
  checkAndUpdateExpiredOrders();
  
  // Get all pending orders
  const pendingOrders = Array.from(sellingOrders.values()).filter(
    order => order.status === 'pending'
  );
  
  if (pendingOrders.length === 0) {
    return;
  }
  
  console.log(`Checking ${pendingOrders.length} pending orders for confirmations...`);
  
  for (const order of pendingOrders) {
    try {
      // Find if the transaction has been confirmed
      const pendingTx = pendingTransactions.find(tx => tx.id === order.txHash);
      
      // If transaction is confirmed or completed, update order status
      if (pendingTx && (['confirmed', 'completed'].includes(pendingTx.status))) {
        console.log(`Order ${order.orderId} transaction confirmed: ${pendingTx.hash}`);
        
        // If transaction has a real hash, use it to update the order
        if (pendingTx.hash) {
          updateSellingOrderStatus(order.orderId, 'active', {
            txHash: pendingTx.hash
          });
          console.log(`Updated order ${order.orderId} to active status`);
        } else {
          updateSellingOrderStatus(order.orderId, 'active');
          console.log(`Updated order ${order.orderId} to active status (no hash available)`);
        }
      }
      
      // If transaction is rejected or failed, update order status
      if (pendingTx && (['rejected', 'failed'].includes(pendingTx.status))) {
        console.log(`Order ${order.orderId} transaction failed or rejected`);
        updateSellingOrderStatus(order.orderId, 'cancelled', {
          memo: order.memo ? `${order.memo} - Transaction failed` : 'Transaction failed'
        });
        console.log(`Updated order ${order.orderId} to cancelled status due to failed transaction`);
      }
    } catch (error) {
      console.error(`Error processing order ${order.orderId}:`, error);
    }
  }
}

/**
 * Start the token selling order relay service
 */
export function startTokenSellingOrderRelay() {
  console.log('Starting token selling order relay service...');
  
  // Run immediately on startup
  checkAndUpdateOrderTransactions().catch(err => {
    console.error('Error in token selling order relay:', err);
  });
  
  // Then run periodically
  const intervalId = setInterval(() => {
    checkAndUpdateOrderTransactions().catch(err => {
      console.error('Error in token selling order relay:', err);
    });
  }, CHECK_INTERVAL);
  
  // Return a function to stop the relay if needed
  return () => {
    console.log('Stopping token selling order relay service...');
    clearInterval(intervalId);
  };
}

// Add a function to manually trigger the relay check (useful for testing)
export async function manuallyCheckOrderTransactions() {
  console.log('Manually checking token selling order transactions...');
  await checkAndUpdateOrderTransactions();
  console.log('Manual check completed');
} 