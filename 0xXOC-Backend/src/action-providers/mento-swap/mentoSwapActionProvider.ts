import { z } from "zod";
import {
  ActionProvider,
  Network,
  CreateAction,
  EvmWalletProvider,
} from "@coinbase/agentkit";
import { 
  parseEther, 
  formatEther, 
  formatUnits,
  encodeFunctionData,
  type PublicClient, 
  type WalletClient 
} from 'viem';
import "reflect-metadata";
import { SwapParamsSchema, SwapQuoteSchema } from './schemas';
import { 
  MentoSwapError, 
  InsufficientAllowanceError,
  InvalidTokenError,
  WrongNetworkError,
  InsufficientBalanceError
} from './errors';

// Constants from transaction data
const MENTO_BROKER_ADDRESS = "0x777A8255cA72412f0d706dc03C9D1987306B4CaD";
const EXCHANGE_PROVIDER = "0x22d9db95e6ae61c104a7b6f6c78d7993b94ec901";
const CELO_TOKEN_ADDRESS = "0x471ece3750da237f93b8e339c536989b8978a438";
const CEUR_TOKEN_ADDRESS = "0xd8763cba276a3738e6de85b4b3bf5fded6d6ca73";
const CUSD_TOKEN_ADDRESS = "0x765de816845861e75a25fca122bb6898b8b1282a";

const EXCHANGE_IDS = {
  CELO_CUSD: "0x3135b662c38265d0655177091f1b647b4fef511103d06c016efdf18b46930d2c",
  CELO_CEUR: "0xb73ffc6b5123de3c8e460490543ab93a3be7d70824f1666343df49e219199b8c"
} as const;

// ABI for token interactions
const ERC20_ABI = [
  {
    "constant": true,
    "inputs": [
      {
        "name": "_owner",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "name": "balance",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "_owner",
        "type": "address"
      },
      {
        "name": "_spender",
        "type": "address"
      }
    ],
    "name": "allowance",
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "name": "spender",
        "type": "address"
      },
      {
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "increaseAllowance",
    "outputs": [
      {
        "name": "",
        "type": "bool"
      }
    ],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// ABI for Mento Broker interactions
const MENTO_BROKER_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "exchangeProvider", "type": "address"},
      {"internalType": "bytes32", "name": "exchangeId", "type": "bytes32"},
      {"internalType": "address", "name": "tokenIn", "type": "address"},
      {"internalType": "address", "name": "tokenOut", "type": "address"},
      {"internalType": "uint256", "name": "amountIn", "type": "uint256"},
      {"internalType": "uint256", "name": "amountOutMin", "type": "uint256"}
    ],
    "name": "swapIn",
    "outputs": [{"internalType": "uint256", "name": "amountOut", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "exchangeProvider",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "exchangeId",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "tokenIn",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "tokenOut",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amountIn",
        "type": "uint256"
      }
    ],
    "name": "getAmountOut",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

/**
 * 💱 MentoSwapActionProvider provides actions for swapping between CELO, cUSD, and cEUR tokens
 * through the Mento Labs broker
 */
