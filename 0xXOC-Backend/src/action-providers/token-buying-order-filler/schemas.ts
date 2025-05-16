import { z } from "zod";

/**
 * Schema for filling a token buying order
 */
export const FillBuyingOrderSchema = z.object({
  orderId: z.string().describe("ID of the buying order to fill"),
});

export type FillBuyingOrderParams = z.infer<typeof FillBuyingOrderSchema>;

/**
 * Schema for checking a filled order status
 */
export const CheckFilledOrderStatusSchema = z.object({
  orderId: z.string().describe("ID of the buying order to check"),
});

export type CheckFilledOrderStatusParams = z.infer<typeof CheckFilledOrderStatusSchema>;

/**
 * Schema for requesting to download a QR code for a filled order
 */
export const RequestQRCodeDownloadSchema = z.object({
  orderId: z.string().describe("ID of the buying order for which to download the QR code"),
});

export type RequestQRCodeDownloadParams = z.infer<typeof RequestQRCodeDownloadSchema>;

/**
 * Schema for listing orders filled by the user
 */
export const ListFilledOrdersSchema = z.object({
  token: z.enum(['XOC', 'MXNe', 'USDC', 'ALL']).optional().default('ALL').describe("Optional: Filter orders by token (default: ALL)"),
  limit: z.number().optional().default(10).describe("Optional: Maximum number of orders to return (default: 10)"),
});

export type ListFilledOrdersParams = z.infer<typeof ListFilledOrdersSchema>;

/**
 * Schema for the token buying order filler transaction
 */
export const FillerTransactionSchema = z.object({
  orderId: z.string(),
  filler: z.string(),
  filledAt: z.number(),
  txHash: z.string(),
  token: z.enum(['XOC', 'MXNe', 'USDC']),
  tokenAmount: z.string(),
  mxnAmount: z.number(),
  qrCodeRequestUrl: z.string().optional(),
  qrCodeDownloaded: z.boolean().optional().default(false),
  buyerId: z.string(),
});

export type FillerTransaction = z.infer<typeof FillerTransactionSchema>; 