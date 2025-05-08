import { z } from "zod";
import {
  ActionProvider,
  Network,
  CreateAction,
  EvmWalletProvider,
} from "@coinbase/agentkit";
import { 
  parseUnits, 
  formatUnits,
  encodeFunctionData,
  createPublicClient
} from 'viem';
import "reflect-metadata";
import {
  CreateSellingOrderSchema,
  ProcessBuyingOrderSchema,
  SellingOrderReceiptSchema,
  BuyingOrderReceiptSchema,
  OrderResultSchema
} from "./schemas";
import {
  ESCROW_WALLET_ADDRESS,
  CUSD_TOKEN_ADDRESS,
  CUSD_DECIMALS,
  ERC20_ABI,
  MIN_ORDER_AMOUNT,
  MAX_ORDER_AMOUNT,
  DEFAULT_BUYER_WALLET_ADDRESS,
  MXN_TO_CUSD_RATE
} from "./constants";
import {
  WrongNetworkError,
  InsufficientBalanceError,
  InvalidOrderAmountError,
  TransactionFailedError,
  InvalidQRCodeError,
  ExpiredQRCodeError,
  InsufficientEscrowBalanceError
} from "./errors";
import { createPendingTransaction } from "../../utils/transaction-utils";
import { parseOxxoQrCode, validateQrCode } from "./utils";
import { privateKeyToAccount } from "viem/accounts";
import { createWalletClient, http } from "viem";
import { celo } from "viem/chains";

// Simple in-memory storage for order tracking (in a real app, this would be a database)
const orderHistory = new Map<string, {
  orderId: string;
  amount: string;
  timestamp: number;
  txHash: string;
  status: 'pending' | 'completed' | 'failed';
  type: 'selling' | 'buying';
  qrData?: any;
}>();

/**
 * cUSDescrowforiAmigoP2P handles the creation of selling orders by sending cUSD to an escrow wallet
 */
export class CUSDescrowforiAmigoP2PActionProvider extends ActionProvider<EvmWalletProvider> {
  constructor() {
    super("cusd-escrow-iamigo", []);
  }

  /**
   * 🌐 Check if we're on Celo network
   */
  private async checkNetwork(walletProvider: EvmWalletProvider): Promise<void> {
    const network = await walletProvider.getNetwork();
    // Accept both network ID and chain ID checks for Celo
    if ((!network.networkId || !network.networkId.includes("celo")) && 
        (!network.chainId || network.chainId !== "42220")) {
      throw new WrongNetworkError();
    }
  }

  /**
   * Get the cUSD balance of the user's wallet
   */
  private async getTokenBalance(
    walletProvider: EvmWalletProvider,
    walletAddress: string
  ): Promise<bigint> {
    try {
      const balance = await walletProvider.readContract({
        address: CUSD_TOKEN_ADDRESS as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [walletAddress as `0x${string}`]
      }) as bigint;
      
      return balance;
    } catch (error) {
      console.error(`Error getting cUSD balance:`, error);
      return BigInt(0);
    }
  }

  /**
   * Validate the order amount is within allowed limits
   */
  private validateOrderAmount(amount: string): void {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) {
      throw new InvalidOrderAmountError(amount, MIN_ORDER_AMOUNT.toString(), MAX_ORDER_AMOUNT.toString());
    }
    
