import { EvmWalletProvider } from "@coinbase/agentkit";
import { formatUnits } from "viem";
import {
  USDC_TOKEN,
  cUSD_TOKEN,
  cEUR_TOKEN,
  CELO_TOKEN,
  ERC20_ABI,
  AaveToken,
} from "./constants";

/**
 * 🪙 Interface for scanned token data
 */
export interface TokenData {
  symbol: string;
  address: string;
  balance: string;
  balanceFormatted: string;
  balanceUsd: string;
  decimals: number;
  supportedByAave: boolean;
  canBeCollateral: boolean;
}

/**
 * 📋 Token registry for easy lookup
 */
const TOKEN_REGISTRY = [
  { 
    symbol: 'CELO', 
    address: CELO_TOKEN, 
    decimals: 18, 
    supportedByAave: true, 
    canBeCollateral: true,
    priceUsd: 0.5
  },
  { 
    symbol: 'USDC', 
    address: USDC_TOKEN, 
    decimals: 6, 
    supportedByAave: true, 
    canBeCollateral: true,
    priceUsd: 1.0
  },
  { 
    symbol: 'cUSD', 
    address: cUSD_TOKEN, 
    decimals: 18, 
    supportedByAave: true, 
    canBeCollateral: false,
    priceUsd: 1.0
  },
  { 
    symbol: 'cEUR', 
    address: cEUR_TOKEN, 
    decimals: 18, 
    supportedByAave: true, 
    canBeCollateral: false,
    priceUsd: 1.08
  },
];

/**
 * 🔍 Scan for supported tokens in the user's wallet
 */
export async function scanWalletForAaveTokens(
  walletProvider: EvmWalletProvider,
  userAddress?: string
): Promise<TokenData[]> {
  const address = userAddress || await walletProvider.getAddress();
  const result: TokenData[] = [];
  
  // Check each token in the registry
  for (const token of TOKEN_REGISTRY) {
    try {
      const balance = await walletProvider.readContract({
        address: token.address as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [address as `0x${string}`],
      }) as bigint;
      
      if (balance > BigInt(0)) {
        const balanceFormatted = formatUnits(balance, token.decimals);
        const balanceUsd = (Number(balanceFormatted) * token.priceUsd).toFixed(2);
        
        result.push({
          symbol: token.symbol,
          address: token.address,
          balance: balance.toString(),
          balanceFormatted,
          balanceUsd: `$${balanceUsd}`,
          decimals: token.decimals,
          supportedByAave: token.supportedByAave,
          canBeCollateral: token.canBeCollateral
        });
      }
    } catch (error) {
      console.error(`Error checking balance for ${token.symbol}:`, error);
    }
  }
  
  return result;
}

/**
 * 📊 Get a formatted summary of wallet tokens that can be supplied to Aave
 */
export async function getWalletTokensSummary(
  walletProvider: EvmWalletProvider,
  userAddress?: string
): Promise<string> {
  const tokens = await scanWalletForAaveTokens(walletProvider, userAddress);
  const address = userAddress || await walletProvider.getAddress();
  
  let summary = `💰 **Wallet Assets for AAVE** 💰\n\n`;
  summary += `Wallet Address: \`${address}\`\n\n`;
  
  if (tokens.length === 0) {
    summary += `No supported AAVE tokens found in this wallet.\n`;
    return summary;
  }
  
  // Get native balance (CELO)
  const nativeBalance = await walletProvider.getBalance();
  const nativeBalanceFormatted = formatUnits(nativeBalance, 18);
  const nativeBalanceUsd = (Number(nativeBalanceFormatted) * 0.5).toFixed(2); // Assuming $0.5 per CELO
  
  summary += `**Native CELO Balance**: ${nativeBalanceFormatted} ($${nativeBalanceUsd})\n\n`;
  
  // Group tokens by their Aave support status
  const supportedTokens = tokens.filter(t => t.supportedByAave);
  const collateralTokens = supportedTokens.filter(t => t.canBeCollateral);
  const nonCollateralTokens = supportedTokens.filter(t => !t.canBeCollateral);
  
  // Show collateral tokens first
  if (collateralTokens.length > 0) {
    summary += `**Potential Collateral Assets**:\n`;
    collateralTokens.forEach(token => {
      summary += `• ${token.symbol}: ${token.balanceFormatted} (${token.balanceUsd}) 🔒\n`;
    });
    summary += `\n`;
  }
  
  // Then show non-collateral tokens
  if (nonCollateralTokens.length > 0) {
    summary += `**Non-Collateral Assets**:\n`;
    nonCollateralTokens.forEach(token => {
      summary += `• ${token.symbol}: ${token.balanceFormatted} (${token.balanceUsd})\n`;
    });
    summary += `\n`;
  }
  
  // Add suggestions
  if (collateralTokens.length > 0) {
    const bestCollateral = collateralTokens.sort((a, b) => 
      Number(b.balanceUsd.replace('$', '')) - Number(a.balanceUsd.replace('$', ''))
    )[0];
    
    summary += `**💡 Suggestion**: You could supply ${bestCollateral.symbol} as collateral on AAVE.\n`;
    summary += `Try: \`supply ${Number(bestCollateral.balanceFormatted) * 0.8} ${bestCollateral.symbol} to aave\`\n`;
  } else {
    summary += `**💡 Suggestion**: Get some USDC or CELO to supply as collateral on AAVE.\n`;
  }
  
  return summary;
} 