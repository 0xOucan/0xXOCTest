import { createPublicClient, createWalletClient, http, formatUnits, parseUnits, encodeFunctionData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, arbitrum, mantle, zkSync } from 'viem/chains';
import * as dotenv from 'dotenv';
import { getContract } from 'viem';
import { 
  ESCROW_WALLET_ADDRESS,
  XOC_TOKEN_ADDRESS,
  MXNB_TOKEN_ADDRESS,
  USDT_MANTLE_TOKEN_ADDRESS,
  USDT_ZKSYNC_ERA_TOKEN_ADDRESS,
  XOC_DECIMALS,
  MXNB_DECIMALS,
  USDT_MANTLE_DECIMALS,
  USDT_ZKSYNC_ERA_DECIMALS,
  ERC20_ABI,
  SWAP_FEE_PERCENTAGE
} from '../action-providers/basic-atomic-swaps/constants';
import { chainClients } from '../action-providers/basic-atomic-swaps/utils';
import { 
  applySwapFee, 
  updateSwapStatus, 
  getSwapById,
  getMostRecentSwap,
  swapHistory
} from '../action-providers/basic-atomic-swaps/utils';
import { SwapResult } from '../action-providers/basic-atomic-swaps/schemas';

// Load environment variables
dotenv.config();

// Get the escrow wallet private key from environment variables
const ESCROW_PRIVATE_KEY = process.env.ESCROW_PRIVATE_KEY;

// Check if the private key is available
if (!ESCROW_PRIVATE_KEY) {
  console.error('⚠️ ESCROW_PRIVATE_KEY is not set in environment variables');
  console.error('Atomic swap relay service will not be able to send tokens');
}

/**
 * Initialize the escrow wallet account
 */
const getEscrowAccount = () => {
  if (!ESCROW_PRIVATE_KEY) {
    throw new Error('Escrow wallet private key not configured');
  }
  return privateKeyToAccount(ESCROW_PRIVATE_KEY as `0x${string}`);
};

/**
 * Create a wallet client for the escrow on the specified network
 */
const createEscrowWalletClient = (chainName: 'base' | 'arbitrum' | 'mantle' | 'zksync') => {
  try {
    const account = getEscrowAccount();
    let chain;
    
    if (chainName === 'base') {
      chain = base;
    } else if (chainName === 'arbitrum') {
      chain = arbitrum;
    } else if (chainName === 'mantle') {
      chain = mantle;
    } else {
      chain = zkSync;
    }
    
    return createWalletClient({
      account,
      chain,
      transport: http(chain.rpcUrls.default.http[0])
    });
  } catch (error) {
    console.error(`Failed to create escrow wallet client for ${chainName}:`, error);
    return null;
  }
};

/**
 * Check if a transaction is confirmed on the specified chain
 */
const isTransactionConfirmed = async (swap: SwapResult): Promise<boolean> => {
  try {
    if (!swap || !swap.sourceTxHash) {
      console.error(`Invalid swap data or missing sourceTxHash`);
      return false;
    }
    
    // Make sure we're using a real blockchain hash (should start with 0x and be 66 chars long)
    if (!swap.sourceTxHash.startsWith('0x') || swap.sourceTxHash.includes('tx-')) {
      console.log(`Waiting for real blockchain hash for swap ${swap.swapId}, current value: ${swap.sourceTxHash}`);
      return false;
    }
    
    console.log(`Checking transaction confirmations for hash: ${swap.sourceTxHash}`);
    
    // Use the appropriate client based on the source chain
    const client = chainClients[swap.sourceChain];
    
    // Get transaction confirmations
    const confirmations = await client.getTransactionConfirmations({
      hash: swap.sourceTxHash as `0x${string}`
    });
    
    console.log(`Transaction ${swap.sourceTxHash} has ${confirmations} confirmations`);
    
    // Consider transaction confirmed if it has at least 1 confirmation
    return confirmations > 0;
  } catch (error) {
    console.error(`Error checking transaction status:`, error);
    return false;
  }
};