    if (numAmount < MIN_ORDER_AMOUNT || numAmount > MAX_ORDER_AMOUNT) {
      throw new InvalidOrderAmountError(amount, MIN_ORDER_AMOUNT.toString(), MAX_ORDER_AMOUNT.toString());
    }
  }

  /**
   * Format amount with proper units and decimals
   */
  private formatAmount(amount: string | number): string {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return "0";
    return numAmount.toFixed(6);
  }

  /**
   * Get celoscan transaction link
   */
  private getCeloscanLink(txHash: string): string {
    return `https://celoscan.io/tx/${txHash}`;
  }

  /**
   * Get a link to the transaction in Celoscan
   * This method provides a more user-friendly way to handle the transaction link
   * without exposing the temporary transaction ID
   */
  private getTransactionTextLink(txId: string): string {
    // Create a transaction hash from the txId but don't include it in the URL
    // Instead we'll just say "View Transaction" and let the user click to view
    // Once the transaction is confirmed, the frontend will update with the real hash
    return `View Transaction`;
  }

  /**
   * Create a selling order by sending cUSD to the escrow wallet
   */
  @CreateAction({
    name: "create_selling_order",
    description: "Create a selling order by sending cUSD to the iAmigo P2P escrow wallet",
    schema: CreateSellingOrderSchema,
  })
  async createSellingOrder(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof CreateSellingOrderSchema>
  ): Promise<string> {
    try {
      // 1. Check if we're on the right network
      await this.checkNetwork(walletProvider);
      
      // 2. Format and validate the amount
      const formattedAmount = this.formatAmount(args.amount);
      this.validateOrderAmount(formattedAmount);
      
      // 3. Check user's balance
      const walletAddress = await walletProvider.getAddress();
      const balance = await this.getTokenBalance(walletProvider, walletAddress);
      const balanceFormatted = formatUnits(balance, CUSD_DECIMALS);
      
      // 4. Ensure user has sufficient balance
      if (parseFloat(balanceFormatted) < parseFloat(formattedAmount)) {
        throw new InsufficientBalanceError(balanceFormatted, formattedAmount);
      }
      
      console.log(`Creating selling order for ${formattedAmount} cUSD to escrow wallet ${ESCROW_WALLET_ADDRESS}`);
      
      // 5. Encode the transfer function call
      const amountInWei = parseUnits(formattedAmount, CUSD_DECIMALS);
      const data = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [ESCROW_WALLET_ADDRESS as `0x${string}`, amountInWei]
      });
      
      // 6. Use createPendingTransaction instead of direct sendTransaction to avoid BigInt serialization issues
      const txId = createPendingTransaction(
        CUSD_TOKEN_ADDRESS, 
        "0", // Value is 0 since we're calling a contract
        data,
        walletAddress
      );
      
      // Store order information for receipt lookup
      const orderId = `SELL-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      orderHistory.set(txId, {
        orderId,
        amount: formattedAmount,
        timestamp: Date.now(),
        txHash: txId,
        status: 'pending',
        type: 'selling'
      });
      
      // 7. Generate response message with a generic transaction link
      // Include the transaction ID in the response for tracking by the frontend
      const response = `✅ Successfully created a selling order for ${formattedAmount} cUSD!

📬 cUSD tokens have been sent to the iAmigo P2P escrow wallet.
💰 Amount: ${formattedAmount} cUSD
🔍 Transaction: ${this.getTransactionTextLink(txId)}
Transaction ID: ${txId}

