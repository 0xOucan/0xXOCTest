import { formatUnits, parseUnits } from 'viem';
import { SwapResult } from './schemas';
import { createPublicClient, http, PublicClient } from 'viem';
import { base, arbitrum, mantle, zkSync } from 'viem/chains';
import { 
  BASESCAN_TX_URL, 
  ARBISCAN_TX_URL, 
  MANTLESCAN_TX_URL,
  ZKSYNC_ERA_SCAN_TX_URL,
  SWAP_FEE_PERCENTAGE,
  USDT_MANTLE_TO_XOC_RATE,
  USDT_MANTLE_TO_MXNB_RATE,
  USDT_ZKSYNC_ERA_TO_XOC_RATE,
  USDT_ZKSYNC_ERA_TO_MXNB_RATE,
  USDT_MANTLE_TO_USDT_ZKSYNC_ERA_RATE
} from './constants';

/**
 * Format an amount with the given number of decimals
 */
export function formatAmount(amount: bigint | string, decimals: number): string {
  if (typeof amount === 'string') {
    // If the amount is already a string, parse it first
    try {
      return formatUnits(parseUnits(amount, decimals), decimals);
    } catch (error) {
      console.error('Error formatting amount:', error);
      return '0';
    }
  }
  return formatUnits(amount, decimals);
}

/**
 * Generate a block explorer URL for a transaction
 */
export function getExplorerLink(chain: 'base' | 'arbitrum' | 'mantle' | 'zksync', txHash: string): string {
  if (chain === 'base') {
    return `${BASESCAN_TX_URL}${txHash}`;
  } else if (chain === 'arbitrum') {
    return `${ARBISCAN_TX_URL}${txHash}`;
  } else if (chain === 'mantle') {
    return `${MANTLESCAN_TX_URL}${txHash}`;
  } else {
    return `${ZKSYNC_ERA_SCAN_TX_URL}${txHash}`;
  }
}

/**
 * Get a transaction link for the command response
 */
export function getTransactionTextLink(chain: 'base' | 'arbitrum' | 'mantle' | 'zksync', txHash: string): string {
  let baseUrl;
  let explorerName;
  
  if (chain === 'base') {
    baseUrl = BASESCAN_TX_URL;
    explorerName = 'BaseScan';
  } else if (chain === 'arbitrum') {
    baseUrl = ARBISCAN_TX_URL;
    explorerName = 'Arbiscan';
  } else if (chain === 'mantle') {
    baseUrl = MANTLESCAN_TX_URL;
    explorerName = 'MantleScan';
  } else {
    baseUrl = ZKSYNC_ERA_SCAN_TX_URL;
    explorerName = 'zkSync Era Explorer';
  }
  
  return `[View transaction on ${explorerName}](${baseUrl}${txHash})`;
}

/**
 * Apply the swap fee to an amount
 */
export function applySwapFee(amount: string, decimals: number): string {
  const parsedAmount = parseFloat(amount);
  const fee = parsedAmount * (SWAP_FEE_PERCENTAGE / 100);
  const amountAfterFee = parsedAmount - fee;
  return amountAfterFee.toFixed(decimals);
}

/**
 * Convert USDT on Mantle to XOC on Base (with fee)
 */
export function convertUsdtToXoc(usdtAmount: string): string {
  const parsedAmount = parseFloat(usdtAmount);
  const rawXocAmount = parsedAmount * USDT_MANTLE_TO_XOC_RATE;
  const fee = rawXocAmount * (SWAP_FEE_PERCENTAGE / 100);
  return (rawXocAmount - fee).toFixed(18); // XOC has 18 decimals
}

/**
 * Convert USDT on Mantle to MXNB on Arbitrum (with fee)
 */
export function convertUsdtToMxnb(usdtAmount: string): string {
  const parsedAmount = parseFloat(usdtAmount);
  const rawMxnbAmount = parsedAmount * USDT_MANTLE_TO_MXNB_RATE;
  const fee = rawMxnbAmount * (SWAP_FEE_PERCENTAGE / 100);
  return (rawMxnbAmount - fee).toFixed(6); // MXNB has 6 decimals
}

/**
 * Convert XOC on Base to USDT on Mantle (with fee)
 */
export function convertXocToUsdt(xocAmount: string): string {
  const parsedAmount = parseFloat(xocAmount);
  const rawUsdtAmount = parsedAmount / USDT_MANTLE_TO_XOC_RATE;
  const fee = rawUsdtAmount * (SWAP_FEE_PERCENTAGE / 100);
  return (rawUsdtAmount - fee).toFixed(6); // USDT has 6 decimals
}

/**
 * Convert MXNB on Arbitrum to USDT on Mantle (with fee)
 */
export function convertMxnbToUsdt(mxnbAmount: string): string {
  const parsedAmount = parseFloat(mxnbAmount);
  const rawUsdtAmount = parsedAmount / USDT_MANTLE_TO_MXNB_RATE;
  const fee = rawUsdtAmount * (SWAP_FEE_PERCENTAGE / 100);
  return (rawUsdtAmount - fee).toFixed(6); // USDT has 6 decimals
}

/**
 * Convert USDT on zkSync Era to XOC on Base (with fee)
 */
