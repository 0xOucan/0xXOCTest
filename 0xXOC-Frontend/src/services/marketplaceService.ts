import { apiUrl } from '../config';
import { sendChatMessage } from './agentService';

// Selling Order interfaces
export interface SellingOrder {
  orderId: string;
  seller: string;
  token: 'XOC' | 'MXNe' | 'USDC';
  amount: string;
  mxnAmount?: string;
  price?: string;
  status: 'pending' | 'active' | 'filled' | 'cancelled' | 'expired';
  createdAt: number;
  expiresAt?: number;
  txHash: string;
  memo?: string;
  filledAt?: number;
  filledTxHash?: string;
  filledBy?: string;
}

export interface CreateSellingOrderParams {
  token: 'XOC' | 'MXNe' | 'USDC';
  amount: string;
  mxnAmount?: string;
  price?: string;
  expiration?: number;
  memo?: string;
}

// Buying Order interfaces
export interface BuyingOrder {
  orderId: string;
  buyer: string;
  mxnAmount: number;
  token: 'XOC' | 'MXNe' | 'USDC';
  tokenAmount: string;
  status: 'pending' | 'active' | 'filled' | 'cancelled' | 'expired';
  createdAt: number;
  expiresAt: number;
  referenceCode: string;
  qrExpiration: string;
  memo?: string;
  filledAt?: number;
  filledBy?: string;
  txHash?: string;
  encryptedQrData?: string;
  publicUuid?: string;
  onChainTxHash?: string;
}

export interface CreateBuyingOrderParams {
  qrCodeData: string;
  token: 'XOC' | 'MXNe' | 'USDC';
  tokenAmount: string;
  memo?: string;
}

export interface DecryptQRCodeParams {
  orderId: string;
  privateUuid: string;
  forcedMethod?: 'local' | 'blockchain';
}

// Selling Order API Calls
export const getSellingOrders = async (
  token?: 'XOC' | 'MXNe' | 'USDC' | 'ALL',
  status?: 'pending' | 'active' | 'filled' | 'cancelled' | 'expired' | 'ALL',
  limit?: number
): Promise<SellingOrder[]> => {
  try {
    let url = `${apiUrl}/api/selling-orders`;
    const params = new URLSearchParams();
    
    if (token && token !== 'ALL') params.append('token', token);
    if (status && status !== 'ALL') params.append('status', status);
    if (limit) params.append('limit', limit.toString());
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch selling orders: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.orders || [];
  } catch (error) {
    console.error('Error fetching selling orders:', error);
    throw error;
  }
};

export const getUserSellingOrders = async (
  address: string,
  status?: 'pending' | 'active' | 'filled' | 'cancelled' | 'expired' | 'ALL',
): Promise<SellingOrder[]> => {
  try {
    let url = `${apiUrl}/api/user/${address}/selling-orders`;
    const params = new URLSearchParams();
    
    if (status && status !== 'ALL') params.append('status', status);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch user selling orders: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.orders || [];
  } catch (error) {
    console.error('Error fetching user selling orders:', error);
    throw error;
  }
};

export const getSellingOrderById = async (orderId: string): Promise<SellingOrder> => {
  try {
    const response = await fetch(`${apiUrl}/api/selling-orders/${orderId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch selling order: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.order;
  } catch (error) {
    console.error(`Error fetching selling order ${orderId}:`, error);
    throw error;
  }
};

export const createSellingOrder = async (params: CreateSellingOrderParams): Promise<string> => {
  try {
    // Format the command for the AI agent
    const message = `create_selling_order token=${params.token} amount=${params.amount}${params.mxnAmount ? ` mxnAmount=${params.mxnAmount}` : ''}${params.price ? ` price=${params.price}` : ''}${params.expiration ? ` expiration=${params.expiration}` : ''}${params.memo ? ` memo=${params.memo}` : ''}`;
    
    // Use the agent service to send the command
    const response = await sendChatMessage(message);
    return response.message || response.rawResponse || 'Order creation command sent';
  } catch (error) {
    console.error('Error creating selling order:', error);
    throw error;
  }
};

export const cancelSellingOrder = async (orderId: string): Promise<string> => {
  try {
    // Format the command for the AI agent
    const message = `cancel_selling_order orderId=${orderId}`;
    
    // Use the agent service to send the command
    const response = await sendChatMessage(message);
    return response.message || response.rawResponse || 'Order cancellation command sent';
  } catch (error) {
    console.error(`Error cancelling selling order ${orderId}:`, error);
    throw error;
  }
};

/**
 * Activate a selling order in the marketplace after transaction confirmation
 */
export const activateSellingOrder = async (orderId: string, txHash: string): Promise<SellingOrder> => {
  try {
    const response = await fetch(`${apiUrl}/api/selling-orders/${orderId}/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ txHash }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to activate selling order');
    }
    
    const data = await response.json();
    return data.order;
  } catch (error) {
    console.error(`Error activating selling order ${orderId}:`, error);
    throw error;
  }
};

