import { parseUnits, formatUnits, encodeAbiParameters, parseAbiParameters } from 'viem';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { v4 as uuidv4 } from 'uuid';
import { SellingOrderFill, FillStatus, OxxoSpinQRData } from './schemas';
import {
  BASESCAN_TX_URL,
  MAX_MXN_AMOUNT_DIFFERENCE_PERCENT,
  MAX_FILL_TIME_MS,
  FILL_FEE_PERCENTAGE
} from './constants';
import {
  InvalidQRCodeError,
  QRCodeExpiredError,
  QRCodeAlreadyUsedError,
  AmountMismatchError,
  OrderNotFoundError,
  OrderNotActiveError
} from './errors';

// Import sellingOrders from token-selling-order utils
import { getSellingOrderById, sellingOrders, updateSellingOrderStatus } from '../token-selling-order/utils';

// Import QR parsing function from token-buying-order utils
import { parseOxxoSpinQRData, parseQRDate } from '../token-buying-order/utils';

// In-memory storage for fills
export const sellingOrderFills: Map<string, SellingOrderFill> = new Map();

// Create a public client for Base chain
export const baseClient = createPublicClient({
  chain: base,
  transport: http(base.rpcUrls.default.http[0]),
});

// Add an adapter interface to map the OxxoSpinQRData fields correctly
interface OxxoSpinQRDataAdapter {
  reference: string;   // maps to Operacion.CR
  amount: number;      // maps to Monto
  expiration: string;  // maps to FechaExpiracionQR
}

/**
 * Adapt the OxxoSpinQRData to our simplified interface
 */
export function adaptOxxoSpinQRData(qrData: OxxoSpinQRData): OxxoSpinQRDataAdapter {
  return {
    reference: qrData.Operacion.CR,
    amount: qrData.Monto,
    expiration: qrData.FechaExpiracionQR
  };
}

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
 * Generate a transaction link for display
 */
export function getTransactionTextLink(txHash: string): string {
  return `[View transaction on BaseScan](${BASESCAN_TX_URL}${txHash})`;
}

/**
 * Create a unique fill ID
 */