🚀 Your order has been created and will be processed by the iAmigo P2P system.
${args.memo ? `📝 Memo: ${args.memo}` : ''}`;

      return response;
    } catch (error) {
      // Handle specific error types
      if (error instanceof WrongNetworkError ||
          error instanceof InsufficientBalanceError ||
          error instanceof InvalidOrderAmountError) {
        return `❌ ${error.message}`;
      }
      
      // Generic error handling
      console.error('Error creating selling order:', error);
      return `❌ Failed to create selling order: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  /**
   * Process a buying order by sending cUSD from escrow to buyer based on QR code
   * This uses the backend wallet (escrow wallet) to send the transaction
   */
  @CreateAction({
    name: "process_buying_order",
    description: "Process a buying order using an OXXO Spin QR code, sending cUSD from escrow to buyer's wallet",
    schema: ProcessBuyingOrderSchema,
  })
  async processBuyingOrder(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof ProcessBuyingOrderSchema>
  ): Promise<string> {
    try {
      // 1. Parse and validate the QR code
      const qrData = parseOxxoQrCode(args.qrCode);
      validateQrCode(qrData);
      
      // 2. Calculate cUSD amount based on MXN amount
      const mxnAmount = qrData.monto;
      const cusdAmount = mxnAmount / MXN_TO_CUSD_RATE;
      const formattedCusdAmount = this.formatAmount(cusdAmount);
      
      console.log(`Processing buying order with QR code for ${mxnAmount} MXN`);
      console.log(`Converting to ${formattedCusdAmount} cUSD at rate ${MXN_TO_CUSD_RATE} MXN/cUSD`);
      
      // 3. Determine buyer wallet address (use provided or default)
      const buyerWalletAddress = args.buyerWalletAddress || DEFAULT_BUYER_WALLET_ADDRESS;
      console.log(`Buyer wallet address: ${buyerWalletAddress}`);
      
      // 4. Get escrow wallet private key
      const escrowPrivateKey = process.env.ESCROW_WALLET_PRIVATE_KEY;
      console.log("🔑 Environment variables check:");
      console.log("- ESCROW_WALLET_PRIVATE_KEY present:", !!process.env.ESCROW_WALLET_PRIVATE_KEY);
      console.log("- Current working directory:", process.cwd());
      
      let privateKey: string;
      if (!escrowPrivateKey) {
        console.warn('Escrow wallet private key not found in environment variables, using fallback');
        // Use the key from the screenshot (beginning part - this is just temporary for demo)
        // In production, never hardcode private keys!
        privateKey = "0x0eecf4305e835"; // This is incomplete, just for demo
        throw new Error('Escrow wallet private key not found in environment variables. Please ensure the .env file contains ESCROW_WALLET_PRIVATE_KEY.');
      } else {
        privateKey = escrowPrivateKey;
      }
      
      // 5. Create wallet client for escrow wallet
      const account = privateKeyToAccount(privateKey as `0x${string}`);
      const client = createWalletClient({
        account,
        chain: celo,
        transport: http(celo.rpcUrls.default.http[0])
      });
      
      // 6. Check escrow wallet balance
      try {
        // Create a public client for reading blockchain data
        const publicClient = createPublicClient({
          chain: celo,
          transport: http(celo.rpcUrls.default.http[0])
        });
        
        const balanceResult = await publicClient.readContract({
          address: CUSD_TOKEN_ADDRESS as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [ESCROW_WALLET_ADDRESS as `0x${string}`]
        });
        
        const escrowBalance = balanceResult as bigint;
        const escrowBalanceFormatted = formatUnits(escrowBalance, CUSD_DECIMALS);
        
        console.log(`Escrow wallet balance: ${escrowBalanceFormatted} cUSD`);
        
        // Check if escrow has enough balance
        if (parseFloat(escrowBalanceFormatted) < parseFloat(formattedCusdAmount)) {
          throw new InsufficientEscrowBalanceError(escrowBalanceFormatted, formattedCusdAmount);
        }
      } catch (error) {
        if (error instanceof InsufficientEscrowBalanceError) {
          throw error;
        }
        console.error('Error checking escrow balance:', error);
        throw new Error('Failed to check escrow wallet balance');
      }
      
      // 7. Format amount for blockchain
      const amountInWei = parseUnits(formattedCusdAmount, CUSD_DECIMALS);
      
      // 8. Build the transaction data
      const data = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [buyerWalletAddress as `0x${string}`, amountInWei]
      });
      
      console.log(`Sending ${formattedCusdAmount} cUSD from escrow to buyer ${buyerWalletAddress}`);
      
      // 9. Send transaction
      let txHash;
      try {
        txHash = await client.writeContract({
          address: CUSD_TOKEN_ADDRESS as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "transfer",
          args: [buyerWalletAddress as `0x${string}`, amountInWei]
        });
        
        console.log(`Transaction sent successfully with hash: ${txHash}`);
      } catch (error) {
        console.error('Error sending transaction:', error);
        throw new TransactionFailedError('Failed to send transaction from escrow wallet');
      }
      
      // Store order information for receipt lookup
      const orderId = `BUY-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      orderHistory.set(String(txHash), {
        orderId,
        amount: formattedCusdAmount,
        timestamp: Date.now(),
        txHash: String(txHash),
        status: 'completed',
        type: 'buying',
        qrData
      });
      
      // 10. Return success message
      return `✅ Successfully processed buying order for ${mxnAmount} MXN (${formattedCusdAmount} cUSD)!

🧾 OXXO QR Details:
  - Amount: ${mxnAmount} MXN
  - Reference: ${qrData.operacion}
  - Expiration: ${qrData.fechaExpiracion.toLocaleDateString()}

💰 Transferred ${formattedCusdAmount} cUSD from escrow to buyer wallet:
  - Buyer: ${buyerWalletAddress}
  - Transaction: View on Celoscan
  - Hash: ${txHash}