/**
 * Check escrow wallet's balances on Arbitrum
 */
const checkEscrowBalances = async (): Promise<{ eth: bigint, mxnb: bigint }> => {
  try {
    if (!ESCROW_PRIVATE_KEY) {
      throw new Error('Escrow wallet private key not configured');
    }
    
    // Create account from private key
    const account = privateKeyToAccount(ESCROW_PRIVATE_KEY as `0x${string}`);
    
    // Create public client for Arbitrum
    const publicClient = createPublicClient({
      chain: arbitrum,
      transport: http(arbitrum.rpcUrls.default.http[0])
    });
    
    // Check ETH balance
    const ethBalance = await publicClient.getBalance({
      address: account.address
    });
    
    // Check MXNB balance
    const mxnbBalance = await publicClient.readContract({
      address: MXNB_TOKEN_ADDRESS as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [account.address]
    });
    
    const ethBalanceFormatted = formatUnits(ethBalance, 18);
    const mxnbBalanceFormatted = formatUnits(mxnbBalance as bigint, MXNB_DECIMALS);
    
    console.log(`Escrow wallet (${account.address}) balances on Arbitrum:`);
    console.log(`- ETH: ${ethBalanceFormatted}`);
    console.log(`- MXNB: ${mxnbBalanceFormatted}`);
    
    return {
      eth: ethBalance,
      mxnb: mxnbBalance as bigint
    };
  } catch (error) {
    console.error('Error checking escrow balances:', error);
    return { eth: 0n, mxnb: 0n };
  }
};

/**
 * Check escrow wallet's balances on Base
 */
const checkEscrowBaseBalances = async (): Promise<{ eth: bigint, xoc: bigint }> => {
  try {
    if (!ESCROW_PRIVATE_KEY) {
      throw new Error('Escrow wallet private key not configured');
    }
    
    // Create account from private key
    const account = privateKeyToAccount(ESCROW_PRIVATE_KEY as `0x${string}`);
    
    // Create public client for Base
    const publicClient = createPublicClient({
      chain: base,
      transport: http(base.rpcUrls.default.http[0])
    });
    
    // Check ETH balance
    const ethBalance = await publicClient.getBalance({
      address: account.address
    });
    
    // Check XOC balance
    const xocBalance = await publicClient.readContract({
      address: XOC_TOKEN_ADDRESS as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [account.address]
    });
    
    const ethBalanceFormatted = formatUnits(ethBalance, 18);
    const xocBalanceFormatted = formatUnits(xocBalance as bigint, XOC_DECIMALS);
    
    console.log(`Escrow wallet (${account.address}) balances on Base:`);
    console.log(`- ETH: ${ethBalanceFormatted}`);
    console.log(`- XOC: ${xocBalanceFormatted}`);
    
    return {
      eth: ethBalance,
      xoc: xocBalance as bigint
    };
  } catch (error) {
    console.error('Error checking escrow balances on Base:', error);
    return { eth: 0n, xoc: 0n };
  }
};

/**
 * Check escrow wallet's balances on Mantle
 */
const checkEscrowMantleBalances = async (): Promise<{ mnt: bigint, usdt: bigint }> => {
  try {
    if (!ESCROW_PRIVATE_KEY) {
      throw new Error('Escrow wallet private key not configured');
    }
    
    // Create account from private key
    const account = privateKeyToAccount(ESCROW_PRIVATE_KEY as `0x${string}`);
    
    // Create public client for Mantle
    const publicClient = createPublicClient({
      chain: mantle,
      transport: http(mantle.rpcUrls.default.http[0])
    });
    
    // Check MNT balance
    const mntBalance = await publicClient.getBalance({
      address: account.address
    });
    
    // Check USDT balance
    const usdtBalance = await publicClient.readContract({
      address: USDT_MANTLE_TOKEN_ADDRESS as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [account.address]
    });
    
    const mntBalanceFormatted = formatUnits(mntBalance, 18);
    const usdtBalanceFormatted = formatUnits(usdtBalance as bigint, USDT_MANTLE_DECIMALS);
    
    console.log(`Escrow wallet (${account.address}) balances on Mantle:`);
    console.log(`- MNT: ${mntBalanceFormatted}`);
    console.log(`- USDT: ${usdtBalanceFormatted}`);
    
    return {
      mnt: mntBalance,
      usdt: usdtBalance as bigint
    };
  } catch (error) {
    console.error('Error checking escrow balances on Mantle:', error);
    return { mnt: 0n, usdt: 0n };
  }
};

