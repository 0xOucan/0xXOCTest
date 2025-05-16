import { z } from "zod";
import {
  ActionProvider,
  Network,
  CreateAction,
  EvmWalletProvider,
} from "@coinbase/agentkit";
import { formatUnits, parseUnits, encodeFunctionData, formatEther, parseEther } from "viem";
import "reflect-metadata";
import {
  CreateSellingOrderSchema,
  CancelSellingOrderSchema,
  GetSellingOrderSchema,
  ListSellingOrdersSchema,
  SellingOrder,
} from "./schemas";
import {
  SUPPORTED_TOKENS,
  BASE_CHAIN_ID,
  ESCROW_WALLET_ADDRESS,
  MIN_MXN_AMOUNT,
  MAX_MXN_AMOUNT,
  MIN_ORDER_AMOUNT_USD as MIN_ORDER_AMOUNT,
  MAX_ORDER_AMOUNT_USD as MAX_ORDER_AMOUNT,
  ERC20_ABI,
} from "./constants";
import {
  WrongNetworkError,
  InsufficientBalanceError,
  InvalidAmountError,
  InvalidMXNAmountError,
  TransactionFailedError,
  OrderNotFoundError,
  InvalidTokenError,
  UnauthorizedError,
  OrderAlreadyCancelledError,
} from "./errors";
import {
  formatAmount,
  getExplorerLink,
  getTransactionTextLink,
  createOrderId,
  storeSellingOrder,
  getSellingOrderById,
  updateSellingOrderStatus,
  getSellingOrders,
  checkAndUpdateExpiredOrders,
  baseClient,
  getTokenDecimals,
  getTokenAddress,
  formatSellingOrderForDisplay,
  calculateExpirationTime,
  sellingOrders,
  getStatusEmoji,
  activateSellingOrder,
} from "./utils";
import { createPendingTransaction } from "../../utils/transaction-utils";
import { encodeAbiParameters, parseAbiParameters } from 'viem';

/**
 * TokenSellingOrderActionProvider provides actions for creating and managing token selling orders
 * on the Base network, focusing on XOC, MXNe, and USDC tokens.
 */
