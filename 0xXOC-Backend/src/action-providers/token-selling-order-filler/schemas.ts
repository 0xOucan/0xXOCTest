import { z } from 'zod';

// Re-import the OxxoSpinQRDataSchema to ensure consistency
import { OxxoSpinQRDataSchema } from '../token-buying-order/schemas';
export type OxxoSpinQRData = z.infer<typeof OxxoSpinQRDataSchema>;

/**
 * Schema for filling a token selling order with a QR code
 */
export const FillSellingOrderSchema = z.object({
  orderId: z.string().describe("ID of the selling order to fill"),
  qrCodeData: z.string().describe("OXXO Spin QR code data for payment verification"),
});

export type FillSellingOrderParams = z.infer<typeof FillSellingOrderSchema>;

/**
 * Schema for checking the status of a fill
 */
export const CheckFillStatusSchema = z.object({
  orderId: z.string().describe("ID of the selling order"),
  fillId: z.string().optional().describe("Optional: ID of the specific fill to check"),
});

export type CheckFillStatusParams = z.infer<typeof CheckFillStatusSchema>;

/**
 * Schema for cancelling a fill that's in progress
 */
export const CancelFillSchema = z.object({
  orderId: z.string().describe("ID of the selling order"),
  fillId: z.string().describe("ID of the fill to cancel"),
});

export type CancelFillParams = z.infer<typeof CancelFillSchema>;

/**
 * Schema for selling order fill status
 */
export const FillStatusSchema = z.enum([
  'pending',    // Initiated but not yet processed
  'processing', // QR code validated, processing the fill
  'completed',  // Fill completed successfully
  'failed',     // Fill failed
  'expired',    // Fill expired without completion
  'cancelled'   // Fill cancelled by the user
]);

export type FillStatus = z.infer<typeof FillStatusSchema>;

/**
 * Schema for a token selling order fill record
 */
export const SellingOrderFillSchema = z.object({
  fillId: z.string(),                    // Unique ID for this fill
  orderId: z.string(),                   // ID of the selling order being filled
  filler: z.string(),                    // Address of the user filling the order
  
  // QR code details
  qrReferenceCode: z.string(),           // Reference code from the QR
  qrAmount: z.number(),                  // MXN amount from the QR
  qrExpiration: z.string(),              // Expiration date of the QR code
  
  // Fill status
  status: FillStatusSchema,              // Current status of the fill
  createdAt: z.number(),                 // When the fill was initiated
  expiresAt: z.number(),                 // When the fill expires if not completed
  
  // Optional blockchain-related fields
  txHash: z.string().optional(),         // Transaction hash for storing QR data
  onChainTxHash: z.string().optional(),  // Transaction hash for on-chain aspects
  
  // Optional field for encrypted QR data stored on blockchain
  encryptedQrData: z.string().optional(),

  // Optional field for transaction completion time
  completedAt: z.number().optional(),
  
  // Optional UUID for encrypted data access
  publicUuid: z.string().optional(),
  
  // Error information if the fill failed
  error: z.string().optional(),
  
  // Token transfer fields
  transferTxId: z.string().optional(),       // ID of the token transfer transaction
  transferTxHash: z.string().optional(),     // Hash of the token transfer transaction
  escrowTransferInitiated: z.boolean().optional(), // Whether token transfer from escrow has been initiated
  escrowTransferTimestamp: z.number().optional(), // When token transfer was initiated
  transferCompleted: z.boolean().optional(),  // Whether token transfer was completed
  transferCompletedTimestamp: z.number().optional(), // When token transfer was completed
  transferError: z.string().optional(),      // Error if token transfer failed
});

export type SellingOrderFill = z.infer<typeof SellingOrderFillSchema>; 