import { z } from "zod";
import {
  ActionProvider,
  Network,
  CreateAction,
  EvmWalletProvider,
} from "@coinbase/agentkit";
import "reflect-metadata";
import {
  CreateBuyingOrderSchema,
  CancelBuyingOrderSchema,
  GetBuyingOrderSchema,
  ListBuyingOrdersSchema,
  DecryptQRCodeSchema,
  BuyingOrder,
} from "./schemas";
import {
  BASE_CHAIN_ID,
  MIN_ORDER_AMOUNT_MXN,
  MAX_ORDER_AMOUNT_MXN,
} from "./constants";
import {
  WrongNetworkError,
  InvalidAmountError,
  OrderNotFoundError,
  InvalidTokenError,
  UnauthorizedError,
  OrderAlreadyCancelledError,
  InvalidQRCodeError,
  QRCodeExpiredError,
  QRCodeAlreadyUsedError,
  InvalidQRAmountError,
} from "./errors";
import {
  parseOxxoSpinQRData,
  createOrderId,
  storeBuyingOrder,
  getBuyingOrderById,
  updateBuyingOrderStatus,
  getBuyingOrders,
  checkAndUpdateExpiredOrders,
  formatBuyingOrderForDisplay,
  calculateOrderExpirationTime,
  getTransactionTextLink,
} from "./utils";
import { 
  createSecureDataBundle, 
  decryptSecureDataBundle,
  decryptSecureDataFromBlockchain
} from "../../utils/encryption-utils";

/**
 * TokenBuyingOrderActionProvider provides actions for creating and managing token buying orders
 * on the Base network, focusing on XOC, MXNe, and USDC tokens using OXXO Spin QR codes.
 */
export class TokenBuyingOrderActionProvider extends ActionProvider<EvmWalletProvider> {
  constructor() {
    super("token-buying-order", []);
  }

  /**
   * Verify that the wallet is connected to the Base network
   */
  private async checkNetwork(walletProvider: EvmWalletProvider): Promise<void> {
    const network = await walletProvider.getNetwork();
    
    if (network.chainId !== BASE_CHAIN_ID) {
      throw new WrongNetworkError(network.chainId || 'unknown', 'Base');
    }
  }