🌐 Conversion rate: ${MXN_TO_CUSD_RATE} MXN/cUSD`;
    } catch (error) {
      // Handle specific error types
      if (error instanceof InvalidQRCodeError ||
          error instanceof ExpiredQRCodeError ||
          error instanceof InsufficientEscrowBalanceError ||
          error instanceof TransactionFailedError) {
        return `❌ ${error.message}`;
      }
      
      // Generic error handling
      console.error('Error processing buying order:', error);
      return `❌ Failed to process buying order: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  /**
   * Get a selling order receipt
   */
  @CreateAction({
    name: "selling_order_receipt",
    description: "Get a receipt for a completed selling order",
    schema: SellingOrderReceiptSchema,
  })
  async getSellingOrderReceipt(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof SellingOrderReceiptSchema>
  ): Promise<string> {
    try {
      // Find the order based on transaction ID
      // If not provided, find the latest selling order
      let orderData;
      
      if (args.transactionId) {
        orderData = orderHistory.get(args.transactionId);
        if (!orderData || orderData.type !== 'selling') {
          return `❌ No selling order found with transaction ID: ${args.transactionId}`;
        }
      } else {
        // Find the latest selling order
        let latestTime = 0;
        let latestOrderData = null;
        
        for (const [_, data] of orderHistory.entries()) {
          if (data.type === 'selling' && data.timestamp > latestTime) {
            latestTime = data.timestamp;
            latestOrderData = data;
          }
        }
        
        if (!latestOrderData) {
          return `❌ No selling orders found`;
        }
        
        orderData = latestOrderData;
      }
      
      // Format the date
      const orderDate = new Date(orderData.timestamp);
      const formattedDate = orderDate.toLocaleString();
      
      // Generate the celoscan link
      const txLink = this.getCeloscanLink(orderData.txHash);
      
      // Return formatted receipt
      return `📃 SELLING ORDER RECEIPT
═════════════════════

🔢 Order ID: ${orderData.orderId}
📅 Date: ${formattedDate}
💰 Amount: ${orderData.amount} cUSD
📊 Status: ${orderData.status.toUpperCase()}
🔍 Transaction Hash: ${orderData.txHash}
🌐 Celoscan Link: ${txLink}

Thank you for using iAmigo P2P!`;
    } catch (error) {
      console.error('Error generating selling order receipt:', error);
      return `❌ Failed to generate selling order receipt: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  /**
   * Get a buying order receipt
   */
  @CreateAction({
    name: "buying_order_receipt",
    description: "Get a receipt for a completed buying order with QR code details",
    schema: BuyingOrderReceiptSchema,
  })
  async getBuyingOrderReceipt(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof BuyingOrderReceiptSchema>
  ): Promise<string> {
    try {
      // Find the order based on transaction ID
      // If not provided, find the latest buying order
      let orderData;
      
      if (args.transactionId) {
        orderData = orderHistory.get(args.transactionId);
        if (!orderData || orderData.type !== 'buying') {
          return `❌ No buying order found with transaction ID: ${args.transactionId}`;
        }
      } else {
        // Find the latest buying order
        let latestTime = 0;
        let latestOrderData = null;
        
        for (const [_, data] of orderHistory.entries()) {
          if (data.type === 'buying' && data.timestamp > latestTime) {
            latestTime = data.timestamp;
            latestOrderData = data;
          }
        }
        
        if (!latestOrderData) {
          return `❌ No buying orders found`;
        }
        
        orderData = latestOrderData;
      }
      
      // Format the date
      const orderDate = new Date(orderData.timestamp);
      const formattedDate = orderDate.toLocaleString();
      
      // Generate the celoscan link
      const txLink = this.getCeloscanLink(orderData.txHash);
      
      // QR code data section (if available)
      let qrSection = '';
      if (orderData.qrData) {
        const qrData = orderData.qrData;
        const mxnAmount = qrData.monto;
        const expiration = qrData.fechaExpiracion.toLocaleDateString();
        
        qrSection = `
🧾 OXXO QR CODE DETAILS
───────────────────────
💵 Amount (MXN): ${mxnAmount} MXN
📊 Conversion: ${mxnAmount} MXN ≈ ${orderData.amount} cUSD
🔄 Operation Type: ${qrData.tipoOperacion || 'N/A'}
🔢 Reference: ${qrData.operacion || 'N/A'}
⏱️ Expiration: ${expiration}
🏷️ Description: ${qrData.descripcion || 'N/A'}`;
      }
      
      // Return formatted receipt
      return `📃 BUYING ORDER RECEIPT
═════════════════════

🔢 Order ID: ${orderData.orderId}
📅 Date: ${formattedDate}
💰 Amount: ${orderData.amount} cUSD
📊 Status: ${orderData.status.toUpperCase()}
🔍 Transaction Hash: ${orderData.txHash}
🌐 Celoscan Link: ${txLink}
${qrSection}

Thank you for using iAmigo P2P!`;
    } catch (error) {
      console.error('Error generating buying order receipt:', error);
      return `❌ Failed to generate buying order receipt: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  /**
   * Check whether this action provider supports the given network
   */
  supportsNetwork = (network: Network): boolean => {
    // Check network ID or chain ID instead of name
    return network.networkId?.includes("celo") || network.chainId === "42220";
  };
}

export const cUSDescrowforiAmigoP2PActionProvider = () => new CUSDescrowforiAmigoP2PActionProvider(); 