/**
 * Check escrow wallet's balances on zkSync Era
 */
const checkEscrowZkSyncBalances = async (): Promise<{ eth: bigint, usdt: bigint }> => {
  try {
    if (!ESCROW_PRIVATE_KEY) {
      throw new Error('Escrow wallet private key not configured');
    }
    
    // Create account from private key
    const account = privateKeyToAccount(ESCROW_PRIVATE_KEY as `0x${string}`);
    
    // Create public client for zkSync Era
    const publicClient = createPublicClient({
      chain: zkSync,
      transport: http(zkSync.rpcUrls.default.http[0])
    });
    
    // Check ETH balance
    const ethBalance = await publicClient.getBalance({
      address: account.address
    });
    
    // Check USDT balance
    const usdtBalance = await publicClient.readContract({
      address: USDT_ZKSYNC_ERA_TOKEN_ADDRESS as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [account.address]
    });
    
    const ethBalanceFormatted = formatUnits(ethBalance, 18);
    const usdtBalanceFormatted = formatUnits(usdtBalance as bigint, USDT_ZKSYNC_ERA_DECIMALS);
    
    console.log(`Escrow wallet (${account.address}) balances on zkSync Era:`);
    console.log(`- ETH: ${ethBalanceFormatted}`);
    console.log(`- USDT: ${usdtBalanceFormatted}`);
    
    return {
      eth: ethBalance,
      usdt: usdtBalance as bigint
    };
  } catch (error) {
    console.error('Error checking escrow balances on zkSync Era:', error);
    return { eth: 0n, usdt: 0n };
  }
};

/**
 * Send MXNB tokens from escrow wallet to recipient on Arbitrum
 */
const sendMxnbFromEscrow = async (
  recipientAddress: string,
  amount: string
): Promise<string> => {
  try {
    if (!ESCROW_PRIVATE_KEY) {
      throw new Error('Escrow wallet private key not configured');
    }
    
    console.log(`Preparing to send ${amount} MXNB to ${recipientAddress} on Arbitrum...`);
    
    // Check escrow balances first
    const balances = await checkEscrowBalances();
    const amountInWei = parseUnits(amount, MXNB_DECIMALS);
    
    // Verify escrow has enough MXNB
    if (balances.mxnb < amountInWei) {
      throw new Error(`Insufficient MXNB balance in escrow wallet. Required: ${amount}, Available: ${formatUnits(balances.mxnb, MXNB_DECIMALS)}`);
    }
    
    // Verify escrow has some ETH for gas
    if (balances.eth < parseUnits('0.0001', 18)) {
      throw new Error(`Insufficient ETH in escrow wallet for gas. Available: ${formatUnits(balances.eth, 18)}`);
    }
    
    // Create account from private key
    const account = privateKeyToAccount(ESCROW_PRIVATE_KEY as `0x${string}`);
    
    // Create wallet client specifically for Arbitrum
    const walletClient = createWalletClient({
      account,
      chain: arbitrum,
      transport: http(arbitrum.rpcUrls.default.http[0])
    });
    
    // Create a contract instance for MXNB token
    const mxnbToken = getContract({
      address: MXNB_TOKEN_ADDRESS as `0x${string}`,
      abi: ERC20_ABI,
      client: walletClient,
    });
    
    // Execute the transfer using the contract method
    console.log(`Sending ${amount} MXNB to ${recipientAddress}...`);
    const hash = await mxnbToken.write.transfer(
      [recipientAddress as `0x${string}`, amountInWei],
      {
        // Set specific gas parameters for Arbitrum
        gas: 300000n, // Set a sufficient gas limit for token transfers
      }
    );
    
    console.log(`✅ MXNB sent from escrow to ${recipientAddress}, hash: ${hash}`);
    return hash;
  } catch (error) {
    console.error('Error sending MXNB from escrow:', error);
    throw error;
  }
};

