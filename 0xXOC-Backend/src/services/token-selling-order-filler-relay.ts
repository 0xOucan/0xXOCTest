import { pendingTransactions, updateTransactionStatus, createPendingTransaction } from '../utils/transaction-utils';
import { 
  sellingOrderFills,
  updateFillStatus,
  getFillById,
  completeFill,
  checkAndUpdateExpiredFills
} from '../action-providers/token-selling-order-filler/utils';
import { 
  getSellingOrderById, 
  updateSellingOrderStatus 
} from '../action-providers/token-selling-order/utils';
import {
  ESCROW_WALLET_ADDRESS,
  XOC_TOKEN_ADDRESS, 
  MXNE_TOKEN_ADDRESS, 
  USDC_TOKEN_ADDRESS
} from '../action-providers/token-selling-order-filler/constants';
import { base } from 'viem/chains';
import { createWalletClient, http, parseUnits, encodeFunctionData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// Interval for checking transaction status (milliseconds)
const CHECK_INTERVAL = 30000; // 30 seconds

// ERC20 ABI for token transfer
const ERC20_TRANSFER_ABI = [
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
];

/**
 * Get token address by symbol
 */
function getTokenAddress(tokenSymbol: string): string {
  switch (tokenSymbol) {
    case 'XOC':
      return XOC_TOKEN_ADDRESS;
    case 'MXNe':
      return MXNE_TOKEN_ADDRESS;
    case 'USDC':
      return USDC_TOKEN_ADDRESS;
    default:
      throw new Error(`Unknown token symbol: ${tokenSymbol}`);
  }
}

/**
 * Get escrow wallet client for direct transactions
 */
function getEscrowWalletClient() {
  // Get the escrow wallet private key from environment
  const escrowWalletPrivateKey = process.env.ESCROW_WALLET_PRIVATE_KEY || process.env.WALLET_PRIVATE_KEY;
  
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
 * Process token transfer to filler
 */
async function processTokenTransferToFiller(fill: any) {
  // Get order details
  const order = getSellingOrderById(fill.orderId);
  
  if (!order) {
    console.error(`Order ${fill.orderId} not found when processing token transfer to filler`);
    return;
  }
  
  // Skip if order is not filled
  if (order.status !== 'filled') {
    console.log(`Order ${fill.orderId} is not filled yet, updating status to filled`);
    
    // Update order status to filled
    updateSellingOrderStatus(fill.orderId, 'filled', {
      filledAt: Date.now(),
      filledBy: fill.filler,
      filledTxHash: fill.onChainTxHash || fill.txHash
    });
    
    // Get updated order to confirm
    const updatedOrder = getSellingOrderById(fill.orderId);
    if (updatedOrder?.status !== 'filled') {
      console.error(`Failed to update order ${fill.orderId} to filled status, cannot proceed with token transfer`);
      return;
    }
  }
  
  // Skip if fill already has a transfer transaction hash (meaning it's already completed)
  if (fill.transferTxHash) {
    console.log(`Fill ${fill.fillId} already has a transfer transaction: ${fill.transferTxHash}`);
    return;
  }
  
  try {
    console.log(`Processing token transfer for fill ${fill.fillId}: ${order.amount} ${order.token} to ${fill.filler}`);
    
    // Get token address
    const tokenAddress = getTokenAddress(order.token);
    
    // Get token decimals (assuming 18 for XOC, 6 for others)
    const tokenDecimals = order.token === 'XOC' ? 18 : 6;
    
    // Convert amount to wei/smallest unit
    const amountInSmallestUnit = parseUnits(order.amount, tokenDecimals);
    
    // Update fill status to indicate the transfer is in progress
    updateFillStatus(fill.fillId, fill.status, {
      escrowTransferInitiated: true,
      escrowTransferTimestamp: Date.now()
    });
    
    try {
      // Get escrow wallet client for direct transaction execution
      const walletClient = getEscrowWalletClient();
      
      console.log(`Executing token transfer from escrow wallet for ${order.amount} ${order.token} to ${fill.filler}`);
      
      // Prepare transaction data
      const data = encodeFunctionData({
        abi: ERC20_TRANSFER_ABI,
        functionName: "transfer",
        args: [fill.filler as `0x${string}`, amountInSmallestUnit]
      });
      
      // Execute the transaction directly
      const txHash = await walletClient.sendTransaction({
        to: tokenAddress as `0x${string}`,
        data,
        value: BigInt(0),
      });
      
      console.log(`Token transfer transaction sent with hash: ${txHash}`);
      
      // Update fill with transfer transaction hash
      updateFillStatus(fill.fillId, fill.status, {
        transferTxHash: txHash,
        transferCompleted: true,
        transferCompletedTimestamp: Date.now()
      });
      
      return txHash;
    } catch (txError) {
      // Log the error
      console.error(`Error executing token transfer for fill ${fill.fillId}:`, txError);
      
      // Update fill with error information
      updateFillStatus(fill.fillId, fill.status, {
        transferError: txError instanceof Error ? txError.message : 'Unknown error executing token transfer'
      });
      
      return null;
    }
  } catch (error) {
    console.error(`Error processing token transfer for fill ${fill.fillId}:`, error);
    
    // Update fill with error info
    updateFillStatus(fill.fillId, fill.status, {
      transferError: error instanceof Error ? error.message : 'Unknown error processing token transfer'
    });
    
    return null;
  }
}

/**
 * Check for confirmed transactions and update fill status
 */
async function checkAndUpdateFillTransactions() {
  // First check for expired fills
  await checkAndUpdateExpiredFills();
  
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
      
      // Get the current order
      const order = getSellingOrderById(orderId);
      if (!order) {
        console.warn(`Order ${orderId} not found during fill processing`);
        continue;
      }
      
      // If transaction has a real hash, mark the fill as completed
      if (tx.hash) {
        console.log(`Completing fill ${fillId} with transaction hash ${tx.hash}`);
        
        // Mark the fill as completed and update the order
        const completedFill = completeFill(fillId, tx.hash);
        
        if (completedFill) {
          console.log(`Fill ${fillId} for order ${orderId} marked as completed`);
          
          // Double-check the order status and update if needed
          const updatedOrder = getSellingOrderById(orderId);
          if (updatedOrder && updatedOrder.status !== 'filled') {
            console.log(`Order ${orderId} status is still ${updatedOrder.status}, explicitly updating to filled`);
            
            // Explicitly update order status to filled
            updateSellingOrderStatus(orderId, 'filled', {
              filledAt: Date.now(),
              filledBy: fill.filler,
              filledTxHash: tx.hash
            });
          }
          
          // Now process token transfer to filler
          await processTokenTransferToFiller(completedFill);
        } else {
          console.error(`Failed to complete fill ${fillId} for order ${orderId}`);
        }
      } else {
        // No hash available, but still update the fill status
        const updatedFill = updateFillStatus(fillId, 'completed', {
          completedAt: Date.now()
        });
        console.log(`Fill ${fillId} for order ${orderId} marked as completed (no hash available)`);
        
        // Explicitly update order status to filled
        updateSellingOrderStatus(orderId, 'filled', {
          filledAt: Date.now(),
          filledBy: fill.filler
        });
        
        // Process token transfer to filler
        if (updatedFill) {
          await processTokenTransferToFiller(updatedFill);
        }
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

// Add a function to manually trigger token transfers for completed fills
export async function processCompletedFillsTokenTransfers() {
  console.log('Checking for completed fills without token transfers...');
  
  // Get all completed fills from memory
  const completedFills = Array.from(sellingOrderFills.values())
    .filter(fill => fill.status === 'completed' && !fill.transferTxHash);
  
  if (completedFills.length === 0) {
    console.log('No completed fills without token transfers found');
    return;
  }
  
  console.log(`Found ${completedFills.length} completed fills without token transfers, processing...`);
  
  // Process each fill
  for (const fill of completedFills) {
    console.log(`Processing token transfer for completed fill ${fill.fillId}`);
    await processTokenTransferToFiller(fill);
  }
}

// Add a function to manually trigger the relay check (useful for testing)
export async function manuallyCheckFillTransactions() {
  console.log('Manually checking token selling order fill transactions...');
  await checkAndUpdateFillTransactions();
  await processCompletedFillsTokenTransfers();
  console.log('Manual check completed');
} 