  /**
   * Create a token buying order using an OXXO Spin QR code
   */
  @CreateAction({
    name: "create_buying_order",
    description: "Create a buying order for XOC, MXNe, or USDC tokens using an OXXO Spin QR code",
    schema: CreateBuyingOrderSchema,
  })
  async createBuyingOrder(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof CreateBuyingOrderSchema>
  ): Promise<string> {
    try {
      // Check network
      await this.checkNetwork(walletProvider);
      
      const { qrCodeData, token, tokenAmount, memo } = args;
      const walletAddress = await walletProvider.getAddress();
      
      // Validate token
      if (!['XOC', 'MXNe', 'USDC'].includes(token)) {
        throw new InvalidTokenError(token);
      }
      
      // Validate and parse QR code data
      const parsedQRData = parseOxxoSpinQRData(qrCodeData);
      
      // Validate token amount
      if (isNaN(parseFloat(tokenAmount)) || parseFloat(tokenAmount) <= 0) {
        throw new InvalidAmountError(
          tokenAmount,
          MIN_ORDER_AMOUNT_MXN.toString(),
          MAX_ORDER_AMOUNT_MXN.toString()
        );
      }
      
      console.log(`Creating buying order for ${tokenAmount} ${token} with ${parsedQRData.Monto} MXN`);
      
      // Create order ID
      const orderId = createOrderId();
      const expiresAt = calculateOrderExpirationTime();

      // Import from transaction utils
      const { createPendingTransaction } = await import('../../utils/transaction-utils');
      // Import ESCROW_WALLET_ADDRESS
      const { ESCROW_WALLET_ADDRESS } = await import('../token-selling-order/constants');
      
      try {
        // Encrypt the QR code data for on-chain storage
        const { publicUuid, privateUuid, encryptedHexData } = createSecureDataBundle(qrCodeData);
        console.log(`QR code data encrypted successfully. Public UUID: ${publicUuid}`);
        console.log(`TEST MODE - Private UUID: ${privateUuid} (Do not include this in production)`);
        
        // Create transaction that includes the encrypted QR data
        const txId = createPendingTransaction(
          ESCROW_WALLET_ADDRESS,
          "0.000022", // Small ETH amount
          `0x${encryptedHexData}`, // Include encrypted data in transaction
          walletAddress,
          "base", // Specify chain
          { 
            type: "buying_order_creation", 
            orderId: orderId,
            publicUuid: publicUuid // Include publicUuid in metadata
          } // Add metadata for tracking this transaction
        );

        // Use the txId as a placeholder for txHash initially
        // Note: We'll update this with the actual blockchain txHash once confirmed
        const txHash = txId;
        
        console.log(`✅ Transaction created with ID: ${txId}`);
        console.log(`⏳ Waiting for wallet signature from ${walletAddress}...`);
        
        // Create the order record (start with pending status)
        const newOrder: BuyingOrder = {
          orderId,
          buyer: walletAddress,
          mxnAmount: parsedQRData.Monto,
          token,
          tokenAmount,
          status: 'pending', // Start with pending status until transaction confirmed
          createdAt: Date.now(),
          expiresAt,
          referenceCode: parsedQRData.Operacion.CR,
          qrExpiration: parsedQRData.FechaExpiracionQR,
          memo,
          txHash, // Include the transaction ID
          // Add encryption-related fields
          encryptedQrData: encryptedHexData,
          publicUuid: publicUuid,
          privateUuidRef: privateUuid, // Store private UUID for later reference (not exposed in API)
          onChainTxHash: undefined // Will be updated when the transaction is confirmed
        };
        
        // Store the order
        storeBuyingOrder(newOrder);
        
        // Return success message with private UUID
        return `✅ Buying order created for ${tokenAmount} ${token} with ${parsedQRData.Monto.toFixed(2)} MXN!

🔢 Order ID: ${orderId}
🔑 Private Access UUID: ${privateUuid} (KEEP THIS SECURE - Required to access QR code data)
🔐 Public UUID: ${publicUuid}
💰 MXN Amount: ${parsedQRData.Monto.toFixed(2)} MXN
🪙 Token: ${tokenAmount} ${token}
💱 Rate: ${(parsedQRData.Monto / parseFloat(tokenAmount)).toFixed(2)} MXN per ${token}
⏱️ Expires: ${new Date(expiresAt).toLocaleString()}
📇 OXXO Reference: ${parsedQRData.Operacion.CR}
${memo ? `📝 Memo: ${memo}` : ''}

Status: PENDING (waiting for blockchain confirmation)

⚠️ IMPORTANT: Save your Private Access UUID safely. It's required to decrypt your QR code data and cannot be recovered if lost.

Your order will be active and visible to potential sellers once your transaction is confirmed.`;
      } catch (txError) {
        console.error('Error sending transaction:', txError);
        
        if (txError instanceof Error && txError.message.includes('user rejected')) {
          throw new Error('Transaction was rejected by the user.');
        }
        
        throw txError;
      }
    } catch (error) {
      console.error('Error creating buying order:', error);
      
      if (error instanceof WrongNetworkError ||
          error instanceof InvalidAmountError ||
          error instanceof InvalidTokenError ||
          error instanceof InvalidQRCodeError ||
          error instanceof QRCodeExpiredError ||
          error instanceof QRCodeAlreadyUsedError ||
          error instanceof InvalidQRAmountError) {
        return `❌ ${error.message}`;
      } else if (error instanceof Error) {
        return `❌ Error creating buying order: ${error.message}`;
      }
      
      return `❌ An unknown error occurred while creating the buying order.`;
    }
  }

