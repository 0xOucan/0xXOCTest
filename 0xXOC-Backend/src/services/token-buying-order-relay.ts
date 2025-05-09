import { 
  buyingOrders, 
  updateBuyingOrderStatus,
  checkAndUpdateExpiredOrders
} from '../action-providers/token-buying-order/utils';

// Interval for checking order status (milliseconds)
const CHECK_INTERVAL = 60000; // 60 seconds

/**
 * Check for orders that need updates
 */
function checkAndUpdateBuyingOrders() {
  // First check for expired orders
  checkAndUpdateExpiredOrders();
  
  // Get all active orders
  const activeOrders = Array.from(buyingOrders.values()).filter(
    order => order.status === 'active'
  );
  
  if (activeOrders.length === 0) {
    return;
  }
  
  console.log(`Monitoring ${activeOrders.length} active buying orders...`);
  
  // In a real implementation, this would check for matching selling orders
  // or notify potential sellers about available buying orders
}

/**
 * Start the token buying order relay service
 */
export function startTokenBuyingOrderRelay() {
  console.log('Starting token buying order relay service...');
  
  // Run immediately on startup
  checkAndUpdateBuyingOrders();
  
  // Then run periodically
  const intervalId = setInterval(() => {
    checkAndUpdateBuyingOrders();
  }, CHECK_INTERVAL);
  
  // Return a function to stop the relay if needed
  return () => {
    console.log('Stopping token buying order relay service...');
    clearInterval(intervalId);
  };
}

// Add a function to manually trigger the relay check (useful for testing)
export function manuallyCheckBuyingOrders() {
  console.log('Manually checking token buying orders...');
  checkAndUpdateBuyingOrders();
  console.log('Manual check completed');
} 