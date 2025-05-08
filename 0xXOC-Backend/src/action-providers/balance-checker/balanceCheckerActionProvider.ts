import { z } from "zod";
import {
  ActionProvider,
  Network,
  CreateAction,
  EvmWalletProvider,
} from "@coinbase/agentkit";
import { formatUnits } from "viem";
import "reflect-metadata";
import {
  CheckBalanceSchema,
  CheckTokenBalanceSchema,
  CheckNativeBalanceSchema,
} from "./schemas";
import {
  ERC20_ABI,
  TRACKED_TOKENS,
  TOKEN_DECIMALS,
  TOKEN_SYMBOLS,
  TOKEN_PRICES_USD,
} from "./constants";
import { getAaveDashboard } from "../aave/aaveUIDataProvider";
import { ichiVaultActionProvider } from "../ichi-vault";
import { IchiVaultStrategy } from "../ichi-vault/constants";

// 💰 Interface for token balance with USD value
interface TokenBalance {
  symbol: string;
  address: string;
  balance: string;
  balanceFormatted: string;
  balanceUsd: string;
  decimals: number;
  isNative: boolean;
  icon: string;
}

/**
 * 💰 BalanceCheckerActionProvider provides actions for checking token balances on Celo
 */
export class BalanceCheckerActionProvider extends ActionProvider<EvmWalletProvider> {
  constructor() {
    super("balance-checker", []);
  }

  /**
   * 🌐 Check if we're on Celo network
   */
  private async checkNetwork(walletProvider: EvmWalletProvider): Promise<void> {
    const network = await walletProvider.getNetwork();
    // Accept both network ID and chain ID checks for Celo
    if ((!network.networkId || !network.networkId.includes("celo")) && 
        (!network.chainId || network.chainId !== "42220")) {
      throw new Error("This action provider is configured for Celo. Please switch your network to Celo.");
    }
  }

  /**
   * 🔍 Get balance of a specific token
   */
  private async getTokenBalance(
    walletProvider: EvmWalletProvider,
    tokenAddress: string,
    walletAddress: string
  ): Promise<bigint> {
    try {
      const balance = await walletProvider.readContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [walletAddress as `0x${string}`],
      }) as bigint;
      
