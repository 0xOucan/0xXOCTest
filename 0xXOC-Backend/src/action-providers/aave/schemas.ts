import { z } from "zod";
import { AaveToken, InterestRateMode } from "./constants";

// 👍 Schema for token approval
export const ApproveTokenSchema = z
  .object({
    token: z.enum([AaveToken.USDC, AaveToken.cUSD, AaveToken.cEUR, AaveToken.CELO])
      .describe("The token to approve for AAVE lending pool"),
    amount: z.string().describe("The amount of tokens to approve (in token units)"),
  })
  .strip();

// 📥 Schema for supplying tokens as collateral
export const SupplySchema = z
  .object({
    token: z.enum([AaveToken.USDC, AaveToken.cUSD, AaveToken.cEUR, AaveToken.CELO])
      .describe("The token to supply to AAVE"),
    amount: z.string().describe("The amount of tokens to supply (in token units)"),
    onBehalfOf: z.string().optional().describe("Optional: The address that will receive the aTokens. Default is caller's address"),
  })
  .strip();

// 🚀 Schema for supplying tokens directly (combines approve+supply)
export const ProvideTokensSchema = z
  .object({
    token: z.enum([AaveToken.USDC, AaveToken.cUSD, AaveToken.cEUR, AaveToken.CELO])
      .describe("The token to provide to AAVE"),
    amount: z.string().describe("The amount of tokens to provide (in token units)"),
    onBehalfOf: z.string().optional().describe("Optional: The address that will receive the aTokens. Default is caller's address"),
  })
  .strip();

// 💸 Schema for borrowing tokens
export const BorrowSchema = z
  .object({
    token: z.enum([AaveToken.USDC, AaveToken.cUSD, AaveToken.cEUR, AaveToken.CELO])
      .describe("The token to borrow from AAVE"),
    amount: z.string().describe("The amount of tokens to borrow (in token units)"),
    interestRateMode: z.enum([
      InterestRateMode.STABLE.toString(), 
      InterestRateMode.VARIABLE.toString()
    ])
      .default(InterestRateMode.VARIABLE.toString())
      .describe("The interest rate mode (1 for stable, 2 for variable). Default is variable."),
    onBehalfOf: z.string().optional().describe("Optional: The address that will receive the borrowed tokens. Default is caller's address"),
  })
  .strip();

// 💰 Schema for repaying borrowed tokens
export const RepaySchema = z
  .object({
    token: z.enum([AaveToken.USDC, AaveToken.cUSD, AaveToken.cEUR, AaveToken.CELO])
      .describe("The borrowed token to repay"),
    amount: z.string().describe("The amount of tokens to repay (in token units, use '-1' for full repayment)"),
    interestRateMode: z.enum([
      InterestRateMode.STABLE.toString(), 
      InterestRateMode.VARIABLE.toString()
    ])
      .default(InterestRateMode.VARIABLE.toString())
      .describe("The interest rate mode of the debt (1 for stable, 2 for variable). Default is variable."),
    onBehalfOf: z.string().optional().describe("Optional: The address whose debt will be repaid. Default is caller's address"),
  })
  .strip();

// 📤 Schema for withdrawing tokens
export const WithdrawSchema = z
  .object({
    token: z.enum([AaveToken.USDC, AaveToken.cUSD, AaveToken.cEUR, AaveToken.CELO])
      .describe("The token to withdraw from AAVE"),
    amount: z.string().describe("The amount of tokens to withdraw (in token units, use '-1' for maximum)"),
    to: z.string().optional().describe("Optional: The address that will receive the withdrawn tokens. Default is caller's address"),
  })
  .strip();

// 💼 Schema for getting user data
export const GetUserDataSchema = z
  .object({
    address: z.string().optional().describe("Optional: The address to check data for. Default is the connected wallet"),
  })
  .strip(); 