import { z } from 'zod';

/**
 * Schema for checking balances across chains
 */
export const CheckMultiChainBalanceSchema = z.object({
  address: z.string().optional().describe("Optional: The address to check balances for. Default is the connected wallet"),
  includeUSD: z.boolean().optional().default(true).describe("Whether to include USD values in the response"),
  chain: z.enum(['base', 'arbitrum', 'mantle', 'zksync', 'all']).default('all').describe("Chain to check balances on. Default is 'all'"),
});

export type CheckMultiChainBalanceParams = z.infer<typeof CheckMultiChainBalanceSchema>;

/**
 * Schema for checking specific token balance on a chain
 */
export const CheckTokenBalanceSchema = z.object({
  address: z.string().optional().describe("Optional: The address to check balance for. Default is the connected wallet"),
  tokenAddress: z.string().describe("The address of the token to check"),
  chain: z.enum(['base', 'arbitrum', 'mantle', 'zksync']).describe("Chain to check balance on"),
});

export type CheckTokenBalanceParams = z.infer<typeof CheckTokenBalanceSchema>;

/**
 * Schema for providing liquidity
 */
export const ProvideLiquiditySchema = z.object({
  amount: z.string().min(1).describe("Amount of tokens to provide as liquidity"),
  tokenSymbol: z.enum(['XOC', 'MXNB', 'USDT']).describe("Token symbol to provide"),
  chain: z.enum(['base', 'arbitrum', 'mantle', 'zksync']).describe("Chain to provide liquidity on"),
});

export type ProvideLiquidityParams = z.infer<typeof ProvideLiquiditySchema>;

/**
 * Schema for atomic swaps between chains
 */
export const AtomicSwapSchema = z.object({
  sourceChain: z.enum(['base', 'arbitrum', 'mantle', 'zksync']).describe("Source chain for the swap"),
  targetChain: z.enum(['base', 'arbitrum', 'mantle', 'zksync']).describe("Target chain for the swap"),
  sourceToken: z.string().describe("Token symbol on the source chain"),
  targetToken: z.string().describe("Token symbol on the target chain"),
  amount: z.string().min(1).describe("Amount to swap (in source token units)"),
  recipientAddress: z.string().optional().describe("Optional: Recipient address on the target chain. Defaults to the sender's address"),
});

export type AtomicSwapParams = z.infer<typeof AtomicSwapSchema>;

/**
 * Schema for XOC to MXNB swap
 */
export const XocToMxnbSwapSchema = z.object({
  amount: z.string().min(1).describe("Amount of XOC to swap for MXNB"),
  recipientAddress: z.string().optional().describe("Optional: Recipient address for MXNB. Defaults to the sender's address"),
});

export type XocToMxnbSwapParams = z.infer<typeof XocToMxnbSwapSchema>;

/**
 * Schema for MXNB to XOC swap
 */
export const MxnbToXocSwapSchema = z.object({
  amount: z.string().min(1).describe("Amount of MXNB to swap for XOC"),
  recipientAddress: z.string().optional().describe("Optional: Recipient address for XOC. Defaults to the sender's address"),
});

export type MxnbToXocSwapParams = z.infer<typeof MxnbToXocSwapSchema>;

/**
 * Schema for USDT to XOC swap (Mantle to Base)
 */
export const UsdtToXocSwapSchema = z.object({
  amount: z.string().min(1).describe("Amount of USDT to swap for XOC"),
  recipientAddress: z.string().optional().describe("Optional: Recipient address for XOC. Defaults to the sender's address"),
});

export type UsdtToXocSwapParams = z.infer<typeof UsdtToXocSwapSchema>;

/**
 * Schema for XOC to USDT swap (Base to Mantle)
 */
export const XocToUsdtSwapSchema = z.object({
  amount: z.string().min(1).describe("Amount of XOC to swap for USDT"),
  recipientAddress: z.string().optional().describe("Optional: Recipient address for USDT. Defaults to the sender's address"),
});

export type XocToUsdtSwapParams = z.infer<typeof XocToUsdtSwapSchema>;

/**
 * Schema for USDT to MXNB swap (Mantle to Arbitrum)
 */
export const UsdtToMxnbSwapSchema = z.object({
  amount: z.string().min(1).describe("Amount of USDT to swap for MXNB"),
  recipientAddress: z.string().optional().describe("Optional: Recipient address for MXNB. Defaults to the sender's address"),
});

export type UsdtToMxnbSwapParams = z.infer<typeof UsdtToMxnbSwapSchema>;