      return balance;
    } catch (error) {
      console.error(`Error getting balance for token ${tokenAddress}:`, error);
      return BigInt(0);
    }
  }

  /**
   * 💰 Format token balance with proper decimals
   */
  private formatTokenBalance(
    balance: bigint,
    decimals: number
  ): string {
    return formatUnits(balance, decimals);
  }

  /**
   * 💲 Convert token amount to USD value
   */
  private getUsdValue(
    formattedBalance: string,
    tokenAddress: string
  ): string {
    // Use type assertion to handle the string index access
    const price = TOKEN_PRICES_USD[tokenAddress as keyof typeof TOKEN_PRICES_USD] || 0;
    const usdValue = Number(formattedBalance) * price;
    return usdValue.toFixed(2);
  }

  /**
   * 💰 Get balances for all tracked tokens
   */
  private async getAllTokenBalances(
    walletProvider: EvmWalletProvider,
    walletAddress: string,
    includeUSD: boolean = true
  ): Promise<TokenBalance[]> {
    const result: TokenBalance[] = [];
    
    // Get native CELO balance
    const nativeBalance = await walletProvider.getBalance();
    const nativeToken = TRACKED_TOKENS.find(t => t.isNative);
    
    if (nativeToken) {
      const formattedBalance = this.formatTokenBalance(nativeBalance, nativeToken.decimals);
      const balanceUsd = includeUSD ? 
        this.getUsdValue(formattedBalance, nativeToken.address) : 
        "0.00";
      
      result.push({
        symbol: nativeToken.symbol,
        address: nativeToken.address,
        balance: nativeBalance.toString(),
        balanceFormatted: formattedBalance,
        balanceUsd: `$${balanceUsd}`,
        decimals: nativeToken.decimals,
        isNative: true,
        icon: nativeToken.icon
      });
    }
    
    // Get balances for all non-native tokens
    const tokenPromises = TRACKED_TOKENS
      .filter(token => !token.isNative)
      .map(async (token) => {
        const balance = await this.getTokenBalance(
          walletProvider, 
          token.address, 
          walletAddress
        );
        
        if (balance > BigInt(0)) {
          const formattedBalance = this.formatTokenBalance(balance, token.decimals);
          const balanceUsd = includeUSD ? 
            this.getUsdValue(formattedBalance, token.address) : 
            "0.00";
          
          result.push({
            symbol: token.symbol,
            address: token.address,
            balance: balance.toString(),
            balanceFormatted: formattedBalance,
            balanceUsd: `$${balanceUsd}`,
            decimals: token.decimals,
            isNative: false,
            icon: token.icon
          });
        }
      });
    
    await Promise.all(tokenPromises);
    
    // Sort by USD value, highest first
    return result.sort((a, b) => {
      const aValue = Number(a.balanceUsd.replace('$', ''));
      const bValue = Number(b.balanceUsd.replace('$', ''));
      return bValue - aValue;
    });
  }

  /**
   * 📊 Check wallet balances
   */
  @CreateAction({
    name: "check_wallet_balances",
    description: "Check balances of all tracked tokens in a wallet",
    schema: CheckBalanceSchema,
  })
  async checkWalletBalances(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof CheckBalanceSchema>
  ): Promise<string> {
    await this.checkNetwork(walletProvider);
    
    const { address, includeUSD = true } = args;
    const walletAddress = address || await walletProvider.getAddress();
    
    const balances = await this.getAllTokenBalances(
      walletProvider,
      walletAddress,
      includeUSD
    );
    
    if (balances.length === 0) {
      return `❌ No token balances found for wallet address ${walletAddress}.`;
    }
    
    // Calculate total USD value from tokens
    const totalTokenUsdValue = balances.reduce((sum, token) => {
      return sum + Number(token.balanceUsd.replace('$', ''));
    }, 0);
    
    // Get AAVE dashboard data for accurate summary
    let aaveSummary = "";
    let aaveNetWorth = 0;
    let totalCollateral = 0;
    let totalDebt = 0;
    let borrowPowerUsed = 0;
    let availableToBorrow = 0;
    let healthFactor = 0;
    try {
      const aaveData = await getAaveDashboard(walletProvider, walletAddress);
      
      // Extract key data for a brief summary
      const totalCollateralUsd = Number(aaveData.supplies.collateral.value);
      const totalDebtUsd = Number(aaveData.borrows.balance);
      aaveNetWorth = Number(aaveData.netWorth.value);
      const availableBorrowsUsd = aaveData.availableToBorrow.length > 0 ? 
        Number(aaveData.availableToBorrow[0].availableUsd.replace('$', '')) : 0;
      const borrowPower = aaveData.borrows.powerUsed.value;
      const healthFactorValue = aaveData.healthFactor.value;
      
      // Create emoji for health factor
      let healthFactorEmoji = "🟢";
      if (healthFactorValue < 1.1) healthFactorEmoji = "🔴";
      else if (healthFactorValue < 1.5) healthFactorEmoji = "🟠";
      else if (healthFactorValue < 3) healthFactorEmoji = "🟡";
      
      aaveSummary = `
### 📊 **AAVE User Dashboard**
- **Net Worth**: $${aaveNetWorth.toFixed(2)} USD 💰
- **Total Collateral**: $${totalCollateralUsd.toFixed(2)} USD
- **Total Debt**: $${totalDebtUsd.toFixed(2)} USD
- **Available to Borrow**: $${availableBorrowsUsd.toFixed(2)} USD
- **Current Borrow Power Used**: ${borrowPower.toFixed(2)}%
- **Health Factor**: ${healthFactorValue === Infinity ? "∞" : healthFactorValue.toFixed(2)} ${healthFactorEmoji} ${this.getHealthDescription(healthFactorValue)}
`;

      totalCollateral = totalCollateralUsd;
      totalDebt = totalDebtUsd;
      borrowPowerUsed = borrowPower;
      availableToBorrow = availableBorrowsUsd;
      healthFactor = healthFactorValue;
    } catch (error) {
      console.error("Error fetching AAVE dashboard:", error);
      // Provide simplified version if there's an error
      aaveSummary = `
### 📊 **AAVE Dashboard**
To view your complete AAVE lending positions, try "aave dashboard"
`;
    }
    
    // Get ICHI vault positions
    let ichiSummary = "";
    let totalIchiValue = 0;
    let celoUsdtVaultValue = 0;
    let celoUsdcVaultValue = 0;
    try {
      // Create an instance of the ICHI vault provider
      const ichiProvider = ichiVaultActionProvider();
      
      // Get CELO-USDT vault balance
      const usdtVaultResponse = await ichiProvider.getVaultBalance(walletProvider, {
        strategy: IchiVaultStrategy.CELO_USDT
      });
      
      // Get CELO-USDC vault balance
      const usdcVaultResponse = await ichiProvider.getVaultBalance(walletProvider, {
        strategy: IchiVaultStrategy.CELO_USDC
      });
      
      // Extract detailed information using regex
      // For USDT vault
      const usdtValueMatch = usdtVaultResponse.match(/Current Value.*\$(\d+\.\d+)/);
      const usdtCeloMatch = usdtVaultResponse.match(/CELO: ([\d\.]+) \(\$([\d\.]+)/);
      const usdtTokenMatch = usdtVaultResponse.match(/USDT: ([\d\.]+) \(\$([\d\.]+)/);
      
      // For USDC vault
      const usdcValueMatch = usdcVaultResponse.match(/Current Value.*\$(\d+\.\d+)/);
      const usdcCeloMatch = usdcVaultResponse.match(/CELO: ([\d\.]+) \(\$([\d\.]+)/);
      const usdcTokenMatch = usdcVaultResponse.match(/USDC: ([\d\.]+) \(\$([\d\.]+)/);
      
      // Get values or default to 0
      const usdtValue = usdtValueMatch ? parseFloat(usdtValueMatch[1]) : 0;
      const usdcValue = usdcValueMatch ? parseFloat(usdcValueMatch[1]) : 0;
      
      // Only include ICHI positions if we have any value
      totalIchiValue = usdtValue + usdcValue;
      
      if (totalIchiValue > 0) {
        ichiSummary = `
### 🌊 **ICHI Vault Positions**
- **Total Value**: $${totalIchiValue.toFixed(2)} USD 💰

${usdtValue > 0 ? `#### CELO-USDT Vault:
${usdtCeloMatch ? `- 🟡 CELO: ${usdtCeloMatch[1]} ($${usdtCeloMatch[2]} USD)` : ''}
${usdtTokenMatch ? `- 💲 USDT: ${usdtTokenMatch[1]} ($${usdtTokenMatch[2]} USD)` : ''}
- **Value**: $${usdtValue.toFixed(2)} USD\n` : ''}

${usdcValue > 0 ? `#### CELO-USDC Vault:
${usdcCeloMatch ? `- 🟡 CELO: ${usdcCeloMatch[1]} ($${usdcCeloMatch[2]} USD)` : ''}
${usdcTokenMatch ? `- 💵 USDC: ${usdcTokenMatch[1]} ($${usdcTokenMatch[2]} USD)` : ''}
- **Value**: $${usdcValue.toFixed(2)} USD\n` : ''}
`;

        celoUsdtVaultValue = usdtValue;
        celoUsdcVaultValue = usdcValue;
      }
    } catch (error) {
      console.error("Error fetching ICHI vault positions:", error);
      // Don't show any ICHI summary if there's an error
    }
    
    // Calculate grand total including tokens, AAVE net worth, and ICHI vaults
    const grandTotal = totalTokenUsdValue + totalIchiValue + aaveNetWorth;
    
    // Format the output with better emojis and formatting
    let result = `### 💰 **Complete Portfolio Overview** 💰\n`;
    result += `**Address**: \`${walletAddress}\`  \n`;
    result += `**Total Portfolio Value**: $${grandTotal.toFixed(2)} USD\n`;
    if (totalTokenUsdValue > 0) result += `- 💵 Token Balances: $${totalTokenUsdValue.toFixed(2)} USD\n`;
    if (totalIchiValue > 0) result += `- 🌊 ICHI Vault Positions: $${totalIchiValue.toFixed(2)} USD\n`;
    if (aaveNetWorth > 0) result += `- 📊 AAVE Net Worth: $${aaveNetWorth.toFixed(2)} USD\n`;
    result += '\n';
    
    // Token balances section
    result += `#### 💵 **Token Balances**\n`;
    balances.forEach((token) => {
      result += `- ${token.icon} **${token.symbol}**: ${token.balanceFormatted} ${includeUSD ? `(${token.balanceUsd})` : ''}\n`;
    });
    
    // Add ICHI summary if available
    if (ichiSummary) {
      result += ichiSummary;
    }
    
    // Add AAVE summary
    result += aaveSummary;
    
    return result;
  }

  /**
   * Helper function to get health factor description
   */
  private getHealthDescription(healthFactor: number): string {
    if (healthFactor === Infinity || healthFactor > 10) return "(Your position is extremely safe!)";
    if (healthFactor > 3) return "(Very safe position)";
    if (healthFactor > 1.5) return "(Safe position)";
    if (healthFactor > 1.1) return "(Caution - monitor your position)";
    return "(Warning - at risk of liquidation!)";
  }

  /**
   * 🪙 Check specific token balance
   */
  @CreateAction({
    name: "check_token_balance",
    description: "Check balance of a specific token in a wallet",
    schema: CheckTokenBalanceSchema,
  })
  async checkTokenBalance(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof CheckTokenBalanceSchema>
  ): Promise<string> {
    await this.checkNetwork(walletProvider);
    
    const { address, tokenAddress } = args;
    const walletAddress = address || await walletProvider.getAddress();
    
    // Get token details
    const tokenInfo = TRACKED_TOKENS.find(t => t.address.toLowerCase() === tokenAddress.toLowerCase());
    if (!tokenInfo) {
      return `Token with address ${tokenAddress} is not in the tracked tokens list.`;
    }
    
    // Get token balance
    const balance = tokenInfo.isNative ?
      await walletProvider.getBalance() :
      await this.getTokenBalance(walletProvider, tokenAddress, walletAddress);
    
    const formattedBalance = this.formatTokenBalance(balance, tokenInfo.decimals);
    const balanceUsd = this.getUsdValue(formattedBalance, tokenAddress);
    
    return `${tokenInfo.icon} **${tokenInfo.symbol}** Balance for ${walletAddress}:\n` +
      `Balance: ${formattedBalance} ${tokenInfo.symbol}\n` +
      `Value: $${balanceUsd} USD`;
  }

  /**
   * 🪙 Check native balance (CELO)
   */
  @CreateAction({
    name: "check_native_balance",
    description: "Check CELO balance of a wallet",
    schema: CheckNativeBalanceSchema,
  })
  async checkNativeBalance(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof CheckNativeBalanceSchema>
  ): Promise<string> {
    await this.checkNetwork(walletProvider);
    
    const { address } = args;
    const walletAddress = address || await walletProvider.getAddress();
    
    // Get native token details
    const nativeToken = TRACKED_TOKENS.find(t => t.isNative);
    if (!nativeToken) {
      return `Native token information not found.`;
    }
    
    // Get native token balance
    const balance = await walletProvider.getBalance();
    const formattedBalance = this.formatTokenBalance(balance, nativeToken.decimals);
    const balanceUsd = this.getUsdValue(formattedBalance, nativeToken.address);
    
    return `${nativeToken.icon} **${nativeToken.symbol}** Balance for ${walletAddress}:\n` +
      `Balance: ${formattedBalance} ${nativeToken.symbol}\n` +
      `Value: $${balanceUsd} USD`;
  }

  /**
   * 🌐 Check if network is supported
   */
  supportsNetwork = (network: Network): boolean => {
    return network.networkId?.includes("celo") || network.chainId === "42220";
  };
}

export const balanceCheckerActionProvider = () => new BalanceCheckerActionProvider(); 