/**
 * Send XOC tokens from escrow wallet to recipient on Base
 */
const sendXocFromEscrow = async (
  recipientAddress: string,
  amount: string
): Promise<string> => {
  try {
    if (!ESCROW_PRIVATE_KEY) {
      throw new Error('Escrow wallet private key not configured');
    }
    
    console.log(`Preparing to send ${amount} XOC to ${recipientAddress} on Base...`);
    
    // Check escrow balances first
    const balances = await checkEscrowBaseBalances();
    const amountInWei = parseUnits(amount, XOC_DECIMALS);
    
    // Verify escrow has enough XOC
    if (balances.xoc < amountInWei) {
      throw new Error(`Insufficient XOC balance in escrow wallet. Required: ${amount}, Available: ${formatUnits(balances.xoc, XOC_DECIMALS)}`);
    }
    
    // Verify escrow has some ETH for gas
    if (balances.eth < parseUnits('0.0001', 18)) {
      throw new Error(`Insufficient ETH in escrow wallet for gas on Base. Available: ${formatUnits(balances.eth, 18)}`);
    }
    
    // Create account from private key
    const account = privateKeyToAccount(ESCROW_PRIVATE_KEY as `0x${string}`);
    
    // Create wallet client specifically for Base
    const walletClient = createWalletClient({
      account,
      chain: base,
      transport: http(base.rpcUrls.default.http[0])
    });
    
    // Create a contract instance for XOC token
    const xocToken = getContract({
      address: XOC_TOKEN_ADDRESS as `0x${string}`,
      abi: ERC20_ABI,
      client: walletClient,
    });
    
    // Execute the transfer using the contract method
    console.log(`Sending ${amount} XOC to ${recipientAddress}...`);
    const hash = await xocToken.write.transfer(
      [recipientAddress as `0x${string}`, amountInWei],
      {
        gas: 300000n, // Set a sufficient gas limit for token transfers
      }
    );
    
    console.log(`✅ XOC sent from escrow to ${recipientAddress}, hash: ${hash}`);
    return hash;
  } catch (error) {
    console.error('Error sending XOC from escrow:', error);
    throw error;
  }
};

/**
 * Send USDT tokens from escrow wallet to recipient on Mantle
 */
