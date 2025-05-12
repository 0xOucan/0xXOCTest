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
  imageFileId?: string;
  imageFileExt?: string;
  downloadStarted?: boolean;
  hasBeenDecrypted?: boolean;
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

/**
 * Upload an image for a buying order
 */
export const uploadBuyingOrderImage = async (orderId: string, imageFile: File): Promise<boolean> => {
  try {
    const formData = new FormData();
    formData.append('image', imageFile);
    
    const response = await fetch(`${apiUrl}/api/buying-orders/${orderId}/upload-image`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to upload image');
    }
    
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error(`Error uploading image for order ${orderId}:`, error);
    throw error;
  }
};

// Download the buying order QR code image
export const downloadBuyingOrderImage = async (orderId: string): Promise<{ imageUrl: string }> => {
  try {
    const response = await fetch(`${apiUrl}/api/buying-orders/${orderId}/download-image`, {
      method: 'GET',
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to download image');
    }
    
    // Get the blob from the response
    const blob = await response.blob();
    
    // Create a URL for the blob
    const imageUrl = URL.createObjectURL(blob);
    
    return { imageUrl };
  } catch (error) {
    console.error('Error downloading buying order image:', error);
    throw error;
  }
};

/**
 * Get the URL for downloading an image from a buying order
 */
export const getBuyingOrderImageUrl = (orderId: string): string => {
  // Add a timestamp query parameter to bypass cache
  return `${apiUrl}/api/buying-orders/${orderId}/download-image?t=${Date.now()}`;
};

// Add a new function to validate OXXO Spin QR code data

/**
 * Validate if a string is a valid OXXO Spin QR code data
 * @param qrData QR code data to validate
 * @returns Boolean indicating if the data is valid and the parsed data object
 */
export const validateOxxoSpinQrData = (qrData: string): { isValid: boolean; data?: any; mxnAmount?: number } => {
  try {
    // Try to parse the QR code data as JSON
    const parsed = JSON.parse(qrData);
    
    // Check for required OXXO Spin QR code fields
    const isValid = Boolean(
      parsed.TipoOperacion === "0004" &&
      parsed.VersionQR &&
      parsed.FechaExpiracionQR &&
      parsed.FechaCreacionQR &&
      parsed.EmisorQR &&
      parsed.Monto &&
      parsed.Operacion &&
      parsed.Operacion.CR
    );
    
    // Get MXN amount from the QR code
    const mxnAmount = isValid ? parseFloat(parsed.Monto) : 0;
    
    return {
      isValid,
      data: isValid ? parsed : undefined,
      mxnAmount: isValid ? mxnAmount : undefined
    };
  } catch (e) {
    console.error("Error validating OXXO Spin QR code data:", e);
    return { isValid: false };
  }
};

// Function to send a fill order transaction
export const fillBuyingOrder = async (orderId: string): Promise<any> => {
  try {
    // Format the command for the AI agent
    const message = `fill_buying_order orderId=${orderId}`;
    
    // Use the agent service to send the command
    const response = await sendChatMessage(message);
    return response.message || response.rawResponse || 'Fill order command sent';
  } catch (error) {
    console.error(`Error filling buying order ${orderId}:`, error);
    throw error;
  }
};

// Function to check filled order status
export const checkFilledOrderStatus = async (orderId: string): Promise<any> => {
  try {
    // API endpoint to check filled order status
    const response = await fetch(`${apiUrl}/api/chatbot/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `check_filled_order_status orderId=${orderId}`,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to check filled order status');
    }
    
    const data = await response.json();
    return data.content;
  } catch (error) {
    console.error('Error checking filled order status:', error);
    throw error;
  }
};

// Function to request QR code download for a filled order
export const requestQRCodeDownload = async (orderId: string): Promise<any> => {
  try {
    // Use the direct API endpoint instead of the chatbot messaging endpoint
    const response = await fetch(`${apiUrl}/api/buying-orders/${orderId}/request-download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderId
      }),
    });
    
    if (!response.ok) {
      // Try to get JSON error if available
      try {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to request QR code download');
      } catch (jsonError) {
        // If response is not JSON, use status text
        throw new Error(`Failed to request QR code download: ${response.statusText}`);
      }
    }
    
    const data = await response.json();
    return data.downloadUrl || data.message || 'QR code download requested';
  } catch (error) {
    console.error('Error requesting QR code download:', error);
    throw error;
  }
};