/**
 * Activate a selling order using the agent API
 */
export const activateSellingOrderWithAgent = async (orderId: string, txHash: string): Promise<string> => {
  try {
    // Format the command for the AI agent
    const message = `activate_selling_order orderId=${orderId} txHash=${txHash}`;
    
    // Use the agent service to send the command
    const response = await sendChatMessage(message);
    return response.message || response.rawResponse || 'Order activation command sent';
  } catch (error) {
    console.error(`Error activating selling order ${orderId}:`, error);
    throw error;
  }
};

// Buying Order API Calls
export const getBuyingOrders = async (
  token?: 'XOC' | 'MXNe' | 'USDC' | 'ALL',
  status?: 'pending' | 'active' | 'filled' | 'cancelled' | 'expired' | 'ALL',
  limit?: number
): Promise<BuyingOrder[]> => {
  try {
    let url = `${apiUrl}/api/buying-orders`;
    const params = new URLSearchParams();
    
    if (token && token !== 'ALL') params.append('token', token);
    if (status && status !== 'ALL') params.append('status', status);
    if (limit) params.append('limit', limit.toString());
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch buying orders: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.orders || [];
  } catch (error) {
    console.error('Error fetching buying orders:', error);
    throw error;
  }
};

export const getUserBuyingOrders = async (
  address: string,
  status?: 'pending' | 'active' | 'filled' | 'cancelled' | 'expired' | 'ALL',
): Promise<BuyingOrder[]> => {
  try {
    let url = `${apiUrl}/api/user/${address}/buying-orders`;
    const params = new URLSearchParams();
    
    if (status && status !== 'ALL') params.append('status', status);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch user buying orders: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.orders || [];
  } catch (error) {
    console.error('Error fetching user buying orders:', error);
    throw error;
  }
};