export class MentoSwapActionProvider extends ActionProvider<EvmWalletProvider> {
  constructor() {
    super("mento-swap", []);
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
   * 🔍 Get token addresses based on token symbols
   */
  private getTokenAddress(token: string): `0x${string}` {
    const normalizedToken = token.toUpperCase();
    
    switch (normalizedToken) {
      case 'CELO':
      case 'CELLO': // Allow common misspelling
        return CELO_TOKEN_ADDRESS as `0x${string}`;
      case 'CUSD':
      case 'CÚSD':
      case 'CSUSD':
        return CUSD_TOKEN_ADDRESS as `0x${string}`;
      case 'CEUR':
      case 'CÉUR':
      case 'CSEUR':
        return CEUR_TOKEN_ADDRESS as `0x${string}`;
      default:
        throw new InvalidTokenError(token);
    }
  }

  /**
   * 🔄 Get exchange ID for the token pair
   */
  private getExchangeId(fromToken: string, toToken: string): `0x${string}` {
    const normalizedFromToken = fromToken.toUpperCase();
    const normalizedToToken = toToken.toUpperCase();
    
    // Handle different token name variations
    const isCeloFrom = ['CELO', 'CELLO'].includes(normalizedFromToken);
    const isUsdFrom = ['CUSD', 'CÚSD', 'CSUSD'].includes(normalizedFromToken);
    const isEurFrom = ['CEUR', 'CÉUR', 'CSEUR'].includes(normalizedFromToken);
    
    const isCeloTo = ['CELO', 'CELLO'].includes(normalizedToToken);
    const isUsdTo = ['CUSD', 'CÚSD', 'CSUSD'].includes(normalizedToToken);
    const isEurTo = ['CEUR', 'CÉUR', 'CSEUR'].includes(normalizedToToken);
    
    // CELO to stablecoins
    if (isCeloFrom && isUsdTo) {
      return EXCHANGE_IDS.CELO_CUSD as `0x${string}`;
    } else if (isCeloFrom && isEurTo) {
      return EXCHANGE_IDS.CELO_CEUR as `0x${string}`;
    } 
    // Stablecoins to CELO (reverse direction)
    else if (isUsdFrom && isCeloTo) {
      return EXCHANGE_IDS.CELO_CUSD as `0x${string}`;
    } else if (isEurFrom && isCeloTo) {
      return EXCHANGE_IDS.CELO_CEUR as `0x${string}`;
    } else {
      throw new Error(`Unsupported token pair: ${fromToken} to ${toToken}. Currently only CELO ⟷ cUSD/cEUR swaps are supported.`);
    }
  }

  /**
   * Get Celoscan transaction link
   */
  private getCeloscanLink(txHash: string): string {
    return `https://celoscan.io/tx/${txHash}`;
  }

  /**
   * Format transaction success message without direct hash link
   * Works for both directions of swaps: CELO to stablecoins and stablecoins to CELO
   */
  private getSwapMessage(fromToken: string, toToken: string, amount: string): string {
    return `I've submitted your request to swap ${amount} ${fromToken} to ${toToken}. 

The transaction has been sent to your wallet for signing. Once signed, it will be processed on the blockchain.

You can monitor the status in the Transactions panel.`;
  }

  /**
   * Format approval transaction success message
   */
  private getApprovalMessage(token: string, amount: string): string {
    return `I've requested approval for ${amount} ${token} tokens for Mento swap.

Please check your wallet to sign the approval transaction.

You can monitor the status in the Transactions panel.`;
  }

  /**
   * Parse amount from user input, with improved format detection
   * Completely rewritten to fix conversion issues
   */
  private parseAmount(amount: string): bigint {
    console.log(`[parseAmount] Raw input: "${amount}" (${typeof amount})`);
    
    try {
      // Normalize any scientific notation (e.g., 1e-4)
      if (amount.includes('e')) {
        const normalizedAmount = Number(amount).toString();
        console.log(`[parseAmount] Normalized scientific notation: "${amount}" → "${normalizedAmount}"`);
        amount = normalizedAmount;
      }
      
      // Case 1: Amount with decimal point (like "0.0001") - Use parseEther
      if (/^-?\d*\.\d+$/.test(amount)) {
        const result = parseEther(amount);
        console.log(`[parseAmount] Decimal format detected: ${amount} → ${result} wei`);
        
        // Safety check - if result is unreasonably large, something went wrong
        if (result > 10n**30n) {
          console.error(`[parseAmount] CONVERSION ERROR: Result too large: ${result}`);
          throw new Error(`Amount conversion produced unreasonable value: ${result}`);
        }
        
        return result;
      }
      
      // Case 2: Plain integer that represents a small CELO amount (e.g., "1" for 1 CELO)
      if (/^\d+$/.test(amount) && amount.length <= 6) {
        const result = parseEther(amount);
        console.log(`[parseAmount] Plain integer interpreted as CELO: ${amount} → ${result} wei`);
        return result;
      }
      
      // Case 3: Already in wei format (large integer)
      if (/^\d+$/.test(amount)) {
        const result = BigInt(amount);
        console.log(`[parseAmount] Wei format detected: ${amount} wei`);
        return result;
      }
      
      // Default case - try parseEther as last resort
      console.log(`[parseAmount] Using default parseEther for: ${amount}`);
      return parseEther(amount);
      
    } catch (error) {
      console.error(`[parseAmount] Error parsing amount "${amount}":`, error);
      throw new Error(`Invalid amount format: ${amount}. Please provide a valid number.`);
    }
  }

  /**
   * Format a detailed error message for insufficient balance
   */
  private formatInsufficientBalanceError(token: string, balance: string, required: string): string {
    return `❌ Error: Insufficient ${token} balance. You have ${balance} ${token}, but the operation requires ${required} ${token}.`;
  }

  /**
   * Check token allowance with improved error handling
   */
  private async checkAllowance(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof SwapParamsSchema>
  ): Promise<boolean> {
    const originalAmount = String(args.amount);
    console.log(`[checkAllowance] Checking allowance for ${args.fromToken}, amount: "${originalAmount}"`);
    
    const walletAddress = await walletProvider.getAddress();
    const tokenAddress = this.getTokenAddress(args.fromToken);
    
    const allowance = await walletProvider.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [walletAddress, MENTO_BROKER_ADDRESS],
    }) as bigint;