export class TokenSellingOrderActionProvider extends ActionProvider<EvmWalletProvider> {
  constructor() {
    super("token-selling-order", []);
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
   * Get the token balance for a wallet
   */
  private async getTokenBalance(
    tokenAddress: string,
    walletAddress: string
  ): Promise<bigint> {
    try {
      return await baseClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [walletAddress as `0x${string}`],
      }) as bigint;
    } catch (error) {
      console.error(`Error getting token balance:`, error);
      return BigInt(0);
    }
  }

  /**
   * Create a token selling order
   */
  @CreateAction({
    name: "create_selling_order",
    description: "Create a new selling order for tokens",
    schema: CreateSellingOrderSchema,
  })
  async createSellingOrder(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof CreateSellingOrderSchema>
  ): Promise<string> {
    try {
      // Check network
      await this.checkNetwork(walletProvider);
      
      const { token, amount, mxnAmount, price, expiration, memo } = args;
      const walletAddress = await walletProvider.getAddress();
      
      // Validate token
      if (!['XOC', 'MXNe', 'USDC'].includes(token)) {
        throw new InvalidTokenError(token);
      }
      
      // Get token details
      const tokenDecimals = getTokenDecimals(token as 'XOC' | 'MXNe' | 'USDC');
      const tokenAddress = getTokenAddress(token as 'XOC' | 'MXNe' | 'USDC');
      
      // Validate amount
      if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        throw new InvalidAmountError(
          amount, 
          MIN_ORDER_AMOUNT.toString(), 
          MAX_ORDER_AMOUNT.toString(), 
          token
        );
      }
      
      const amountValue = parseFloat(amount);
      if (amountValue < MIN_ORDER_AMOUNT || amountValue > MAX_ORDER_AMOUNT) {
        throw new InvalidAmountError(
          amount, 
          MIN_ORDER_AMOUNT.toString(), 
          MAX_ORDER_AMOUNT.toString(), 
          token
        );
      }
      
      // Validate MXN amount if provided
      if (mxnAmount) {
        if (isNaN(parseFloat(mxnAmount)) || parseFloat(mxnAmount) <= 0) {
          throw new InvalidMXNAmountError(
            mxnAmount,
            MIN_MXN_AMOUNT.toString(),
            MAX_MXN_AMOUNT.toString()
          );
        }
        
        if (parseFloat(mxnAmount) < MIN_MXN_AMOUNT || parseFloat(mxnAmount) > MAX_MXN_AMOUNT) {
          throw new InvalidMXNAmountError(
            mxnAmount,
            MIN_MXN_AMOUNT.toString(),
            MAX_MXN_AMOUNT.toString()
          );
        }
      }
      
      // Check balance
      const balance = await this.getTokenBalance(tokenAddress, walletAddress);
      const formattedBalance = formatAmount(balance, tokenDecimals);
      const amountInWei = parseUnits(amount, tokenDecimals);
      
      if (balance < amountInWei) {
        throw new InsufficientBalanceError(
          formattedBalance,
          amount,
          token
        );
      }
      
      console.log(`Creating selling order for ${amount} ${token} - Amount in Wei: ${amountInWei.toString()}`);
      console.log(`Token address: ${tokenAddress}, Escrow address: ${ESCROW_WALLET_ADDRESS}`);
      
      // Generate a unique order ID
      const orderId = `order-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      try {
        // Create data for token transfer to escrow wallet
        const data = encodeFunctionData({
          abi: ERC20_ABI,
          functionName: "transfer",
          args: [ESCROW_WALLET_ADDRESS as `0x${string}`, amountInWei],
        });
        
        console.log(`🔶 Prepared transaction data: ${data.substring(0, 20)}...`);
        console.log(`🔶 Sending transaction to token ${tokenAddress}`);
        
        // Use createPendingTransaction instead of direct wallet transaction to avoid BigInt serialization issues
        const txId = createPendingTransaction(
          tokenAddress,
          "0", // No ETH value needed for token transfers
          data,
          walletAddress,
          "base", // Specify chain
          { 
            type: "token_transfer", 
            orderId: orderId 
          } // Add metadata for tracking this transaction
        );
        
        // Initially use a placeholder transaction hash (will be updated later with real tx hash)
        const initialTxHash = txId;
        
        console.log(`✅ Transaction ID created: ${txId}`);
        
        // Create the selling order in our system
        const expiresAt = expiration ? Date.now() + (expiration * 1000) : calculateExpirationTime();
        const newOrder: SellingOrder = {
          orderId: orderId,
          seller: walletAddress,
          token: token as 'XOC' | 'MXNe' | 'USDC',
          amount: amount,
          mxnAmount: mxnAmount,
          price: price,
          status: 'pending',
          createdAt: Date.now(),
          expiresAt: expiresAt,
          txHash: initialTxHash,
          memo: memo
        };
        
        // Store the order
        sellingOrders.set(orderId, newOrder);
        
        // Return a success message with transaction id and additional information
        return `${getStatusEmoji('pending')} Selling order created successfully! Order ID: ${orderId}
        
I've created a selling order for ${amount} ${token} with a price of ${mxnAmount || price || 'market price'} MXN.

Your tokens have been transferred to the escrow wallet and will be held securely until someone purchases them.

🔍 Transaction ID: ${txId}

Status: PENDING (waiting for blockchain confirmation)

IMPORTANT: After your transaction is confirmed, click the "POST TO MARKETPLACE" button in the transaction notification to make your order visible in the marketplace.`;
      } catch (txError) {
        console.error('Error sending transaction:', txError);
        return `❌ Error creating selling order: The transaction to transfer tokens could not be completed. Please make sure your wallet is connected and has enough tokens.`;
      }
    } catch (error) {
      console.error('Error in createSellingOrder:', error);
      if (error instanceof Error) {
        return `❌ Error creating selling order: ${error.message}`;
      }
      return `❌ An unknown error occurred while creating your selling order.`;
    }
  }

  /**
   * Cancel a token selling order
   */
  @CreateAction({
    name: "cancel_selling_order",
    description: "Cancel a selling order",
    schema: CancelSellingOrderSchema,
  })
  async cancelSellingOrder(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof CancelSellingOrderSchema>
  ): Promise<string> {
    try {
      // Check network
      await this.checkNetwork(walletProvider);
      
      const { orderId } = args;
      const walletAddress = await walletProvider.getAddress();
      
      // Check if order exists
      const order = getSellingOrderById(orderId);
      if (!order) {
        throw new OrderNotFoundError(orderId);
      }
      
      // Check if user is the seller
      if (order.seller.toLowerCase() !== walletAddress.toLowerCase()) {
        throw new UnauthorizedError(orderId, walletAddress);
      }
      
      // Check if order is already cancelled
      if (order.status === 'cancelled') {
        throw new OrderAlreadyCancelledError(orderId);
      }
      
      // Check if order can be cancelled (only pending or active orders)
      if (order.status !== 'pending' && order.status !== 'active') {
        return `❌ Cannot cancel order with status ${order.status.toUpperCase()}.`;
      }
      
      // Update order status
      const updatedOrder = updateSellingOrderStatus(orderId, 'cancelled', {
        // In a real implementation, we would also handle returning tokens from escrow to seller
      });
      
      if (!updatedOrder) {
        throw new Error(`Failed to update order ${orderId}`);
      }
      
      // Return success message
      return `✅ Order #${orderId} cancelled successfully!

The order for ${order.amount} ${order.token} has been cancelled.
${order.status === 'active' ? 'Note: To get your tokens back, please contact support.' : ''}`;
    } catch (error) {
      console.error('Error cancelling selling order:', error);
      if (error instanceof WrongNetworkError ||
          error instanceof OrderNotFoundError ||
          error instanceof UnauthorizedError ||
          error instanceof OrderAlreadyCancelledError) {
        return `❌ ${error.message}`;
      } else if (error instanceof Error) {
        return `❌ Error cancelling selling order: ${error.message}`;
      }
      return `❌ An unknown error occurred while cancelling the selling order.`;
    }
  }

  /**
   * Get details of a specific selling order
   */
  @CreateAction({
    name: "get_selling_order",
    description: "Get details of a specific selling order",
    schema: GetSellingOrderSchema,
  })
  async getSellingOrder(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof GetSellingOrderSchema>
  ): Promise<string> {
    try {
      // Check network
      await this.checkNetwork(walletProvider);
      
      const { orderId } = args;
      
      // Check for expired orders
      checkAndUpdateExpiredOrders();
      
      // Get order details
      const order = getSellingOrderById(orderId);
      if (!order) {
        throw new OrderNotFoundError(orderId);
      }
      
      // Format and return order details
      return formatSellingOrderForDisplay(order);
    } catch (error) {
      console.error('Error getting selling order:', error);
      if (error instanceof WrongNetworkError ||
          error instanceof OrderNotFoundError) {
        return `❌ ${error.message}`;
      } else if (error instanceof Error) {
        return `❌ Error getting selling order: ${error.message}`;
      }
      return `❌ An unknown error occurred while getting the selling order.`;
    }
  }

  /**
   * Activate a selling order after transaction confirmation
   */
  @CreateAction({
    name: "activate_selling_order",
    description: "Activate a selling order after transaction confirmation",
    schema: z.object({
      orderId: z.string(),
      txHash: z.string(),
    })
  })
  async activateSellingOrder(
    walletProvider: EvmWalletProvider,
    args: { orderId: string, txHash: string }
  ): Promise<string> {
    try {
      // Check network
      await this.checkNetwork(walletProvider);
      
      const { orderId, txHash } = args;
      const walletAddress = await walletProvider.getAddress();
      
      // Check if order exists
      const order = getSellingOrderById(orderId);
      if (!order) {
        throw new OrderNotFoundError(orderId);
      }
      
      // Check if user is the seller
      if (order.seller.toLowerCase() !== walletAddress.toLowerCase()) {
        throw new UnauthorizedError(orderId, walletAddress);
      }
      
      // Check if order can be activated (only pending orders)
      if (order.status !== 'pending') {
        return `❌ Cannot activate order with status ${order.status.toUpperCase()}.`;
      }
      
      // Activate the order
      const activatedOrder = activateSellingOrder(orderId, txHash);
      
      if (!activatedOrder) {
        throw new Error(`Failed to activate order ${orderId}`);
      }
      
      // Return success message
      return `✅ Order #${orderId} activated successfully!

Your selling order for ${order.amount} ${order.token} is now visible in the marketplace.
Buyers can now see and fulfill your order.

Transaction: ${getTransactionTextLink(txHash)}`;
    } catch (error) {
      console.error('Error activating selling order:', error);
      if (error instanceof WrongNetworkError ||
          error instanceof OrderNotFoundError ||
          error instanceof UnauthorizedError) {
        return `❌ ${error.message}`;
      } else if (error instanceof Error) {
        return `❌ Error activating selling order: ${error.message}`;
      }
      return `❌ An unknown error occurred while activating the selling order.`;
    }
  }

  /**
   * List selling orders
   */
  @CreateAction({
    name: "list_selling_orders",
    description: "List selling orders with optional filters",
    schema: ListSellingOrdersSchema,
  })
  async listSellingOrders(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof ListSellingOrdersSchema>
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
      const orders = getSellingOrders(
        token as 'XOC' | 'MXNe' | 'USDC' | 'ALL',
        status as 'pending' | 'active' | 'filled' | 'cancelled' | 'expired' | 'ALL',
        limit,
        userOnly ? userAddress : undefined
      );
      
      // If no orders found
      if (orders.length === 0) {
        return `📋 No ${status === 'ALL' ? '' : status + ' '}selling orders found${token !== 'ALL' ? ` for ${token}` : ''}${userOnly ? ' created by you' : ''}.`;
      }
      
      // Format response
      let response = `📋 **Selling Orders**\n\n`;
      response += `Found ${orders.length} ${status === 'ALL' ? '' : status + ' '}order(s)${token !== 'ALL' ? ` for ${token}` : ''}${userOnly ? ' created by you' : ''}:\n\n`;
      
      // Add each order summary
      orders.forEach((order, index) => {
        const statusEmoji = getStatusEmoji(order.status);
        response += `${statusEmoji} **Order #${order.orderId}**: ${order.amount} ${order.token} - ${order.status.toUpperCase()}\n`;
        
        // Add "View details" hint for the first order
        if (index === 0) {
          response += `   Use \`get_selling_order orderId=${order.orderId}\` for details\n`;
        }
        
        if (index < orders.length - 1) {
          response += `\n`;
        }
      });
      
      return response;
    } catch (error) {
      console.error('Error listing selling orders:', error);
      if (error instanceof WrongNetworkError) {
        return `❌ ${error.message}`;
      } else if (error instanceof Error) {
        return `❌ Error listing selling orders: ${error.message}`;
      }
      return `❌ An unknown error occurred while listing selling orders.`;
    }
  }

  /**
   * Check if the action provider supports a given network
   */
  supportsNetwork = (network: Network): boolean => {
    return network.chainId === BASE_CHAIN_ID;
  };
}

export const tokenSellingOrderActionProvider = () => new TokenSellingOrderActionProvider(); 