export function createFillId(): string {
  return `fill-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

/**
 * Store a selling order fill
 */
export function storeFill(fill: SellingOrderFill): SellingOrderFill {
  sellingOrderFills.set(fill.fillId, fill);
  return fill;
}

/**
 * Get a fill by ID
 */
export function getFillById(fillId: string): SellingOrderFill | undefined {
  return sellingOrderFills.get(fillId);
}

/**
 * Get fills for a specific order
 */
export function getFillsByOrderId(orderId: string): SellingOrderFill[] {
  return Array.from(sellingOrderFills.values()).filter(fill => fill.orderId === orderId);
}

/**
 * Get the most recent fill for an order
 */
export function getMostRecentFillForOrder(orderId: string): SellingOrderFill | undefined {
  const fills = getFillsByOrderId(orderId).sort((a, b) => b.createdAt - a.createdAt);
  return fills.length > 0 ? fills[0] : undefined;
}

/**
 * Calculate fill expiration time
 */
export function calculateFillExpirationTime(): number {
  return Date.now() + MAX_FILL_TIME_MS;
}

/**
 * Update a fill's status
 */
export function updateFillStatus(
  fillId: string,
  status: FillStatus,
  additionalData?: Partial<SellingOrderFill>
): SellingOrderFill | undefined {
  const fill = sellingOrderFills.get(fillId);
  
  if (!fill) {
    return undefined;
  }
  
  const updatedFill = {
    ...fill,
    status,
    ...additionalData
  };
  
  sellingOrderFills.set(fillId, updatedFill);
  return updatedFill;
}

/**
 * Check and update expired fills
 */
export function checkAndUpdateExpiredFills(): void {
  const now = Date.now();
  
  for (const [fillId, fill] of sellingOrderFills.entries()) {
    if ((fill.status === 'pending' || fill.status === 'processing') && fill.expiresAt < now) {
      updateFillStatus(fillId, 'expired', {
        error: 'Fill expired without completion'
      });
      console.log(`Fill ${fillId} for order ${fill.orderId} marked as expired`);
    }
  }
}

/**
 * Validate an OXXO Spin QR code against a selling order
 */
export function validateQrCodeForOrder(
  qrCodeData: string,
  orderMxnAmount: string
): { isValid: boolean; qrData?: OxxoSpinQRDataAdapter; error?: Error } {
  try {
    // Parse QR code data
    const originalQrData = parseOxxoSpinQRData(qrCodeData);
    
    if (!originalQrData) {
      return { isValid: false, error: new InvalidQRCodeError('Could not parse QR code data') };
    }
    
    // Adapt to our simplified interface
    const qrData = adaptOxxoSpinQRData(originalQrData);
    
    // Check if QR code has expired
    const expirationDate = parseQRDate(qrData.expiration);
    if (expirationDate < new Date()) {
      return { isValid: false, error: new QRCodeExpiredError(qrData.expiration) };
    }
    
    // TODO: In a production system, we would check against a database to see if this QR code
    // has been used before. For now, we check against our in-memory fills
    const isQrCodeUsed = Array.from(sellingOrderFills.values()).some(
      fill => fill.qrReferenceCode === qrData.reference && 
              (fill.status === 'completed' || fill.status === 'processing')
    );
    
    if (isQrCodeUsed) {
      return { isValid: false, error: new QRCodeAlreadyUsedError(qrData.reference) };
    }
    
    // Check if QR amount matches the order MXN amount (with tolerance)
    const orderAmount = parseFloat(orderMxnAmount);
    const qrAmount = qrData.amount;
    
    const tolerance = orderAmount * (MAX_MXN_AMOUNT_DIFFERENCE_PERCENT / 100);
    const minAllowed = orderAmount - tolerance;
    const maxAllowed = orderAmount + tolerance;
    
    if (qrAmount < minAllowed || qrAmount > maxAllowed) {
      return { 
        isValid: false, 
        error: new AmountMismatchError(qrAmount, orderMxnAmount),
        qrData // Return the QR data anyway for possible display
      };
    }
    
    // QR code is valid
    return { isValid: true, qrData };
  } catch (error) {
    console.error('Error validating QR code:', error);
    return { 
      isValid: false, 
      error: error instanceof Error ? error : new InvalidQRCodeError('Unknown error validating QR code') 
    };
  }
}

/**
 * Initialize a fill for a selling order
 */
export function initializeFill(
  orderId: string,
  fillerAddress: string,
  qrData: OxxoSpinQRDataAdapter
): SellingOrderFill {
  const order = getSellingOrderById(orderId);
  
  if (!order) {
    throw new OrderNotFoundError(orderId);
  }
  
  if (order.status !== 'active') {
    throw new OrderNotActiveError(orderId, order.status);
  }
  
  const fillId = createFillId();
  const expiresAt = calculateFillExpirationTime();
  
  // Generate a public UUID for the encrypted data
  const publicUuid = uuidv4();
  
  const fill: SellingOrderFill = {
    fillId,
    orderId,
    filler: fillerAddress,
    qrReferenceCode: qrData.reference,
    qrAmount: qrData.amount,
    qrExpiration: qrData.expiration,
    status: 'pending',
    createdAt: Date.now(),
    expiresAt,
    publicUuid
  };
  
  storeFill(fill);
  return fill;
}

/**
 * Mark a fill as completed and update the order
 */
export function completeFill(
  fillId: string, 
  onChainTxHash?: string
): SellingOrderFill | undefined {
  const fill = getFillById(fillId);
  
  if (!fill) {
    return undefined;
  }
  
  const order = getSellingOrderById(fill.orderId);
  
  if (!order) {
    return undefined;
  }
  
  // Make sure we have a blockchain transaction hash, not a UUID
  const finalTxHash = (onChainTxHash && !onChainTxHash.startsWith('tx-')) 
    ? onChainTxHash 
    : (fill.txHash && !fill.txHash.startsWith('tx-')) 
      ? fill.txHash 
      : undefined;
  
  // Mark the order as filled
  updateSellingOrderStatus(fill.orderId, 'filled', {
    filledAt: Date.now(),
    filledBy: fill.filler,
    filledTxHash: finalTxHash
  });
  
  // Update the fill status
  return updateFillStatus(fillId, 'completed', {
    completedAt: Date.now(),
    onChainTxHash: finalTxHash
  });
}

/**
 * Format a selling order fill for display
 */
export function formatFillForDisplay(fill: SellingOrderFill): string {
  // Get the order
  const order = getSellingOrderById(fill.orderId);
  
  let orderInfo = '';
  if (order) {
    orderInfo = `
**Order Details:**
Token: ${order.token}
Amount: ${order.amount}
MXN Amount: ${order.mxnAmount || 'N/A'}
Seller: ${shortenAddress(order.seller)}`;
  }
  
  const statusEmoji = getStatusEmoji(fill.status);
  
  let result = `${statusEmoji} **Fill #${fill.fillId}**\n\n`;
  result += `**Order ID:** ${fill.orderId}${orderInfo}\n\n`;
  result += `**QR Payment:**\nReference: ${fill.qrReferenceCode}\nAmount: ${fill.qrAmount} MXN\nExpires: ${fill.qrExpiration}\n\n`;
  result += `**Status:** ${fill.status.toUpperCase()}\n`;
  
  if (fill.createdAt) {
    result += `**Created:** ${new Date(fill.createdAt).toLocaleString()}\n`;
  }
  
  if (fill.expiresAt) {
    result += `**Expires:** ${new Date(fill.expiresAt).toLocaleString()}\n`;
  }
  
  if (fill.completedAt) {
    result += `**Completed:** ${new Date(fill.completedAt).toLocaleString()}\n`;
  }
  
  if (fill.txHash) {
    result += `**Transaction:** ${getTransactionTextLink(fill.txHash)}\n`;
  }
  
  if (fill.onChainTxHash) {
    result += `**On-Chain Transaction:** ${getTransactionTextLink(fill.onChainTxHash)}\n`;
  }
  
  if (fill.error) {
    result += `\n**Error:** ${fill.error}\n`;
  }
  
  return result;
}

/**
 * Get an emoji for fill status
 */
export function getStatusEmoji(status: string): string {
  switch (status) {
    case 'pending':
      return '⏳';
    case 'processing':
      return '🔄';
    case 'completed':
      return '✅';
    case 'failed':
      return '❌';
    case 'expired':
      return '⌛';
    case 'cancelled':
      return '🚫';
    default:
      return '❓';
  }
}

/**
 * Shorten an Ethereum address for display
 */
export function shortenAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

/**
 * Encrypt QR code data (simple implementation - in production, use proper encryption)
 */
export function encryptQrData(qrData: string, publicUuid: string): string {
  // In a real implementation, use proper encryption with the public UUID
  // For this demo, we'll do a simple base64 encoding
  return Buffer.from(qrData).toString('base64');
}

/**
 * Calculate the fee amount based on the MXN amount
 */
export function calculateFillFee(mxnAmount: number): number {
  return (mxnAmount * FILL_FEE_PERCENTAGE) / 100;
}

/**
 * Check if a user has authorization to fill orders
 * In a real implementation, this would check against a whitelist or specific criteria
 */
export function userCanFillOrders(userAddress: string): boolean {
  // For now, all users can fill orders
  return true;
} 