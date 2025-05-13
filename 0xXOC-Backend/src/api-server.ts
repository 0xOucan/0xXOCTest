// @ts-nocheck - Temporarily disable TypeScript checking for this file
import express from "express";

import cors from "cors";
import bodyParser from "body-parser";
import { HumanMessage } from "@langchain/core/messages";
import * as dotenv from "dotenv";
import { initializeAgent } from "./chatbot";
import { pendingTransactions, updateTransactionStatus, getTransactionById } from "./utils/transaction-utils";
import { startAtomicSwapRelay } from "./services/atomic-swap-relay";
import { updateSwapStatus, getMostRecentSwap } from "./action-providers/basic-atomic-swaps/utils";
import { sellingOrders } from "./action-providers/token-selling-order/utils";
import { startTokenSellingOrderRelay } from "./services/token-selling-order-relay";
import { 
  buyingOrders,
  getBuyingOrderById,
  getBuyingOrders,
  updateBuyingOrderStatus 
} from './action-providers/token-buying-order/utils';
import { startTokenBuyingOrderRelay } from "./services/token-buying-order-relay";
import { startTokenBuyingOrderFillerRelay } from "./services/token-buying-order-filler-relay";
import multer from "multer";
import { saveUploadedFile, getFileById, deleteFile } from "./utils/file-storage";
import path from "path";
import { startTokenSellingOrderFillerRelay } from "./services/token-selling-order-filler-relay";
import { 
  getFillById, 
  getFillsByOrderId, 
  updateFillStatus 
} from './action-providers/token-selling-order-filler/utils';

dotenv.config();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // Limit file size to 5MB
  },
  fileFilter: (_req, file, cb) => {
    // Check file type
    const filetypes = /jpeg|jpg|png/;
    // Check extension
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    // Check mime type
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error("Only images (jpg, jpeg, png) are allowed"));
    }
  },
});

// Store connected wallet address globally for use across requests
let connectedWalletAddress: string | null = null;
let selectedNetwork: string = "base"; // Default to Base network

// Cache agent instances by wallet address and network
const agentCache: Record<string, { agent: any, config: any, timestamp: number }> = {};
// Cache expiration time (30 minutes)
const CACHE_EXPIRATION_MS = 30 * 60 * 1000;

/**
 * Get or create an agent for the current wallet address and network
 */
async function getOrCreateAgent(walletAddress: string | null, network: string = "base") {
  // Create a cache key - combines wallet address (or "default") and network
  const cacheKey = `${walletAddress || "default"}-${network}`;
  const now = Date.now();
  
  // Check if we have a cached agent and it's not expired
  if (
    agentCache[cacheKey] && 
    now - agentCache[cacheKey].timestamp < CACHE_EXPIRATION_MS
  ) {
    console.log(`Using cached agent for ${cacheKey}`);
    return {
      agent: agentCache[cacheKey].agent,
      config: agentCache[cacheKey].config
    };
  }
  
  // Initialize a new agent
  console.log(`Creating new agent for ${cacheKey}`);
  const { agent, config } = await initializeAgent({ 
    network: network, 
    nonInteractive: true,
    walletAddress: walletAddress
  });
  
  // Cache the new agent
  agentCache[cacheKey] = {
    agent,
    config,
    timestamp: now
  };
  
  return { agent, config };
}

/**
 * Update any associated swap records when a transaction is confirmed
 * @param txId - The transaction ID
 * @param status - The new status
 * @param hash - The blockchain transaction hash
 */
function updateAssociatedSwapRecords(txId, status, hash) {
  if (status !== 'confirmed' || !hash) {
    return;
  }
  
  // Get the most recent swap (we'll expand this in the future to track all pending swaps)
  const recentSwap = getMostRecentSwap();
  if (!recentSwap) {
    return;
  }
  
  // Check if this swap has a transaction ID that matches our internal ID format
  if (recentSwap.sourceTxHash && recentSwap.sourceTxHash === txId) {
    console.log(`Updating swap record ${recentSwap.swapId} with blockchain transaction hash ${hash}`);
    updateSwapStatus(recentSwap.swapId, recentSwap.status, hash);
  }
}

