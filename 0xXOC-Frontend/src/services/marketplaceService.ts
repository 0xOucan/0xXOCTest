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

/**
 * Download an image from a buying order
 * The image will be available for 60 seconds after the first download request
 * @returns Promise resolving to boolean indicating success
 */
export const downloadBuyingOrderImage = async (orderId: string): Promise<boolean> => {
  try {
    console.log(`Attempting to download image for order ${orderId}`);
    
    // First check if the image is available and if QR code has been decrypted
    const response = await fetch(`${apiUrl}/api/buying-orders/${orderId}/download-image`, {
      method: 'HEAD'
    });
    
    if (!response.ok) {
      console.error(`Error checking image availability: ${response.status} ${response.statusText}`);
      
      // Parse the error message from the response if possible
      let errorMessage = `Server error: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData && errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        // If we can't parse the error as JSON, use the default message
      }
      
      if (response.status === 403) {
        throw new Error('You must decrypt the QR code before downloading the image.');
      } else if (response.status === 404) {
        throw new Error('No image found for this order.');
      } else {
        throw new Error(errorMessage);
      }
    }
    
    // Create a hidden link and trigger the download
    const link = document.createElement('a');
    link.href = getBuyingOrderImageUrl(orderId);
    link.download = `order-image-${orderId}.png`;
    link.target = '_blank'; // Open in new tab to help with download reliability
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log(`Download triggered for order ${orderId}`);
    
    // Return true to indicate download was initiated
    return true;
  } catch (error) {
    console.error(`Error downloading image for order ${orderId}:`, error);
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