const sendUsdtFromEscrow = async (
  recipientAddress: string,
  amount: string
): Promise<string> => {
  try {
    if (!ESCROW_PRIVATE_KEY) {
      throw new Error('Escrow wallet private key not configured');
    }
    
    console.log(`Preparing to send ${amount} USDT to ${recipientAddress} on Mantle...`);
    
    // Check escrow balances first
    const balances = await checkEscrowMantleBalances();
    const amountInWei = parseUnits(amount, USDT_MANTLE_DECIMALS);
    
    // Verify escrow has enough USDT
    if (balances.usdt < amountInWei) {
      throw new Error(`Insufficient USDT balance in escrow wallet. Required: ${amount}, Available: ${formatUnits(balances.usdt, USDT_MANTLE_DECIMALS)}`);
    }
    
    // Verify escrow has some MNT for gas
    if (balances.mnt < parseUnits('0.0001', 18)) {
      throw new Error(`Insufficient MNT in escrow wallet for gas. Available: ${formatUnits(balances.mnt, 18)}`);
    }
    
    // Create account from private key
    const account = privateKeyToAccount(ESCROW_PRIVATE_KEY as `0x${string}`);
    
    // Create wallet client specifically for Mantle
    const walletClient = createWalletClient({
      account,
      chain: mantle,
      transport: http(mantle.rpcUrls.default.http[0])
    });
    
    // Create public client for gas estimation
    const publicClient = createPublicClient({
      chain: mantle,
      transport: http(mantle.rpcUrls.default.http[0])
    });
    
    // Prepare the transfer data
    const transferData = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [recipientAddress as `0x${string}`, amountInWei]
    });
    
    // Estimate gas for the transaction
    console.log(`Estimating gas for USDT transfer on Mantle...`);
    try {
      const gasEstimate = await publicClient.estimateGas({
        account: account.address,
        to: USDT_MANTLE_TOKEN_ADDRESS as `0x${string}`,
        data: transferData,
        value: 0n
      });
      
      // Add a buffer to the gas estimate (50% more to be safe on Mantle)
      const gasLimit = (gasEstimate * 150n) / 100n;
      console.log(`Estimated gas: ${gasEstimate}, Using gas limit with buffer: ${gasLimit}`);
      
      // Create a contract instance for USDT token
      const usdtToken = getContract({
        address: USDT_MANTLE_TOKEN_ADDRESS as `0x${string}`,
        abi: ERC20_ABI,
        client: walletClient,
      });
      
      // Execute the transfer using the contract method with estimated gas
      console.log(`Sending ${amount} USDT to ${recipientAddress} with gas limit ${gasLimit}...`);
      const hash = await usdtToken.write.transfer(
        [recipientAddress as `0x${string}`, amountInWei],
        {
          gas: gasLimit,
        }
      );
      
      console.log(`✅ USDT sent from escrow to ${recipientAddress}, hash: ${hash}`);
      return hash;
    } catch (estimateError) {
      console.error('Error estimating gas, using fallback high gas limit:', estimateError);
      
      // Fallback to a very high gas limit for Mantle network
      // Based on the successful transaction example, use 150,000,000 as a safe value
      const fallbackGasLimit = 150000000n;
      console.log(`Using fallback gas limit: ${fallbackGasLimit}`);
      
      // Create a contract instance for USDT token
      const usdtToken = getContract({
        address: USDT_MANTLE_TOKEN_ADDRESS as `0x${string}`,
        abi: ERC20_ABI,
        client: walletClient,
      });
      
      // Execute the transfer using the contract method with the fallback gas limit
      console.log(`Sending ${amount} USDT to ${recipientAddress} with fallback gas limit ${fallbackGasLimit}...`);
      const hash = await usdtToken.write.transfer(
        [recipientAddress as `0x${string}`, amountInWei],
        {
          gas: fallbackGasLimit,
        }
      );
      
      console.log(`✅ USDT sent from escrow to ${recipientAddress}, hash: ${hash}`);
      return hash;
    }
  } catch (error) {
    console.error('Error sending USDT from escrow:', error);
    throw error;
  }
};

/**
 * Send USDT tokens from escrow wallet to recipient on zkSync Era
 */
const sendZkUsdtFromEscrow = async (
  recipientAddress: string,
  amount: string
): Promise<string> => {
  try {
    if (!ESCROW_PRIVATE_KEY) {
      throw new Error('Escrow wallet private key not configured');
    }
    
    console.log(`Preparing to send ${amount} USDT to ${recipientAddress} on zkSync Era...`);
    
    // Check escrow balances first
    const balances = await checkEscrowZkSyncBalances();
    const amountInWei = parseUnits(amount, USDT_ZKSYNC_ERA_DECIMALS);
    
    // Verify escrow has enough USDT
    if (balances.usdt < amountInWei) {
      throw new Error(`Insufficient USDT balance in escrow wallet on zkSync Era. Required: ${amount}, Available: ${formatUnits(balances.usdt, USDT_ZKSYNC_ERA_DECIMALS)}`);
    }
    
    // Verify escrow has some ETH for gas
    if (balances.eth < parseUnits('0.0001', 18)) {
      throw new Error(`Insufficient ETH in escrow wallet for gas on zkSync Era. Available: ${formatUnits(balances.eth, 18)}`);
    }
    
    // Create account from private key
    const account = privateKeyToAccount(ESCROW_PRIVATE_KEY as `0x${string}`);
    
    // Create wallet client specifically for zkSync Era
    const walletClient = createWalletClient({
      account,
      chain: zkSync,
      transport: http(zkSync.rpcUrls.default.http[0])
    });
    
    // Create a contract instance for USDT token
    const usdtToken = getContract({
      address: USDT_ZKSYNC_ERA_TOKEN_ADDRESS as `0x${string}`,
      abi: ERC20_ABI,
      client: walletClient,
    });
    
    // Execute the transfer using the contract method
    console.log(`Sending ${amount} USDT to ${recipientAddress} on zkSync Era...`);
    const hash = await usdtToken.write.transfer(
      [recipientAddress as `0x${string}`, amountInWei],
      {
        gas: 300000n, // Set a sufficient gas limit for token transfers
      }
    );
    
    console.log(`✅ USDT sent from escrow to ${recipientAddress} on zkSync Era, hash: ${hash}`);
    return hash;
  } catch (error) {
    console.error('Error sending USDT from escrow on zkSync Era:', error);
    throw error;
  }
};

