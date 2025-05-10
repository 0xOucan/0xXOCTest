import { createPublicClient, http, formatUnits } from 'viem';
import { base } from 'viem/chains';
import { pendingTransactions } from '../utils/transaction-utils';
import { 
  buyingOrders, 
  updateBuyingOrderStatus,
  checkAndUpdateExpiredOrders
} from '../action-providers/token-buying-order/utils';

// Interval for checking order status (milliseconds)
const CHECK_INTERVAL = 30000; // 30 seconds

// Create base client
const baseClient = createPublicClient({
  chain: base,
  transport: http(base.rpcUrls.default.http[0]),
});

/**
 * Check for orders that need updates
 */
async function checkAndUpdateBuyingOrders() {
  // First check for expired orders
  checkAndUpdateExpiredOrders();
  
  // Get all pending orders
  const pendingOrders = Array.from(buyingOrders.values()).filter(
    order => order.status === 'pending'
  );
  
  if (pendingOrders.length > 0) {
    console.log(`Checking ${pendingOrders.length} pending buying orders for confirmations...`);
    
    for (const order of pendingOrders) {
      try {
        // Find if the transaction has been confirmed
        const pendingTx = pendingTransactions.find(tx => tx.id === order.txHash);
        
        // If transaction is confirmed or completed, update order status
        if (pendingTx && (['confirmed', 'completed'].includes(pendingTx.status))) {
          console.log(`Order ${order.orderId} transaction confirmed: ${pendingTx.hash}`);
          
          // If transaction has a real hash, use it to update the order
          if (pendingTx.hash) {
            updateBuyingOrderStatus(order.orderId, 'active' as const, pendingTx.hash);
            console.log(`Updated order ${order.orderId} to active status with hash ${pendingTx.hash}`);
          } else {
            updateBuyingOrderStatus(order.orderId, 'active' as const);
            console.log(`Updated order ${order.orderId} to active status (no hash available)`);
          }
        }
        
        // If transaction is rejected or failed, update order status
        if (pendingTx && (['rejected', 'failed'].includes(pendingTx.status))) {
          console.log(`Order ${order.orderId} transaction failed or rejected`);
          updateBuyingOrderStatus(order.orderId, 'cancelled' as const);
          console.log(`Updated order ${order.orderId} to cancelled status due to failed transaction`);
        }
      } catch (error) {
        console.error(`Error processing buying order ${order.orderId}:`, error);
      }
    }
  }
  
  // Get all active orders
  const activeOrders = Array.from(buyingOrders.values()).filter(
    order => order.status === 'active'
  );
  
  if (activeOrders.length > 0) {
    console.log(`Monitoring ${activeOrders.length} active buying orders...`);
    
    // In a real implementation, this would check for matching selling orders
    // or notify potential sellers about available buying orders
  }
}

/**
 * Start the token buying order relay service
 */
export function startTokenBuyingOrderRelay() {
  console.log('Starting token buying order relay service...');
  
  // Run immediately on startup
  checkAndUpdateBuyingOrders().catch(err => {
    console.error('Error in token buying order relay:', err);
  });
  
  // Then run periodically
  const intervalId = setInterval(() => {
    checkAndUpdateBuyingOrders().catch(err => {
      console.error('Error in token buying order relay:', err);
    });
  }, CHECK_INTERVAL);
  
  // Return a function to stop the relay if needed
  return () => {
    console.log('Stopping token buying order relay service...');
    clearInterval(intervalId);
  };
}

// Add a function to manually trigger the relay check (useful for testing)
export async function manuallyCheckBuyingOrders() {
  console.log('Manually checking token buying orders...');
  await checkAndUpdateBuyingOrders();
  console.log('Manual check completed');
} 