import { z } from "zod";
import {
  ActionProvider,
  Network,
  CreateAction,
  EvmWalletProvider,
} from "@coinbase/agentkit";
import { encodeFunctionData, parseUnits, formatUnits } from "viem";
import type { Hex } from "viem";
import "reflect-metadata";
import {
  ApproveTokenSchema,
  SupplySchema,
  BorrowSchema,
  RepaySchema,
  WithdrawSchema,
  ProvideTokensSchema,
  GetUserDataSchema,
} from "./schemas";
import {
  AAVE_LENDING_POOL,
  AAVE_LENDING_POOL_ABI,
  CELO_TOKEN,
  USDC_TOKEN,
  cUSD_TOKEN,
  cEUR_TOKEN,
  ERC20_ABI,
  InterestRateMode,
  AaveToken,
  NON_COLLATERAL_TOKENS,
  DEFAULT_REFERRAL_CODE,
  USDT_TOKEN,
} from "./constants";
import {
  AaveError,
  InsufficientBalanceError,
  InsufficientAllowanceError,
  WrongNetworkError,
  TransactionFailedError,
  NonCollateralTokenError,
  HealthFactorTooLowError,
} from "./errors";
import { getAaveDashboard, getAaveDashboardSummary } from "./aaveUIDataProvider";
import { getWalletTokensSummary } from "./walletScanner";

/**
 * 🏦 AaveActionProvider provides actions for interacting with AAVE lending protocol on Celo
 */
export class AaveActionProvider extends ActionProvider<EvmWalletProvider> {
  constructor() {
    super("aave", []);
  }

  /**
   * 🌐 Check if we're on Celo network
   */
  private async checkNetwork(walletProvider: EvmWalletProvider): Promise<void> {
    const network = await walletProvider.getNetwork();
    // Accept both network ID and chain ID checks for Celo
    if ((!network.networkId || !network.networkId.includes("celo")) && 
        (!network.chainId || network.chainId !== "42220")) {
      throw new WrongNetworkError();
    }
  }

  /**
   * 🪙 Get token address based on the token enum
   */
  private getTokenAddress(token: AaveToken): string {
    switch (token) {
      case AaveToken.USDC:
        return USDC_TOKEN;
      case AaveToken.cUSD:
        return cUSD_TOKEN;
      case AaveToken.cEUR:
        return cEUR_TOKEN;
      case AaveToken.CELO:
        return CELO_TOKEN;
      default:
        throw new AaveError(`Unsupported token: ${token}`);
    }
  }

