import { z } from 'zod';

/**
 * Schema for validating OXXO Spin QR code data
 */
export const OxxoSpinQRDataSchema = z.object({
  TipoOperacion: z.string().refine(val => val === '0004', {
    message: 'Invalid operation type. Must be 0004 for OXXO Spin QR codes.'
  }),
  VersionQR: z.string(),
  FechaExpiracionQR: z.string(),
  FechaCreacionQR: z.string(),
  EmisorQR: z.string().refine(val => val === '101', {
    message: 'Invalid emisor ID. Must be 101 for OXXO Spin QR codes.'
  }),
  Monto: z.number().positive(),
  Concepto: z.string().optional(),
  Operacion: z.object({
    Mensaje: z.string().optional(),
    CR: z.string(),
    Comisiones: z.string().optional(),
    CadenaEncriptada: z.string().optional(),
    Aux1: z.string().optional(),
    Aux2: z.string().optional(),
  }),
});

export type OxxoSpinQRData = z.infer<typeof OxxoSpinQRDataSchema>;

/**
 * Schema for creating a token buying order
 */
export const CreateBuyingOrderSchema = z.object({
  qrCodeData: z.string().describe("OXXO Spin QR code data string (JSON format)"),
  token: z.enum(['XOC', 'MXNe', 'USDC']).describe("Token symbol to buy (XOC, MXNe, or USDC)"),
  tokenAmount: z.string().min(1).describe("Amount of tokens to buy"),
  memo: z.string().optional().describe("Optional: Additional information about the order"),
});

export type CreateBuyingOrderParams = z.infer<typeof CreateBuyingOrderSchema>;

/**
 * Schema for cancelling a token buying order
 */
export const CancelBuyingOrderSchema = z.object({
  orderId: z.string().describe("ID of the order to cancel"),
});

export type CancelBuyingOrderParams = z.infer<typeof CancelBuyingOrderSchema>;

/**
 * Schema for getting token buying order details
 */
export const GetBuyingOrderSchema = z.object({
  orderId: z.string().describe("ID of the order to retrieve"),
});

export type GetBuyingOrderParams = z.infer<typeof GetBuyingOrderSchema>;

/**
 * Schema for listing token buying orders
 */
export const ListBuyingOrdersSchema = z.object({
  token: z.enum(['XOC', 'MXNe', 'USDC', 'ALL']).optional().default('ALL').describe("Optional: Filter orders by token (default: ALL)"),
  status: z.enum(['pending', 'active', 'filled', 'cancelled', 'expired', 'ALL']).optional().default('active').describe("Optional: Filter orders by status (default: active)"),
  limit: z.number().optional().default(10).describe("Optional: Maximum number of orders to return (default: 10)"),
  userOnly: z.boolean().optional().default(false).describe("Optional: Only show orders created by the current user (default: false)"),
});

export type ListBuyingOrdersParams = z.infer<typeof ListBuyingOrdersSchema>;

/**
 * Schema for decrypting QR code data from a buying order
 */
export const DecryptQRCodeSchema = z.object({
  orderId: z.string().describe("ID of the buying order"),
  privateUuid: z.string().describe("Private UUID for decryption"),
  forceMethod: z.enum(['local', 'blockchain']).optional().describe("Optional: Force a specific decryption method"),
});

export type DecryptQRCodeParams = z.infer<typeof DecryptQRCodeSchema>;

/**
 * Token Buying Order schema
 * Represents a buy order in the marketplace where a user wants to purchase tokens with MXN (OXXO)
 */
export interface TokenBuyingOrder {
  // Order identification
  orderId: string;            // Unique order ID
  publicUuid: string;         // Public UUID that identifies the encrypted data
  
  // Buyer information
  buyer: string;              // Wallet address of the buyer
  
  // Order details
  mxnAmount: number;          // Amount in MXN (Mexican Pesos)
  token: 'XOC' | 'MXNe' | 'USDC';  // Token to buy
  tokenAmount: string;        // Amount of token to buy
  referenceCode: string;      // OXXO reference code from the QR
  qrExpiration: string;       // Expiration date of the QR code
  
  // Image file information (optional)
  imageFileId?: string;       // ID of the uploaded image file
  imageFileExt?: string;      // Extension of the uploaded image file
  
  // Order status
  status: 'pending' | 'active' | 'filled' | 'cancelled' | 'expired';
  createdAt: number;          // Timestamp when the order was created
  expiresAt: number;          // Timestamp when the order expires
  
  // Optional fields
  memo?: string;              // Optional memo for the order
  filledAt?: number;          // Timestamp when the order was filled
  filledBy?: string;          // Address of the account that filled the order
  encryptedQrData?: string;   // Encrypted QR data stored on blockchain
  txHash?: string;            // Transaction hash of the created order
  onChainTxHash?: string;     // On-chain transaction hash where QR data is stored
  
  // QR code download tracking
  qrCodeDownloaded?: boolean; // Whether the QR code has been downloaded
  qrCodeDownloadedAt?: number; // Timestamp when the QR code was downloaded
  
  // Token transfer tracking
  transferTxHash?: string;    // Transaction hash of the token transfer from escrow to buyer
  transferTimestamp?: number; // Timestamp when the tokens were transferred
  transferError?: string;     // Error message if the transfer failed
}

/**
 * Schema for token buying order object
 */
export const BuyingOrderSchema = z.object({
  orderId: z.string(),
  buyer: z.string(),
  mxnAmount: z.number(),
  token: z.enum(['XOC', 'MXNe', 'USDC']),
  tokenAmount: z.string(),
  status: z.enum(['pending', 'active', 'filled', 'cancelled', 'expired']),
  createdAt: z.number(),
  expiresAt: z.number(),
  referenceCode: z.string(), // OXXO Spin CR code
  qrExpiration: z.string(), // Original QR expiration date
  memo: z.string().optional(),
  filledAt: z.number().optional(),
  filledBy: z.string().optional(),
  txHash: z.string().optional(),
  // New fields for encrypted QR data
  encryptedQrData: z.string().optional(), // Encrypted QR code data in hex format, stored on-chain
  publicUuid: z.string().optional(), // Public UUID used for encryption
  privateUuidRef: z.string().optional(), // Reference to private UUID (not exposed in API responses)
  onChainTxHash: z.string().optional(), // Hash of the transaction that stored encrypted data on-chain
  // Image file fields
  imageFileId: z.string().optional(), // ID of the uploaded image file
  imageFileExt: z.string().optional(), // Extension of the uploaded image file
  // Decryption status
  hasBeenDecrypted: z.boolean().optional(), // Whether the QR code has been successfully decrypted
  downloadStarted: z.boolean().optional(), // Whether a download has been initiated
  // QR code download tracking
  qrCodeDownloaded: z.boolean().optional(), // Whether the QR code has been downloaded
  qrCodeDownloadedAt: z.number().optional(), // Timestamp when the QR code was downloaded
  // Token transfer tracking
  transferTxHash: z.string().optional(), // Transaction hash of the token transfer from escrow to buyer
  transferTimestamp: z.number().optional(), // Timestamp when the tokens were transferred
  transferError: z.string().optional(), // Error message if the transfer failed
});

export type BuyingOrder = z.infer<typeof BuyingOrderSchema>; 