import { z } from "zod";
import {
  ActionProvider,
  Network,
  CreateAction,
  EvmWalletProvider,
} from "@coinbase/agentkit";
import "reflect-metadata";
import {
  FillBuyingOrderSchema,
  CheckFilledOrderStatusSchema,
  RequestQRCodeDownloadSchema,
  ListFilledOrdersSchema,
} from "./schemas";
import { BASE_CHAIN_ID, BASESCAN_TX_URL, ERC20_ABI, ESCROW_WALLET_ADDRESS } from "./constants";
import {
  WrongNetworkError,
  OrderNotFoundError,
  OrderAlreadyFilledError,
  InsufficientBalanceError,
  TransactionFailedError,
  OrderExpiredError,
  OrderCancelledError,
  InvalidOrderStatusError,
  SameUserError,
} from "./errors";
import {
  validateOrderForFilling,
  markOrderAsFilled,
  getFillerTransactions,
  getFillerTransactionByOrderId,
  generateQRCodeDownloadUrl,
  markQRCodeAsDownloaded,
} from "./utils";
import {
  getBuyingOrderById,
} from "../token-buying-order/utils";

/**
 * Helper function to shorten an address for display
 */
function shortenAddress(address: string): string {
  if (!address || address.length < 10) {
    return address || '';
  }
  
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

/**
 * TokenBuyingOrderFillerActionProvider provides actions for filling token buying orders
 * by transferring the requested tokens to the escrow wallet
 */
export class TokenBuyingOrderFillerActionProvider extends ActionProvider<EvmWalletProvider> {
  constructor() {
    super("token-buying-order-filler", []);
  }

  /**
   * Check if the provider supports the given network
   */
  supportsNetwork(network: Network): boolean {
    return true; // Support all networks for now
  }

  /**
   * Verify that the wallet is connected to the Base network
   */
  private async checkNetwork(walletProvider: EvmWalletProvider): Promise<void> {
    const network = await walletProvider.getNetwork();
    
    // Convert chainId to number for comparison with BASE_CHAIN_ID
    const chainIdStr = network.chainId?.toString() || '';
    const chainId = parseInt(chainIdStr, 10);
    
    if (isNaN(chainId) || chainId !== BASE_CHAIN_ID) {
      throw new WrongNetworkError(chainIdStr || 'unknown', 'Base');
    }
  }

  /**
   * Fill a token buying order
   */
  @CreateAction({
    name: "fill_buying_order",
    description: "Fill a buying order by transferring tokens to the escrow wallet",
    schema: FillBuyingOrderSchema,
  })
  async fillBuyingOrder(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof FillBuyingOrderSchema>
  ): Promise<string> {
    try {
      // Check network
      await this.checkNetwork(walletProvider);
      
      const { orderId } = args;
      const walletAddress = await walletProvider.getAddress();
      
      // Validate the order for filling
      const validation = validateOrderForFilling(orderId, walletAddress);
      
      if (!validation.valid) {
        if (validation.errorCode === 'ORDER_NOT_FOUND') {
          throw new OrderNotFoundError(orderId);
        } else if (validation.errorCode === 'ALREADY_FILLED') {
          throw new OrderAlreadyFilledError(orderId);
        } else if (validation.errorCode === 'EXPIRED_ORDER') {
          throw new OrderExpiredError(orderId, validation.order.expiresAt);
        } else if (validation.errorCode === 'CANCELLED_ORDER') {
          throw new OrderCancelledError(orderId);
        } else if (validation.errorCode === 'INVALID_ORDER_STATUS') {
          throw new InvalidOrderStatusError(orderId, validation.order.status);
        } else if (validation.errorCode === 'SAME_USER') {
          throw new SameUserError(orderId);
        } else {
          throw new Error(validation.errorMessage || 'Order validation failed');
        }
      }
      
      const order = validation.order;
      
      // Import from transaction utils
      const { createPendingTransaction } = await import('../../utils/transaction-utils');
      const { SUPPORTED_TOKENS } = await import('../token-buying-order/constants');
      
      try {
        // Skip balance check for simplicity - the wallet extension will handle this
        // and reject if there's insufficient balance
        console.log(`Creating transaction for ${order.tokenAmount} ${order.token} transfer to escrow wallet`);
        
        // Import modules needed for ERC20 transfer
        const { encodeFunctionData, parseUnits } = await import('viem');
        
        // Get token details
        const mappedToken = order.token === 'MXNe' ? 'MXNE' : order.token;
        const tokenInfo = SUPPORTED_TOKENS[mappedToken as keyof typeof SUPPORTED_TOKENS];
        
        if (!tokenInfo) {
          throw new Error(`Unsupported token: ${order.token}`);
        }
        
        // Get token address and decimals
        const tokenAddress = tokenInfo.address;
        const tokenDecimals = tokenInfo.decimals;
        
        // Convert token amount to proper units
        const amountInWei = parseUnits(order.tokenAmount, tokenDecimals);
        
        // Create data for token transfer to escrow wallet
        const data = encodeFunctionData({
          abi: ERC20_ABI,
          functionName: "transfer",
          args: [ESCROW_WALLET_ADDRESS as `0x${string}`, amountInWei],
        });
        
        console.log(`🔶 Prepared transaction data: ${data.substring(0, 20)}...`);
        console.log(`🔶 Sending transaction to token ${tokenAddress}`);
        
        // Create transaction for token transfer
        const txId = createPendingTransaction(
          tokenAddress,  // Send to token contract, not escrow directly
          "0",           // No ETH value for token transfers
          data,          // Include the transfer function call
          walletAddress, // User wallet address
          "base",        // Specify chain
          { 
            type: "fill_buying_order",
            orderId: orderId,
            token: order.token,
            buyerId: order.buyer
          }
        );
        
        console.log(`✅ Transaction created with ID: ${txId}`);
        console.log(`⏳ Waiting for wallet signature from ${walletAddress}...`);
        
        // Create message to return to the user
        return `✅ Starting to fill buying order for ${order.tokenAmount} ${order.token}!

🔢 Order ID: ${orderId}
💰 MXN Amount: ${order.mxnAmount.toFixed(2)} MXN
🪙 Token: ${order.tokenAmount} ${order.token}
💱 Rate: ${(order.mxnAmount / parseFloat(order.tokenAmount)).toFixed(2)} MXN per ${order.token}
📇 OXXO Reference: ${order.referenceCode}

⏳ Status: PROCESSING (waiting for your transaction to be confirmed)

Your wallet will prompt you to sign a transaction to transfer ${order.tokenAmount} ${order.token} to the escrow wallet.
Once confirmed, the order will be marked as filled and you'll be able to download the OXXO Spin QR code.`;
      } catch (txError) {
        console.error('Error sending transaction:', txError);
        
        if (txError instanceof Error && txError.message.includes('user rejected')) {
          throw new TransactionFailedError('Transaction was rejected by the user.');
        }
        
        throw new TransactionFailedError(
          txError instanceof Error ? txError.message : String(txError)
        );
      }
    } catch (error) {
      console.error('Error filling buying order:', error);
      
      if (error instanceof WrongNetworkError ||
          error instanceof OrderNotFoundError ||
          error instanceof OrderAlreadyFilledError ||
          error instanceof InsufficientBalanceError ||
          error instanceof TransactionFailedError ||
          error instanceof OrderExpiredError ||
          error instanceof OrderCancelledError ||
          error instanceof InvalidOrderStatusError ||
          error instanceof SameUserError) {
        return `❌ ${error.message}`;
      } else if (error instanceof Error) {
        return `❌ Error filling buying order: ${error.message}`;
      }
      
      return `❌ An unknown error occurred while filling the buying order.`;
    }
  }

  /**
   * Check the status of a filled order
   */
  @CreateAction({
    name: "check_filled_order_status",
    description: "Check the status of a filled buying order",
    schema: CheckFilledOrderStatusSchema,
  })
  async checkFilledOrderStatus(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof CheckFilledOrderStatusSchema>
  ): Promise<string> {
    try {
      await this.checkNetwork(walletProvider);
      
      const { orderId } = args;
      const walletAddress = await walletProvider.getAddress();
      
      // Get the order
      const order = getBuyingOrderById(orderId);
      
      if (!order) {
        throw new OrderNotFoundError(orderId);
      }
      
      console.log(`Checking status for order ${orderId} - Current status: ${order.status}`);
      
      // Get the transaction record for this order
      const fillerTx = getFillerTransactionByOrderId(orderId);
      
      // If not filled or filled by someone else, return an error
      if (order.status !== 'filled') {
        return `❌ Order ${orderId} is not filled. Current status: ${order.status}`;
      }
      
      if (order.filledBy.toLowerCase() !== walletAddress.toLowerCase()) {
        return `❌ Order ${orderId} was not filled by you. It was filled by ${shortenAddress(order.filledBy)}`;
      }
      
      // Check for transaction confirmation
      const { pendingTransactions } = await import('../../utils/transaction-utils');
      
      // Find the transaction for this order
      const tx = pendingTransactions.find(
        tx => tx.metadata?.orderId === orderId && 
             tx.metadata?.type === 'fill_buying_order'
      );
      
      console.log(`Transaction status for order ${orderId}: ${tx ? tx.status : 'not found'}`);
      
      // If we have image file info, the QR code is ready for download
      if (order.imageFileId && order.imageFileExt) {
        console.log(`Order ${orderId} has QR code image ready for download: ${order.imageFileId}${order.imageFileExt}`);
        
        // Generate download URL
        const downloadUrl = generateQRCodeDownloadUrl(orderId);
        
        if (!downloadUrl) {
          return `❌ Error generating QR code download URL for order ${orderId}`;
        }
        
        return `✅ Order ${orderId} has been filled successfully!

💰 MXN Amount: ${order.mxnAmount.toFixed(2)} MXN
🪙 Token: ${order.tokenAmount} ${order.token}
💱 Rate: ${(order.mxnAmount / parseFloat(order.tokenAmount)).toFixed(2)} MXN per ${order.token}
📇 OXXO Reference: ${order.referenceCode}

🎟️ Your QR code is ready for download!

Click the button below to download the SPIN QR code image:

[Download QR Code](${downloadUrl})

Note: This QR code will allow you to receive the MXN amount at any OXXO store. Show it to the cashier to redeem your payment.`;
      }
      
      // If the transaction is confirmed but we don't have QR code, it's being processed
      if (tx && (tx.status === 'completed' || tx.status === 'signed')) {
        console.log(`Transaction confirmed for order ${orderId}, but QR code not yet available`);
        
        // Force the order to be marked as filled if not already
        if (order.status !== 'filled') {
          console.log(`Marking order ${orderId} as filled by ${walletAddress}`);
          markOrderAsFilled(orderId, walletAddress, tx.hash || tx.id);
        }
        
        return `✅ Order ${orderId} transaction has been confirmed!

💰 MXN Amount: ${order.mxnAmount.toFixed(2)} MXN
🪙 Token: ${order.tokenAmount} ${order.token}
💱 Rate: ${(order.mxnAmount / parseFloat(order.tokenAmount)).toFixed(2)} MXN per ${order.token}
📇 OXXO Reference: ${order.referenceCode}

⏳ QR code status: PROCESSING

Your QR code is being generated and will be available shortly.
Please check back in a few moments.

[Check Again]()`;
      }
      
      // Transaction is still pending
      return `⏳ Order ${orderId} transaction is being processed.

💰 MXN Amount: ${order.mxnAmount.toFixed(2)} MXN
🪙 Token: ${order.tokenAmount} ${order.token}
💱 Rate: ${(order.mxnAmount / parseFloat(order.tokenAmount)).toFixed(2)} MXN per ${order.token}
📇 OXXO Reference: ${order.referenceCode}

⏳ Transaction status: ${tx ? tx.status.toUpperCase() : 'PENDING'}

Please wait for the transaction to be confirmed on the blockchain.
This usually takes about 10-15 seconds on the Base network.

[Check Again]()`;
    } catch (error) {
      console.error('Error checking filled order status:', error);
      
      if (error instanceof OrderNotFoundError ||
          error instanceof WrongNetworkError) {
        return `❌ ${error.message}`;
      } else if (error instanceof Error) {
        return `❌ Error checking filled order status: ${error.message}`;
      }
      
      return `❌ An unknown error occurred while checking filled order status`;
    }
  }

  /**
   * Request to download QR code for a filled order
   */
  @CreateAction({
    name: "request_qr_code_download",
    description: "Request to download the QR code for a filled order",
    schema: RequestQRCodeDownloadSchema,
  })
  async requestQRCodeDownload(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof RequestQRCodeDownloadSchema>
  ): Promise<string> {
    try {
      // Check network
      await this.checkNetwork(walletProvider);
      
      const { orderId } = args;
      const walletAddress = await walletProvider.getAddress();
      
      // Get the order
      const order = getBuyingOrderById(orderId);
      
      if (!order) {
        throw new OrderNotFoundError(orderId);
      }
      
      // Check if the order is filled
      if (order.status !== 'filled') {
        return `❌ Order #${orderId} is not filled. Current status: ${order.status.toUpperCase()}`;
      }
      
      // Check if the filler is the one who filled the order
      if (order.filledBy && order.filledBy.toLowerCase() !== walletAddress.toLowerCase()) {
        return `❌ You are not authorized to download this QR code. Order was filled by: ${order.filledBy}`;
      }
      
      // Check if the order has an image
      if (!order.imageFileId || !order.imageFileExt) {
        return `❌ This order does not have an associated QR code image`;
      }
      
      // Generate QR code download URL
      const downloadUrl = generateQRCodeDownloadUrl(orderId);
      
      if (!downloadUrl) {
        return `❌ Failed to generate QR code download URL`;
      }
      
      // Mark the QR code as requested for download
      markQRCodeAsDownloaded(orderId);
      
      // Format the frontend URL that the user should visit
      const frontendUrl = `/marketplace/order/${orderId}/image-download?token=${encodeURIComponent(downloadUrl.split('imageId=')[1])}`;
      
      // Return the download URL to the user
      return `✅ QR Code download ready!

🔢 Order ID: ${orderId}
📱 Visit this URL in your browser to download the QR code:

${frontendUrl}

This link will expire in 5 minutes for security reasons.`;
    } catch (error) {
      console.error('Error requesting QR code download:', error);
      
      if (error instanceof WrongNetworkError ||
          error instanceof OrderNotFoundError) {
        return `❌ ${error.message}`;
      } else if (error instanceof Error) {
        return `❌ Error requesting QR code download: ${error.message}`;
      }
      
      return `❌ An unknown error occurred while requesting the QR code download.`;
    }
  }

  /**
   * List orders filled by the user
   */
  @CreateAction({
    name: "list_filled_orders",
    description: "List orders filled by the user",
    schema: ListFilledOrdersSchema,
  })
  async listFilledOrders(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof ListFilledOrdersSchema>
  ): Promise<string> {
    try {
      await this.checkNetwork(walletProvider);
      
      const { token, limit } = args;
      const walletAddress = await walletProvider.getAddress();
      
      // Get filler transactions
      const fillerTxs = getFillerTransactions(
        walletAddress,
        token as 'XOC' | 'MXNe' | 'USDC' | 'ALL',
        limit || 10
      );
      
      // Format response
      let response = `📋 **Filled Orders**\n\n`;
      response += `Found ${fillerTxs.length} order(s) filled by you${token !== 'ALL' ? ` for ${token}` : ''}.\n\n`;
      
      // Get the order details for each filled order to access reference code
      response += fillerTxs.map(tx => {
        const order = getBuyingOrderById(tx.orderId);
        const referenceCode = order?.referenceCode || 'Unknown';
        
        return `🔢 Order ID: ${tx.orderId}
💰 MXN Amount: ${tx.mxnAmount.toFixed(2)} MXN
🪙 Token: ${tx.tokenAmount} ${tx.token}
💱 Rate: ${(tx.mxnAmount / parseFloat(tx.tokenAmount)).toFixed(2)} MXN per ${tx.token}
📇 OXXO Reference: ${referenceCode}

`;
      }).join('');
      
      return response;
    } catch (error) {
      console.error('Error listing filled orders:', error);
      
      if (error instanceof WrongNetworkError) {
        return `❌ ${error.message}`;
      } else if (error instanceof Error) {
        return `❌ Error listing filled orders: ${error.message}`;
      }
      
      return `❌ An unknown error occurred while listing filled orders`;
    }
  }
}