export const getBuyingOrderById = async (orderId: string): Promise<BuyingOrder> => {
  try {
    const response = await fetch(`${apiUrl}/api/buying-orders/${orderId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch buying order: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.order;
  } catch (error) {
    console.error(`Error fetching buying order ${orderId}:`, error);
    throw error;
  }
};

export const createBuyingOrder = async (params: CreateBuyingOrderParams): Promise<string> => {
  try {
    // Format the command for the AI agent
    const message = `create_buying_order qrCodeData=${JSON.stringify(params.qrCodeData)} token=${params.token} tokenAmount=${params.tokenAmount}${params.memo ? ` memo=${params.memo}` : ''}`;
    
    // Use the agent service to send the command
    const response = await sendChatMessage(message);
    return response.message || response.rawResponse || 'Order creation command sent';
  } catch (error) {
    console.error('Error creating buying order:', error);
    throw error;
  }
};

export const cancelBuyingOrder = async (orderId: string): Promise<string> => {
  try {
    // Format the command for the AI agent
    const message = `cancel_buying_order orderId=${orderId}`;
    
    // Use the agent service to send the command
    const response = await sendChatMessage(message);
    return response.message || response.rawResponse || 'Order cancellation command sent';
  } catch (error) {
    console.error(`Error cancelling buying order ${orderId}:`, error);
    throw error;
  }
};

/**
 * Decrypt QR code data using the private UUID
 */
export const decryptQrCode = async (params: DecryptQRCodeParams): Promise<string> => {
  try {
    // Format the command for the AI agent
    let message = `decrypt_qr_code orderId=${params.orderId} privateUuid=${params.privateUuid}`;
    
    // Add forced method parameter if specified
    if (params.forcedMethod) {
      message += ` forceMethod=${params.forcedMethod}`;
    }
    
    // Use the agent service to send the command
    const response = await sendChatMessage(message);
    return response.message || response.rawResponse || 'QR code decryption command sent';
  } catch (error) {
    console.error('Error decrypting QR code:', error);
    throw error;
  }
};

// Mock data for testing
export const getMockSellingOrders = (): SellingOrder[] => {
  return [
    {
      orderId: 'order-1678912345-1234',
      seller: '0x1234567890123456789012345678901234567890',
      token: 'XOC',
      amount: '100',
      mxnAmount: '2000',
      status: 'active',
      createdAt: Date.now() - 3600000, // 1 hour ago
      expiresAt: Date.now() + 86400000 * 7, // 7 days from now
      txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
    },
    {
      orderId: 'order-1678912345-2345',
      seller: '0x2345678901234567890123456789012345678901',
      token: 'MXNe',
      amount: '500',
      mxnAmount: '500',
      status: 'active',
      createdAt: Date.now() - 86400000, // 1 day ago
      expiresAt: Date.now() + 86400000 * 6, // 6 days from now
      txHash: '0xbcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890a'
    },
    {
      orderId: 'order-1678912345-3456',
      seller: '0x3456789012345678901234567890123456789012',
      token: 'USDC',
      amount: '250',
      mxnAmount: '5000',
      status: 'active',
      createdAt: Date.now() - 86400000 * 2, // 2 days ago
      expiresAt: Date.now() + 86400000 * 5, // 5 days from now
      txHash: '0xcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab'
    },
    {
      orderId: 'order-1678912345-4567',
      seller: '0x4567890123456789012345678901234567890123',
      token: 'XOC',
      amount: '50',
      mxnAmount: '1000',
      status: 'filled',
      createdAt: Date.now() - 86400000 * 3, // 3 days ago
      expiresAt: Date.now() + 86400000 * 4, // 4 days from now
      txHash: '0xdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abc',
      filledAt: Date.now() - 86400000, // 1 day ago
      filledTxHash: '0xef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd',
      filledBy: '0x8901234567890123456789012345678901234567'
    },
    {
      orderId: 'order-1678912345-5678',
      seller: '0x5678901234567890123456789012345678901234',
      token: 'USDC',
      amount: '100',
      mxnAmount: '2000',
      status: 'cancelled',
      createdAt: Date.now() - 86400000 * 4, // 4 days ago
      txHash: '0xf1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcde'
    }
  ];
};

export const getMockBuyingOrders = (): BuyingOrder[] => {
  return [
    {
      orderId: 'buyorder-1678912345-1234',
      buyer: '0x1234567890123456789012345678901234567890',
      mxnAmount: 2000,
      token: 'XOC',
      tokenAmount: '100',
      status: 'active',
      createdAt: Date.now() - 3600000, // 1 hour ago
      expiresAt: Date.now() + 86400000 * 7, // 7 days from now
      referenceCode: 'OXXO1234567890',
      qrExpiration: '25/12/31 23:59:59'
    },
    {
      orderId: 'buyorder-1678912345-2345',
      buyer: '0x2345678901234567890123456789012345678901',
      mxnAmount: 500,
      token: 'MXNe',
      tokenAmount: '500',
      status: 'active',
      createdAt: Date.now() - 86400000, // 1 day ago
      expiresAt: Date.now() + 86400000 * 6, // 6 days from now
      referenceCode: 'OXXO2345678901',
      qrExpiration: '25/11/30 23:59:59'
    },
    {
      orderId: 'buyorder-1678912345-3456',
      buyer: '0x3456789012345678901234567890123456789012',
      mxnAmount: 5000,
      token: 'USDC',
      tokenAmount: '250',
      status: 'active',
      createdAt: Date.now() - 86400000 * 2, // 2 days ago
      expiresAt: Date.now() + 86400000 * 5, // 5 days from now
      referenceCode: 'OXXO3456789012',
      qrExpiration: '25/10/31 23:59:59'
    },
    {
      orderId: 'buyorder-1678912345-4567',
      buyer: '0x4567890123456789012345678901234567890123',
      mxnAmount: 1000,
      token: 'XOC',
      tokenAmount: '50',
      status: 'filled',
      createdAt: Date.now() - 86400000 * 3, // 3 days ago
      expiresAt: Date.now() + 86400000 * 4, // 4 days from now
      referenceCode: 'OXXO4567890123',
      qrExpiration: '25/09/30 23:59:59',
      filledAt: Date.now() - 86400000, // 1 day ago
      filledBy: '0x8901234567890123456789012345678901234567',
      txHash: '0xef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd'
    },
    {
      orderId: 'buyorder-1678912345-5678',
      buyer: '0x5678901234567890123456789012345678901234',
      mxnAmount: 2000,
      token: 'USDC',
      tokenAmount: '100',
      status: 'cancelled',
      createdAt: Date.now() - 86400000 * 4, // 4 days ago
      expiresAt: Date.now() - 86400000, // 1 day ago
      referenceCode: 'OXXO5678901234',
      qrExpiration: '25/08/31 23:59:59'
    }
  ];
}; 