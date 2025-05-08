import { z } from "zod";

// 📊 Schema for checking balance of a specific wallet
export const CheckBalanceSchema = z
  .object({
    address: z.string().optional().describe("Optional: The address to check balance for. Default is the connected wallet"),
    includeUSD: z.boolean().optional().default(true).describe("Whether to include USD values in the response"),
  })
  .strip();

// 📊 Schema for checking balance of a specific token
export const CheckTokenBalanceSchema = z
  .object({
    address: z.string().optional().describe("Optional: The address to check balance for. Default is the connected wallet"),
    tokenAddress: z.string().describe("The address of the token to check"),
  })
  .strip();

// 🌐 Schema for getting the network token (CELO) balance
export const CheckNativeBalanceSchema = z
  .object({
    address: z.string().optional().describe("Optional: The address to check balance for. Default is the connected wallet"),
  })
  .strip(); 