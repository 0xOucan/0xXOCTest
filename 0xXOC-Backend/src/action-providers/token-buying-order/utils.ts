import { formatUnits, parseUnits } from 'viem';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { 
  BuyingOrder,
  OxxoSpinQRData,
  OxxoSpinQRDataSchema
} from './schemas';
import { 
  BASESCAN_TX_URL, 
  SUPPORTED_TOKENS,
  DEFAULT_ORDER_EXPIRATION,
  MIN_ORDER_AMOUNT_MXN,
  MAX_ORDER_AMOUNT_MXN,
  OXXO_SPIN_EMISOR_ID,
  OXXO_SPIN_OPERATION_TYPE
} from './constants';
import {
  InvalidQRCodeError,
  QRCodeExpiredError,
  InvalidQRAmountError,
  QRCodeAlreadyUsedError
} from './errors';

// In-memory storage for buying orders
export const buyingOrders: Map<string, BuyingOrder> = new Map();

// In-memory storage to track used QR codes by reference number
export const usedQRCodes: Set<string> = new Set();

/**
 * Format an amount with the given number of decimals
 */
export function formatAmount(amount: bigint | string, decimals: number): string {
  if (typeof amount === 'string') {
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
  return `buyorder-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

/**
 * Store a buying order
 */
export function storeBuyingOrder(order: BuyingOrder): BuyingOrder {
  buyingOrders.set(order.orderId, order);
  
  // Mark QR code as used
  usedQRCodes.add(order.referenceCode);
  
  return order;
}

/**
 * Get a buying order by its ID
 */
export function getBuyingOrderById(orderId: string): any {
  const order = buyingOrders.get(orderId);
  
  if (!order) {
    return null;
  }
  
  // When returning the order, explicitly include all fields including image file info
  return {
    orderId: order.orderId,
    buyer: order.buyer,
    mxnAmount: order.mxnAmount,
    token: order.token,
    tokenAmount: order.tokenAmount,
    status: order.status,
    createdAt: order.createdAt,
    expiresAt: order.expiresAt,
    referenceCode: order.referenceCode,
    qrExpiration: order.qrExpiration,
    memo: order.memo,
    filledAt: order.filledAt,
    filledBy: order.filledBy,
    txHash: order.txHash,
    encryptedQrData: order.encryptedQrData,
    publicUuid: order.publicUuid,
    onChainTxHash: order.onChainTxHash,
    // Explicitly include image file information
    imageFileId: order.imageFileId,
    imageFileExt: order.imageFileExt,
    // Include decryption status
    hasBeenDecrypted: order.hasBeenDecrypted || false,
    downloadStarted: order.downloadStarted || false
  };
}

/**
 * Update a buying order status to the new status
 * This also logs the change and performs any necessary side effects
 */
export function updateBuyingOrderStatus(
  orderId: string, 
  newStatus: 'pending' | 'active' | 'filled' | 'cancelled' | 'expired',
  additionalData?: {
    onChainTxHash?: string;
    imageFileId?: string;
    imageFileExt?: string;
    [key: string]: any;
  }
): BuyingOrder | null {
  const order = buyingOrders.get(orderId);
  
  if (!order) {
    console.error(`Order ${orderId} not found.`);
    return null;
  }
  
  // Update the order status
  const updatedOrder: BuyingOrder = {
    ...order,
    status: newStatus,
    ...(newStatus === 'filled' && { filledAt: Date.now() }),
    ...(additionalData?.onChainTxHash && { onChainTxHash: additionalData.onChainTxHash }),
    ...(additionalData?.imageFileId !== undefined && { imageFileId: additionalData.imageFileId }),
    ...(additionalData?.imageFileExt !== undefined && { imageFileExt: additionalData.imageFileExt }),
    // Include any other additional data fields
    ...Object.entries(additionalData || {})
      .filter(([key]) => !['onChainTxHash', 'imageFileId', 'imageFileExt'].includes(key))
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})
  };
  
  buyingOrders.set(orderId, updatedOrder);
  
  console.log(`Updated order ${orderId} to ${newStatus} status${
    additionalData?.onChainTxHash ? ` with tx hash ${additionalData.onChainTxHash}` : ''
  }${
    additionalData?.imageFileId ? ` with image ID ${additionalData.imageFileId}` : ''
  }`);
  
  return updatedOrder;
}

/**
 * Get buying orders based on filters
 */
export function getBuyingOrders(
  tokenFilter: 'XOC' | 'MXNe' | 'USDC' | 'ALL' = 'ALL',
  statusFilter: 'pending' | 'active' | 'filled' | 'cancelled' | 'expired' | 'ALL' = 'active',
  limit: number = 10,
  userAddress?: string
): BuyingOrder[] {
  const filteredOrders = Array.from(buyingOrders.values()).filter(order => {
    // Filter by token if specified
    if (tokenFilter !== 'ALL' && order.token !== tokenFilter) {
      return false;
    }
    
    // Filter by status if specified
    if (statusFilter !== 'ALL' && order.status !== statusFilter) {
      return false;
    }
    
    // Filter by user if specified
    if (userAddress && order.buyer.toLowerCase() !== userAddress.toLowerCase()) {
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
  
  for (const [orderId, order] of buyingOrders.entries()) {
    if (order.status === 'active' && order.expiresAt < now) {
      updateBuyingOrderStatus(orderId, 'expired' as const);
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
  // Map MXNe to MXNE for compatibility with SUPPORTED_TOKENS
  const mappedSymbol = tokenSymbol === 'MXNe' ? 'MXNE' : tokenSymbol;
  return SUPPORTED_TOKENS[mappedSymbol as keyof typeof SUPPORTED_TOKENS].decimals;
}

/**
 * Get token address by symbol
 */
export function getTokenAddress(tokenSymbol: 'XOC' | 'MXNe' | 'USDC'): string {
  // Map MXNe to MXNE for compatibility with SUPPORTED_TOKENS
  const mappedSymbol = tokenSymbol === 'MXNe' ? 'MXNE' : tokenSymbol;
  return SUPPORTED_TOKENS[mappedSymbol as keyof typeof SUPPORTED_TOKENS].address;
}

/**
 * Parse and validate OXXO Spin QR code data
 */
export function parseOxxoSpinQRData(qrData: string): OxxoSpinQRData {
  try {
    // Attempt to parse the JSON data
    const parsedData = JSON.parse(qrData);
    
    // Validate against schema
    const validationResult = OxxoSpinQRDataSchema.safeParse(parsedData);
    
    if (!validationResult.success) {
      throw new InvalidQRCodeError(validationResult.error.message);
    }
    
    const validatedData = validationResult.data;
    
    // Additional validation checks
    if (validatedData.TipoOperacion !== OXXO_SPIN_OPERATION_TYPE) {
      throw new InvalidQRCodeError('Invalid operation type');
    }
    
    if (validatedData.EmisorQR !== OXXO_SPIN_EMISOR_ID) {
      throw new InvalidQRCodeError('Invalid emisor ID');
    }
    
    // Check if amount is within acceptable range
    if (validatedData.Monto < MIN_ORDER_AMOUNT_MXN || validatedData.Monto > MAX_ORDER_AMOUNT_MXN) {
      throw new InvalidQRAmountError(
        validatedData.Monto,
        MIN_ORDER_AMOUNT_MXN,
        MAX_ORDER_AMOUNT_MXN
      );
    }
    
    // Check if QR code has already been used
    if (usedQRCodes.has(validatedData.Operacion.CR)) {
      throw new QRCodeAlreadyUsedError(validatedData.Operacion.CR);
    }
    
    // Check if QR code has expired
    const expirationDate = parseQRDate(validatedData.FechaExpiracionQR);
    const now = new Date();
    
    if (expirationDate < now) {
      throw new QRCodeExpiredError(validatedData.FechaExpiracionQR);
    }
    
    return validatedData;
  } catch (error) {
    if (error instanceof InvalidQRCodeError || 
        error instanceof QRCodeExpiredError || 
        error instanceof InvalidQRAmountError ||
        error instanceof QRCodeAlreadyUsedError) {
      throw error;
    }
    
    // Generic parsing error
    throw new InvalidQRCodeError(error instanceof Error ? error.message : 'Failed to parse QR code data');
  }
}

/**
 * Parse a date from OXXO Spin QR format (YY/MM/DD HH:MM:SS)
 */
export function parseQRDate(dateString: string): Date {
  try {
    // Format: YY/MM/DD HH:MM:SS
    const [datePart, timePart] = dateString.split(' ');
    const [year, month, day] = datePart.split('/');
    
    // Add 2000 to get full year (YY -> 20YY)
    const fullYear = 2000 + parseInt(year, 10);
    
    let hours = 0;
    let minutes = 0;
    let seconds = 0;
    
    if (timePart) {
      const [hoursStr, minutesStr, secondsStr] = timePart.split(':');
      hours = parseInt(hoursStr, 10);
      minutes = parseInt(minutesStr, 10);
      seconds = parseInt(secondsStr, 10);
    }
    
    return new Date(fullYear, parseInt(month, 10) - 1, parseInt(day, 10), hours, minutes, seconds);
  } catch (error) {
    console.error('Error parsing date:', error);
    throw new InvalidQRCodeError(`Invalid date format: ${dateString}`);
  }
}

/**
 * Calculate order expiration time (default 7 days from now)
 */
export function calculateOrderExpirationTime(): number {
  return Date.now() + (DEFAULT_ORDER_EXPIRATION * 1000);
}

/**
 * Format a buying order for display
 */
export function formatBuyingOrderForDisplay(order: BuyingOrder): string {
  // Map MXNe to MXNE for compatibility with SUPPORTED_TOKENS
  const mappedToken = order.token === 'MXNe' ? 'MXNE' : order.token;
  const tokenInfo = SUPPORTED_TOKENS[mappedToken as keyof typeof SUPPORTED_TOKENS];
  const statusEmoji = getStatusEmoji(order.status);
  
  let formattedOrder = `${statusEmoji} **Buy Order #${order.orderId}**\n\n`;
  formattedOrder += `**MXN Amount:** ${order.mxnAmount.toFixed(2)} MXN\n`;
  formattedOrder += `**Token:** ${tokenInfo.icon} ${order.token}\n`;
  formattedOrder += `**Token Amount:** ${order.tokenAmount}\n`;
  formattedOrder += `**Exchange Rate:** ${(order.mxnAmount / parseFloat(order.tokenAmount)).toFixed(2)} MXN per ${order.token}\n`;
  formattedOrder += `**Status:** ${order.status.toUpperCase()}\n`;
  formattedOrder += `**Created:** ${new Date(order.createdAt).toLocaleString()}\n`;
  formattedOrder += `**Expires:** ${new Date(order.expiresAt).toLocaleString()}\n`;
  formattedOrder += `**Buyer:** ${shortenAddress(order.buyer)}\n`;
  formattedOrder += `**OXXO Reference:** ${order.referenceCode}\n`;
  
  if (order.memo) {
    formattedOrder += `**Memo:** ${order.memo}\n`;
  }
  
  if (order.status === 'filled' && order.filledAt && order.filledBy) {
    formattedOrder += `\n**Filled at:** ${new Date(order.filledAt).toLocaleString()}\n`;
    formattedOrder += `**Filled by:** ${shortenAddress(order.filledBy)}\n`;
    
    if (order.txHash) {
      formattedOrder += `**Transaction:** ${getTransactionTextLink(order.txHash)}\n`;
    }
  }
  
  return formattedOrder;
}

/**
 * Get an emoji for order status
 */
function getStatusEmoji(status: string): string {
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