/**
 * Process a completed swap
 */
const processSwap = async (swapId: string): Promise<boolean> => {
  try {
    const swap = getSwapById(swapId);
    if (!swap) {
      console.error(`Swap ${swapId} not found`);
      return false;
    }
    
    // Check if the source transaction is confirmed
    if (!swap.sourceTxHash) {
      console.error(`Swap ${swapId} has no source transaction hash`);
      return false;
    }
    
    // Skip processing if the transaction hash isn't a valid blockchain hash
    if (!swap.sourceTxHash.startsWith('0x') || swap.sourceTxHash.includes('tx-')) {
      console.log(`Waiting for real blockchain hash for swap ${swapId}, current value: ${swap.sourceTxHash}`);
      return false;
    }
    
    // Pass the entire swap object to isTransactionConfirmed
    const confirmed = await isTransactionConfirmed(swap);
    if (!confirmed) {
      console.log(`Source transaction for swap ${swapId} not confirmed yet`);
      return false;
    }
    
    // Check if the swap is already completed
    if (swap.status === 'completed') {
      console.log(`Swap ${swapId} is already completed`);
      return true;
    }
    
    try {
      let targetHash: string;
      
      // Check the swap direction and send tokens accordingly
      if (swap.sourceChain === 'base' && swap.targetChain === 'arbitrum') {
        // XOC to MXNB swap (Base to Arbitrum)
        console.log(`Preparing to send ${swap.targetAmount} MXNB to ${swap.recipientAddress} on Arbitrum...`);
        targetHash = await sendMxnbFromEscrow(
          swap.recipientAddress,
          swap.targetAmount
        );
      } else if (swap.sourceChain === 'arbitrum' && swap.targetChain === 'base') {
        // MXNB to XOC swap (Arbitrum to Base)
        console.log(`Preparing to send ${swap.targetAmount} XOC to ${swap.recipientAddress} on Base...`);
        targetHash = await sendXocFromEscrow(
          swap.recipientAddress,
          swap.targetAmount
        );
      } else if (swap.sourceChain === 'mantle' && swap.targetChain === 'base') {
        // USDT to XOC swap (Mantle to Base)
        console.log(`Preparing to send ${swap.targetAmount} XOC to ${swap.recipientAddress} on Base...`);
        targetHash = await sendXocFromEscrow(
          swap.recipientAddress,
          swap.targetAmount
        );
      } else if (swap.sourceChain === 'base' && swap.targetChain === 'mantle') {
        // XOC to USDT swap (Base to Mantle)
        console.log(`Preparing to send ${swap.targetAmount} USDT to ${swap.recipientAddress} on Mantle...`);
        targetHash = await sendUsdtFromEscrow(
          swap.recipientAddress,
          swap.targetAmount
        );
      } else if (swap.sourceChain === 'mantle' && swap.targetChain === 'arbitrum') {
        // USDT to MXNB swap (Mantle to Arbitrum)
        console.log(`Preparing to send ${swap.targetAmount} MXNB to ${swap.recipientAddress} on Arbitrum...`);
        targetHash = await sendMxnbFromEscrow(
          swap.recipientAddress,
          swap.targetAmount
        );
      } else if (swap.sourceChain === 'arbitrum' && swap.targetChain === 'mantle') {
        // MXNB to USDT swap (Arbitrum to Mantle)
        console.log(`Preparing to send ${swap.targetAmount} USDT to ${swap.recipientAddress} on Mantle...`);
        targetHash = await sendUsdtFromEscrow(
          swap.recipientAddress,
          swap.targetAmount
        );
      } 
      // Add zkSync Era swap cases
      else if (swap.sourceChain === 'zksync' && swap.targetChain === 'base') {
        // USDT to XOC swap (zkSync to Base)
        console.log(`Preparing to send ${swap.targetAmount} XOC to ${swap.recipientAddress} on Base...`);
        targetHash = await sendXocFromEscrow(
          swap.recipientAddress,
          swap.targetAmount
        );
      } else if (swap.sourceChain === 'base' && swap.targetChain === 'zksync') {
        // XOC to USDT swap (Base to zkSync)
        console.log(`Preparing to send ${swap.targetAmount} USDT to ${swap.recipientAddress} on zkSync Era...`);
        targetHash = await sendZkUsdtFromEscrow(
          swap.recipientAddress,
          swap.targetAmount
        );
      } else if (swap.sourceChain === 'zksync' && swap.targetChain === 'arbitrum') {
        // USDT to MXNB swap (zkSync to Arbitrum)
        console.log(`Preparing to send ${swap.targetAmount} MXNB to ${swap.recipientAddress} on Arbitrum...`);
        targetHash = await sendMxnbFromEscrow(
          swap.recipientAddress,
          swap.targetAmount
        );
      } else if (swap.sourceChain === 'arbitrum' && swap.targetChain === 'zksync') {
        // MXNB to USDT swap (Arbitrum to zkSync)
        console.log(`Preparing to send ${swap.targetAmount} USDT to ${swap.recipientAddress} on zkSync Era...`);
        targetHash = await sendZkUsdtFromEscrow(
          swap.recipientAddress,
          swap.targetAmount
        );
      } else if (swap.sourceChain === 'zksync' && swap.targetChain === 'mantle') {
        // USDT to USDT swap (zkSync to Mantle)
        console.log(`Preparing to send ${swap.targetAmount} USDT to ${swap.recipientAddress} on Mantle...`);
        targetHash = await sendUsdtFromEscrow(
          swap.recipientAddress,
          swap.targetAmount
        );
      } else if (swap.sourceChain === 'mantle' && swap.targetChain === 'zksync') {
        // USDT to USDT swap (Mantle to zkSync)
        console.log(`Preparing to send ${swap.targetAmount} USDT to ${swap.recipientAddress} on zkSync Era...`);
        targetHash = await sendZkUsdtFromEscrow(
          swap.recipientAddress,
          swap.targetAmount
        );
      } else {
        console.error(`Unsupported swap direction: ${swap.sourceChain} to ${swap.targetChain}`);
        return false;
      }
      
      // Update swap status to completed
      updateSwapStatus(swapId, 'completed', undefined, targetHash);
      
      console.log(`✅ Atomic swap ${swapId} completed successfully`);
      console.log(`Source TX: ${swap.sourceTxHash} (${swap.sourceChain.charAt(0).toUpperCase() + swap.sourceChain.slice(1)})`);
      console.log(`Target TX: ${targetHash} (${swap.targetChain.charAt(0).toUpperCase() + swap.targetChain.slice(1)})`);
      
      return true;
    } catch (error) {
      console.error(`Error completing swap ${swapId}:`, error);
      // Don't mark as failed yet, will retry next interval
      return false;
    }
  } catch (error) {
    console.error(`Error processing swap ${swapId}:`, error);
    return false;
  }
};

