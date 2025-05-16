import { formatUnits, parseUnits } from 'viem';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { SellingOrder } from './schemas';
import { 
  BASESCAN_TX_URL, 
  SUPPORTED_TOKENS,
  DEFAULT_ORDER_EXPIRATION,
  MXNE_DECIMALS,
  XOC_DECIMALS,
  USDC_DECIMALS,
  MXNE_TOKEN_ADDRESS,
  XOC_TOKEN_ADDRESS,
  USDC_TOKEN_ADDRESS
} from './constants';

// In-memory storage for orders
export const sellingOrders: Map<string, SellingOrder> = new Map();

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
export function getExplorerLink(txHash: string): string {
  return `${BASESCAN_TX_URL}${txHash}`;
}

/**
 * Get a transaction link for the command response
 */
export function getTransactionTextLink(txHash: string): string {
  return `[View transaction on BaseScan](${BASESCAN_TX_URL}${txHash})`;
}

/**
 * Create a unique order ID
 */
export function createOrderId(): string {
  return `order-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

/**
 * Store a selling order
 */
export function storeSellingOrder(order: SellingOrder): SellingOrder {
  sellingOrders.set(order.orderId, order);
  return order;
}

/**
 * Get a selling order by ID
 */
export function getSellingOrderById(orderId: string): SellingOrder | undefined {
  return sellingOrders.get(orderId);
}

/**
 * Update a selling order's status
 */
export function updateSellingOrderStatus(
  orderId: string,
  status: 'pending' | 'active' | 'filled' | 'cancelled' | 'expired',
  additionalData?: Partial<SellingOrder>
): SellingOrder | undefined {
  const order = sellingOrders.get(orderId);
  
  if (!order) {
    return undefined;
  }
  
  const updatedOrder = {
    ...order,
    status,
    ...additionalData
  };
  
  sellingOrders.set(orderId, updatedOrder);
  return updatedOrder;
}

/**
 * Get selling orders based on filters
 */
export function getSellingOrders(
  tokenFilter: 'XOC' | 'MXNe' | 'USDC' | 'ALL' = 'ALL',
  statusFilter: 'pending' | 'active' | 'filled' | 'cancelled' | 'expired' | 'ALL' = 'active',
  limit: number = 10,
  userAddress?: string
): SellingOrder[] {
  const filteredOrders = Array.from(sellingOrders.values()).filter(order => {
    // Filter by token if specified
    if (tokenFilter !== 'ALL' && order.token !== tokenFilter) {
      return false;
    }
    
    // Filter by status if specified
    if (statusFilter !== 'ALL' && order.status !== statusFilter) {
      return false;
    }
    
    // Filter by user if specified
    if (userAddress && order.seller.toLowerCase() !== userAddress.toLowerCase()) {
      return false;
    }
    
    return true;
  });
  
  // Sort by creation date, newest first
  const sortedOrders = filteredOrders.sort((a, b) => b.createdAt - a.createdAt);
  
  // Apply limit
  return sortedOrders.slice(0, limit);
}

/**
 * Check for expired orders and update their status
 */
export function checkAndUpdateExpiredOrders(): void {
  const now = Date.now();
  
  for (const [orderId, order] of sellingOrders.entries()) {
    if (order.status === 'active' && order.expiresAt && order.expiresAt < now) {
      updateSellingOrderStatus(orderId, 'expired');
    }
  }
}

/**
 * Create Base client
 */
export const baseClient = createPublicClient({
  chain: base,
  transport: http(base.rpcUrls.default.http[0]),
});

/**
 * Get token decimals by symbol
 */
export function getTokenDecimals(tokenSymbol: 'XOC' | 'MXNe' | 'USDC'): number {
  // For MXNe, we need to check if it's using MXNE in the SUPPORTED_TOKENS
  if (tokenSymbol === 'MXNe') {
    // Use the fallback constant directly for MXNe
    return MXNE_DECIMALS;
  }
  
  // For XOC and USDC, use from SUPPORTED_TOKENS or fallback
  if (tokenSymbol === 'XOC') {
    return SUPPORTED_TOKENS.XOC.decimals;
  }
  
  if (tokenSymbol === 'USDC') {
    return SUPPORTED_TOKENS.USDC.decimals;
  }
  
  // Default fallback
  return 18;
}

/**
 * Get token address by symbol
 */
export function getTokenAddress(tokenSymbol: 'XOC' | 'MXNe' | 'USDC'): string {
  // For MXNe, we need to check if it's using MXNE in the SUPPORTED_TOKENS
  if (tokenSymbol === 'MXNe') {
    // Use the fallback constant directly for MXNe
    return MXNE_TOKEN_ADDRESS;
  }
  
  // For XOC and USDC, use from SUPPORTED_TOKENS or fallback
  if (tokenSymbol === 'XOC') {
    return SUPPORTED_TOKENS.XOC.address;
  }
  
  if (tokenSymbol === 'USDC') {
    return SUPPORTED_TOKENS.USDC.address;
  }
  
  // This should never happen with our type constraints, but just in case
  throw new Error(`Unknown token symbol: ${tokenSymbol}`);
}

/**
 * Format a selling order for display
 */
export function formatSellingOrderForDisplay(order: SellingOrder): string {
  // Map MXNe to MXNE for compatibility with SUPPORTED_TOKENS
  const mappedToken = order.token === 'MXNe' ? 'MXNE' : order.token;
  const tokenInfo = SUPPORTED_TOKENS[mappedToken as keyof typeof SUPPORTED_TOKENS];
  const statusEmoji = getStatusEmoji(order.status);
  
  let formattedOrder = `${statusEmoji} **Order #${order.orderId}**\n\n`;
  formattedOrder += `**Token:** ${tokenInfo.icon} ${order.token}\n`;
  formattedOrder += `**Amount:** ${order.amount}\n`;
  
  if (order.mxnAmount) {
    formattedOrder += `**Expected MXN:** ${order.mxnAmount} MXN\n`;
  }
  
  if (order.price) {
    formattedOrder += `**Price:** $${order.price} per token\n`;
  }
  
  formattedOrder += `**Status:** ${order.status.toUpperCase()}\n`;
  formattedOrder += `**Created:** ${new Date(order.createdAt).toLocaleString()}\n`;
  
  if (order.expiresAt) {
    formattedOrder += `**Expires:** ${new Date(order.expiresAt).toLocaleString()}\n`;
  }
  
  formattedOrder += `**Seller:** ${shortenAddress(order.seller)}\n`;
  formattedOrder += `**Transaction:** ${getTransactionTextLink(order.txHash)}\n`;
  
  if (order.memo) {
    formattedOrder += `**Memo:** ${order.memo}\n`;
  }
  
  if (order.status === 'filled' && order.filledAt && order.filledBy) {
    formattedOrder += `\n**Filled at:** ${new Date(order.filledAt).toLocaleString()}\n`;
    formattedOrder += `**Filled by:** ${shortenAddress(order.filledBy)}\n`;
    
    if (order.filledTxHash) {
      formattedOrder += `**Fill Transaction:** ${getTransactionTextLink(order.filledTxHash)}\n`;
    }
  }
  
  return formattedOrder;
}