  /**
   * 💰 Check if user has enough token balance
   */
  private async checkTokenBalance(
    walletProvider: EvmWalletProvider,
    tokenAddress: string,
    amount: string
  ): Promise<void> {
    const address = await walletProvider.getAddress();
    const balance = await walletProvider.readContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [address as `0x${string}`],
    }) as bigint;

    if (balance < BigInt(amount)) {
      const tokenSymbol = await this.getTokenSymbol(walletProvider, tokenAddress);
      const formattedBalance = await this.formatTokenAmount(walletProvider, tokenAddress, balance);
      const formattedAmount = await this.formatTokenAmount(walletProvider, tokenAddress, BigInt(amount));
      
      throw new InsufficientBalanceError(
        tokenSymbol,
        formattedBalance,
        formattedAmount
      );
    }
  }

  /**
   * 🔒 Check token allowance
   */
  private async checkTokenAllowance(
    walletProvider: EvmWalletProvider,
    tokenAddress: string,
    spender: string,
    amount: string
  ): Promise<void> {
    const address = await walletProvider.getAddress();
    const allowance = await walletProvider.readContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [address as `0x${string}`, spender as `0x${string}`],
    }) as bigint;

    if (allowance < BigInt(amount)) {
      const tokenSymbol = await this.getTokenSymbol(walletProvider, tokenAddress);
      throw new InsufficientAllowanceError(
        tokenSymbol,
        allowance.toString(),
        amount
      );
    }
  }

  /**
   * 🌐 Get Celoscan link for transaction
   */
  private getCeloscanLink(txHash: string): string {
    return `https://celoscan.io/tx/${txHash}`;
  }

  /**
   * 📝 Format transaction success message without direct hash link
   */
  private getTransactionMessage(action: string, token: string, amount: string): string {
    return `I've submitted your request to ${action} ${amount} ${token}. 

The transaction has been sent to your wallet for signing. Once signed, it will be processed on the blockchain.

You can monitor the status in the Transactions panel.`;
  }

  /**
   * 🔖 Format approval transaction success message
   */
  private getApprovalMessage(token: string, amount: string): string {
    return `I've requested approval for ${amount} ${token} tokens for AAVE.

Please check your wallet to sign the approval transaction.

You can monitor the status in the Transactions panel.`;
  }

  /**
   * 💱 Format token amount with proper decimals
   */
  private async formatTokenAmount(
    walletProvider: EvmWalletProvider,
    tokenAddress: string,
    amount: bigint
  ): Promise<string> {
    try {
      const decimals = await walletProvider.readContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "decimals",
      }) as number;
      
      return formatUnits(amount, decimals);
    } catch (error) {
      console.error("Error formatting token amount:", error);
      return amount.toString();
    }
  }

  /**
   * 💱 Parse token amount to appropriate units based on decimals
   */
  private async parseTokenAmount(
    walletProvider: EvmWalletProvider,
    tokenAddress: string,
    amount: string
  ): Promise<bigint> {
    try {
      const decimals = await walletProvider.readContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "decimals",
      }) as number;
      
      return parseUnits(amount, decimals);
    } catch (error) {
      console.error("Error parsing token amount:", error);
      return BigInt(amount);
    }
  }

  /**
   * 🏷️ Get token symbol
   */
  private async getTokenSymbol(
    walletProvider: EvmWalletProvider,
    tokenAddress: string
  ): Promise<string> {
    try {
      return await walletProvider.readContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "symbol",
      }) as string;
    } catch (error) {
      console.error("Error getting token symbol:", error);
      return "Unknown";
    }
  }

  /**
   * 🔍 Check if token can be used as collateral
   */
  private checkCollateralEligibility(token: AaveToken): void {
    if (NON_COLLATERAL_TOKENS.includes(token)) {
      throw new NonCollateralTokenError(token);
    }
  }

  /**
   * 💵 Get user account data from AAVE
   */
  private async getUserAccountData(
    walletProvider: EvmWalletProvider,
    userAddress: string
  ): Promise<{
    totalCollateralETH: bigint;
    totalDebtETH: bigint;
    availableBorrowsETH: bigint;
    currentLiquidationThreshold: bigint;
    ltv: bigint;
    healthFactor: bigint;
  }> {
    const result = await walletProvider.readContract({
      address: AAVE_LENDING_POOL as `0x${string}`,
      abi: AAVE_LENDING_POOL_ABI,
      functionName: "getUserAccountData",
      args: [userAddress as `0x${string}`],
    }) as readonly [bigint, bigint, bigint, bigint, bigint, bigint];
    
    // Convert tuple to object
    return {
      totalCollateralETH: result[0],
      totalDebtETH: result[1],
      availableBorrowsETH: result[2],
      currentLiquidationThreshold: result[3],
      ltv: result[4],
      healthFactor: result[5]
    };
  }

  /**
   * 👍 Approve tokens for AAVE lending pool
   */
  @CreateAction({
    name: "approve_token_for_aave",
    description: "Approve tokens to be used by the AAVE lending pool",
    schema: ApproveTokenSchema,
  })
  async approveToken(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof ApproveTokenSchema>
  ): Promise<string> {
    await this.checkNetwork(walletProvider);
    
    // Ensure token is typed as AaveToken
    const token = args.token as AaveToken;
    const tokenAddress = this.getTokenAddress(token);
    const amount = args.amount;
    
    // Cast amount to string for parseTokenAmount
    const parsedAmount = await this.parseTokenAmount(walletProvider, tokenAddress, amount as string);
    
    // Check if user has enough balance
    await this.checkTokenBalance(walletProvider, tokenAddress, parsedAmount.toString());
    
    // Create and send the approval transaction
    const data = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "approve",
      args: [AAVE_LENDING_POOL as `0x${string}`, parsedAmount],
    }) as Hex;

    try {
      const txHash = await walletProvider.sendTransaction({
        to: tokenAddress as `0x${string}`,
        data,
      });
      
      const formattedAmount = await this.formatTokenAmount(walletProvider, tokenAddress, parsedAmount);
      return this.getApprovalMessage(token, formattedAmount);
    } catch (error) {
      throw new TransactionFailedError(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  /**
   * 📥 Supply tokens to AAVE
   */
  @CreateAction({
    name: "supply_to_aave",
    description: "Supply tokens to the AAVE lending pool as collateral",
    schema: SupplySchema,
  })
  async supplyTokens(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof SupplySchema>
  ): Promise<string> {
    await this.checkNetwork(walletProvider);
    
    // Ensure token is typed as AaveToken
    const token = args.token as AaveToken;
    const tokenAddress = this.getTokenAddress(token);
    const amount = args.amount;
    
    // Cast amount to string for parseTokenAmount
    const parsedAmount = await this.parseTokenAmount(walletProvider, tokenAddress, amount as string);
    
    // Get user address
    const userAddress = await walletProvider.getAddress();
    
    // Check if user has enough balance
    await this.checkTokenBalance(walletProvider, tokenAddress, parsedAmount.toString());
    
    // Check token allowance
    await this.checkTokenAllowance(
      walletProvider,
      tokenAddress,
      AAVE_LENDING_POOL,
      parsedAmount.toString()
    );

    // Create and send the supply transaction
    const data = encodeFunctionData({
      abi: AAVE_LENDING_POOL_ABI,
      functionName: "supply",
      args: [
        tokenAddress as `0x${string}`,
        parsedAmount,
        (args.onBehalfOf || userAddress) as `0x${string}`,
        DEFAULT_REFERRAL_CODE,
      ],
    }) as Hex;

    try {
      const txHash = await walletProvider.sendTransaction({
        to: AAVE_LENDING_POOL as `0x${string}`,
        data,
      });
      
      const formattedAmount = await this.formatTokenAmount(walletProvider, tokenAddress, parsedAmount);
      return this.getTransactionMessage("supply", token, formattedAmount);
    } catch (error) {
      throw new TransactionFailedError(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  /**
   * 🚀 Provide tokens to AAVE (approve + supply in one step)
   */
  @CreateAction({
    name: "provide_to_aave",
    description: "Approve and supply tokens to the AAVE lending pool in one operation",
    schema: ProvideTokensSchema,
  })
  async provideTokens(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof ProvideTokensSchema>
  ): Promise<string> {
    await this.checkNetwork(walletProvider);
    
    // Ensure token is typed as AaveToken
    const token = args.token as AaveToken;
    const tokenAddress = this.getTokenAddress(token);
    const amount = args.amount;
    
    // Cast amount to string for parseTokenAmount
    const parsedAmount = await this.parseTokenAmount(walletProvider, tokenAddress, amount as string);
    
    // Get user address
    const userAddress = await walletProvider.getAddress();
    
    // Check if user has enough balance
    await this.checkTokenBalance(walletProvider, tokenAddress, parsedAmount.toString());
    
    // Get current allowance
    const address = await walletProvider.getAddress();
    const allowance = await walletProvider.readContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [address as `0x${string}`, AAVE_LENDING_POOL as `0x${string}`],
    }) as bigint;

    // Approve tokens if necessary
    if (allowance < parsedAmount) {
      const approveData = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "approve",
        args: [AAVE_LENDING_POOL as `0x${string}`, parsedAmount],
      }) as Hex;

      try {
        const approveTxHash = await walletProvider.sendTransaction({
          to: tokenAddress as `0x${string}`,
          data: approveData,
        });
        
        console.log(`Approval transaction: ${this.getCeloscanLink(approveTxHash)}`);
      } catch (error) {
        throw new TransactionFailedError(
          `Token approval failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    // Create and send the supply transaction
    const supplyData = encodeFunctionData({
      abi: AAVE_LENDING_POOL_ABI,
      functionName: "supply",
      args: [
        tokenAddress as `0x${string}`,
        parsedAmount,
        (args.onBehalfOf || userAddress) as `0x${string}`,
        DEFAULT_REFERRAL_CODE,
      ],
    }) as Hex;

    try {
      const supplyTxHash = await walletProvider.sendTransaction({
        to: AAVE_LENDING_POOL as `0x${string}`,
        data: supplyData,
      });
      
      const formattedAmount = await this.formatTokenAmount(walletProvider, tokenAddress, parsedAmount);
      return this.getTransactionMessage("supply", token, formattedAmount);
    } catch (error) {
      throw new TransactionFailedError(
        `Supply transaction failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * 💸 Borrow tokens from AAVE
   */
  @CreateAction({
    name: "borrow_from_aave",
    description: "Borrow tokens from the AAVE lending pool using your supplied collateral",
    schema: BorrowSchema,
  })
  async borrowTokens(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof BorrowSchema>
  ): Promise<string> {
    await this.checkNetwork(walletProvider);
    
    // Ensure token is typed as AaveToken
    const token = args.token as AaveToken;
    const tokenAddress = this.getTokenAddress(token);
    const amount = args.amount;
    const interestRateMode = args.interestRateMode;
    const onBehalfOf = args.onBehalfOf;
    
    // Cast amount to string for parseTokenAmount
    const parsedAmount = await this.parseTokenAmount(walletProvider, tokenAddress, amount as string);
    
    // Get user address
    const userAddress = await walletProvider.getAddress();
    
    // Check user's health factor and available borrows
    const accountData = await this.getUserAccountData(walletProvider, userAddress);
    
    if (accountData.healthFactor < BigInt(12000000000000000)) { // 1.2 with 1e18 precision
      throw new HealthFactorTooLowError(
        formatUnits(accountData.healthFactor, 18)
      );
    }

    // Create and send the borrow transaction
    const data = encodeFunctionData({
      abi: AAVE_LENDING_POOL_ABI,
      functionName: "borrow",
      args: [
        tokenAddress as `0x${string}`,
        parsedAmount,
        BigInt(Number(interestRateMode)),
        DEFAULT_REFERRAL_CODE,
        (onBehalfOf || userAddress) as `0x${string}`,
      ],
    }) as Hex;

    try {
      const txHash = await walletProvider.sendTransaction({
        to: AAVE_LENDING_POOL as `0x${string}`,
        data,
      });
      
      const formattedAmount = await this.formatTokenAmount(walletProvider, tokenAddress, parsedAmount);
      return this.getTransactionMessage("borrow", token, formattedAmount);
    } catch (error) {
      throw new TransactionFailedError(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  /**
   * 💰 Repay borrowed tokens
   */
  @CreateAction({
    name: "repay_aave_loan",
    description: "Repay tokens borrowed from the AAVE lending pool",
    schema: RepaySchema,
  })
  async repayTokens(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof RepaySchema>
  ): Promise<string> {
    await this.checkNetwork(walletProvider);
    
    // Ensure token is typed as AaveToken
    const token = args.token as AaveToken;
    const tokenAddress = this.getTokenAddress(token);
    const amount = args.amount;
    const interestRateMode = args.interestRateMode;
    const onBehalfOf = args.onBehalfOf;
    
    // Cast amount to string for parseTokenAmount
    const parsedAmount = await this.parseTokenAmount(walletProvider, tokenAddress, amount as string);
    
    // Get user address
    const userAddress = await walletProvider.getAddress();
    
    // Handle full repayment case (amount = -1)
    let parsedAmountToUse: bigint;
    if (amount === "-1") {
      parsedAmountToUse = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
    } else {
      // Check if user has enough balance
      await this.checkTokenBalance(walletProvider, tokenAddress, parsedAmount.toString());
      parsedAmountToUse = parsedAmount;
    }
    
    // Check token allowance
    await this.checkTokenAllowance(
      walletProvider,
      tokenAddress,
      AAVE_LENDING_POOL,
      parsedAmountToUse.toString()
    );

    // Create and send the repay transaction
    const data = encodeFunctionData({
      abi: AAVE_LENDING_POOL_ABI,
      functionName: "repay",
      args: [
        tokenAddress as `0x${string}`,
        parsedAmountToUse,
        BigInt(Number(interestRateMode)),
        (onBehalfOf || userAddress) as `0x${string}`,
      ],
    }) as Hex;

    try {
      const txHash = await walletProvider.sendTransaction({
        to: AAVE_LENDING_POOL as `0x${string}`,
        data,
      });
      
      const amountText = amount === "-1" ? "all borrowed" : await this.formatTokenAmount(walletProvider, tokenAddress, parsedAmountToUse);
      return this.getTransactionMessage("repay", token, amountText);
    } catch (error) {
      throw new TransactionFailedError(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  /**
   * 📤 Withdraw tokens from AAVE
   */
  @CreateAction({
    name: "withdraw_from_aave",
    description: "Withdraw tokens previously supplied to the AAVE lending pool",
    schema: WithdrawSchema,
  })
  async withdrawTokens(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof WithdrawSchema>
  ): Promise<string> {
    await this.checkNetwork(walletProvider);

    const { token, amount, to } = args;
    const tokenAddress = this.getTokenAddress(token);
    
    // Get user address
    const userAddress = await walletProvider.getAddress();
    
    // Handle maximum withdrawal case (amount = -1)
    let parsedAmount: bigint;
    if (amount === "-1") {
      parsedAmount = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
    } else {
      // Parse amount to token units
      parsedAmount = await this.parseTokenAmount(walletProvider, tokenAddress, amount);
    }
    
    // Check user's health factor 
    const accountData = await this.getUserAccountData(walletProvider, userAddress);
    
    if (accountData.healthFactor < BigInt(12000000000000000) && 
        amount !== "-1" && 
        accountData.totalDebtETH > BigInt(0)) { // Only check if user has debt
      throw new HealthFactorTooLowError(
        formatUnits(accountData.healthFactor, 18)
      );
    }

    // Create and send the withdraw transaction
    const data = encodeFunctionData({
      abi: AAVE_LENDING_POOL_ABI,
      functionName: "withdraw",
      args: [
        tokenAddress as `0x${string}`,
        parsedAmount,
        (to || userAddress) as `0x${string}`,
      ],
    }) as Hex;

    try {
      const txHash = await walletProvider.sendTransaction({
        to: AAVE_LENDING_POOL as `0x${string}`,
        data,
      });
      
      const amountText = amount === "-1" ? "all" : await this.formatTokenAmount(walletProvider, tokenAddress, parsedAmount);
      return this.getTransactionMessage("withdraw", token, amountText);
    } catch (error) {
      throw new TransactionFailedError(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  /**
   * 💼 Get user account data
   */
  @CreateAction({
    name: "get_aave_user_data",
    description: "Get user account data from the AAVE lending pool",
    schema: GetUserDataSchema,
  })
  async getUserData(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof GetUserDataSchema>
  ): Promise<string> {
    await this.checkNetwork(walletProvider);

    const { address } = args;
    const userAddress = address || await walletProvider.getAddress();
    
    const accountData = await this.getUserAccountData(walletProvider, userAddress);
    
    // ETH price in USD (approximate for display purposes) - ideally this would come from an oracle
    const ethPriceUsd = 3500;

    // Convert the values to USD for display
    const totalCollateralUsd = Number(formatUnits(accountData.totalCollateralETH, 18)) * ethPriceUsd;
    const totalDebtUsd = Number(formatUnits(accountData.totalDebtETH, 18)) * ethPriceUsd;
    const availableBorrowsUsd = Number(formatUnits(accountData.availableBorrowsETH, 18)) * ethPriceUsd;
    const ltv = formatUnits(accountData.ltv, 2); // LTV is typically in percentage with 2 decimals
    const healthFactor = Number(formatUnits(accountData.healthFactor, 18)) > 100 
      ? "∞" // Show infinity symbol for extremely high health factors
      : Number(formatUnits(accountData.healthFactor, 18)).toFixed(2);
    
    return `🏦 **AAVE User Dashboard** for ${userAddress}\n\n` +
      `💰 **Total Collateral:** $${totalCollateralUsd.toFixed(2)} USD\n` +
      `💸 **Total Debt:** $${totalDebtUsd.toFixed(2)} USD\n` +
      `💵 **Available to Borrow:** $${availableBorrowsUsd.toFixed(2)} USD\n` +
      `📊 **Current LTV:** ${ltv}%\n` +
      `🛡️ **Health Factor:** ${healthFactor}\n\n` +
      `ℹ️ Your position is ${healthFactor === "∞" || Number(healthFactor) > 3 ? "extremely safe 🟢" : 
        Number(healthFactor) > 1.5 ? "healthy 🟢" : 
        Number(healthFactor) > 1.1 ? "good 🟡" : "at risk 🔴"}`;
  }

  /**
   * 🌐 Check health factor
   */
  @CreateAction({
    name: "check_aave_health_factor",
    description: "Check your current health factor in the AAVE lending pool",
    schema: GetUserDataSchema,
  })
  async checkHealthFactor(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof GetUserDataSchema>
  ): Promise<string> {
    await this.checkNetwork(walletProvider);

    const { address } = args;
    const userAddress = address || await walletProvider.getAddress();
    
    const accountData = await this.getUserAccountData(walletProvider, userAddress);
    
    const healthFactor = Number(formatUnits(accountData.healthFactor, 18)) > 100 
      ? "∞" // Show infinity symbol for extremely high health factors
      : Number(formatUnits(accountData.healthFactor, 18)).toFixed(2);
    
    let statusEmoji = "🟢";
    let statusText = "extremely safe";
    
    if (healthFactor !== "∞") {
      const hf = Number(healthFactor);
      if (hf < 1.1) {
        statusEmoji = "🔴";
        statusText = "at risk of liquidation";
      } else if (hf < 1.5) {
        statusEmoji = "🟡";
        statusText = "needs attention";
      }
    }
    
    return `🛡️ **AAVE Health Factor Check** 🛡️\n\n` +
      `Your current health factor is: **${healthFactor}** ${statusEmoji}\n\n` +
      `Status: ${statusText}\n\n` +
      `${healthFactor === "∞" || Number(healthFactor) > 3 ? 
        "✅ Your position is very safe with minimal liquidation risk." :
        Number(healthFactor) > 1.5 ?
        "✅ Your position is healthy but keep monitoring it." :
        Number(healthFactor) > 1.1 ?
        "⚠️ Your position is close to risk levels. Consider repaying some debt or adding collateral." :
        "❌ WARNING: Your position is at high risk of liquidation! Take action immediately!"}`;
  }

  /**
   * 📊 Get AAVE dashboard
   */
  @CreateAction({
    name: "getAaveDashboard",
    description: "Get a dashboard view of your Aave position, including supplies, borrows, health factor, and other important metrics",
    schema: GetUserDataSchema,
  })
  async getAaveDashboard(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof GetUserDataSchema>
  ): Promise<string> {
    try {
      await this.checkNetwork(walletProvider);
      const { address } = args;
      const userAddress = address || await walletProvider.getAddress();
      
      // Get dashboard data
      const dashboardData = await getAaveDashboard(walletProvider, userAddress);
      
      // Create a formatted dashboard similar to web UI
      let dashboard = "";
      
      // Header with Celo Market branding
      dashboard += "## 🟡 Celo Market 📊\n\n";
      
      // Top row: Net worth, Net APY, Health factor
      dashboard += `| Net worth | Net APY | Health factor |\n`;
      dashboard += `| --- | --- | --- |\n`;
      
      // Format health factor with color
      let healthFactorColor = "🟢"; // safe
      if (dashboardData.healthFactor.value < 1.1) healthFactorColor = "🔴"; // danger
      else if (dashboardData.healthFactor.value < 1.5) healthFactorColor = "🟡"; // warning
      
      dashboard += `| $${formatNumberShort(Number(dashboardData.netWorth.value))} | ${dashboardData.netAPY.formatted} | ${dashboardData.healthFactor.formatted} ${healthFactorColor} |\n\n`;
      
      // Supplies section
      dashboard += "### Your supplies\n\n";
      dashboard += `Balance: $${formatNumberShort(Number(dashboardData.supplies.balance))} | APY: ${dashboardData.supplies.apy.formatted} | Collateral: $${formatNumberShort(Number(dashboardData.supplies.collateral.value))}\n\n`;
      
      if (dashboardData.supplies.assets.length > 0) {
        dashboard += "| Asset | Balance | APY | Collateral |\n";
        dashboard += "| --- | --- | --- | --- |\n";
        
        dashboardData.supplies.assets.forEach(asset => {
          const collateral = asset.isCollateral ? "✅" : "◻️";
          dashboard += `| ${asset.icon} ${asset.symbol} | ${asset.balance} ($${asset.balanceUsd.replace("$", "")}) | ${asset.apy} | ${collateral} |\n`;
        });
      } else {
        dashboard += "No assets supplied yet.\n";
      }
      
      dashboard += "\n";

      // Borrows section
      dashboard += "### Your borrows\n\n";
      dashboard += `Balance: $${formatNumberShort(Number(dashboardData.borrows.balance))} | APY: ${dashboardData.borrows.apy.formatted} | Borrow power used: ${dashboardData.borrows.powerUsed.formatted}\n\n`;
      
      if (dashboardData.borrows.assets.length > 0) {
        dashboard += "| Asset | Debt | APY |\n";
        dashboard += "| --- | --- | --- |\n";
        
        dashboardData.borrows.assets.forEach(asset => {
          dashboard += `| ${asset.icon} ${asset.symbol} | ${asset.balance} ($${asset.balanceUsd.replace("$", "")}) | ${asset.apy} |\n`;
        });
      } else {
        dashboard += "No assets borrowed yet.\n";
      }
      
      dashboard += "\n";

      // Assets to borrow section
      dashboard += "### Assets to borrow\n\n";
      
      dashboard += "| Asset | Available | APY |\n";
      dashboard += "| --- | --- | --- |\n";
      
      dashboardData.availableToBorrow.forEach(asset => {
        dashboard += `| ${asset.icon} ${asset.symbol} | ${asset.available} ($${asset.availableUsd.replace("$", "")}) | ${asset.apy} |\n`;
      });
      
      dashboard += "\n";
      
      // Assets to supply section
      dashboard += "### Assets to supply\n\n";
      
      if (dashboardData.assetsToSupply && dashboardData.assetsToSupply.length > 0) {
        dashboard += "| Asset | Wallet balance | APY | Can be collateral |\n";
        dashboard += "| --- | --- | --- | --- |\n";
        
        dashboardData.assetsToSupply.forEach(asset => {
          const collateral = asset.canBeCollateral ? "✅" : "—";
          dashboard += `| ${asset.icon} ${asset.symbol} | ${asset.balance} ($${asset.balanceUsd.replace("$", "")}) | ${asset.apy} | ${collateral} |\n`;
        });
      } else {
        dashboard += "No assets available to supply.\n";
      }
      
      // Return the formatted dashboard
      return dashboard;
    } catch (error) {
      console.error("Error in getAaveDashboard:", error);
      return "❌ Unable to fetch your AAVE dashboard. There was an error connecting to the AAVE protocol. Please try again later or verify your wallet is connected to the Celo network.";
    }
  }

  /**
   * 💰 Scan wallet for potential assets to supply to AAVE
   */
  @CreateAction({
    name: "scan_wallet_for_aave",
    description: "Scan your wallet for tokens that can be supplied to AAVE",
    schema: GetUserDataSchema,
  })
  async scanWalletForAave(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof GetUserDataSchema>
  ): Promise<string> {
    await this.checkNetwork(walletProvider);

    const { address } = args;
    const userAddress = address || await walletProvider.getAddress();
    
    return getWalletTokensSummary(walletProvider, userAddress);
  }

  /**
   * 🌐 Check if network is supported
   */
  supportsNetwork = (network: Network): boolean => {
    return network.networkId?.includes("celo") || network.chainId === "42220";
  };
}

export const aaveActionProvider = () => new AaveActionProvider();

/**
 * Formats a number for the dashboard display
 */
function formatNumberShort(value: number): string {
  if (value < 0.01 && value > 0) {
    return "<0.01";
  }
  
  // Use 2 decimal places
  return value.toFixed(2);
} 