    // Parse amount to Wei with our fixed function
    const amountInWei = this.parseAmount(originalAmount);
    
    console.log(`[checkAllowance] Current allowance: ${formatEther(allowance)} ${args.fromToken} (${allowance} wei)`);
    console.log(`[checkAllowance] Required amount: ${formatEther(amountInWei)} ${args.fromToken} (${amountInWei} wei)`);
    
    if (allowance < amountInWei) {
      console.log(`[checkAllowance] INSUFFICIENT ALLOWANCE: ${formatEther(allowance)} < ${formatEther(amountInWei)}`);
      throw new InsufficientAllowanceError(
        args.fromToken,
        formatEther(allowance),
        formatEther(amountInWei)
      );
    } else {
      console.log(`[checkAllowance] Allowance check PASSED ✓`);
    }

    return true;
  }

  /**
   * Check if user has sufficient balance with improved error handling
   */
  private async checkBalance(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof SwapParamsSchema>
  ): Promise<void> {
    const originalAmount = String(args.amount);
    console.log(`[checkBalance] Checking balance for ${args.fromToken}, amount: "${originalAmount}"`);
    
    const address = await walletProvider.getAddress();
    const tokenAddress = this.getTokenAddress(args.fromToken);
    
    const balance = await walletProvider.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [address],
    }) as bigint;

    // Parse amount to Wei with our fixed function
    const amountInWei = this.parseAmount(originalAmount);
    
    console.log(`[checkBalance] Wallet balance: ${formatEther(balance)} ${args.fromToken} (${balance} wei)`);
    console.log(`[checkBalance] Required amount: ${formatEther(amountInWei)} ${args.fromToken} (${amountInWei} wei)`);
    
    if (balance < amountInWei) {
      console.log(`[checkBalance] INSUFFICIENT BALANCE: ${formatEther(balance)} < ${formatEther(amountInWei)}`);
      throw new InsufficientBalanceError(
        args.fromToken,
        formatEther(balance),
        formatEther(amountInWei)
      );
    } else {
      console.log(`[checkBalance] Balance check PASSED ✓`);
    }
  }

  /**
   * Approve token for swapping
   */
  @CreateAction({
    name: "approve_token",
    description: "Approve token spending for Mento swaps (CELO, cUSD, or cEUR)",
    schema: SwapParamsSchema,
  })
  async approveToken(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof SwapParamsSchema>
  ): Promise<string> {
    await this.checkNetwork(walletProvider);

    // IMPORTANT: Keep original amount as received from UI/command without pre-processing
    const originalAmount = String(args.amount);
    console.log(`[approveToken] Starting approval: ${originalAmount} ${args.fromToken}`);

    // Check if approval is needed (passing args directly)
    try {
      await this.checkAllowance(walletProvider, args);
      return this.getApprovalMessage(args.fromToken, originalAmount);
    } catch (error) {
      if (!(error instanceof InsufficientAllowanceError)) {
        throw error;
      }
      // Continue with approval if insufficient allowance
    }

    const tokenAddress = this.getTokenAddress(args.fromToken);
    
    // Parse amount to Wei for transaction - using our fixed function
    const amountInWei = this.parseAmount(originalAmount);
    const amountDisplay = formatEther(amountInWei);

    console.log(`[approveToken] Approving ${amountDisplay} ${args.fromToken} (${amountInWei} wei) for Mento swap`);

    const txHash = await walletProvider.sendTransaction({
      to: tokenAddress,
      data: encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "increaseAllowance",
        args: [MENTO_BROKER_ADDRESS, amountInWei],
      }),
    });

    console.log(`[approveToken] Approval transaction successful: ${this.getCeloscanLink(txHash)}`);
    return this.getApprovalMessage(args.fromToken, originalAmount);
  }

  /**
   * Execute swap
   */
  @CreateAction({
    name: "execute_swap",
    description: "Swap between CELO, cUSD, and cEUR using Mento Protocol",
    schema: SwapParamsSchema,
  })
  async executeSwap(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof SwapParamsSchema>
  ): Promise<string> {
    try {
      await this.checkNetwork(walletProvider);
      
      // IMPORTANT: Keep original amount as received from UI/command without pre-processing
      const originalAmount = String(args.amount);
      console.log(`[executeSwap] Starting swap: ${originalAmount} ${args.fromToken} to ${args.toToken} with slippage: ${args.slippageTolerance}%`);
      
      // Normalize token names in case of misspellings or different casing
      const normalizedFromToken = args.fromToken.toUpperCase() === 'CELLO' ? 'CELO' : args.fromToken;
      const normalizedToToken = args.toToken;
      
      // Check balance and allowance (passing args directly)
      await this.checkBalance(walletProvider, {...args, fromToken: normalizedFromToken, toToken: normalizedToToken});
      await this.checkAllowance(walletProvider, {...args, fromToken: normalizedFromToken, toToken: normalizedToToken});

      const fromTokenAddress = this.getTokenAddress(normalizedFromToken);
      const toTokenAddress = this.getTokenAddress(normalizedToToken);
      
      // Parse amount to Wei for transaction - using our fixed function
      const amountInWei = this.parseAmount(originalAmount);
      const amountDisplay = formatEther(amountInWei);
      
      const exchangeId = this.getExchangeId(normalizedFromToken, normalizedToToken);

      console.log(`[executeSwap] Swapping ${amountDisplay} ${normalizedFromToken} (${amountInWei} wei) to ${normalizedToToken}`);
      
      // Get quote to calculate minimum amount out based on slippage
      const expectedOutput = await walletProvider.readContract({
        address: MENTO_BROKER_ADDRESS as `0x${string}`,
        abi: MENTO_BROKER_ABI,
        functionName: 'getAmountOut',
        args: [
          EXCHANGE_PROVIDER as `0x${string}`,
          exchangeId,
          fromTokenAddress,
          toTokenAddress,
          amountInWei
        ]
      }) as bigint;
      
      // Calculate minimum amount out with slippage
      const slippageFactor = BigInt(Math.floor((100 - args.slippageTolerance) * 100)) / BigInt(10000);
      const minAmountOut = (expectedOutput * slippageFactor) / BigInt(100) * BigInt(100);
      
      console.log(`[executeSwap] Expected output: ${formatEther(expectedOutput)} ${normalizedToToken} (${expectedOutput} wei)`);
      console.log(`[executeSwap] Minimum output with ${args.slippageTolerance}% slippage: ${formatEther(minAmountOut)} ${normalizedToToken} (${minAmountOut} wei)`);

      // Get wallet address for logging
      const address = await walletProvider.getAddress();
      
      // Check if we're using a frontend-connected wallet
      const usingConnectedWallet = walletProvider.nativeTransfer.toString().includes('Creating pending transaction for frontend wallet');
      
      const txHash = await walletProvider.sendTransaction({
        to: MENTO_BROKER_ADDRESS as `0x${string}`,
        data: encodeFunctionData({
          abi: MENTO_BROKER_ABI,
          functionName: "swapIn",
          args: [
            EXCHANGE_PROVIDER as `0x${string}`,
            exchangeId as `0x${string}`,
            fromTokenAddress,
            toTokenAddress,
            amountInWei,
            minAmountOut,
          ],
        }),
      });

      const outputMessage = usingConnectedWallet
        ? this.getSwapMessage(normalizedFromToken, normalizedToToken, amountDisplay)
        : this.getSwapMessage(normalizedFromToken, normalizedToToken, amountDisplay);

      return outputMessage;
    } catch (error) {
      // Enhanced error handling for a better user experience
      if (error instanceof InsufficientBalanceError || 
          error instanceof InsufficientAllowanceError ||
          error instanceof InvalidTokenError ||
          error instanceof WrongNetworkError) {
        throw error; // These are already formatted nicely for the user
      } else {
        console.error('[executeSwap] Error:', error);
        // More user-friendly error message
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to execute swap: ${errorMessage}. Please try again with a different amount or token pair.`);
      }
    }
  }

  /**
   * 📊 Get a quote for the swap
   */
  @CreateAction({
    name: "get_swap_quote",
    description: "Get a quote for swapping between CELO, cUSD, and cEUR",
    schema: SwapParamsSchema,
  })
  async getSwapQuote(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof SwapParamsSchema>
  ): Promise<string> {
    await this.checkNetwork(walletProvider);
    
    // IMPORTANT: Keep original amount as received from UI/command without pre-processing
    const originalAmount = String(args.amount);
    const { fromToken, toToken } = args;
    
    console.log(`[getSwapQuote] Getting quote: ${originalAmount} ${fromToken} to ${toToken}`);
    
    // Validate token pair is supported
    const normalizedFromToken = fromToken.toUpperCase();
    const normalizedToToken = toToken.toUpperCase();
    
    const isCeloFrom = ['CELO', 'CELLO'].includes(normalizedFromToken);
    const isUsdFrom = ['CUSD', 'CÚSD', 'CSUSD'].includes(normalizedFromToken);
    const isEurFrom = ['CEUR', 'CÉUR', 'CSEUR'].includes(normalizedFromToken);
    
    const isCeloTo = ['CELO', 'CELLO'].includes(normalizedToToken);
    const isUsdTo = ['CUSD', 'CÚSD', 'CSUSD'].includes(normalizedToToken);
    const isEurTo = ['CEUR', 'CÉUR', 'CSEUR'].includes(normalizedToToken);
    
    // Validate token pair: Either CELO to stable or stable to CELO, not stable to stable
    if (!(
      (isCeloFrom && (isUsdTo || isEurTo)) || 
      ((isUsdFrom || isEurFrom) && isCeloTo)
    )) {
      throw new Error(`Unsupported token pair: ${fromToken} to ${toToken}. Only CELO ⟷ cUSD/cEUR swaps are supported.`);
    }
    
    const fromTokenAddress = this.getTokenAddress(fromToken);
    const toTokenAddress = this.getTokenAddress(toToken);
    const exchangeId = this.getExchangeId(fromToken, toToken);
    
    // Parse amount to Wei for transaction - using our fixed function
    const amountInWei = this.parseAmount(originalAmount);
    const amountDisplay = formatEther(amountInWei);
    
    console.log(`[getSwapQuote] Requesting quote for ${amountDisplay} ${fromToken} (${amountInWei} wei) to ${toToken}`);
    
    // Get expected output amount
    const expectedOutput = await walletProvider.readContract({
      address: MENTO_BROKER_ADDRESS as `0x${string}`,
      abi: MENTO_BROKER_ABI,
      functionName: 'getAmountOut',
      args: [
        EXCHANGE_PROVIDER as `0x${string}`,
        exchangeId,
        fromTokenAddress,
        toTokenAddress,
        amountInWei
      ]
    }) as bigint;
    
    // Format the output amount
    const formattedOutput = formatEther(expectedOutput);
    const exchangeRate = Number(formattedOutput) / Number(amountDisplay);
    
    console.log(`[getSwapQuote] Quote received: ${formattedOutput} ${toToken} (${expectedOutput} wei)`);
    console.log(`[getSwapQuote] Exchange rate: 1 ${fromToken} = ${exchangeRate.toFixed(6)} ${toToken}`);
    
    // Generate emoji for token display
    const fromEmoji = fromToken.toUpperCase().includes('CELO') ? '🟡 CELO' : 
                     fromToken.toUpperCase().includes('USD') ? '💵 cUSD' : '💶 cEUR';
    const toEmoji = toToken.toUpperCase().includes('CELO') ? '🟡 CELO' : 
                   toToken.toUpperCase().includes('USD') ? '💵 cUSD' : '💶 cEUR';
    
    return `📊 **Mento Swap Quote**\n\n💱 ${amountDisplay} ${fromEmoji} ➡️ ${formattedOutput} ${toEmoji}\n📈 Exchange Rate: 1 ${fromToken} = ${exchangeRate.toFixed(6)} ${toToken}\n\n⚠️ Rate may fluctuate slightly. Use slippage tolerance when executing swap.`;
  }

  supportsNetwork = (network: Network): boolean => {
    return network.networkId?.includes("celo") || network.chainId === "42220";
  };
}

/**
 * 🏭 Factory function for creating a MentoSwapActionProvider instance
 */
export const mentoSwapActionProvider = () => new MentoSwapActionProvider();