/**
 * Check for pending swaps and process them
 */
export const checkAndProcessSwaps = async (): Promise<void> => {
  try {
    // Get all swaps that are in pending state
    const pendingSwaps = swapHistory.filter(swap => swap.status === 'pending');
    
    if (pendingSwaps.length === 0) {
      console.log('No pending swaps to process');
      return;
    }
    
    console.log(`Found ${pendingSwaps.length} pending swaps to process`);
    
    // Process each pending swap
    for (const swap of pendingSwaps) {
      console.log(`Processing swap: ${swap.swapId}`);
      await processSwap(swap.swapId);
    }
  } catch (error) {
    console.error('Error checking and processing swaps:', error);
  }
};

// Start the relay service
export const startAtomicSwapRelay = () => {
  // Check if we have the necessary configuration
  if (!ESCROW_PRIVATE_KEY) {
    console.warn('⚠️ Atomic swap relay service is disabled: Missing ESCROW_PRIVATE_KEY');
    return;
  }
  
  console.log('🔄 Starting atomic swap relay service...');
  
  // Verify that the private key corresponds to the expected wallet address
  try {
    const account = privateKeyToAccount(ESCROW_PRIVATE_KEY as `0x${string}`);
    if (account.address.toLowerCase() !== ESCROW_WALLET_ADDRESS.toLowerCase()) {
      console.error('⚠️ CRITICAL ERROR: The ESCROW_PRIVATE_KEY does not correspond to the configured ESCROW_WALLET_ADDRESS');
      console.error(`Expected address: ${ESCROW_WALLET_ADDRESS}`);
      console.error(`Actual address from private key: ${account.address}`);
      console.error('Please ensure you are using the correct private key for the escrow wallet');
    } else {
      console.log(`✅ Verified escrow wallet address: ${ESCROW_WALLET_ADDRESS}`);
    }
  } catch (error) {
    console.error('⚠️ Error validating escrow wallet private key:', error);
  }
  
  // Check escrow balances on all chains at startup
  Promise.all([
    checkEscrowBalances(),
    checkEscrowBaseBalances(),
    checkEscrowMantleBalances(),
    checkEscrowZkSyncBalances()
  ]).then(([arbitrumBalances, baseBalances, mantleBalances, zkSyncBalances]) => {
    if (arbitrumBalances.eth < parseUnits('0.0001', 18)) {
      console.warn('⚠️ WARNING: Escrow wallet has insufficient ETH on Arbitrum for gas fees');
    }
    
    if (arbitrumBalances.mxnb === 0n) {
      console.warn('⚠️ WARNING: Escrow wallet has 0 MXNB tokens on Arbitrum');
    }
    
    if (baseBalances.eth < parseUnits('0.0001', 18)) {
      console.warn('⚠️ WARNING: Escrow wallet has insufficient ETH on Base for gas fees');
    }
    
    if (baseBalances.xoc === 0n) {
      console.warn('⚠️ WARNING: Escrow wallet has 0 XOC tokens on Base');
    }
    
    if (mantleBalances.mnt < parseUnits('0.0001', 18)) {
      console.warn('⚠️ WARNING: Escrow wallet has insufficient MNT on Mantle for gas fees');
    }
    
    if (mantleBalances.usdt === 0n) {
      console.warn('⚠️ WARNING: Escrow wallet has 0 USDT tokens on Mantle');
    }
    
    if (zkSyncBalances.eth < parseUnits('0.0001', 18)) {
      console.warn('⚠️ WARNING: Escrow wallet has insufficient ETH on zkSync Era for gas fees');
    }
    
    if (zkSyncBalances.usdt === 0n) {
      console.warn('⚠️ WARNING: Escrow wallet has 0 USDT tokens on zkSync Era');
    }
  });
  
  // Check for swaps every 30 seconds
  const intervalId = setInterval(async () => {
    await checkAndProcessSwaps();
  }, 30000);
  
  // Initial check
  checkAndProcessSwaps();
  
  return () => clearInterval(intervalId);
};