  /**
   * Cancel a token buying order
   */
  @CreateAction({
    name: "cancel_buying_order",
    description: "Cancel a buying order",
    schema: CancelBuyingOrderSchema,
  })
  async cancelBuyingOrder(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof CancelBuyingOrderSchema>
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
      
      // Check if user is the buyer
      if (order.buyer.toLowerCase() !== walletAddress.toLowerCase()) {
        throw new UnauthorizedError("Only the buyer can cancel this order");
      }
      
      // Check order status
      if (order.status === 'cancelled') {
        throw new OrderAlreadyCancelledError(orderId);
      }
      
      if (order.status === 'filled') {
        throw new Error("Cannot cancel a filled order");
      }
      
      if (order.status === 'expired') {
        throw new Error("Cannot cancel an expired order");
      }
      
      // Update order status
      const updatedOrder = updateBuyingOrderStatus(orderId, 'cancelled');
      
      if (!updatedOrder) {
        throw new Error(`Failed to update order status for ${orderId}`);
      }
      
      // Return success message
      return `✅ Buying order cancelled successfully!

🔢 Order ID: ${orderId}
💰 MXN Amount: ${updatedOrder.mxnAmount.toFixed(2)} MXN
🪙 Token: ${updatedOrder.tokenAmount} ${updatedOrder.token}
📇 OXXO Reference: ${updatedOrder.referenceCode}

Status: CANCELLED`;
    } catch (error) {
      console.error('Error cancelling buying order:', error);
      
      if (error instanceof OrderNotFoundError ||
          error instanceof UnauthorizedError ||
          error instanceof OrderAlreadyCancelledError) {
        return `❌ ${error.message}`;
      } else if (error instanceof Error) {
        return `❌ Error cancelling buying order: ${error.message}`;
      }
      
      return `❌ An unknown error occurred while cancelling the buying order.`;
    }
  }

  /**
   * Get details of a specific buying order
   */
  @CreateAction({
    name: "get_buying_order",
    description: "Get details of a specific buying order",
    schema: GetBuyingOrderSchema,
  })
  async getBuyingOrder(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof GetBuyingOrderSchema>
  ): Promise<string> {
    try {
      // Check network
      await this.checkNetwork(walletProvider);
      
      const { orderId } = args;
      
      // Check for expired orders
      checkAndUpdateExpiredOrders();
      
      // Get order details
      const order = getBuyingOrderById(orderId);
      if (!order) {
        throw new OrderNotFoundError(orderId);
      }
      
      // Format and return order details
      return formatBuyingOrderForDisplay(order);
    } catch (error) {
      console.error('Error getting buying order:', error);
      
      if (error instanceof WrongNetworkError ||
          error instanceof OrderNotFoundError) {
        return `❌ ${error.message}`;
      } else if (error instanceof Error) {
        return `❌ Error getting buying order: ${error.message}`;
      }
      
      return `❌ An unknown error occurred while getting the buying order.`;
    }
  }

  /**
   * List buying orders
   */
  @CreateAction({
    name: "list_buying_orders",
    description: "List buying orders with optional filters",
    schema: ListBuyingOrdersSchema,
  })
  async listBuyingOrders(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof ListBuyingOrdersSchema>
  ): Promise<string> {
    try {
      // Check network
      await this.checkNetwork(walletProvider);
      
      const { token = 'ALL', status = 'active', limit = 10, userOnly = false } = args;
      let userAddress: string | undefined;
      
      // Check for expired orders
      checkAndUpdateExpiredOrders();
      
      if (userOnly) {
        userAddress = await walletProvider.getAddress();
      }
      
      // Get orders based on filters
      const orders = getBuyingOrders(
        token as 'XOC' | 'MXNe' | 'USDC' | 'ALL',
        status as 'pending' | 'active' | 'filled' | 'cancelled' | 'expired' | 'ALL',
        limit,
        userOnly ? userAddress : undefined
      );
      
      // If no orders found
      if (orders.length === 0) {
        return `📋 No ${status === 'ALL' ? '' : status + ' '}buying orders found${token !== 'ALL' ? ` for ${token}` : ''}${userOnly ? ' created by you' : ''}.`;
      }
      
      // Format response
      let response = `📋 **Buying Orders**\n\n`;
      response += `Found ${orders.length} ${status === 'ALL' ? '' : status + ' '}order(s)${token !== 'ALL' ? ` for ${token}` : ''}${userOnly ? ' created by you' : ''}:\n\n`;
      
      // Add each order summary
      orders.forEach((order, index) => {
        const statusEmoji = getStatusEmoji(order.status);
        response += `${statusEmoji} **Order #${order.orderId}**: ${order.mxnAmount.toFixed(2)} MXN → ${order.tokenAmount} ${order.token} - ${order.status.toUpperCase()}\n`;
        
        // Add "View details" hint for the first order
        if (index === 0) {
          response += `   Use \`get_buying_order orderId=${order.orderId}\` for details\n`;
        }
        
        if (index < orders.length - 1) {
          response += `\n`;
        }
      });
      
      return response;
    } catch (error) {
      console.error('Error listing buying orders:', error);
      
      if (error instanceof WrongNetworkError) {
        return `❌ ${error.message}`;
      } else if (error instanceof Error) {
        return `❌ Error listing buying orders: ${error.message}`;
      }
      
      return `❌ An unknown error occurred while listing buying orders.`;
    }
  }

  /**
   * Decrypt QR code data from a buying order using the private UUID
   */
  @CreateAction({
    name: "decrypt_qr_code",
    description: "Decrypt QR code data from a buying order using the private UUID",
    schema: DecryptQRCodeSchema,
  })
  async decryptQrCode(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof DecryptQRCodeSchema>
  ): Promise<string> {
    try {
      // Check network
      await this.checkNetwork(walletProvider);
      
      const { orderId, privateUuid, forceMethod } = args;
      const walletAddress = await walletProvider.getAddress();
      
      // Get the order
      const order = getBuyingOrderById(orderId);
      
      if (!order) {
        throw new OrderNotFoundError(orderId);
      }
      
      // Check if user is the buyer or has permissions to access this order
      if (order.buyer.toLowerCase() !== walletAddress.toLowerCase()) {
        throw new UnauthorizedError("You are not authorized to access this order's QR code data");
      }
      
      // Verify that public UUID exists
      if (!order.publicUuid) {
        throw new Error("This order doesn't have encryption metadata");
      }
      
      let qrData: string;
      let decryptionMethod = "local";
      
      // If a specific method is forced, try only that method
      if (forceMethod === 'blockchain') {
        // Force blockchain method
        if (!order.onChainTxHash) {
          throw new Error("Cannot use blockchain method: Order has no associated blockchain transaction hash");
        }
        
        // Make sure the hash is a proper hex format with 0x prefix
        const txHash = order.onChainTxHash.startsWith('0x') 
          ? order.onChainTxHash 
          : `0x${order.onChainTxHash}`;
        
        console.log(`[decrypt_qr_code] Forcing blockchain decryption method`);
        console.log(`[decrypt_qr_code] Using transaction hash: ${txHash}`);
        console.log(`[decrypt_qr_code] Using public UUID: ${order.publicUuid}`);
        console.log(`[decrypt_qr_code] Using private UUID: ${privateUuid.substring(0, 4)}...${privateUuid.substring(privateUuid.length - 4)} (partially hidden for security)`);
        
        try {
          // Get data directly from blockchain
          console.log(`[decrypt_qr_code] Starting blockchain data retrieval and decryption process...`);
          qrData = await decryptSecureDataFromBlockchain(
            txHash,
            order.publicUuid,
            privateUuid
          );
          decryptionMethod = "blockchain";
          console.log(`[decrypt_qr_code] QR data decrypted successfully from blockchain (forced method)`);
          console.log(`[decrypt_qr_code] Decrypted data length: ${qrData.length} chars`);
        } catch (blockchainError) {
          console.error("[decrypt_qr_code] Blockchain decryption failed:", blockchainError);
          throw new Error("Blockchain decryption failed: " + 
            (blockchainError instanceof Error ? blockchainError.message : "Unknown error"));
        }
      } else if (forceMethod === 'local') {
        // Force local method
        if (!order.encryptedQrData) {
          throw new Error("Cannot use local method: Order has no local encrypted data");
        }
        
        try {
          qrData = decryptSecureDataBundle(
            order.encryptedQrData,
            order.publicUuid,
            privateUuid
          );
          console.log("QR data decrypted successfully from local storage (forced method)");
        } catch (localError) {
          console.error("Local decryption failed:", localError);
          throw new Error("Local decryption failed: " + 
            (localError instanceof Error ? localError.message : "Unknown error"));
        }
      } else {
        // Auto method (try local first, then blockchain)
        try {
          // First try to decrypt using local storage
          if (order.encryptedQrData) {
            qrData = decryptSecureDataBundle(
              order.encryptedQrData,
              order.publicUuid,
              privateUuid
            );
            console.log("QR data decrypted successfully from local storage");
          } else {
            // If no local encrypted data, force using blockchain
            throw new Error("Local encrypted data not available");
          }
        } catch (localError) {
          console.log("Local decryption failed, trying blockchain...", localError);
          
          // If local decryption fails, try blockchain decryption
          if (!order.onChainTxHash) {
            throw new Error("Order has no associated blockchain transaction hash");
          }
          
          // Make sure the hash is a proper hex format with 0x prefix
          const txHash = order.onChainTxHash.startsWith('0x') 
            ? order.onChainTxHash 
            : `0x${order.onChainTxHash}`;
          
          try {
            // Get data directly from blockchain
            qrData = await decryptSecureDataFromBlockchain(
              txHash,
              order.publicUuid,
              privateUuid
            );
            decryptionMethod = "blockchain";
            console.log("QR data decrypted successfully from blockchain");
          } catch (blockchainError) {
            console.error("Blockchain decryption failed:", blockchainError);
            // Re-throw the original error if both methods fail
            throw localError;
          }
        }
      }
      
      // Mark order as successfully decrypted
      updateBuyingOrderStatus(
        orderId,
        order.status,
        { 
          hasBeenDecrypted: true
        }
      );
      console.log(`✅ Order ${orderId} marked as successfully decrypted`);
      
      // Return the decrypted QR code data
      return `✅ QR code data decrypted successfully for order ${orderId} (using ${decryptionMethod} storage):

\`\`\`json
${qrData}
\`\`\`

You can now use this QR code to confirm the payment status or for refund purposes.`;
    } catch (error) {
      console.error('Error decrypting QR code data:', error);
      
      if (error instanceof OrderNotFoundError ||
          error instanceof UnauthorizedError) {
        return `❌ ${error.message}`;
      } else if (error instanceof Error) {
        return `❌ Error decrypting QR code: ${error.message}`;
      }
      
      return `❌ An unknown error occurred while decrypting the QR code data.`;
    }
  }

  /**
   * Check if the action provider supports a given network
   */
  supportsNetwork = (network: Network): boolean => {
    return network.chainId === BASE_CHAIN_ID;
  };
}

/**
 * Get an emoji for order status
 */
function getStatusEmoji(status: string): string {
  switch (status) {
    case 'pending':
      return '⏳';
    case 'active':
      return '🟢';
    case 'filled':
      return '✅';
    case 'cancelled':
      return '❌';
    case 'expired':
      return '⌛';
    default:
      return '❓';
  }
}

export const tokenBuyingOrderActionProvider = () => new TokenBuyingOrderActionProvider(); 