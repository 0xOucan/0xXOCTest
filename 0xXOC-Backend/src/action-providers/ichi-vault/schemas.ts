import { z } from "zod";
import { IchiVaultStrategy } from "./constants";

// Strategy selection schema
export const StrategySelectionSchema = z
  .object({
    strategy: z.enum([IchiVaultStrategy.CELO_USDT, IchiVaultStrategy.CELO_USDC])
      .describe("The ICHI vault strategy to use (CELO-USDT or CELO-USDC)"),
  })
  .strip();

// 👍 Schema for token approval
export const ApproveTokenSchema = z
  .object({
    amount: z.string().describe("The amount of CELO tokens to approve for the ICHI vault (in wei)"),
    strategy: z.enum([IchiVaultStrategy.CELO_USDT, IchiVaultStrategy.CELO_USDC])
      .optional()
      .describe("Optional: The ICHI vault strategy to use (CELO-USDT or CELO-USDC). Default is CELO-USDT"),
  })
  .strip();

// 📥 Schema for depositing tokens
export const DepositSchema = z
  .object({
    amount: z.string().describe("The amount of CELO tokens to deposit into the ICHI vault (in wei)"),
    minimumProceeds: z.string().optional().describe("Optional: The minimum vault tokens expected to receive"),
    strategy: z.enum([IchiVaultStrategy.CELO_USDT, IchiVaultStrategy.CELO_USDC])
      .optional()
      .describe("Optional: The ICHI vault strategy to use (CELO-USDT or CELO-USDC). Default is CELO-USDT"),
  })
  .strip();

// 🚀 Schema for providing tokens directly (combines approve+deposit)
export const ProvideTokensSchema = z
  .object({
    amount: z.string().describe("The amount of CELO tokens to provide (in CELO, e.g. '5' for 5 CELO)"),
    minimumProceeds: z.string().optional().describe("Optional: The minimum vault tokens expected to receive"),
    strategy: z.enum([IchiVaultStrategy.CELO_USDT, IchiVaultStrategy.CELO_USDC])
      .optional()
      .describe("Optional: The ICHI vault strategy to use (CELO-USDT or CELO-USDC). Default is CELO-USDT"),
  })
  .strip();

// 📤 Schema for withdrawing tokens
export const WithdrawSchema = z
  .object({
    shares: z.string().describe("The amount of vault shares to withdraw (in wei)"),
    minAmount0: z.string().optional().describe("Optional: The minimum amount of token0 expected to receive"),
    minAmount1: z.string().optional().describe("Optional: The minimum amount of token1 expected to receive"),
    strategy: z.enum([IchiVaultStrategy.CELO_USDT, IchiVaultStrategy.CELO_USDC])
      .optional()
      .describe("Optional: The ICHI vault strategy to use (CELO-USDT or CELO-USDC). Default is CELO-USDT"),
  })
  .strip();

// 💼 Schema for getting balance
export const GetBalanceSchema = z
  .object({
    address: z.string().optional().describe("Optional: The address to check balance for. Default is the connected wallet"),
    strategy: z.enum([IchiVaultStrategy.CELO_USDT, IchiVaultStrategy.CELO_USDC])
      .optional()
      .describe("Optional: The ICHI vault strategy to use (CELO-USDT or CELO-USDC). Default is CELO-USDT"),
  })
  .strip();

// 💵 Schema for collecting fees 
export const CollectFeesSchema = z
  .object({
    strategy: z.enum([IchiVaultStrategy.CELO_USDT, IchiVaultStrategy.CELO_USDC])
      .optional()
      .describe("Optional: The ICHI vault strategy to use (CELO-USDT or CELO-USDC). Default is CELO-USDT"),
  })
  .strip();

// 📊 Schema for getting fee history
export const GetFeesHistorySchema = z
  .object({
    days: z.number().optional().describe("Optional: The number of days to check fee history for. Default is 7"),
    strategy: z.enum([IchiVaultStrategy.CELO_USDT, IchiVaultStrategy.CELO_USDC])
      .optional()
      .describe("Optional: The ICHI vault strategy to use (CELO-USDT or CELO-USDC). Default is CELO-USDT"),
  })
  .strip(); 