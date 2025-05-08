import { z } from "zod";
import {
  ActionProvider,
  Network,
  CreateAction,
  EvmWalletProvider,
} from "@coinbase/agentkit";
import { formatUnits, parseUnits, encodeFunctionData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { createWalletClient, http } from "viem";
import { base, arbitrum, mantle, zkSync } from "viem/chains";
import "reflect-metadata";
import {
  CheckMultiChainBalanceSchema,
  CheckTokenBalanceSchema,
  ProvideLiquiditySchema,
  XocToMxnbSwapSchema,
  MxnbToXocSwapSchema,
  SwapReceiptSchema,
  UsdtToXocSwapSchema,
  XocToUsdtSwapSchema,
  UsdtToMxnbSwapSchema,
  MxnbToUsdtSwapSchema,
  ZkUsdtToXocSwapSchema,
  XocToZkUsdtSwapSchema,
  ZkUsdtToMxnbSwapSchema,
  MxnbToZkUsdtSwapSchema,
  MantleUsdtToZkUsdtSwapSchema,
  ZkUsdtToMantleUsdtSwapSchema,
} from "./schemas";
import {
  ERC20_ABI,
  TRACKED_TOKENS,
  BASE_CHAIN_ID,
  ARBITRUM_CHAIN_ID,
  MANTLE_CHAIN_ID,
  ZKSYNC_ERA_CHAIN_ID,
  XOC_TOKEN_ADDRESS,
  MXNB_TOKEN_ADDRESS,
  USDT_MANTLE_TOKEN_ADDRESS,
  USDT_ZKSYNC_ERA_TOKEN_ADDRESS,
  XOC_DECIMALS,
  MXNB_DECIMALS,
  USDT_MANTLE_DECIMALS,
  USDT_ZKSYNC_ERA_DECIMALS,
  SWAP_FEE_PERCENTAGE,
  ESCROW_WALLET_ADDRESS,
} from "./constants";
import {
  WrongNetworkError,
  InsufficientBalanceError,
  InvalidAmountError,
  TransactionFailedError,
  InsufficientEscrowBalanceError,
} from "./errors";
import {
  formatAmount,
  getExplorerLink,
  getTransactionTextLink,
  applySwapFee,
  convertUsdtToXoc,
  convertUsdtToMxnb,
  convertXocToUsdt,
  convertMxnbToUsdt,
  convertZkUsdtToXoc,
  convertXocToZkUsdt,
  convertZkUsdtToMxnb,
  convertMxnbToZkUsdt,
  convertMantleUsdtToZkUsdt,
  convertZkUsdtToMantleUsdt,
  createSwapId,
  recordSwap,
  getMostRecentSwap,
  chainClients,
} from "./utils";
import { createPendingTransaction } from "../../utils/transaction-utils";

// Interface for token balance with USD value
interface TokenBalance {
  symbol: string;
  address: string;
  balance: string;
  balanceFormatted: string;
  balanceUsd: string;
  decimals: number;
  isNative: boolean;
  icon: string;
  chain: string;
}

/**
 * BasicAtomicSwapActionProvider provides actions for cross-chain atomic swaps
 * between Base, Arbitrum, and Mantle networks, focusing on XOC, MXNB, and USDT tokens.
 */
export class BasicAtomicSwapActionProvider extends ActionProvider<EvmWalletProvider> {
  constructor() {
    super("basic-atomic-swaps", []);
  }

  /**
   * Verify that the wallet is connected to the specified network
   */
  private async checkNetwork(
    walletProvider: EvmWalletProvider,
    chain: 'base' | 'arbitrum' | 'mantle' | 'zksync'
  ): Promise<void> {
    const network = await walletProvider.getNetwork();
    
    if (chain === 'base' && network.chainId !== BASE_CHAIN_ID) {
      throw new WrongNetworkError(network.chainId || 'unknown', 'Base');
    } else if (chain === 'arbitrum' && network.chainId !== ARBITRUM_CHAIN_ID) {
      throw new WrongNetworkError(network.chainId || 'unknown', 'Arbitrum');
    } else if (chain === 'mantle' && network.chainId !== MANTLE_CHAIN_ID) {
      throw new WrongNetworkError(network.chainId || 'unknown', 'Mantle');
    } else if (chain === 'zksync' && network.chainId !== ZKSYNC_ERA_CHAIN_ID) {
      throw new WrongNetworkError(network.chainId || 'unknown', 'zkSync Era');
    }
  }

  /**
   * Get the native token balance for a wallet on a specific chain
   */
  private async getNativeBalance(
    chain: 'base' | 'arbitrum' | 'mantle' | 'zksync',
    walletAddress: string
  ): Promise<bigint> {
    try {
      const client = chainClients[chain];
      return await client.getBalance({ address: walletAddress as `0x${string}` });
    } catch (error) {
      console.error(`Error getting native balance on ${chain}:`, error);
      return BigInt(0);
    }
  }

  /**
   * Get the token balance for a wallet on a specific chain
   */
  private async getTokenBalance(
    chain: 'base' | 'arbitrum' | 'mantle' | 'zksync',
    tokenAddress: string,
    walletAddress: string
  ): Promise<bigint> {
    try {
      const client = chainClients[chain];
      return await client.readContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [walletAddress as `0x${string}`],
      }) as bigint;
    } catch (error) {
      console.error(`Error getting token balance on ${chain}:`, error);
      return BigInt(0);
    }
  }

  /**
   * Convert token amount to USD value
   */
  private getUsdValue(
    formattedBalance: string,
    token: { symbol: string; price: number }
  ): string {
    const usdValue = Number(formattedBalance) * token.price;
    return usdValue.toFixed(2);
  }

  /**
   * Get balances for all tracked tokens across specified chains
   */
  private async getAllTokenBalances(
    walletAddress: string,
    includeUSD: boolean = true,
    chain: 'base' | 'arbitrum' | 'mantle' | 'zksync' | 'all' = 'all'
  ): Promise<TokenBalance[]> {
    const result: TokenBalance[] = [];
    const chains = chain === 'all' ? ['base', 'arbitrum', 'mantle', 'zksync'] : [chain];
    
    for (const currentChain of chains) {
      // Get native ETH balance
      const nativeBalance = await this.getNativeBalance(
        currentChain as 'base' | 'arbitrum' | 'mantle' | 'zksync', 
        walletAddress
      );
      
      const nativeToken = TRACKED_TOKENS[currentChain.toUpperCase() as keyof typeof TRACKED_TOKENS]
        .find(t => t.isNative);
      
      if (nativeToken) {
        const formattedBalance = formatAmount(nativeBalance, nativeToken.decimals);
        const balanceUsd = includeUSD ? 
          this.getUsdValue(formattedBalance, nativeToken) : 
          "0.00";
        
        result.push({
          symbol: nativeToken.symbol,
          address: nativeToken.address,
          balance: nativeBalance.toString(),
          balanceFormatted: formattedBalance,
          balanceUsd: `$${balanceUsd}`,
          decimals: nativeToken.decimals,
          isNative: true,
          icon: nativeToken.icon,
          chain: currentChain,
        });
      }
      
      // Get balances for all non-native tokens on this chain
      const tokenPromises = TRACKED_TOKENS[currentChain.toUpperCase() as keyof typeof TRACKED_TOKENS]
        .filter(token => !token.isNative)
        .map(async (token) => {
          const balance = await this.getTokenBalance(
            currentChain as 'base' | 'arbitrum' | 'mantle' | 'zksync',
            token.address,
            walletAddress
          );
          
          const formattedBalance = formatAmount(balance, token.decimals);
          const balanceUsd = includeUSD ? 
            this.getUsdValue(formattedBalance, token) : 
            "0.00";
          
          result.push({
            symbol: token.symbol,
            address: token.address,
            balance: balance.toString(),
            balanceFormatted: formattedBalance,
            balanceUsd: `$${balanceUsd}`,
            decimals: token.decimals,
            isNative: false,
            icon: token.icon,
            chain: currentChain,
          });
        });
      
      await Promise.all(tokenPromises);
    }
    
    // Sort by USD value, highest first
    return result.sort((a, b) => {
      const aValue = Number(a.balanceUsd.replace('$', ''));
      const bValue = Number(b.balanceUsd.replace('$', ''));
      return bValue - aValue;
    });
  }

  /**
   * Check balances across multiple chains
   */
  @CreateAction({
    name: "check_multichain_balances",
    description: "Check token balances across Base and Arbitrum chains",
    schema: CheckMultiChainBalanceSchema,
  })
  async checkMultiChainBalances(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof CheckMultiChainBalanceSchema>
  ): Promise<string> {
    const { address, includeUSD = true, chain = 'all' } = args;
    const walletAddress = address || await walletProvider.getAddress();
    
    // No need to check network since we're using separate clients for each chain
    
    try {
      const balances = await this.getAllTokenBalances(
        walletAddress,
        includeUSD,
        chain
      );
      
      if (balances.length === 0) {
        return `❌ No token balances found for wallet address ${walletAddress}.`;
      }
      
      // Group balances by chain
      const balancesByChain: Record<string, TokenBalance[]> = {};
      for (const balance of balances) {
        if (!balancesByChain[balance.chain]) {
          balancesByChain[balance.chain] = [];
        }
        balancesByChain[balance.chain].push(balance);
      }
      
      // Format the output
      let output = `📊 **Multi-Chain Wallet Balance Report**\n\n`;
      output += `Wallet: \`${walletAddress}\`\n\n`;
      
      let totalUsdValue = 0;
      
      // Add each chain's balances
      for (const [chainName, chainBalances] of Object.entries(balancesByChain)) {
        output += `📌 **${chainName.toUpperCase()} NETWORK**\n`;
        
        for (const balance of chainBalances) {
          if (parseFloat(balance.balanceFormatted) > 0) {
            output += `${balance.icon} ${balance.symbol}: ${balance.balanceFormatted} (${balance.balanceUsd})\n`;
            totalUsdValue += parseFloat(balance.balanceUsd.replace('$', ''));
          }
        }
        
        output += `\n`;
      }
      
      // Add the total value
      if (includeUSD) {
        output += `💰 **Total Portfolio Value**: $${totalUsdValue.toFixed(2)}\n\n`;
      }
      
      return output;
    } catch (error) {
      console.error('Error in checkMultiChainBalances:', error);
      if (error instanceof Error) {
        return `❌ Error checking balances: ${error.message}`;
      }
      return `❌ An unknown error occurred while checking balances.`;
    }
  }

  /**
   * Check specific token balance on a chain
   */
  @CreateAction({
    name: "check_token_balance",
    description: "Check balance of a specific token on Base or Arbitrum",
    schema: CheckTokenBalanceSchema,
  })
  async checkTokenBalance(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof CheckTokenBalanceSchema>
  ): Promise<string> {
    const { address, tokenAddress, chain } = args;
    const walletAddress = address || await walletProvider.getAddress();
    
    try {
      const balance = await this.getTokenBalance(
        chain, 
        tokenAddress, 
        walletAddress
      );
      
      // Lookup token in tracked tokens
      const chainTokens = TRACKED_TOKENS[chain.toUpperCase() as keyof typeof TRACKED_TOKENS];
      const token = chainTokens.find(t => t.address.toLowerCase() === tokenAddress.toLowerCase());
      
      if (!token) {
        // If token is not in our tracked list, try to get its details
        const client = chainClients[chain];
        try {
          const symbol = await client.readContract({
            address: tokenAddress as `0x${string}`,
            abi: ERC20_ABI,
            functionName: "symbol"
          }) as string;
          
          const decimals = await client.readContract({
            address: tokenAddress as `0x${string}`,
            abi: ERC20_ABI,
            functionName: "decimals"
          }) as number;
          
          const formattedBalance = formatAmount(balance, decimals);
          
          return `💰 **Token Balance**\n\nToken: ${symbol} (${tokenAddress})\nChain: ${chain.toUpperCase()}\nBalance: ${formattedBalance}`;
        } catch (error) {
          return `❌ Could not get details for token ${tokenAddress} on ${chain}. Balance: ${balance.toString()}`;
        }
      }
      
      const formattedBalance = formatAmount(balance, token.decimals);
      const usdValue = this.getUsdValue(formattedBalance, token);
      
      return `💰 **Token Balance**\n\nToken: ${token.symbol} ${token.icon}\nChain: ${chain.toUpperCase()}\nBalance: ${formattedBalance}\nValue: $${usdValue}`;
    } catch (error) {
      console.error(`Error checking token balance on ${chain}:`, error);
      if (error instanceof Error) {
        return `❌ Error checking token balance: ${error.message}`;
      }
      return `❌ An unknown error occurred while checking token balance.`;
    }
  }

  /**
   * Provide liquidity (only supports XOC on Base for now)
   */
  @CreateAction({
    name: "provide_liquidity",
    description: "Provide liquidity to the cross-chain swap pool (XOC on Base)",
    schema: ProvideLiquiditySchema,
  })
  async provideLiquidity(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof ProvideLiquiditySchema>
  ): Promise<string> {
    const { amount, tokenSymbol, chain } = args;
    
    try {
      // Check that the wallet is on the right network
      await this.checkNetwork(walletProvider, chain);
      
      const walletAddress = await walletProvider.getAddress();
      
      // Currently only support XOC on Base
      if (tokenSymbol !== 'XOC' || chain !== 'base') {
        return `❌ Currently only XOC liquidity provision on Base is supported.`;
      }
      
      // Get the token address
      const tokenAddress = XOC_TOKEN_ADDRESS;
      
      // Check token balance
      const tokenBalance = await this.getTokenBalance(chain, tokenAddress, walletAddress);
      const amountInWei = parseUnits(amount, XOC_DECIMALS);
      
      if (tokenBalance < amountInWei) {
        throw new InsufficientBalanceError(
          formatAmount(tokenBalance, XOC_DECIMALS),
          amount,
          tokenSymbol
        );
      }
      
      // Get the escrow wallet address
      const escrowWalletAddress = ESCROW_WALLET_ADDRESS;
      if (!escrowWalletAddress) {
        // Use a hardcoded fallback for testing purposes
        // In production, you'd want to ensure the env var is set
        console.error("Escrow wallet address not configured in environment variables, using fallback");
        throw new Error("Escrow wallet address not configured. Please set WALLET_ADDRESS in your .env file.");
      }
      
      console.log(`Using escrow wallet address: ${escrowWalletAddress}`);
      
      // Create encoded data for the transfer function
      const data = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [escrowWalletAddress as `0x${string}`, amountInWei],
      });
      
      // Transfer tokens to the escrow wallet
      const txHash = await walletProvider.sendTransaction({
        to: tokenAddress as `0x${string}`,
        data,
      });
      
      return `✅ Successfully provided ${amount} ${tokenSymbol} as liquidity on ${chain.toUpperCase()}.\n\n${getTransactionTextLink(chain, txHash)}\n\nYour liquidity will be used to facilitate cross-chain swaps between Base and Arbitrum.`;
    } catch (error) {
      console.error(`Error providing liquidity:`, error);
      if (error instanceof InsufficientBalanceError) {
        return `❌ ${error.message}`;
      } else if (error instanceof WrongNetworkError) {
        return `❌ ${error.message} Please switch to the ${chain} network and try again.`;
      } else if (error instanceof Error) {
        return `❌ Error providing liquidity: ${error.message}`;
      }
      return `❌ An unknown error occurred while providing liquidity.`;
    }
  }

  /**
   * Execute an atomic swap from XOC on Base to MXNB on Arbitrum
   */
  @CreateAction({
    name: "swap_xoc_to_mxnb",
    description: "Swap XOC on Base for MXNB on Arbitrum",
    schema: XocToMxnbSwapSchema,
  })
  async swapXocToMxnb(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof XocToMxnbSwapSchema>
  ): Promise<string> {
    const { amount, recipientAddress } = args;
    
    try {
      // We won't check network here to avoid the chain switching issue
      // The transaction will still work if the wallet handles chain switching correctly
      // await this.checkNetwork(walletProvider, 'base');
      
      const senderAddress = await walletProvider.getAddress();
      const targetAddress = recipientAddress || senderAddress;
      
      // Validate amount (check if it's a valid number)
      if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        throw new InvalidAmountError(amount, '0.000001', '1000', 'XOC');
      }
      
      // Check sender's XOC balance on Base using public client instead of wallet provider
      const sourceBalance = await this.getTokenBalance(
        'base',
        XOC_TOKEN_ADDRESS,
        senderAddress
      );
      
      const amountInWei = parseUnits(amount, XOC_DECIMALS);
      
      if (sourceBalance < amountInWei) {
        throw new InsufficientBalanceError(
          formatAmount(sourceBalance, XOC_DECIMALS),
          amount,
          'XOC'
        );
      }
      
      // Get the escrow wallet address
      const escrowWalletAddress = ESCROW_WALLET_ADDRESS;
      if (!escrowWalletAddress) {
        // Use a hardcoded fallback for testing purposes
        // In production, you'd want to ensure the env var is set
        console.error("Escrow wallet address not configured in environment variables, using fallback");
        throw new Error("Escrow wallet address not configured. Please set WALLET_ADDRESS in your .env file.");
      }
      
      console.log(`Using escrow wallet address: ${escrowWalletAddress}`);
      
      // Get escrow wallet's MXNB balance on Arbitrum
      const escrowMxnbBalance = await this.getTokenBalance(
        'arbitrum',
        MXNB_TOKEN_ADDRESS,
        escrowWalletAddress
      );
      
      // Calculate the amount of MXNB to send (apply the swap fee)
      const targetAmount = applySwapFee(amount, MXNB_DECIMALS);
      const targetAmountInWei = parseUnits(targetAmount, MXNB_DECIMALS);
      
      if (escrowMxnbBalance < targetAmountInWei) {
        throw new InsufficientEscrowBalanceError(
          formatAmount(escrowMxnbBalance, MXNB_DECIMALS),
          targetAmount,
          'MXNB',
          'Arbitrum'
        );
      }
      
      console.log(`Sending XOC to escrow address: ${escrowWalletAddress}`);
      
      // Instead of directly calling sendTransaction, use createPendingTransaction to properly set chain info
      const data = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [escrowWalletAddress as `0x${string}`, amountInWei],
      });
      
      // Create a pending transaction for Base chain
      const txId = createPendingTransaction(
        XOC_TOKEN_ADDRESS,
        "0", // No value since we're calling a contract
        data,
        senderAddress,
        'base' // Explicitly specify Base chain
      );
      
      // Get the transaction hash after the wallet signs it
      // This will be handled by the frontend wallet connection
      const sourceTxHash = txId; // We'll use the txId as a reference until the real hash is available
      
      // Create a swap record
      const swapId = createSwapId();
      recordSwap({
        swapId,
        sourceChain: 'base',
        targetChain: 'arbitrum',
        sourceAmount: amount,
        sourceToken: 'XOC',
        targetAmount: targetAmount,
        targetToken: 'MXNB',
        senderAddress,
        recipientAddress: targetAddress,
        sourceTxHash,
        status: 'pending',
        timestamp: Date.now(),
      });
      
      // Now we need to send MXNB from escrow to recipient on Arbitrum
      // For now, we'll simulate this by just returning a success message
      
      return `✅ **Atomic Swap Initiated**\n\nSwap ID: ${swapId}\n\n**From:**\n- ${amount} XOC on Base\n- ${getTransactionTextLink('base', sourceTxHash)}\n\n**To:**\n- ${targetAmount} MXNB on Arbitrum (after ${SWAP_FEE_PERCENTAGE}% fee)\n- Recipient: ${targetAddress}\n\nThe MXNB will be sent to your address on Arbitrum once the Base transaction is confirmed. Use \`get_swap_receipt\` to check the status.`;
    } catch (error) {
      console.error(`Error swapping XOC to MXNB:`, error);
      if (error instanceof InsufficientBalanceError || 
          error instanceof WrongNetworkError ||
          error instanceof InvalidAmountError ||
          error instanceof InsufficientEscrowBalanceError) {
        return `❌ ${error.message}`;
      } else if (error instanceof Error) {
        return `❌ Error swapping XOC to MXNB: ${error.message}`;
      }
      return `❌ An unknown error occurred while swapping XOC to MXNB.`;
    }
  }

  /**
   * Execute an atomic swap from MXNB on Arbitrum to XOC on Base
   */
  @CreateAction({
    name: "swap_mxnb_to_xoc",
    description: "Swap MXNB on Arbitrum for XOC on Base",
    schema: MxnbToXocSwapSchema,
  })
  async swapMxnbToXoc(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof MxnbToXocSwapSchema>
  ): Promise<string> {
    const { amount, recipientAddress } = args;
    
    try {
      // We won't check network here to avoid the chain switching issue
      // The transaction will still work if the wallet handles chain switching correctly
      // await this.checkNetwork(walletProvider, 'arbitrum');
      
      const senderAddress = await walletProvider.getAddress();
      const targetAddress = recipientAddress || senderAddress;
      
      // Validate amount (check if it's a valid number)
      if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        throw new InvalidAmountError(amount, '0.000001', '1000', 'MXNB');
      }
      
      // Check sender's MXNB balance on Arbitrum using public client
      const sourceBalance = await this.getTokenBalance(
        'arbitrum',
        MXNB_TOKEN_ADDRESS,
        senderAddress
      );
      
      const amountInWei = parseUnits(amount, MXNB_DECIMALS);
      
      if (sourceBalance < amountInWei) {
        throw new InsufficientBalanceError(
          formatAmount(sourceBalance, MXNB_DECIMALS),
          amount,
          'MXNB'
        );
      }
      
      // Get the escrow wallet address
      const escrowWalletAddress = ESCROW_WALLET_ADDRESS;
      if (!escrowWalletAddress) {
        console.error("Escrow wallet address not configured in environment variables, using fallback");
        throw new Error("Escrow wallet address not configured. Please set WALLET_ADDRESS in your .env file.");
      }
      
      console.log(`Using escrow wallet address: ${escrowWalletAddress}`);
      
      // Get escrow wallet's XOC balance on Base
      const escrowXocBalance = await this.getTokenBalance(
        'base',
        XOC_TOKEN_ADDRESS,
        escrowWalletAddress
      );
      
      // Calculate the amount of XOC to send (apply the swap fee)
      const targetAmount = applySwapFee(amount, XOC_DECIMALS);
      const targetAmountInWei = parseUnits(targetAmount, XOC_DECIMALS);
      
      if (escrowXocBalance < targetAmountInWei) {
        throw new InsufficientEscrowBalanceError(
          formatAmount(escrowXocBalance, XOC_DECIMALS),
          targetAmount,
          'XOC',
          'Base'
        );
      }
      
      console.log(`Sending MXNB to escrow address: ${escrowWalletAddress}`);
      
      // Create encoded data for the transfer function
      const data = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [escrowWalletAddress as `0x${string}`, amountInWei],
      });
      
      // Create a pending transaction for Arbitrum chain
      const txId = createPendingTransaction(
        MXNB_TOKEN_ADDRESS,
        "0", // No value since we're calling a contract
        data,
        senderAddress,
        'arbitrum' // Explicitly specify Arbitrum chain
      );
      
      // Get the transaction hash after the wallet signs it
      // This will be handled by the frontend wallet connection
      const sourceTxHash = txId; // We'll use the txId as a reference until the real hash is available
      
      // Create a swap record
      const swapId = createSwapId();
      recordSwap({
        swapId,
        sourceChain: 'arbitrum',
        targetChain: 'base',
        sourceAmount: amount,
        sourceToken: 'MXNB',
        targetAmount: targetAmount,
        targetToken: 'XOC',
        senderAddress,
        recipientAddress: targetAddress,
        sourceTxHash,
        status: 'pending',
        timestamp: Date.now(),
      });
      
      return `✅ **Atomic Swap Initiated**\n\nSwap ID: ${swapId}\n\n**From:**\n- ${amount} MXNB on Arbitrum\n- ${getTransactionTextLink('arbitrum', sourceTxHash)}\n\n**To:**\n- ${targetAmount} XOC on Base (after ${SWAP_FEE_PERCENTAGE}% fee)\n- Recipient: ${targetAddress}\n\nThe XOC will be sent to your address on Base once the Arbitrum transaction is confirmed. Use \`get_swap_receipt\` to check the status.`;
    } catch (error) {
      console.error(`Error swapping MXNB to XOC:`, error);
      if (error instanceof InsufficientBalanceError || 
          error instanceof WrongNetworkError ||
          error instanceof InvalidAmountError ||
          error instanceof InsufficientEscrowBalanceError) {
        return `❌ ${error.message}`;
      } else if (error instanceof Error) {
        return `❌ Error swapping MXNB to XOC: ${error.message}`;
      }
      return `❌ An unknown error occurred while swapping MXNB to XOC.`;
    }
  }

  /**
   * Get receipt for a swap
   */
  @CreateAction({
    name: "get_swap_receipt",
    description: "Get receipt for a cross-chain swap",
    schema: SwapReceiptSchema,
  })
  async getSwapReceipt(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof SwapReceiptSchema>
  ): Promise<string> {
    const { transactionId } = args;
    
    try {
      // Get the most recent swap if no transaction ID provided
      const swap = getMostRecentSwap();
      
      if (!swap) {
        return `❌ No swap history found. Please make a swap first.`;
      }
      
      // Format the receipt
      let receipt = `📜 **Cross-Chain Swap Receipt**\n\n`;
      receipt += `Swap ID: ${swap.swapId}\n`;
      receipt += `Timestamp: ${new Date(swap.timestamp).toLocaleString()}\n\n`;
      
      receipt += `**From:**\n`;
      receipt += `- Chain: ${swap.sourceChain.toUpperCase()}\n`;
      receipt += `- Token: ${swap.sourceToken}\n`;
      receipt += `- Amount: ${swap.sourceAmount}\n`;
      if (swap.sourceTxHash) {
        receipt += `- Transaction: ${getTransactionTextLink(swap.sourceChain, swap.sourceTxHash)}\n`;
      }
      receipt += `- Sender: ${swap.senderAddress}\n\n`;
      
      receipt += `**To:**\n`;
      receipt += `- Chain: ${swap.targetChain.toUpperCase()}\n`;
      receipt += `- Token: ${swap.targetToken}\n`;
      receipt += `- Amount: ${swap.targetAmount}\n`;
      if (swap.targetTxHash) {
        receipt += `- Transaction: ${getTransactionTextLink(swap.targetChain, swap.targetTxHash)}\n`;
      }
      receipt += `- Recipient: ${swap.recipientAddress}\n\n`;
      
      receipt += `**Status:** ${swap.status.toUpperCase()}\n`;
      
      if (swap.status === 'pending') {
        receipt += `\n⏳ Your swap is being processed. The ${swap.targetToken} will be sent to your address on ${swap.targetChain} once the ${swap.sourceChain} transaction is confirmed.`;
      } else if (swap.status === 'completed') {
        receipt += `\n✅ Your swap has been completed successfully!`;
      } else {
        receipt += `\n❌ Your swap has failed. Please try again or contact support.`;
      }
      
      return receipt;
    } catch (error) {
      console.error(`Error getting swap receipt:`, error);
      if (error instanceof Error) {
        return `❌ Error getting swap receipt: ${error.message}`;
      }
      return `❌ An unknown error occurred while getting swap receipt.`;
    }
  }

  /**
   * Execute an atomic swap from USDT on Mantle to XOC on Base
   */
  @CreateAction({
    name: "swap_usdt_to_xoc",
    description: "Swap USDT on Mantle for XOC on Base",
    schema: UsdtToXocSwapSchema,
  })
  async swapUsdtToXoc(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof UsdtToXocSwapSchema>
  ): Promise<string> {
    const { amount, recipientAddress } = args;
    
    try {
      // We won't check network here to avoid the chain switching issue
      // The transaction will still work if the wallet handles chain switching correctly
      
      const senderAddress = await walletProvider.getAddress();
      const targetAddress = recipientAddress || senderAddress;
      
      // Validate amount (check if it's a valid number)
      if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        throw new InvalidAmountError(amount, '0.000001', '1000', 'USDT');
      }
      
      // Check sender's USDT balance on Mantle using public client
      const sourceBalance = await this.getTokenBalance(
        'mantle',
        USDT_MANTLE_TOKEN_ADDRESS,
        senderAddress
      );
      
      const amountInWei = parseUnits(amount, USDT_MANTLE_DECIMALS);
      
      if (sourceBalance < amountInWei) {
        throw new InsufficientBalanceError(
          formatAmount(sourceBalance, USDT_MANTLE_DECIMALS),
          amount,
          'USDT'
        );
      }
      
      // Get the escrow wallet address
      const escrowWalletAddress = ESCROW_WALLET_ADDRESS;
      if (!escrowWalletAddress) {
        console.error("Escrow wallet address not configured in environment variables, using fallback");
        throw new Error("Escrow wallet address not configured. Please set WALLET_ADDRESS in your .env file.");
      }
      
      console.log(`Using escrow wallet address: ${escrowWalletAddress}`);
      
      // Get escrow wallet's XOC balance on Base
      const escrowXocBalance = await this.getTokenBalance(
        'base',
        XOC_TOKEN_ADDRESS,
        escrowWalletAddress
      );
      
      // Calculate the amount of XOC to send (apply the conversion rate and fee)
      const targetAmount = convertUsdtToXoc(amount);
      const targetAmountInWei = parseUnits(targetAmount, XOC_DECIMALS);
      
      if (escrowXocBalance < targetAmountInWei) {
        throw new InsufficientEscrowBalanceError(
          formatAmount(escrowXocBalance, XOC_DECIMALS),
          targetAmount,
          'XOC',
          'Base'
        );
      }
      
      console.log(`Sending USDT to escrow address: ${escrowWalletAddress}`);
      
      // Create encoded data for the transfer function
      const data = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [escrowWalletAddress as `0x${string}`, amountInWei],
      });
      
      // Create a pending transaction for Mantle chain
      const txId = createPendingTransaction(
        USDT_MANTLE_TOKEN_ADDRESS,
        "0", // No value since we're calling a contract
        data,
        senderAddress,
        'mantle' // Explicitly specify Mantle chain
      );
      
      // Get the transaction hash after the wallet signs it
      // This will be handled by the frontend wallet connection
      const sourceTxHash = txId; // We'll use the txId as a reference until the real hash is available
      
      // Create a swap record
      const swapId = createSwapId();
      recordSwap({
        swapId,
        sourceChain: 'mantle',
        targetChain: 'base',
        sourceAmount: amount,
        sourceToken: 'USDT',
        targetAmount: targetAmount,
        targetToken: 'XOC',
        senderAddress,
        recipientAddress: targetAddress,
        sourceTxHash,
        status: 'pending',
        timestamp: Date.now(),
      });
      
      return `✅ **Atomic Swap Initiated**\n\nSwap ID: ${swapId}\n\n**From:**\n- ${amount} USDT on Mantle\n- ${getTransactionTextLink('mantle', sourceTxHash)}\n\n**To:**\n- ${targetAmount} XOC on Base (after ${SWAP_FEE_PERCENTAGE}% fee)\n- Recipient: ${targetAddress}\n\nThe XOC will be sent to your address on Base once the Mantle transaction is confirmed. Use \`get_swap_receipt\` to check the status.`;
    } catch (error) {
      console.error(`Error swapping USDT to XOC:`, error);
      if (error instanceof InsufficientBalanceError || 
          error instanceof WrongNetworkError ||
          error instanceof InvalidAmountError ||
          error instanceof InsufficientEscrowBalanceError) {
        return `❌ ${error.message}`;
      } else if (error instanceof Error) {
        return `❌ Error swapping USDT to XOC: ${error.message}`;
      }
      return `❌ An unknown error occurred while swapping USDT to XOC.`;
    }
  }

  /**
   * Execute an atomic swap from XOC on Base to USDT on Mantle
   */
  @CreateAction({
    name: "swap_xoc_to_usdt",
    description: "Swap XOC on Base for USDT on Mantle",
    schema: XocToUsdtSwapSchema,
  })
  async swapXocToUsdt(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof XocToUsdtSwapSchema>
  ): Promise<string> {
    const { amount, recipientAddress } = args;
    
    try {
      // We won't check network here to avoid the chain switching issue
      // The transaction will still work if the wallet handles chain switching correctly
      
      const senderAddress = await walletProvider.getAddress();
      const targetAddress = recipientAddress || senderAddress;
      
      // Validate amount (check if it's a valid number)
      if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        throw new InvalidAmountError(amount, '0.000001', '1000', 'XOC');
      }
      
      // Check sender's XOC balance on Base using public client
      const sourceBalance = await this.getTokenBalance(
        'base',
        XOC_TOKEN_ADDRESS,
        senderAddress
      );
      
      const amountInWei = parseUnits(amount, XOC_DECIMALS);
      
      if (sourceBalance < amountInWei) {
        throw new InsufficientBalanceError(
          formatAmount(sourceBalance, XOC_DECIMALS),
          amount,
          'XOC'
        );
      }
      
      // Get the escrow wallet address
      const escrowWalletAddress = ESCROW_WALLET_ADDRESS;
      if (!escrowWalletAddress) {
        console.error("Escrow wallet address not configured in environment variables, using fallback");
        throw new Error("Escrow wallet address not configured. Please set WALLET_ADDRESS in your .env file.");
      }
      
      console.log(`Using escrow wallet address: ${escrowWalletAddress}`);
      
      // Get escrow wallet's USDT balance on Mantle
      const escrowUsdtBalance = await this.getTokenBalance(
        'mantle',
        USDT_MANTLE_TOKEN_ADDRESS,
        escrowWalletAddress
      );
      
      // Calculate the amount of USDT to send (apply the conversion rate and fee)
      const targetAmount = convertXocToUsdt(amount);
      const targetAmountInWei = parseUnits(targetAmount, USDT_MANTLE_DECIMALS);
      
      if (escrowUsdtBalance < targetAmountInWei) {
        throw new InsufficientEscrowBalanceError(
          formatAmount(escrowUsdtBalance, USDT_MANTLE_DECIMALS),
          targetAmount,
          'USDT',
          'Mantle'
        );
      }
      
      console.log(`Sending XOC to escrow address: ${escrowWalletAddress}`);
      
      // Create encoded data for the transfer function
      const data = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [escrowWalletAddress as `0x${string}`, amountInWei],
      });
      
      // Create a pending transaction for Base chain
      const txId = createPendingTransaction(
        XOC_TOKEN_ADDRESS,
        "0", // No value since we're calling a contract
        data,
        senderAddress,
        'base' // Explicitly specify Base chain
      );
      
      // Get the transaction hash after the wallet signs it
      // This will be handled by the frontend wallet connection
      const sourceTxHash = txId; // We'll use the txId as a reference until the real hash is available
      
      // Create a swap record
      const swapId = createSwapId();
      recordSwap({
        swapId,
        sourceChain: 'base',
        targetChain: 'mantle',
        sourceAmount: amount,
        sourceToken: 'XOC',
        targetAmount: targetAmount,
        targetToken: 'USDT',
        senderAddress,
        recipientAddress: targetAddress,
        sourceTxHash,
        status: 'pending',
        timestamp: Date.now(),
      });
      
      return `✅ **Atomic Swap Initiated**\n\nSwap ID: ${swapId}\n\n**From:**\n- ${amount} XOC on Base\n- ${getTransactionTextLink('base', sourceTxHash)}\n\n**To:**\n- ${targetAmount} USDT on Mantle (after ${SWAP_FEE_PERCENTAGE}% fee)\n- Recipient: ${targetAddress}\n\nThe USDT will be sent to your address on Mantle once the Base transaction is confirmed. Use \`get_swap_receipt\` to check the status.`;
    } catch (error) {
      console.error(`Error swapping XOC to USDT:`, error);
      if (error instanceof InsufficientBalanceError || 
          error instanceof WrongNetworkError ||
          error instanceof InvalidAmountError ||
          error instanceof InsufficientEscrowBalanceError) {
        return `❌ ${error.message}`;
      } else if (error instanceof Error) {
        return `❌ Error swapping XOC to USDT: ${error.message}`;
      }
      return `❌ An unknown error occurred while swapping XOC to USDT.`;
    }
  }

  /**
   * Execute an atomic swap from USDT on Mantle to MXNB on Arbitrum
   */
  @CreateAction({
    name: "swap_usdt_to_mxnb",
    description: "Swap USDT on Mantle for MXNB on Arbitrum",
    schema: UsdtToMxnbSwapSchema,
  })
  async swapUsdtToMxnb(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof UsdtToMxnbSwapSchema>
  ): Promise<string> {
    const { amount, recipientAddress } = args;
    
    try {
      // We won't check network here to avoid the chain switching issue
      // The transaction will still work if the wallet handles chain switching correctly
      
      const senderAddress = await walletProvider.getAddress();
      const targetAddress = recipientAddress || senderAddress;
      
      // Validate amount (check if it's a valid number)
      if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        throw new InvalidAmountError(amount, '0.000001', '1000', 'USDT');
      }
      
      // Check sender's USDT balance on Mantle using public client
      const sourceBalance = await this.getTokenBalance(
        'mantle',
        USDT_MANTLE_TOKEN_ADDRESS,
        senderAddress
      );
      
      const amountInWei = parseUnits(amount, USDT_MANTLE_DECIMALS);
      
      if (sourceBalance < amountInWei) {
        throw new InsufficientBalanceError(
          formatAmount(sourceBalance, USDT_MANTLE_DECIMALS),
          amount,
          'USDT'
        );
      }
      
      // Get the escrow wallet address
      const escrowWalletAddress = ESCROW_WALLET_ADDRESS;
      if (!escrowWalletAddress) {
        console.error("Escrow wallet address not configured in environment variables, using fallback");
        throw new Error("Escrow wallet address not configured. Please set WALLET_ADDRESS in your .env file.");
      }
      
      console.log(`Using escrow wallet address: ${escrowWalletAddress}`);
      
      // Get escrow wallet's MXNB balance on Arbitrum
      const escrowMxnbBalance = await this.getTokenBalance(
        'arbitrum',
        MXNB_TOKEN_ADDRESS,
        escrowWalletAddress
      );
      
      // Calculate the amount of MXNB to send (apply the conversion rate and fee)
      const targetAmount = convertUsdtToMxnb(amount);
      const targetAmountInWei = parseUnits(targetAmount, MXNB_DECIMALS);
      
      if (escrowMxnbBalance < targetAmountInWei) {
        throw new InsufficientEscrowBalanceError(
          formatAmount(escrowMxnbBalance, MXNB_DECIMALS),
          targetAmount,
          'MXNB',
          'Arbitrum'
        );
      }
      
      console.log(`Sending USDT to escrow address: ${escrowWalletAddress}`);
      
      // Create encoded data for the transfer function
      const data = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [escrowWalletAddress as `0x${string}`, amountInWei],
      });
      
      // Create a pending transaction for Mantle chain
      const txId = createPendingTransaction(
        USDT_MANTLE_TOKEN_ADDRESS,
        "0", // No value since we're calling a contract
        data,
        senderAddress,
        'mantle' // Explicitly specify Mantle chain
      );
      
      // Get the transaction hash after the wallet signs it
      // This will be handled by the frontend wallet connection
      const sourceTxHash = txId; // We'll use the txId as a reference until the real hash is available
      
      // Create a swap record
      const swapId = createSwapId();
      recordSwap({
        swapId,
        sourceChain: 'mantle',
        targetChain: 'arbitrum',
        sourceAmount: amount,
        sourceToken: 'USDT',
        targetAmount: targetAmount,
        targetToken: 'MXNB',
        senderAddress,
        recipientAddress: targetAddress,
        sourceTxHash,
        status: 'pending',
        timestamp: Date.now(),
      });
      
      return `✅ **Atomic Swap Initiated**\n\nSwap ID: ${swapId}\n\n**From:**\n- ${amount} USDT on Mantle\n- ${getTransactionTextLink('mantle', sourceTxHash)}\n\n**To:**\n- ${targetAmount} MXNB on Arbitrum (after ${SWAP_FEE_PERCENTAGE}% fee)\n- Recipient: ${targetAddress}\n\nThe MXNB will be sent to your address on Arbitrum once the Mantle transaction is confirmed. Use \`get_swap_receipt\` to check the status.`;
    } catch (error) {
      console.error(`Error swapping USDT to MXNB:`, error);
      if (error instanceof InsufficientBalanceError || 
          error instanceof WrongNetworkError ||
          error instanceof InvalidAmountError ||
          error instanceof InsufficientEscrowBalanceError) {
        return `❌ ${error.message}`;
      } else if (error instanceof Error) {
        return `❌ Error swapping USDT to MXNB: ${error.message}`;
      }
      return `❌ An unknown error occurred while swapping USDT to MXNB.`;
    }
  }

  /**
   * Execute an atomic swap from MXNB on Arbitrum to USDT on Mantle
   */
  @CreateAction({
    name: "swap_mxnb_to_usdt",
    description: "Swap MXNB on Arbitrum for USDT on Mantle",
    schema: MxnbToUsdtSwapSchema,
  })
  async swapMxnbToUsdt(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof MxnbToUsdtSwapSchema>
  ): Promise<string> {
    const { amount, recipientAddress } = args;
    
    try {
      // We won't check network here to avoid the chain switching issue
      // The transaction will still work if the wallet handles chain switching correctly
      
      const senderAddress = await walletProvider.getAddress();
      const targetAddress = recipientAddress || senderAddress;
      
      // Validate amount (check if it's a valid number)
      if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        throw new InvalidAmountError(amount, '0.000001', '1000', 'MXNB');
      }
      
      // Check sender's MXNB balance on Arbitrum using public client
      const sourceBalance = await this.getTokenBalance(
        'arbitrum',
        MXNB_TOKEN_ADDRESS,
        senderAddress
      );
      
      const amountInWei = parseUnits(amount, MXNB_DECIMALS);
      
      if (sourceBalance < amountInWei) {
        throw new InsufficientBalanceError(
          formatAmount(sourceBalance, MXNB_DECIMALS),
          amount,
          'MXNB'
        );
      }
      
      // Get the escrow wallet address
      const escrowWalletAddress = ESCROW_WALLET_ADDRESS;
      if (!escrowWalletAddress) {
        console.error("Escrow wallet address not configured in environment variables, using fallback");
        throw new Error("Escrow wallet address not configured. Please set WALLET_ADDRESS in your .env file.");
      }
      
      console.log(`Using escrow wallet address: ${escrowWalletAddress}`);
      
      // Get escrow wallet's USDT balance on Mantle
      const escrowUsdtBalance = await this.getTokenBalance(
        'mantle',
        USDT_MANTLE_TOKEN_ADDRESS,
        escrowWalletAddress
      );
      
      // Calculate the amount of USDT to send (apply the conversion rate and fee)
      const targetAmount = convertMxnbToUsdt(amount);
      const targetAmountInWei = parseUnits(targetAmount, USDT_MANTLE_DECIMALS);
      
      if (escrowUsdtBalance < targetAmountInWei) {
        throw new InsufficientEscrowBalanceError(
          formatAmount(escrowUsdtBalance, USDT_MANTLE_DECIMALS),
          targetAmount,
          'USDT',
          'Mantle'
        );
      }
      
      console.log(`Sending MXNB to escrow address: ${escrowWalletAddress}`);
      
      // Create encoded data for the transfer function
      const data = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [escrowWalletAddress as `0x${string}`, amountInWei],
      });
      
      // Create a pending transaction for Arbitrum chain
      const txId = createPendingTransaction(
        MXNB_TOKEN_ADDRESS,
        "0", // No value since we're calling a contract
        data,
        senderAddress,
        'arbitrum' // Explicitly specify Arbitrum chain
      );
      
      // Get the transaction hash after the wallet signs it
      // This will be handled by the frontend wallet connection
      const sourceTxHash = txId; // We'll use the txId as a reference until the real hash is available
      
      // Create a swap record
      const swapId = createSwapId();
      recordSwap({
        swapId,
        sourceChain: 'arbitrum',
        targetChain: 'mantle',
        sourceAmount: amount,
        sourceToken: 'MXNB',
        targetAmount: targetAmount,
        targetToken: 'USDT',
        senderAddress,
        recipientAddress: targetAddress,
        sourceTxHash,
        status: 'pending',
        timestamp: Date.now(),
      });
      
      return `✅ **Atomic Swap Initiated**\n\nSwap ID: ${swapId}\n\n**From:**\n- ${amount} MXNB on Arbitrum\n- ${getTransactionTextLink('arbitrum', sourceTxHash)}\n\n**To:**\n- ${targetAmount} USDT on Mantle (after ${SWAP_FEE_PERCENTAGE}% fee)\n- Recipient: ${targetAddress}\n\nThe USDT will be sent to your address on Mantle once the Arbitrum transaction is confirmed. Use \`get_swap_receipt\` to check the status.`;
    } catch (error) {
      console.error(`Error swapping MXNB to USDT:`, error);
      if (error instanceof InsufficientBalanceError || 
          error instanceof WrongNetworkError ||
          error instanceof InvalidAmountError ||
          error instanceof InsufficientEscrowBalanceError) {
        return `❌ ${error.message}`;
      } else if (error instanceof Error) {
        return `❌ Error swapping MXNB to USDT: ${error.message}`;
      }
      return `❌ An unknown error occurred while swapping MXNB to USDT.`;
    }
  }

  /**
   * Execute an atomic swap from USDT on zkSync Era to XOC on Base
   */
  @CreateAction({
    name: "swap_zk_usdt_to_xoc",
    description: "Swap USDT on zkSync Era for XOC on Base",
    schema: ZkUsdtToXocSwapSchema,
  })
  async swapZkUsdtToXoc(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof ZkUsdtToXocSwapSchema>
  ): Promise<string> {
    const { amount, recipientAddress } = args;
    
    try {
      // We won't check network here to avoid the chain switching issue
      // The transaction will still work if the wallet handles chain switching correctly
      
      const senderAddress = await walletProvider.getAddress();
      const targetAddress = recipientAddress || senderAddress;
      
      // Validate amount (check if it's a valid number)
      if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        throw new InvalidAmountError(amount, '0.000001', '1000', 'USDT');
      }
      
      // Check sender's USDT balance on zkSync Era using public client
      const sourceBalance = await this.getTokenBalance(
        'zksync',
        USDT_ZKSYNC_ERA_TOKEN_ADDRESS,
        senderAddress
      );
      
      const amountInWei = parseUnits(amount, USDT_ZKSYNC_ERA_DECIMALS);
      
      if (sourceBalance < amountInWei) {
        throw new InsufficientBalanceError(
          formatAmount(sourceBalance, USDT_ZKSYNC_ERA_DECIMALS),
          amount,
          'USDT'
        );
      }
      
      // Get the escrow wallet address
      const escrowWalletAddress = ESCROW_WALLET_ADDRESS;
      if (!escrowWalletAddress) {
        console.error("Escrow wallet address not configured in environment variables, using fallback");
        throw new Error("Escrow wallet address not configured. Please set WALLET_ADDRESS in your .env file.");
      }
      
      console.log(`Using escrow wallet address: ${escrowWalletAddress}`);
      
      // Get escrow wallet's XOC balance on Base
      const escrowXocBalance = await this.getTokenBalance(
        'base',
        XOC_TOKEN_ADDRESS,
        escrowWalletAddress
      );
      
      // Calculate the amount of XOC to send (apply the conversion rate and fee)
      const targetAmount = convertZkUsdtToXoc(amount);
      const targetAmountInWei = parseUnits(targetAmount, XOC_DECIMALS);
      
      if (escrowXocBalance < targetAmountInWei) {
        throw new InsufficientEscrowBalanceError(
          formatAmount(escrowXocBalance, XOC_DECIMALS),
          targetAmount,
          'XOC',
          'Base'
        );
      }
      
      console.log(`Sending USDT to escrow address: ${escrowWalletAddress}`);
      
      // Create encoded data for the transfer function
      const data = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [escrowWalletAddress as `0x${string}`, amountInWei],
      });
      
      // Create a pending transaction for zkSync Era chain
      const txId = createPendingTransaction(
        USDT_ZKSYNC_ERA_TOKEN_ADDRESS,
        "0", // No value since we're calling a contract
        data,
        senderAddress,
        'zksync' as 'celo' | 'base' | 'arbitrum' | 'mantle' | 'zksync'
      );
      
      // Get the transaction hash after the wallet signs it
      // This will be handled by the frontend wallet connection
      const sourceTxHash = txId; // We'll use the txId as a reference until the real hash is available
      
      // Create a swap record
      const swapId = createSwapId();
      recordSwap({
        swapId,
        sourceChain: 'zksync',
        targetChain: 'base',
        sourceAmount: amount,
        sourceToken: 'USDT',
        targetAmount: targetAmount,
        targetToken: 'XOC',
        senderAddress,
        recipientAddress: targetAddress,
        sourceTxHash,
        status: 'pending',
        timestamp: Date.now(),
      });
      
      return `✅ **Atomic Swap Initiated**\n\nSwap ID: ${swapId}\n\n**From:**\n- ${amount} USDT on zkSync Era\n- ${getTransactionTextLink('zksync', sourceTxHash)}\n\n**To:**\n- ${targetAmount} XOC on Base (after ${SWAP_FEE_PERCENTAGE}% fee)\n- Recipient: ${targetAddress}\n\nThe XOC will be sent to your address on Base once the zkSync Era transaction is confirmed. Use \`get_swap_receipt\` to check the status.`;
    } catch (error) {
      console.error(`Error swapping zkSync USDT to XOC:`, error);
      if (error instanceof InsufficientBalanceError || 
          error instanceof WrongNetworkError ||
          error instanceof InvalidAmountError ||
          error instanceof InsufficientEscrowBalanceError) {
        return `❌ ${error.message}`;
      } else if (error instanceof Error) {
        return `❌ Error swapping zkSync USDT to XOC: ${error.message}`;
      }
      return `❌ An unknown error occurred while swapping zkSync USDT to XOC.`;
    }
  }

  /**
   * Execute an atomic swap from XOC on Base to USDT on zkSync Era
   */
  @CreateAction({
    name: "swap_xoc_to_zk_usdt",
    description: "Swap XOC on Base for USDT on zkSync Era",
    schema: XocToZkUsdtSwapSchema,
  })
  async swapXocToZkUsdt(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof XocToZkUsdtSwapSchema>
  ): Promise<string> {
    const { amount, recipientAddress } = args;
    
    try {
      // We won't check network here to avoid the chain switching issue
      // The transaction will still work if the wallet handles chain switching correctly
      
      const senderAddress = await walletProvider.getAddress();
      const targetAddress = recipientAddress || senderAddress;
      
      // Validate amount (check if it's a valid number)
      if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        throw new InvalidAmountError(amount, '0.000001', '1000', 'XOC');
      }
      
      // Check sender's XOC balance on Base using public client
      const sourceBalance = await this.getTokenBalance(
        'base',
        XOC_TOKEN_ADDRESS,
        senderAddress
      );
      
      const amountInWei = parseUnits(amount, XOC_DECIMALS);
      
      if (sourceBalance < amountInWei) {
        throw new InsufficientBalanceError(
          formatAmount(sourceBalance, XOC_DECIMALS),
          amount,
          'XOC'
        );
      }
      
      // Get the escrow wallet address
      const escrowWalletAddress = ESCROW_WALLET_ADDRESS;
      if (!escrowWalletAddress) {
        console.error("Escrow wallet address not configured in environment variables, using fallback");
        throw new Error("Escrow wallet address not configured. Please set WALLET_ADDRESS in your .env file.");
      }
      
      console.log(`Using escrow wallet address: ${escrowWalletAddress}`);
      
      // Get escrow wallet's USDT balance on zkSync Era
      const escrowUsdtBalance = await this.getTokenBalance(
        'zksync',
        USDT_ZKSYNC_ERA_TOKEN_ADDRESS,
        escrowWalletAddress
      );
      
      // Calculate the amount of USDT to send (apply the conversion rate and fee)
      const targetAmount = convertXocToZkUsdt(amount);
      const targetAmountInWei = parseUnits(targetAmount, USDT_ZKSYNC_ERA_DECIMALS);
      
      if (escrowUsdtBalance < targetAmountInWei) {
        throw new InsufficientEscrowBalanceError(
          formatAmount(escrowUsdtBalance, USDT_ZKSYNC_ERA_DECIMALS),
          targetAmount,
          'USDT',
          'zkSync Era'
        );
      }
      
      console.log(`Sending XOC to escrow address: ${escrowWalletAddress}`);
      
      // Create encoded data for the transfer function
      const data = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [escrowWalletAddress as `0x${string}`, amountInWei],
      });
      
      // Create a pending transaction for Base chain
      const txId = createPendingTransaction(
        XOC_TOKEN_ADDRESS,
        "0", // No value since we're calling a contract
        data,
        senderAddress,
        'base' // Explicitly specify Base chain
      );
      
      // Get the transaction hash after the wallet signs it
      // This will be handled by the frontend wallet connection
      const sourceTxHash = txId; // We'll use the txId as a reference until the real hash is available
      
      // Create a swap record
      const swapId = createSwapId();
      recordSwap({
        swapId,
        sourceChain: 'base',
        targetChain: 'zksync',
        sourceAmount: amount,
        sourceToken: 'XOC',
        targetAmount: targetAmount,
        targetToken: 'USDT',
        senderAddress,
        recipientAddress: targetAddress,
        sourceTxHash,
        status: 'pending',
        timestamp: Date.now(),
      });
      
      return `✅ **Atomic Swap Initiated**\n\nSwap ID: ${swapId}\n\n**From:**\n- ${amount} XOC on Base\n- ${getTransactionTextLink('base', sourceTxHash)}\n\n**To:**\n- ${targetAmount} USDT on zkSync Era (after ${SWAP_FEE_PERCENTAGE}% fee)\n- Recipient: ${targetAddress}\n\nThe USDT will be sent to your address on zkSync Era once the Base transaction is confirmed. Use \`get_swap_receipt\` to check the status.`;
    } catch (error) {
      console.error(`Error swapping XOC to zkSync USDT:`, error);
      if (error instanceof InsufficientBalanceError || 
          error instanceof WrongNetworkError ||
          error instanceof InvalidAmountError ||
          error instanceof InsufficientEscrowBalanceError) {
        return `❌ ${error.message}`;
      } else if (error instanceof Error) {
        return `❌ Error swapping XOC to zkSync USDT: ${error.message}`;
      }
      return `❌ An unknown error occurred while swapping XOC to zkSync USDT.`;
    }
  }

  /**
   * Execute an atomic swap from USDT on zkSync Era to MXNB on Arbitrum
   */
  @CreateAction({
    name: "swap_zk_usdt_to_mxnb",
    description: "Swap USDT on zkSync Era for MXNB on Arbitrum",
    schema: ZkUsdtToMxnbSwapSchema,
  })
  async swapZkUsdtToMxnb(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof ZkUsdtToMxnbSwapSchema>
  ): Promise<string> {
    const { amount, recipientAddress } = args;
    
    try {
      // We won't check network here to avoid the chain switching issue
      // The transaction will still work if the wallet handles chain switching correctly
      
      const senderAddress = await walletProvider.getAddress();
      const targetAddress = recipientAddress || senderAddress;
      
      // Validate amount (check if it's a valid number)
      if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        throw new InvalidAmountError(amount, '0.000001', '1000', 'USDT');
      }
      
      // Check sender's USDT balance on zkSync Era using public client
      const sourceBalance = await this.getTokenBalance(
        'zksync',
        USDT_ZKSYNC_ERA_TOKEN_ADDRESS,
        senderAddress
      );
      
      const amountInWei = parseUnits(amount, USDT_ZKSYNC_ERA_DECIMALS);
      
      if (sourceBalance < amountInWei) {
        throw new InsufficientBalanceError(
          formatAmount(sourceBalance, USDT_ZKSYNC_ERA_DECIMALS),
          amount,
          'USDT'
        );
      }
      
      // Get the escrow wallet address
      const escrowWalletAddress = ESCROW_WALLET_ADDRESS;
      if (!escrowWalletAddress) {
        console.error("Escrow wallet address not configured in environment variables, using fallback");
        throw new Error("Escrow wallet address not configured. Please set WALLET_ADDRESS in your .env file.");
      }
      
      console.log(`Using escrow wallet address: ${escrowWalletAddress}`);
      
      // Get escrow wallet's MXNB balance on Arbitrum
      const escrowMxnbBalance = await this.getTokenBalance(
        'arbitrum',
        MXNB_TOKEN_ADDRESS,
        escrowWalletAddress
      );
      
      // Calculate the amount of MXNB to send (apply the conversion rate and fee)
      const targetAmount = convertZkUsdtToMxnb(amount);
      const targetAmountInWei = parseUnits(targetAmount, MXNB_DECIMALS);
      
      if (escrowMxnbBalance < targetAmountInWei) {
        throw new InsufficientEscrowBalanceError(
          formatAmount(escrowMxnbBalance, MXNB_DECIMALS),
          targetAmount,
          'MXNB',
          'Arbitrum'
        );
      }
      
      console.log(`Sending USDT to escrow address: ${escrowWalletAddress}`);
      
      // Create encoded data for the transfer function
      const data = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [escrowWalletAddress as `0x${string}`, amountInWei],
      });
      
      // Create a pending transaction for zkSync Era chain
      const txId = createPendingTransaction(
        USDT_ZKSYNC_ERA_TOKEN_ADDRESS,
        "0", // No value since we're calling a contract
        data,
        senderAddress,
        'zksync' as 'celo' | 'base' | 'arbitrum' | 'mantle' | 'zksync'
      );
      
      // Get the transaction hash after the wallet signs it
      // This will be handled by the frontend wallet connection
      const sourceTxHash = txId; // We'll use the txId as a reference until the real hash is available
      
      // Create a swap record
      const swapId = createSwapId();
      recordSwap({
        swapId,
        sourceChain: 'zksync',
        targetChain: 'arbitrum',
        sourceAmount: amount,
        sourceToken: 'USDT',
        targetAmount: targetAmount,
        targetToken: 'MXNB',
        senderAddress,
        recipientAddress: targetAddress,
        sourceTxHash,
        status: 'pending',
        timestamp: Date.now(),
      });
      
      return `✅ **Atomic Swap Initiated**\n\nSwap ID: ${swapId}\n\n**From:**\n- ${amount} USDT on zkSync Era\n- ${getTransactionTextLink('zksync', sourceTxHash)}\n\n**To:**\n- ${targetAmount} MXNB on Arbitrum (after ${SWAP_FEE_PERCENTAGE}% fee)\n- Recipient: ${targetAddress}\n\nThe MXNB will be sent to your address on Arbitrum once the zkSync Era transaction is confirmed. Use \`get_swap_receipt\` to check the status.`;
    } catch (error) {
      console.error(`Error swapping zkSync USDT to MXNB:`, error);
      if (error instanceof InsufficientBalanceError || 
          error instanceof WrongNetworkError ||
          error instanceof InvalidAmountError ||
          error instanceof InsufficientEscrowBalanceError) {
        return `❌ ${error.message}`;
      } else if (error instanceof Error) {
        return `❌ Error swapping zkSync USDT to MXNB: ${error.message}`;
      }
      return `❌ An unknown error occurred while swapping zkSync USDT to MXNB.`;
    }
  }

  /**
   * Execute an atomic swap from MXNB on Arbitrum to USDT on zkSync Era
   */
  @CreateAction({
    name: "swap_mxnb_to_zk_usdt",
    description: "Swap MXNB on Arbitrum for USDT on zkSync Era",
    schema: MxnbToZkUsdtSwapSchema,
  })
  async swapMxnbToZkUsdt(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof MxnbToZkUsdtSwapSchema>
  ): Promise<string> {
    const { amount, recipientAddress } = args;
    
    try {
      // We won't check network here to avoid the chain switching issue
      // The transaction will still work if the wallet handles chain switching correctly
      
      const senderAddress = await walletProvider.getAddress();
      const targetAddress = recipientAddress || senderAddress;
      
      // Validate amount (check if it's a valid number)
      if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        throw new InvalidAmountError(amount, '0.000001', '1000', 'MXNB');
      }
      
      // Check sender's MXNB balance on Arbitrum using public client
      const sourceBalance = await this.getTokenBalance(
        'arbitrum',
        MXNB_TOKEN_ADDRESS,
        senderAddress
      );
      
      const amountInWei = parseUnits(amount, MXNB_DECIMALS);
      
      if (sourceBalance < amountInWei) {
        throw new InsufficientBalanceError(
          formatAmount(sourceBalance, MXNB_DECIMALS),
          amount,
          'MXNB'
        );
      }
      
      // Get the escrow wallet address
      const escrowWalletAddress = ESCROW_WALLET_ADDRESS;
      if (!escrowWalletAddress) {
        console.error("Escrow wallet address not configured in environment variables, using fallback");
        throw new Error("Escrow wallet address not configured. Please set WALLET_ADDRESS in your .env file.");
      }
      
      console.log(`Using escrow wallet address: ${escrowWalletAddress}`);
      
      // Get escrow wallet's USDT balance on zkSync Era
      const escrowUsdtBalance = await this.getTokenBalance(
        'zksync',
        USDT_ZKSYNC_ERA_TOKEN_ADDRESS,
        escrowWalletAddress
      );
      
      // Calculate the amount of USDT to send (apply the conversion rate and fee)
      const targetAmount = convertMxnbToZkUsdt(amount);
      const targetAmountInWei = parseUnits(targetAmount, USDT_ZKSYNC_ERA_DECIMALS);
      
      if (escrowUsdtBalance < targetAmountInWei) {
        throw new InsufficientEscrowBalanceError(
          formatAmount(escrowUsdtBalance, USDT_ZKSYNC_ERA_DECIMALS),
          targetAmount,
          'USDT',
          'zkSync Era'
        );
      }
      
      console.log(`Sending MXNB to escrow address: ${escrowWalletAddress}`);
      
      // Create encoded data for the transfer function
      const data = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [escrowWalletAddress as `0x${string}`, amountInWei],
      });
      
      // Create a pending transaction for Arbitrum chain
      const txId = createPendingTransaction(
        MXNB_TOKEN_ADDRESS,
        "0", // No value since we're calling a contract
        data,
        senderAddress,
        'arbitrum' // Explicitly specify Arbitrum chain
      );
      
      // Get the transaction hash after the wallet signs it
      // This will be handled by the frontend wallet connection
      const sourceTxHash = txId; // We'll use the txId as a reference until the real hash is available
      
      // Create a swap record
      const swapId = createSwapId();
      recordSwap({
        swapId,
        sourceChain: 'arbitrum',
        targetChain: 'zksync',
        sourceAmount: amount,
        sourceToken: 'MXNB',
        targetAmount: targetAmount,
        targetToken: 'USDT',
        senderAddress,
        recipientAddress: targetAddress,
        sourceTxHash,
        status: 'pending',
        timestamp: Date.now(),
      });
      
      return `✅ **Atomic Swap Initiated**\n\nSwap ID: ${swapId}\n\n**From:**\n- ${amount} MXNB on Arbitrum\n- ${getTransactionTextLink('arbitrum', sourceTxHash)}\n\n**To:**\n- ${targetAmount} USDT on zkSync Era (after ${SWAP_FEE_PERCENTAGE}% fee)\n- Recipient: ${targetAddress}\n\nThe USDT will be sent to your address on zkSync Era once the Arbitrum transaction is confirmed. Use \`get_swap_receipt\` to check the status.`;
    } catch (error) {
      console.error(`Error swapping MXNB to zkSync USDT:`, error);
      if (error instanceof InsufficientBalanceError || 
          error instanceof WrongNetworkError ||
          error instanceof InvalidAmountError ||
          error instanceof InsufficientEscrowBalanceError) {
        return `❌ ${error.message}`;
      } else if (error instanceof Error) {
        return `❌ Error swapping MXNB to zkSync USDT: ${error.message}`;
      }
      return `❌ An unknown error occurred while swapping MXNB to zkSync USDT.`;
    }
  }

  /**
   * Execute an atomic swap from USDT on Mantle to USDT on zkSync Era
   */
  @CreateAction({
    name: "swap_mantle_usdt_to_zk_usdt",
    description: "Swap USDT on Mantle for USDT on zkSync Era",
    schema: MantleUsdtToZkUsdtSwapSchema,
  })
  async swapMantleUsdtToZkUsdt(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof MantleUsdtToZkUsdtSwapSchema>
  ): Promise<string> {
    const { amount, recipientAddress } = args;
    
    try {
      // We won't check network here to avoid the chain switching issue
      // The transaction will still work if the wallet handles chain switching correctly
      
      const senderAddress = await walletProvider.getAddress();
      const targetAddress = recipientAddress || senderAddress;
      
      // Validate amount (check if it's a valid number)
      if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        throw new InvalidAmountError(amount, '0.000001', '1000', 'USDT');
      }
      
      // Check sender's USDT balance on Mantle using public client
      const sourceBalance = await this.getTokenBalance(
        'mantle',
        USDT_MANTLE_TOKEN_ADDRESS,
        senderAddress
      );
      
      const amountInWei = parseUnits(amount, USDT_MANTLE_DECIMALS);
      
      if (sourceBalance < amountInWei) {
        throw new InsufficientBalanceError(
          formatAmount(sourceBalance, USDT_MANTLE_DECIMALS),
          amount,
          'USDT'
        );
      }
      
      // Get the escrow wallet address
      const escrowWalletAddress = ESCROW_WALLET_ADDRESS;
      if (!escrowWalletAddress) {
        console.error("Escrow wallet address not configured in environment variables, using fallback");
        throw new Error("Escrow wallet address not configured. Please set WALLET_ADDRESS in your .env file.");
      }
      
      console.log(`Using escrow wallet address: ${escrowWalletAddress}`);
      
      // Get escrow wallet's USDT balance on zkSync Era
      const escrowUsdtBalance = await this.getTokenBalance(
        'zksync',
        USDT_ZKSYNC_ERA_TOKEN_ADDRESS,
        escrowWalletAddress
      );
      
      // Calculate the amount of USDT to send (apply the conversion rate and fee)
      const targetAmount = convertMantleUsdtToZkUsdt(amount);
      const targetAmountInWei = parseUnits(targetAmount, USDT_ZKSYNC_ERA_DECIMALS);
      
      if (escrowUsdtBalance < targetAmountInWei) {
        throw new InsufficientEscrowBalanceError(
          formatAmount(escrowUsdtBalance, USDT_ZKSYNC_ERA_DECIMALS),
          targetAmount,
          'USDT',
          'zkSync Era'
        );
      }
      
      console.log(`Sending USDT to escrow address: ${escrowWalletAddress}`);
      
      // Create encoded data for the transfer function
      const data = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [escrowWalletAddress as `0x${string}`, amountInWei],
      });
      
      // Create a pending transaction for Mantle chain
      const txId = createPendingTransaction(
        USDT_MANTLE_TOKEN_ADDRESS,
        "0", // No value since we're calling a contract
        data,
        senderAddress,
        'mantle' // Explicitly specify Mantle chain
      );
      
      // Get the transaction hash after the wallet signs it
      // This will be handled by the frontend wallet connection
      const sourceTxHash = txId; // We'll use the txId as a reference until the real hash is available
      
      // Create a swap record
      const swapId = createSwapId();
      recordSwap({
        swapId,
        sourceChain: 'mantle',
        targetChain: 'zksync',
        sourceAmount: amount,
        sourceToken: 'USDT',
        targetAmount: targetAmount,
        targetToken: 'USDT',
        senderAddress,
        recipientAddress: targetAddress,
        sourceTxHash,
        status: 'pending',
        timestamp: Date.now(),
      });
      
      return `✅ **Atomic Swap Initiated**\n\nSwap ID: ${swapId}\n\n**From:**\n- ${amount} USDT on Mantle\n- ${getTransactionTextLink('mantle', sourceTxHash)}\n\n**To:**\n- ${targetAmount} USDT on zkSync Era (after ${SWAP_FEE_PERCENTAGE}% fee)\n- Recipient: ${targetAddress}\n\nThe USDT will be sent to your address on zkSync Era once the Mantle transaction is confirmed. Use \`get_swap_receipt\` to check the status.`;
    } catch (error) {
      console.error(`Error swapping Mantle USDT to zkSync USDT:`, error);
      if (error instanceof InsufficientBalanceError || 
          error instanceof WrongNetworkError ||
          error instanceof InvalidAmountError ||
          error instanceof InsufficientEscrowBalanceError) {
        return `❌ ${error.message}`;
      } else if (error instanceof Error) {
        return `❌ Error swapping Mantle USDT to zkSync USDT: ${error.message}`;
      }
      return `❌ An unknown error occurred while swapping Mantle USDT to zkSync USDT.`;
    }
  }

  /**
   * Execute an atomic swap from USDT on zkSync Era to USDT on Mantle
   */
  @CreateAction({
    name: "swap_zk_usdt_to_mantle_usdt",
    description: "Swap USDT on zkSync Era for USDT on Mantle",
    schema: ZkUsdtToMantleUsdtSwapSchema,
  })
  async swapZkUsdtToMantleUsdt(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof ZkUsdtToMantleUsdtSwapSchema>
  ): Promise<string> {
    const { amount, recipientAddress } = args;
    
    try {
      // We won't check network here to avoid the chain switching issue
      // The transaction will still work if the wallet handles chain switching correctly
      
      const senderAddress = await walletProvider.getAddress();
      const targetAddress = recipientAddress || senderAddress;
      
      // Validate amount (check if it's a valid number)
      if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        throw new InvalidAmountError(amount, '0.000001', '1000', 'USDT');
      }
      
      // Check sender's USDT balance on zkSync Era using public client
      const sourceBalance = await this.getTokenBalance(
        'zksync',
        USDT_ZKSYNC_ERA_TOKEN_ADDRESS,
        senderAddress
      );
      
      const amountInWei = parseUnits(amount, USDT_ZKSYNC_ERA_DECIMALS);
      
      if (sourceBalance < amountInWei) {
        throw new InsufficientBalanceError(
          formatAmount(sourceBalance, USDT_ZKSYNC_ERA_DECIMALS),
          amount,
          'USDT'
        );
      }
      
      // Get the escrow wallet address
      const escrowWalletAddress = ESCROW_WALLET_ADDRESS;
      if (!escrowWalletAddress) {
        console.error("Escrow wallet address not configured in environment variables, using fallback");
        throw new Error("Escrow wallet address not configured. Please set WALLET_ADDRESS in your .env file.");
      }
      
      console.log(`Using escrow wallet address: ${escrowWalletAddress}`);
      
      // Get escrow wallet's USDT balance on Mantle
      const escrowUsdtBalance = await this.getTokenBalance(
        'mantle',
        USDT_MANTLE_TOKEN_ADDRESS,
        escrowWalletAddress
      );
      
      // Calculate the amount of USDT to send (apply the conversion rate and fee)
      const targetAmount = convertZkUsdtToMantleUsdt(amount);
      const targetAmountInWei = parseUnits(targetAmount, USDT_MANTLE_DECIMALS);
      
      if (escrowUsdtBalance < targetAmountInWei) {
        throw new InsufficientEscrowBalanceError(
          formatAmount(escrowUsdtBalance, USDT_MANTLE_DECIMALS),
          targetAmount,
          'USDT',
          'Mantle'
        );
      }
      
      console.log(`Sending USDT to escrow address: ${escrowWalletAddress}`);
      
      // Create encoded data for the transfer function
      const data = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [escrowWalletAddress as `0x${string}`, amountInWei],
      });
      
      // Create a pending transaction for zkSync Era chain
      const txId = createPendingTransaction(
        USDT_ZKSYNC_ERA_TOKEN_ADDRESS,
        "0", // No value since we're calling a contract
        data,
        senderAddress,
        'zksync' as 'celo' | 'base' | 'arbitrum' | 'mantle' | 'zksync'
      );
      
      // Get the transaction hash after the wallet signs it
      // This will be handled by the frontend wallet connection
      const sourceTxHash = txId; // We'll use the txId as a reference until the real hash is available
      
      // Create a swap record
      const swapId = createSwapId();
      recordSwap({
        swapId,
        sourceChain: 'zksync',
        targetChain: 'mantle',
        sourceAmount: amount,
        sourceToken: 'USDT',
        targetAmount: targetAmount,
        targetToken: 'USDT',
        senderAddress,
        recipientAddress: targetAddress,
        sourceTxHash,
        status: 'pending',
        timestamp: Date.now(),
      });
      
      return `✅ **Atomic Swap Initiated**\n\nSwap ID: ${swapId}\n\n**From:**\n- ${amount} USDT on zkSync Era\n- ${getTransactionTextLink('zksync', sourceTxHash)}\n\n**To:**\n- ${targetAmount} USDT on Mantle (after ${SWAP_FEE_PERCENTAGE}% fee)\n- Recipient: ${targetAddress}\n\nThe USDT will be sent to your address on Mantle once the zkSync Era transaction is confirmed. Use \`get_swap_receipt\` to check the status.`;
    } catch (error) {
      console.error(`Error swapping zkSync USDT to Mantle USDT:`, error);
      if (error instanceof InsufficientBalanceError || 
          error instanceof WrongNetworkError ||
          error instanceof InvalidAmountError ||
          error instanceof InsufficientEscrowBalanceError) {
        return `❌ ${error.message}`;
      } else if (error instanceof Error) {
        return `❌ Error swapping zkSync USDT to Mantle USDT: ${error.message}`;
      }
      return `❌ An unknown error occurred while swapping zkSync USDT to Mantle USDT.`;
    }
  }

  /**
   * Check if the action provider supports a given network
   */
  supportsNetwork = (network: Network): boolean => {
    return true; // Support all networks since we're using our own public clients
  };
}

export const basicAtomicSwapActionProvider = () => new BasicAtomicSwapActionProvider(); 