/**
 * Schema for MXNB to USDT swap (Arbitrum to Mantle)
 */
export const MxnbToUsdtSwapSchema = z.object({
  amount: z.string().min(1).describe("Amount of MXNB to swap for USDT"),
  recipientAddress: z.string().optional().describe("Optional: Recipient address for USDT. Defaults to the sender's address"),
});

export type MxnbToUsdtSwapParams = z.infer<typeof MxnbToUsdtSwapSchema>;

/**
 * Schema for USDT (zkSync) to XOC swap (zkSync to Base)
 */
export const ZkUsdtToXocSwapSchema = z.object({
  amount: z.string().min(1).describe("Amount of USDT on zkSync to swap for XOC"),
  recipientAddress: z.string().optional().describe("Optional: Recipient address for XOC. Defaults to the sender's address"),
});

export type ZkUsdtToXocSwapParams = z.infer<typeof ZkUsdtToXocSwapSchema>;

/**
 * Schema for XOC to USDT (zkSync) swap (Base to zkSync)
 */
export const XocToZkUsdtSwapSchema = z.object({
  amount: z.string().min(1).describe("Amount of XOC to swap for USDT on zkSync"),
  recipientAddress: z.string().optional().describe("Optional: Recipient address for USDT on zkSync. Defaults to the sender's address"),
});

export type XocToZkUsdtSwapParams = z.infer<typeof XocToZkUsdtSwapSchema>;

/**
 * Schema for USDT (zkSync) to MXNB swap (zkSync to Arbitrum)
 */
export const ZkUsdtToMxnbSwapSchema = z.object({
  amount: z.string().min(1).describe("Amount of USDT on zkSync to swap for MXNB"),
  recipientAddress: z.string().optional().describe("Optional: Recipient address for MXNB. Defaults to the sender's address"),
});

export type ZkUsdtToMxnbSwapParams = z.infer<typeof ZkUsdtToMxnbSwapSchema>;

/**
 * Schema for MXNB to USDT (zkSync) swap (Arbitrum to zkSync)
 */
export const MxnbToZkUsdtSwapSchema = z.object({
  amount: z.string().min(1).describe("Amount of MXNB to swap for USDT on zkSync"),
  recipientAddress: z.string().optional().describe("Optional: Recipient address for USDT on zkSync. Defaults to the sender's address"),
});

export type MxnbToZkUsdtSwapParams = z.infer<typeof MxnbToZkUsdtSwapSchema>;

/**
 * Schema for USDT (Mantle) to USDT (zkSync) swap
 */
export const MantleUsdtToZkUsdtSwapSchema = z.object({
  amount: z.string().min(1).describe("Amount of USDT on Mantle to swap for USDT on zkSync"),
  recipientAddress: z.string().optional().describe("Optional: Recipient address for USDT on zkSync. Defaults to the sender's address"),
});

export type MantleUsdtToZkUsdtSwapParams = z.infer<typeof MantleUsdtToZkUsdtSwapSchema>;

/**
 * Schema for USDT (zkSync) to USDT (Mantle) swap
 */
export const ZkUsdtToMantleUsdtSwapSchema = z.object({
  amount: z.string().min(1).describe("Amount of USDT on zkSync to swap for USDT on Mantle"),
  recipientAddress: z.string().optional().describe("Optional: Recipient address for USDT on Mantle. Defaults to the sender's address"),
});

export type ZkUsdtToMantleUsdtSwapParams = z.infer<typeof ZkUsdtToMantleUsdtSwapSchema>;

/**
 * Schema for receiving a swap receipt
 */
export const SwapReceiptSchema = z.object({
  transactionId: z.string().optional().describe("Transaction ID of the swap (optional, will use latest if not provided)"),
});

export type SwapReceiptParams = z.infer<typeof SwapReceiptSchema>;

/**
 * Schema for swap result
 */
export const SwapResultSchema = z.object({
  swapId: z.string(),
  sourceChain: z.enum(['base', 'arbitrum', 'mantle', 'zksync']),
  targetChain: z.enum(['base', 'arbitrum', 'mantle', 'zksync']),
  sourceAmount: z.string(),
  sourceToken: z.string(),
  targetAmount: z.string(),
  targetToken: z.string(),
  senderAddress: z.string(),
  recipientAddress: z.string(),
  sourceTxHash: z.string().optional(),
  targetTxHash: z.string().optional(),
  status: z.enum(['pending', 'completed', 'failed']),
  timestamp: z.number(),
});

export type SwapResult = z.infer<typeof SwapResultSchema>; 