export function convertZkUsdtToXoc(zkUsdtAmount: string): string {
  const parsedAmount = parseFloat(zkUsdtAmount);
  const rawXocAmount = parsedAmount * USDT_ZKSYNC_ERA_TO_XOC_RATE;
  const fee = rawXocAmount * (SWAP_FEE_PERCENTAGE / 100);
  return (rawXocAmount - fee).toFixed(18); // XOC has 18 decimals
}

/**
 * Convert XOC on Base to USDT on zkSync Era (with fee)
 */
export function convertXocToZkUsdt(xocAmount: string): string {
  const parsedAmount = parseFloat(xocAmount);
  const rawZkUsdtAmount = parsedAmount / USDT_ZKSYNC_ERA_TO_XOC_RATE;
  const fee = rawZkUsdtAmount * (SWAP_FEE_PERCENTAGE / 100);
  return (rawZkUsdtAmount - fee).toFixed(6); // USDT has 6 decimals
}

/**
 * Convert USDT on zkSync Era to MXNB on Arbitrum (with fee)
 */
export function convertZkUsdtToMxnb(zkUsdtAmount: string): string {
  const parsedAmount = parseFloat(zkUsdtAmount);
  const rawMxnbAmount = parsedAmount * USDT_ZKSYNC_ERA_TO_MXNB_RATE;
  const fee = rawMxnbAmount * (SWAP_FEE_PERCENTAGE / 100);
  return (rawMxnbAmount - fee).toFixed(6); // MXNB has 6 decimals
}

/**
 * Convert MXNB on Arbitrum to USDT on zkSync Era (with fee)
 */
export function convertMxnbToZkUsdt(mxnbAmount: string): string {
  const parsedAmount = parseFloat(mxnbAmount);
  const rawZkUsdtAmount = parsedAmount / USDT_ZKSYNC_ERA_TO_MXNB_RATE;
  const fee = rawZkUsdtAmount * (SWAP_FEE_PERCENTAGE / 100);
  return (rawZkUsdtAmount - fee).toFixed(6); // USDT has 6 decimals
}

/**
 * Convert USDT on Mantle to USDT on zkSync Era (with fee)
 */
export function convertMantleUsdtToZkUsdt(mantleUsdtAmount: string): string {
  const parsedAmount = parseFloat(mantleUsdtAmount);
  const rawZkUsdtAmount = parsedAmount * USDT_MANTLE_TO_USDT_ZKSYNC_ERA_RATE;
  const fee = rawZkUsdtAmount * (SWAP_FEE_PERCENTAGE / 100);
  return (rawZkUsdtAmount - fee).toFixed(6); // USDT has 6 decimals
}

/**
 * Convert USDT on zkSync Era to USDT on Mantle (with fee)
 */
export function convertZkUsdtToMantleUsdt(zkUsdtAmount: string): string {
  const parsedAmount = parseFloat(zkUsdtAmount);
  const rawMantleUsdtAmount = parsedAmount / USDT_MANTLE_TO_USDT_ZKSYNC_ERA_RATE;
  const fee = rawMantleUsdtAmount * (SWAP_FEE_PERCENTAGE / 100);
  return (rawMantleUsdtAmount - fee).toFixed(6); // USDT has 6 decimals
}

/**
 * Create a swap ID
 */
export function createSwapId(): string {
  return `swap-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

/**
 * Record a new swap in the swap history
 */
export const swapHistory: SwapResult[] = [];

export function recordSwap(swap: SwapResult): SwapResult {
  swapHistory.push(swap);
  return swap;
}

/**
 * Get a swap by ID
 */
export function getSwapById(swapId: string): SwapResult | undefined {
  return swapHistory.find(swap => swap.swapId === swapId);
}

/**
 * Get the most recent swap
 */
export function getMostRecentSwap(): SwapResult | undefined {
  if (swapHistory.length === 0) {
    return undefined;
  }
  return swapHistory[swapHistory.length - 1];
}

/**
 * Update a swap's status and transaction hashes
 */
export function updateSwapStatus(
  swapId: string,
  status: 'pending' | 'completed' | 'failed',
  sourceTxHash?: string,
  targetTxHash?: string
): SwapResult | undefined {
  const swapIndex = swapHistory.findIndex(swap => swap.swapId === swapId);
  
  if (swapIndex === -1) {
    return undefined;
  }
  
  const updatedSwap = {
    ...swapHistory[swapIndex],
    status,
    ...(sourceTxHash ? { sourceTxHash } : {}),
    ...(targetTxHash ? { targetTxHash } : {})
  };
  
  swapHistory[swapIndex] = updatedSwap;
  return updatedSwap;
}

/**
 * Create viem public clients for different chains
 */
export const chainClients = {
  base: createPublicClient({
    chain: base,
    transport: http(base.rpcUrls.default.http[0]),
  }),
  arbitrum: createPublicClient({
    chain: arbitrum,
    transport: http(arbitrum.rpcUrls.default.http[0]),
  }),
  mantle: createPublicClient({
    chain: mantle,
    transport: http(mantle.rpcUrls.default.http[0]),
  }),
  zksync: createPublicClient({
    chain: zkSync,
    transport: http(zkSync.rpcUrls.default.http[0]),
  }),
} as Record<'base' | 'arbitrum' | 'mantle' | 'zksync', PublicClient>; 