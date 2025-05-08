import { z } from 'zod';
import { SUPPORTED_TOKENS } from './constants';

export const SwapParamsSchema = z.object({
  fromToken: z.enum(SUPPORTED_TOKENS),
  toToken: z.enum(SUPPORTED_TOKENS),
  amount: z.string(),
  slippageTolerance: z.number().min(0).max(100).default(0.5),
});

export type SwapParams = z.infer<typeof SwapParamsSchema>;

export const SwapQuoteSchema = z.object({
  fromToken: z.enum(SUPPORTED_TOKENS),
  toToken: z.enum(SUPPORTED_TOKENS),
  fromAmount: z.string(),
  toAmount: z.string(),
  exchangeRate: z.string(),
});

export type SwapQuote = z.infer<typeof SwapQuoteSchema>;