/**
 * Create an Express server to expose the AI agent as an API
 */
async function createServer() {
  try {
    // Initialize the agent in non-interactive mode, automatically selecting Base
    console.log("🤖 Initializing AI agent for API...");
    const { agent: defaultAgent, config: defaultConfig } = await initializeAgent({ 
      network: "base", 
      nonInteractive: true 
    });
    console.log("✅ Agent initialization complete");
    
    // Start the atomic swap relay service
    const stopRelayService = startAtomicSwapRelay();
    
    // Start the token selling order relay service
    const stopTokenSellingOrderRelay = startTokenSellingOrderRelay();
    
    // Start the token buying order relay service
    const stopTokenBuyingOrderRelay = startTokenBuyingOrderRelay();
    
    // Start the token buying order filler relay service
    const stopTokenBuyingOrderFillerRelay = startTokenBuyingOrderFillerRelay();
    
    // Start the token selling order filler relay service
    const stopTokenSellingOrderFillerRelay = startTokenSellingOrderFillerRelay();
    
    // Initialize the default agent cache
    agentCache["default-base"] = {
      agent: defaultAgent,
      config: defaultConfig,
      timestamp: Date.now()
    };

    // Create Express app
    const app = express();
    app.use(cors());
    app.use(bodyParser.json());

    // Wallet connection endpoint
    app.post("/api/wallet/connect", async (req, res) => {
      try {
        const { walletAddress, network = "base" } = req.body;
        
        if (!walletAddress) {
          return res.status(400).json({ 
            success: false, 
            message: 'No wallet address provided' 
          });
        }
        
        // Validate wallet address format
        if (!/^0x[0-9a-fA-F]{40}$/.test(walletAddress)) {
          return res.status(400).json({ 
            success: false, 
            message: 'Invalid wallet address format. Must be a 0x-prefixed 20-byte hex string (40 characters after 0x)' 
          });
        }
        
        // Validate and set network
        if (!["base", "arbitrum", "mantle", "zksync"].includes(network)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid network. Must be one of: base, arbitrum, mantle, zksync'
          });
        }
        
        console.log(`✅ Wallet connected: ${walletAddress} on ${network}`);
        
        // Store the wallet address and network for future agent initializations
        connectedWalletAddress = walletAddress;
        selectedNetwork = network;
        
        // Pre-initialize an agent for this wallet address and network
        await getOrCreateAgent(walletAddress, network);
        
        return res.status(200).json({ 
          success: true, 
          message: `Wallet address received and stored for agent communication on ${network}` 
        });
      } catch (error) {
        console.error('Error handling wallet connection:', error);
        return res.status(500).json({ 
          success: false, 
          message: error instanceof Error ? error.message : 'Unknown server error' 
        });
      }
    });

    // Network selection endpoint
    app.post("/api/network/select", async (req, res) => {
      try {
        const { network } = req.body;
        
        if (!network) {
          return res.status(400).json({
            success: false,
            message: 'No network provided'
          });
        }
        
        // Validate network
        if (!["base", "arbitrum", "mantle", "zksync"].includes(network)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid network. Must be one of: base, arbitrum, mantle, zksync'
          });
        }
        
        console.log(`✅ Network changed to: ${network}`);
        selectedNetwork = network;
        
        // Pre-initialize an agent for the current wallet on the new network
        if (connectedWalletAddress) {
          await getOrCreateAgent(connectedWalletAddress, network);
        }
        
        return res.status(200).json({
          success: true,
          message: `Network changed to ${network}`
        });
      } catch (error) {
        console.error('Error changing network:', error);
        return res.status(500).json({ 
          success: false, 
          message: error instanceof Error ? error.message : 'Unknown server error' 
        });
      }
    });

    // Transaction handling endpoints
    
    // Get pending transactions
    app.get("/api/transactions/pending", (req, res) => {
      try {
        // Filter transactions that are in pending state
        const pending = pendingTransactions.filter(tx => tx.status === 'pending');
        
        return res.json({
          success: true,
          transactions: pending
        });
      } catch (error) {
        console.error('Error fetching pending transactions:', error);
        return res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : 'Unknown server error'
        });
      }
    });
    
    // Transaction update endpoint
    app.post("/api/transactions/:txId/update", async (req, res) => {
      try {
        const { txId } = req.params;
        const { status, hash } = req.body;
        
        if (!txId) {
          return res.status(400).json({ 
            success: false, 
            message: 'Transaction ID is required' 
          });
        }
        
        // Update transaction status
        const transaction = updateTransactionStatus(txId, status, hash);
        
        if (!transaction) {
          return res.status(404).json({ 
            success: false, 
            message: `Transaction with ID ${txId} not found` 
          });
        }
        
        // Update associated swap records if transaction is confirmed
        if (status === 'confirmed' && hash) {
          updateAssociatedSwapRecords(txId, status, hash);
        }
        
        return res.json({ 
          success: true, 
          transaction 
        });
      } catch (error) {
        console.error('Error updating transaction:', error);
        return res.status(500).json({ 
          success: false, 
          message: error instanceof Error ? error.message : 'Unknown server error' 
        });
      }
    });
    
    // Transaction hash update endpoint (for updating order hashes after confirmation)
    app.post("/api/transactions/:txId/hash", async (req, res) => {
      try {
        const { txId } = req.params;
        const { hash } = req.body;
        
        if (!txId) {
          return res.status(400).json({ 
            success: false, 
            message: 'Transaction ID is required' 
          });
        }
        
        if (!hash) {
          return res.status(400).json({ 
            success: false, 
            message: 'Transaction hash is required' 
          });
        }
        
        // Get the transaction
        const transaction = getTransactionById(txId);
        
        if (!transaction) {
          return res.status(404).json({
            success: false,
            message: `Transaction with ID ${txId} not found`
          });
        }
        
        // Update transaction hash
        const updatedTransaction = updateTransactionStatus(txId, 'completed', hash);
        
        // If this is a selling order transaction, update its order
        if (transaction.metadata?.orderId && transaction.metadata?.type === 'token_transfer') {
          const orderId = transaction.metadata.orderId;
          // Check if there's a selling order with this ID
          const order = sellingOrders.get(orderId);
          
          if (order) {
            // Update the order's transaction hash
            const updatedOrder = {
              ...order,
              txHash: hash
            };
            sellingOrders.set(orderId, updatedOrder);
          }
        }
        
        return res.json({
          success: true,
          transaction: updatedTransaction 
        });
      } catch (error) {
        console.error('Error updating transaction hash:', error);
        return res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : 'Unknown server error'
        });
      }
    });

    // Define API routes
    app.post("/api/agent/chat", async (req, res) => {
      try {
        const { userInput } = req.body;
        
        if (!userInput || typeof userInput !== "string") {
          return res.status(400).json({ 
            error: "Invalid request. 'userInput' must be a non-empty string." 
          });
        }

        console.log(`🔍 Received query: "${userInput}"`);
        
        // Get agent for the current wallet address and network
        let { agent, config } = await getOrCreateAgent(connectedWalletAddress, selectedNetwork);
        
        let finalResponse = "";
        // Use streaming for real-time updates
        const stream = await agent.stream(
          { messages: [new HumanMessage(userInput)] },
          config
        );
        
        for await (const chunk of stream) {
          if ("agent" in chunk) {
            finalResponse = chunk.agent.messages[0].content;
          }
        }
        
        console.log(`✅ Response sent (${finalResponse.length} chars)`);
        return res.json({ response: finalResponse });
      } catch (err: any) {
        console.error("🚨 Error in /api/agent/chat:", err);
        return res.status(500).json({ error: err.message || "Unknown error occurred" });
      }
    });

    // Health check endpoint
    app.get("/api/health", (_, res) => {
      return res.json({ 
        status: "ok", 
        service: "MictlAI API",
        walletConnected: connectedWalletAddress ? true : false,
        network: selectedNetwork,
        supportedNetworks: ["base", "arbitrum", "mantle", "zksync"]
      });
    });

    // Token Selling Order endpoints
    
    // Get all selling orders
    app.get("/api/selling-orders", (req, res) => {
      try {
        // Convert from Map to Array for easier JSON serialization
        const orders = Array.from(sellingOrders.values());
        
        // Apply filters if provided
        const { token, status, limit = 10 } = req.query;
        
        let filteredOrders = orders;
        
        if (token && token !== 'ALL') {
          filteredOrders = filteredOrders.filter(order => order.token === token);
        }
        
        if (status && status !== 'ALL') {
          filteredOrders = filteredOrders.filter(order => order.status === status);
        }
        
        // Sort by creation time (newest first)
        filteredOrders = filteredOrders.sort((a, b) => b.createdAt - a.createdAt);
        
        // Apply limit
        if (limit) {
          filteredOrders = filteredOrders.slice(0, parseInt(limit as string));
        }
        
        return res.json({
          success: true,
          orders: filteredOrders
        });
      } catch (error) {
        console.error('Error fetching selling orders:', error);
        return res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : 'Unknown server error'
        });
      }
    });
    
    // Get specific selling order
    app.get("/api/selling-orders/:orderId", (req, res) => {
      try {
        const { orderId } = req.params;
        const order = sellingOrders.get(orderId);
        
        if (!order) {
          return res.status(404).json({
            success: false,
            message: `Order with ID ${orderId} not found`
          });
        }
        
        return res.json({
          success: true,
          order
        });
      } catch (error) {
        console.error(`Error fetching selling order:`, error);
        return res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : 'Unknown server error'
        });
      }
    });
    
    // Update selling order status
    app.post("/api/selling-orders/:orderId/update", (req, res) => {
      try {
        const { orderId } = req.params;
        const { status, additionalData } = req.body;
        
        const order = sellingOrders.get(orderId);
        
        if (!order) {
          return res.status(404).json({
            success: false,
            message: `Order with ID ${orderId} not found`
          });
        }
        
        // Update the order
        const updatedOrder = {
          ...order,
          status,
          ...additionalData
        };
        
        sellingOrders.set(orderId, updatedOrder);
        
        return res.json({
          success: true,
          order: updatedOrder
        });
      } catch (error) {
        console.error(`Error updating selling order:`, error);
        return res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : 'Unknown server error'
        });
      }
    });

    // Activate a selling order after transaction confirmation
    app.post("/api/selling-orders/:orderId/activate", (req, res) => {
      try {
        const { orderId } = req.params;
        const { txHash } = req.body;
        
        if (!txHash) {
          return res.status(400).json({
            success: false,
            message: 'Transaction hash is required'
          });
        }
        
        const order = sellingOrders.get(orderId);
        
        if (!order) {
          return res.status(404).json({
            success: false,
            message: `Order with ID ${orderId} not found`
          });
        }
        
        if (order.status !== 'pending') {
          return res.status(400).json({
            success: false,
            message: `Order with ID ${orderId} is not in pending status`
          });
        }
        
        // Activate the order using the utility function
        const activatedOrder = activateSellingOrder(orderId, txHash);
        
        return res.json({
          success: true,
          order: activatedOrder
        });
      } catch (error) {
        console.error(`Error activating selling order:`, error);
        return res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : 'Unknown server error'
        });
      }
    });

    // Get user's selling orders
    app.get("/api/user/:address/selling-orders", (req, res) => {
      try {
        const { address } = req.params;
        const { status, limit = 10 } = req.query;
        
        if (!address) {
          return res.status(400).json({
            success: false,
            message: 'Address parameter is required'
          });
        }
        
        // Convert from Map to Array for easier JSON serialization
        const orders = Array.from(sellingOrders.values());
        
        // Filter by user address and apply other filters
        let filteredOrders = orders.filter(order => 
          order.seller.toLowerCase() === address.toLowerCase()
        );
        
        if (status && status !== 'ALL') {
          filteredOrders = filteredOrders.filter(order => order.status === status);
        }
        
        // Sort by creation time (newest first)
        filteredOrders = filteredOrders.sort((a, b) => b.createdAt - a.createdAt);
        
        // Apply limit
        if (limit) {
          filteredOrders = filteredOrders.slice(0, parseInt(limit as string));
        }
        
        return res.json({
          success: true,
          orders: filteredOrders
        });
      } catch (error) {
        console.error('Error fetching user selling orders:', error);
        return res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : 'Unknown server error'
        });
      }
    });

    // Token Buying Order endpoints
    
    // Get all buying orders
    app.get('/api/buying-orders', (req, res) => {
      try {
        const { token, status, limit } = req.query;
        
        const tokenFilter = token ? token.toString() as 'XOC' | 'MXNe' | 'USDC' | 'ALL' : 'ALL';
        const statusFilter = status ? status.toString() as 'pending' | 'active' | 'filled' | 'cancelled' | 'expired' | 'ALL' : 'active';
        const limitNum = limit ? parseInt(limit.toString()) : 50;
        
        const orders = getBuyingOrders(tokenFilter, statusFilter, limitNum);
        
        res.json({
          success: true,
          orders
        });
      } catch (error) {
        console.error('Error getting buying orders:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    app.get('/api/buying-orders/:orderId', (req, res) => {
      try {
        const { orderId } = req.params;
        
        const order = getBuyingOrderById(orderId);
        
        if (!order) {
          return res.status(404).json({
            success: false,
            error: `Order with ID ${orderId} not found`
          });
        }
        
        res.json({
          success: true,
          order
        });
      } catch (error) {
        console.error('Error getting buying order:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    app.post('/api/buying-orders/:orderId/update', (req, res) => {
      try {
        const { orderId } = req.params;
        const { status, additionalData } = req.body;
        
        if (!status) {
          return res.status(400).json({
            success: false,
            error: 'Status is required'
          });
        }
        
        const order = getBuyingOrderById(orderId);
        
        if (!order) {
          return res.status(404).json({
            success: false,
            error: `Order with ID ${orderId} not found`
          });
        }
        
        // In a real implementation, this would include authentication
        // to ensure only authorized users can update order status
        
        const updatedOrder = updateBuyingOrderStatus(
          orderId,
          status as 'pending' | 'active' | 'filled' | 'cancelled' | 'expired',
          additionalData
        );
        
        if (!updatedOrder) {
          return res.status(500).json({
            success: false,
            error: `Failed to update order ${orderId}`
          });
        }
        
        res.json({
          success: true,
          order: updatedOrder
        });
      } catch (error) {
        console.error('Error updating buying order:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    app.get('/api/user/:address/buying-orders', (req, res) => {
      try {
        const { address } = req.params;
        const { token, status, limit } = req.query;
        
        const tokenFilter = token ? token.toString() as 'XOC' | 'MXNe' | 'USDC' | 'ALL' : 'ALL';
        const statusFilter = status ? status.toString() as 'pending' | 'active' | 'filled' | 'cancelled' | 'expired' | 'ALL' : 'ALL';
        const limitNum = limit ? parseInt(limit.toString()) : 50;
        
        const orders = getBuyingOrders(tokenFilter, statusFilter, limitNum, address);
        
        res.json({
          success: true,
          orders
        });
      } catch (error) {
        console.error('Error getting user buying orders:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // File upload endpoint for buying orders
    app.post("/api/buying-orders/:orderId/upload-image", upload.single('image'), async (req, res) => {
      try {
        const { orderId } = req.params;
        
        if (!req.file) {
          return res.status(400).json({
            success: false,
            message: 'No image file provided'
          });
        }
        
        // Get order
        const order = getBuyingOrderById(orderId);
        
        if (!order) {
          return res.status(404).json({
            success: false,
            message: `Order with ID ${orderId} not found`
          });
        }
        
        // Save file to disk
        const { fileId, path: filePath, filename } = await saveUploadedFile(
          req.file.buffer, 
          req.file.originalname
        );
        
        // Extract file extension
        const fileExt = path.extname(filename);
        
        // Update order with file information
        const updatedOrder = updateBuyingOrderStatus(
          orderId,
          order.status,
          { 
            imageFileId: fileId,
            imageFileExt: fileExt
          }
        );
        
        return res.json({
          success: true,
          message: 'Image uploaded successfully',
          fileId,
          fileExt
        });
      } catch (error) {
        console.error('Error uploading image:', error);
        return res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : 'Unknown server error'
        });
      }
    });

    // File download endpoint for buying orders
    app.get("/api/buying-orders/:orderId/download-image", async (req, res) => {
      try {
        const { orderId } = req.params;
        console.log(`📥 Download image request for order ${orderId}`);
        
        // Get order
        const order = getBuyingOrderById(orderId);
        
        if (!order) {
          console.error(`❌ Order not found: ${orderId}`);
          return res.status(404).json({
            success: false,
            message: `Order with ID ${orderId} not found`
          });
        }
        
        console.log(`📋 Order details: ${JSON.stringify({
          orderId: order.orderId,
          hasImageFileId: !!order.imageFileId,
          hasImageFileExt: !!order.imageFileExt,
          imageFileId: order.imageFileId,
          imageFileExt: order.imageFileExt,
          hasBeenDecrypted: !!order.hasBeenDecrypted
        })}`);
        
        // Check if order has an associated image
        if (!order.imageFileId || !order.imageFileExt) {
          console.error(`❌ No image associated with order ${orderId}`);
          return res.status(404).json({
            success: false,
            message: 'No image associated with this order'
          });
        }
        
        // Check if the QR code has been decrypted first
        if (!order.hasBeenDecrypted) {
          console.error(`❌ Order ${orderId} has not been decrypted yet`);
          return res.status(403).json({
            success: false,
            message: 'You must decrypt the QR code before downloading the image'
          });
        }
        
        try {
          // Get file
          console.log(`🔍 Retrieving file: ${order.imageFileId}${order.imageFileExt}`);
          const { buffer, path: filePath, filename } = await getFileById(
            order.imageFileId, 
            order.imageFileExt
          );
          
          // Content type based on file extension
          const contentType = getMimeType(order.imageFileExt);
          
          // Set response headers
          res.setHeader('Content-Type', contentType);
          res.setHeader('Content-Disposition', `attachment; filename="qr-code-${orderId}${order.imageFileExt}"`);
          
          // Return the file
          console.log(`✅ Sending file: ${filename}`);
          return res.send(buffer);
        } catch (error) {
          console.error(`❌ Error retrieving file: ${error instanceof Error ? error.message : String(error)}`);
          return res.status(404).json({
            success: false,
            message: 'File not found'
          });
        }
      } catch (error) {
        console.error('Error downloading image:', error);
        return res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : 'Unknown server error'
        });
      }
    });

    // Endpoint to request QR code download for a filled order
    app.post("/api/buying-orders/:orderId/request-download", async (req, res) => {
      try {
        const { orderId } = req.params;
        console.log(`🔄 Request for QR code download for order ${orderId}`);
        
        // Get order
        const order = getBuyingOrderById(orderId);
        
        if (!order) {
          console.error(`❌ Order not found: ${orderId}`);
          return res.status(404).json({
            success: false,
            message: `Order with ID ${orderId} not found`
          });
        }
        
        // Check if the order is filled
        if (order.status !== 'filled') {
          console.error(`❌ Order ${orderId} is not filled. Current status: ${order.status}`);
          return res.status(400).json({
            success: false,
            message: `Order ${orderId} is not filled. Current status: ${order.status}`
          });
        }
        
        // Check if order has an associated image
        if (!order.imageFileId || !order.imageFileExt) {
          console.error(`❌ No image associated with order ${orderId}`);
          return res.status(404).json({
            success: false,
            message: 'No image associated with this order'
          });
        }
        
        // Mark the QR code as ready for download
        updateBuyingOrderStatus(
          orderId,
          'filled',
          {
            downloadStarted: true,
            hasBeenDecrypted: true // Force decryption flag to true to allow download
          }
        );
        
        // Generate a download URL
        const downloadUrl = `/api/buying-orders/${orderId}/download-image?t=${Date.now()}`;
        
        console.log(`✅ QR code download ready for order ${orderId}`);
        return res.json({
          success: true,
          message: 'QR code download ready',
          downloadUrl
        });
      } catch (error) {
        console.error('Error requesting QR code download:', error);
        return res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : 'Unknown server error'
        });
      }
    });

    // QR code image download endpoint
    app.get("/api/order/:orderId/qr-image-download", async (req, res) => {
      try {
        const { orderId } = req.params;
        const { expires, imageId } = req.query;
        
        // Validate required parameters
        if (!orderId || !expires || !imageId) {
          return res.status(400).json({
            success: false,
            message: 'Missing required parameters'
          });
        }
        
        // Check if the token has expired
        const expirationTime = parseInt(expires as string, 10);
        if (isNaN(expirationTime) || Date.now() > expirationTime) {
          return res.status(403).json({
            success: false,
            message: 'Download link has expired'
          });
        }
        
        // Get the buying order
        const order = getBuyingOrderById(orderId);
        
        if (!order) {
          return res.status(404).json({
            success: false,
            message: 'Order not found'
          });
        }
        
        // Check if the order has an image
        if (!order.imageFileId || !order.imageFileExt) {
          return res.status(404).json({
            success: false,
            message: 'No image associated with this order'
          });
        }
        
        // Verify that the image ID matches
        if (order.imageFileId !== imageId) {
          return res.status(403).json({
            success: false,
            message: 'Invalid image ID'
          });
        }
        
        // Check if the order is filled
        if (order.status !== 'filled') {
          return res.status(403).json({
            success: false,
            message: 'Cannot download QR code for unfilled order'
          });
        }
        
        // Get the file
        const file = getFileById(order.imageFileId);
        
        if (!file) {
          return res.status(404).json({
            success: false,
            message: 'Image file not found'
          });
        }
        
        // Set content type based on file extension
        const contentType = getMimeType(order.imageFileExt);
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="qr-code-${orderId}.${order.imageFileExt}"`);
        
        // Send the file
        res.send(file.data);
        
        // Update the order to mark QR code as downloaded
        updateBuyingOrderStatus(orderId, 'filled', {
          qrCodeDownloaded: true,
          qrCodeDownloadedAt: Date.now()
        });
        
        console.log(`QR code for order ${orderId} downloaded successfully`);
      } catch (error) {
        console.error('Error downloading QR code image:', error);
        return res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : 'Unknown server error'
        });
      }
    });

    // Token Selling Order Fill endpoints
    
    // Get all fills for a selling order
    app.get('/api/selling-orders/:orderId/fills', (req, res) => {
      try {
        const { orderId } = req.params;
        
        const fills = getFillsByOrderId(orderId);
        
        if (fills.length === 0) {
          return res.json({
            success: true,
            message: `No fills found for order ${orderId}`,
            fills: []
          });
        }
        
        return res.json({
          success: true,
          fills
        });
      } catch (error) {
        console.error('Error getting fills for selling order:', error);
        return res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });
    
    // Get specific fill
    app.get('/api/selling-orders/:orderId/fills/:fillId', (req, res) => {
      try {
        const { orderId, fillId } = req.params;
        
        const fill = getFillById(fillId);
        
        if (!fill) {
          return res.status(404).json({
            success: false,
            message: `Fill with ID ${fillId} not found`
          });
        }
        
        // Check if this fill is associated with the order
        if (fill.orderId !== orderId) {
          return res.status(400).json({
            success: false,
            message: `Fill ${fillId} is not associated with order ${orderId}`
          });
        }
        
        return res.json({
          success: true,
          fill
        });
      } catch (error) {
        console.error('Error getting fill details:', error);
        return res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });
    
    // Update fill status
    app.post('/api/selling-orders/:orderId/fills/:fillId/update', (req, res) => {
      try {
        const { orderId, fillId } = req.params;
        const { status, additionalData } = req.body;
        
        const fill = getFillById(fillId);
        
        if (!fill) {
          return res.status(404).json({
            success: false,
            message: `Fill with ID ${fillId} not found`
          });
        }
        
        // Check if this fill is associated with the order
        if (fill.orderId !== orderId) {
          return res.status(400).json({
            success: false,
            message: `Fill ${fillId} is not associated with order ${orderId}`
          });
        }
        
        // Update the fill
        const updatedFill = updateFillStatus(
          fillId,
          status as 'pending' | 'processing' | 'completed' | 'failed' | 'expired' | 'cancelled',
          additionalData
        );
        
        if (!updatedFill) {
          return res.status(500).json({
            success: false,
            message: `Failed to update fill ${fillId}`
          });
        }
        
        return res.json({
          success: true,
          fill: updatedFill
        });
      } catch (error) {
        console.error('Error updating fill status:', error);
        return res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });
    
    // Create endpoint for filling a selling order (handled by chatbot agent)
    app.post('/api/selling-orders/:orderId/fill', async (req, res) => {
      try {
        const { orderId } = req.params;
        const { qrCodeData } = req.body;
        
        if (!qrCodeData) {
          return res.status(400).json({
            success: false,
            message: 'QR code data is required'
          });
        }
        
        // Use the agent to process the fill request
        const agentResponse = await fetch(`${req.protocol}://${req.get('host')}/api/agent/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            userInput: `fill_selling_order orderId=${orderId} qrCodeData=${qrCodeData}` 
          })
        });
        
        if (!agentResponse.ok) {
          return res.status(500).json({
            success: false,
            message: 'Failed to process fill request through agent'
          });
        }
        
        const agentData = await agentResponse.json();
        
        // Extract fill ID from agent response if available
        let fillId = null;
        const fillIdMatch = agentData.response.match(/Fill ID: ([a-zA-Z0-9-]+)/);
        if (fillIdMatch && fillIdMatch[1]) {
          fillId = fillIdMatch[1];
        }
        
        return res.json({
          success: true,
          message: 'Fill request processed',
          fillId,
          agentResponse: agentData.response
        });
      } catch (error) {
        console.error('Error filling selling order:', error);
        return res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Start the server
    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
      console.log(`🚀 API server running at http://localhost:${PORT}`);
      
      // Handle graceful shutdown
      process.on('SIGINT', () => {
        console.log('Shutting down API server...');
        if (stopTokenSellingOrderRelay) stopTokenSellingOrderRelay();
        if (stopTokenBuyingOrderRelay) stopTokenBuyingOrderRelay();
        if (stopTokenBuyingOrderFillerRelay) stopTokenBuyingOrderFillerRelay();
        if (stopTokenSellingOrderFillerRelay) stopTokenSellingOrderFillerRelay();
        process.exit(0);
      });
      
      // Log available API endpoints
      console.log(`🔗 Transactions history: http://localhost:${PORT}/api/transactions`);
      console.log(`🔗 Pending transactions: http://localhost:${PORT}/api/transactions/pending`);
      console.log(`🔗 Selling orders: http://localhost:${PORT}/api/selling-orders`);
      console.log(`🔗 Buying orders: http://localhost:${PORT}/api/buying-orders`);
    });
  } catch (error) {
    console.error("🚨 Failed to start API server:", error);
    process.exit(1);
  }
}

/**
 * Get MIME type based on file extension
 */
function getMimeType(fileExt: string): string {
  switch(fileExt.toLowerCase()) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    default:
      return 'application/octet-stream';
  }
}

// Start the server
createServer(); 