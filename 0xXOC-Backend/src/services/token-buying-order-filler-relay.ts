import { pendingTransactions } from '../utils/transaction-utils';
import { markOrderAsFilled } from '../action-providers/token-buying-order-filler/utils';
import { getBuyingOrderById, buyingOrders } from '../action-providers/token-buying-order/utils';
import { PendingTransaction } from '../utils/transaction-utils';
import { BuyingOrder } from '../action-providers/token-buying-order/schemas';
import { createWalletClient, http, createPublicClient, parseUnits, formatUnits } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// Interval for checking transactions (milliseconds)
const CHECK_INTERVAL = 20000; // 20 seconds

/**
 * Get the escrow wallet client for token transfers
 */
function getEscrowWalletClient() {
  // Get the escrow wallet private key from environment
  const escrowWalletPrivateKey = process.env.ESCROW_WALLET_PRIVATE_KEY || process.env.WALLET_PRIVATE_KEY || process.env.ESCROW_PRIVATE_KEY;
  
  if (!escrowWalletPrivateKey) {
    throw new Error('ESCROW_WALLET_PRIVATE_KEY not found in environment variables');
  }
  
  // Check if private key already starts with 0x
  const privateKey = escrowWalletPrivateKey.startsWith('0x') 
    ? escrowWalletPrivateKey 
    : `0x${escrowWalletPrivateKey}`;
  
  // Create an account from the private key
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  
  // Create and return a wallet client
  return createWalletClient({
    account,
    chain: base,
    transport: http(base.rpcUrls.default.http[0]),
  });
}

/**
 * Get token address by symbol
 */
function getTokenAddress(tokenSymbol: string): string {
  switch (tokenSymbol) {
    case 'XOC':
      return '0xa411c9Aa00E020e4f88Bc19996d29c5B7ADB4ACf';
    case 'MXNe':
      return '0x269caE7Dc59803e5C596c95756faEeBb6030E0aF';
    case 'USDC':
      return '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
    default:
      throw new Error(`Unknown token symbol: ${tokenSymbol}`);
  }
}

/**
 * Get token decimals by symbol
 */
function getTokenDecimals(tokenSymbol: string): number {
  switch (tokenSymbol) {
    case 'XOC':
      return 18;
    case 'MXNe':
      return 6;
    case 'USDC':
      return 6;
    default:
      throw new Error(`Unknown token symbol: ${tokenSymbol}`);
  }
}

/**
 * Process token transfers from escrow wallet to buyers for completed orders
 */
async function processCompletedOrdersTokenTransfers() {
  console.log('Processing token transfers for completed buying orders...');
  
  // Get all filled orders
  const filledOrders = Array.from(buyingOrders.values()).filter(order => 
    order.status === 'filled' && 
    order.filledBy && 
    order.qrCodeDownloaded === true && 
    !order.transferTxHash // No transfer has been made yet
  );
  
  if (filledOrders.length === 0) {
    console.log('No filled orders waiting for token transfer');
    return;
  }
  
  console.log(`Found ${filledOrders.length} filled orders waiting for token transfer`);
  
  const escrowWalletClient = getEscrowWalletClient();
  const baseClient = createPublicClient({
    chain: base,
    transport: http(base.rpcUrls.default.http[0]),
  });
  
  // Import ERC20 ABI from constants
  const { ERC20_ABI } = await import('../action-providers/token-buying-order-filler/constants');
  
  for (const order of filledOrders) {
    try {
      console.log(`Processing token transfer for order ${order.orderId}`);
      
      // Get token details
      const tokenAddress = getTokenAddress(order.token);
      const tokenDecimals = getTokenDecimals(order.token);
      
      // Validate token amount
      if (isNaN(parseFloat(order.tokenAmount)) || parseFloat(order.tokenAmount) <= 0) {
        console.error(`Invalid token amount for order ${order.orderId}: ${order.tokenAmount}`);
        continue;
      }
      
      // Convert token amount to wei
      const amountInWei = parseUnits(order.tokenAmount, tokenDecimals);
      
      // Check escrow wallet balance
      const escrowBalance = await baseClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [escrowWalletClient.account.address],
      });
      
      if ((escrowBalance as bigint) < amountInWei) {
        console.error(`Insufficient balance in escrow wallet for order ${order.orderId}. Required: ${amountInWei}, Available: ${escrowBalance}`);
        
        // Update order with error
        const { updateBuyingOrderStatus } = await import('../action-providers/token-buying-order/utils');
        updateBuyingOrderStatus(order.orderId, 'filled', {
          transferError: `Insufficient balance in escrow wallet. Required: ${formatUnits(amountInWei, tokenDecimals)} ${order.token}, Available: ${formatUnits(escrowBalance as bigint, tokenDecimals)} ${order.token}`
        });
        
        continue;
      }
      
      // Encode the transfer function call
      const { encodeFunctionData } = await import('viem');
      
      // Transfer tokens from escrow wallet to the buyer (order creator)
      console.log(`Transferring ${order.tokenAmount} ${order.token} from escrow wallet to order creator (buyer) ${order.buyer}`);
      
      const data = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [order.buyer as `0x${string}`, amountInWei]
      });
      
      // Send transaction
      const txHash = await escrowWalletClient.writeContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [order.buyer as `0x${string}`, amountInWei]
      });
      
      console.log(`✅ Token transfer transaction sent: ${txHash}`);
      
      // Update order with transaction hash
      const { updateBuyingOrderStatus } = await import('../action-providers/token-buying-order/utils');
      updateBuyingOrderStatus(order.orderId, 'filled', {
        transferTxHash: txHash,
        transferTimestamp: Date.now()
      });
      
      console.log(`Updated order ${order.orderId} with transfer transaction hash ${txHash}`);
    } catch (error) {
      console.error(`Error processing token transfer for order ${order.orderId}:`, error);
      
      // Create a more detailed error message
      let errorMessage = error instanceof Error ? error.message : String(error);
      if (error instanceof Error && error.stack) {
        console.error('Error stack:', error.stack);
      }
      
      console.error(`Failed to transfer ${order.tokenAmount} ${order.token} to buyer ${order.buyer} for order ${order.orderId}`);
      
      try {
        // Update order with error
        const { updateBuyingOrderStatus } = await import('../action-providers/token-buying-order/utils');
        updateBuyingOrderStatus(order.orderId, 'filled', {
          transferError: errorMessage
        });
        console.log(`Updated order ${order.orderId} with transfer error: ${errorMessage}`);
      } catch (updateError) {
        console.error(`Additional error when updating order status:`, updateError);
      }
    }
  }
}

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
  
  // Process token transfers for completed orders
  await processCompletedOrdersTokenTransfers();
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

// Add a function to manually process token transfers (useful for testing)
export async function processTokenTransfers() {
  console.log('Manually processing token transfers for completed orders...');
  await processCompletedOrdersTokenTransfers();
  console.log('Manual token transfer processing completed');
}

// Add a function to manually trigger the relay check (useful for testing)
export async function manuallyCheckFillTransactions() {
  console.log('Manually checking token buying order fill transactions...');
  await checkAndProcessFillTransactions();
  console.log('Manual check completed');
} 