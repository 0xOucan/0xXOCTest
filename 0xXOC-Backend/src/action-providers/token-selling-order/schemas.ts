import { z } from 'zod';

/**
 * Schema for creating a token selling order
 */
export const CreateSellingOrderSchema = z.object({
  token: z.enum(['XOC', 'MXNe', 'USDC']).describe("Token symbol to sell (XOC, MXNe, or USDC)"),
  amount: z.string().min(1).describe("Amount of tokens to sell"),
  mxnAmount: z.string().min(1).optional().describe("Expected amount in MXN to receive for the tokens"),
  price: z.string().optional().describe("Optional: Price per token in USD (if not provided, market price will be used)"),
  expiration: z.number().optional().describe("Optional: Expiration time in seconds from now"),
  memo: z.string().optional().describe("Optional: Additional information about the order"),
});

export type CreateSellingOrderParams = z.infer<typeof CreateSellingOrderSchema>;

/**
 * Schema for cancelling a token selling order
 */
export const CancelSellingOrderSchema = z.object({
  orderId: z.string().describe("ID of the order to cancel"),
});

export type CancelSellingOrderParams = z.infer<typeof CancelSellingOrderSchema>;

/**
 * Schema for getting token selling order details
 */
export const GetSellingOrderSchema = z.object({
  orderId: z.string().describe("ID of the order to retrieve"),
});

export type GetSellingOrderParams = z.infer<typeof GetSellingOrderSchema>;

/**
 * Schema for listing token selling orders
 */
export const ListSellingOrdersSchema = z.object({
  token: z.enum(['XOC', 'MXNe', 'USDC', 'ALL']).optional().default('ALL').describe("Optional: Filter orders by token (default: ALL)"),
  status: z.enum(['pending', 'active', 'filled', 'cancelled', 'expired', 'ALL']).optional().default('active').describe("Optional: Filter orders by status (default: active)"),
  limit: z.number().optional().default(10).describe("Optional: Maximum number of orders to return (default: 10)"),
  userOnly: z.boolean().optional().default(false).describe("Optional: Only show orders created by the current user (default: false)"),
});

export type ListSellingOrdersParams = z.infer<typeof ListSellingOrdersSchema>;

/**
 * Schema for token selling order object
 */
export const SellingOrderSchema = z.object({
  orderId: z.string(),
  seller: z.string(),
  token: z.enum(['XOC', 'MXNe', 'USDC']),
  amount: z.string(),
  mxnAmount: z.string().optional(),
  price: z.string().optional(),
  status: z.enum(['pending', 'active', 'filled', 'cancelled', 'expired']),
  createdAt: z.number(),
  expiresAt: z.number().optional(),
  txHash: z.string(),
  memo: z.string().optional(),
  filledAt: z.number().optional(),
  filledTxHash: z.string().optional(),
  filledBy: z.string().optional(),
});

export type SellingOrder = z.infer<typeof SellingOrderSchema>; 