/**
 * Get an emoji for order status
 */
export function getStatusEmoji(status: string): string {
  switch (status) {
    case 'pending':
      return '⏳';
    case 'active':
      return '🟢';
    case 'filled':
      return '✅';
    case 'cancelled':
      return '❌';
    case 'expired':
      return '⌛';
    default:
      return '❓';
  }
}

/**
 * Shorten an Ethereum address for display
 */
function shortenAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

/**
 * Calculate default expiration time
 */
export function calculateExpirationTime(customExpirationSeconds?: number): number {
  const now = Date.now();
  const expirationSeconds = customExpirationSeconds || DEFAULT_ORDER_EXPIRATION;
  return now + (expirationSeconds * 1000);
}

/**
 * Update transaction hash for a selling order
 */
export function updateSellingOrderTxHash(
  orderId: string,
  txHash: string
): SellingOrder | undefined {
  const order = sellingOrders.get(orderId);
  
  if (!order) {
    return undefined;
  }
  
  const updatedOrder = {
    ...order,
    txHash
  };
  
  sellingOrders.set(orderId, updatedOrder);
  return updatedOrder;
}

/**
 * Activate a selling order after confirmation
 */
export function activateSellingOrder(
  orderId: string,
  txHash: string
): SellingOrder | undefined {
  const order = sellingOrders.get(orderId);
  
  if (!order) {
    return undefined;
  }
  
  if (order.status !== 'pending') {
    return order; // Only activate pending orders
  }
  
  const updatedOrder = {
    ...order,
    status: 'active' as const,
    txHash // Update with real transaction hash
  };
  
  sellingOrders.set(orderId, updatedOrder);
  return updatedOrder;
} 