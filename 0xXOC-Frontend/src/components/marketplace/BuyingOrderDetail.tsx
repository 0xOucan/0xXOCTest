import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWallet } from '../../providers/WalletContext';
import { 
  getBuyingOrderById, 
  cancelBuyingOrder, 
  decryptQrCode, 
  downloadBuyingOrderImage,
  fillBuyingOrder,
  checkFilledOrderStatus,
  requestQRCodeDownload,
  manuallyTriggerTokenTransfer
} from '../../services/marketplaceService';
import { formatAddress, formatTimeAgo } from '../../utils/formatting';
import { LoadingIcon } from '../Icons';
import { useNotification, NotificationType } from '../../utils/notification';

type DecryptionMethod = 'local' | 'blockchain' | 'auto';

type BuyingOrder = {
  orderId: string;
  buyer: string;
  mxnAmount: number;
  token: string;
  tokenAmount: string;
  status: string;
  createdAt: number;
  expiresAt: number;
  referenceCode: string;
  qrExpiration: string;
  memo?: string;
  txHash?: string;
  filledAt?: number;
  filledBy?: string;
  // Encryption-related fields
  encryptedQrData?: string;
  publicUuid?: string;
  onChainTxHash?: string;
  imageFileId?: string;
  imageFileExt?: string;
  downloadStarted?: boolean;
  hasBeenDecrypted?: boolean;
  // Token transfer tracking
  qrCodeDownloaded?: boolean;
  qrCodeDownloadedAt?: number;
  transferTxHash?: string;
  transferTimestamp?: number;
  transferError?: string;
};

export default function BuyingOrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { connectedAddress, isConnected } = useWallet();
  const { addNotification } = useNotification();
  
  const [order, setOrder] = React.useState<BuyingOrder | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isCancelling, setIsCancelling] = React.useState(false);
  const [privateUuid, setPrivateUuid] = useState('');
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptedQRData, setDecryptedQRData] = useState<string | null>(null);
  const [decryptionMethod, setDecryptionMethod] = useState<DecryptionMethod>('auto');
  const [usedDecryptionMethod, setUsedDecryptionMethod] = useState<string | null>(null);
  const [isDecrypted, setIsDecrypted] = useState<boolean>(false);
  const [decryptedData, setDecryptedData] = useState<any>(null);
  const [imageDownloaded, setImageDownloaded] = useState<boolean>(false);
  const [decryptionError, setDecryptionError] = useState<string>('');
  const [downloadTimeRemaining, setDownloadTimeRemaining] = useState<number>(0);
  const [hasImage, setHasImage] = useState<boolean>(false);
  const [isFilling, setIsFilling] = useState<boolean>(false);
  const [fillerQRDownloadUrl, setFillerQRDownloadUrl] = useState<string | null>(null);
  const [isCheckingFilledStatus, setIsCheckingFilledStatus] = useState<boolean>(false);
  const [isFilledByCurrentUser, setIsFilledByCurrentUser] = useState<boolean>(false);
  
  // Fetch order details
  const fetchOrderDetails = async () => {
    if (!orderId) return;
    
    setIsLoading(true);
    
    try {
      const orderData = await getBuyingOrderById(orderId);
      
      if (orderData) {
        setOrder(orderData);
        
        // Check if the order has an image available
        setHasImage(!!orderData.imageFileId && !!orderData.imageFileExt);
        
        // If the order is filled and the user is connected, check if they filled it
        if (orderData.status === 'filled' && isConnected) {
          checkFilledStatus();
        }
      } else {
        setOrder(null);
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
      addNotification(
        'Failed to fetch order details',
        NotificationType.ERROR,
        error instanceof Error ? error.message : 'Unknown error'
      );
      setOrder(null);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch order details on component mount
  useEffect(() => {
    fetchOrderDetails();
  }, [orderId, isConnected]);
  
  // When the component mounts or order changes, check if it's a filled order
  useEffect(() => {
    if (order && order.status === 'filled' && isConnected) {
      checkFilledStatus();
    }
  }, [order, isConnected]);
  
  // Check for QR download request flag on component mount
  useEffect(() => {
    const hasDownloadRequest = localStorage.getItem('qrDownloadRequested');
    
    if (hasDownloadRequest === 'true') {
      // Clear the flag
      localStorage.removeItem('qrDownloadRequested');
      
      // Refresh page data
      fetchOrderDetails();
    }
  }, []);
  
  // When the component mounts or the order changes, check if already decrypted
  useEffect(() => {
    if (order) {
      // Only set isDecrypted if the order has the hasBeenDecrypted flag
      if (order.hasBeenDecrypted) {
        setIsDecrypted(true);
      } else {
        setIsDecrypted(false);
      }
      
      // If download has already been initiated but not completed
      if (order.downloadStarted) {
        setImageDownloaded(false);
      }
      
      // If there is an image, show download section after decryption
      if (order.imageFileId && order.imageFileExt) {
        setHasImage(true);
      } else {
        setHasImage(false);
      }
    }
  }, [order]);
  
  // Countdown timer for download window
  useEffect(() => {
    // If we've started a download but haven't marked it complete
    if (downloadTimeRemaining > 0) {
      const timer = setTimeout(() => {
        setDownloadTimeRemaining(prev => {
          const newValue = prev - 1;
          // If countdown reaches zero, reset download state
          if (newValue <= 0) {
            setImageDownloaded(true); // Mark as downloaded/expired
            return 0;
          }
          return newValue;
        });
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [downloadTimeRemaining]);
  
  // Refresh order details periodically if in a relevant state
  useEffect(() => {
    // Initial check for filled status
    if (isConnected && order?.status === 'filled') {
      checkFilledStatus();
    }
    
    // If order is filled by current user, we don't need to refresh
    if (isFilledByCurrentUser) return;
    
    // If order is in active status and user submitted a fill, check more frequently
    const shouldCheckOften = order?.status === 'active' || isFilling;
    
    // Don't refresh if in certain states
    if (['cancelled', 'expired'].includes(order?.status || '') && !isFilling) {
      return;
    }
    
    const interval = setInterval(() => {
      fetchOrderDetails();
      
      // Also check the filled status if the order is in filled state
      if (order?.status === 'filled' && isConnected) {
        checkFilledStatus();
      }
    }, shouldCheckOften ? 5000 : 15000); // Check every 5 seconds if pending fill, otherwise every 15 seconds
    
    return () => clearInterval(interval);
  }, [order?.status, isConnected, isFilling, isFilledByCurrentUser]);
  
  // Handle order cancellation
  const handleCancelOrder = async () => {
    if (!isConnected || !order) {
      addNotification('Please connect your wallet first', NotificationType.WARNING);
      return;
    }
    
    try {
      setIsCancelling(true);
      
      const result = await cancelBuyingOrder(order.orderId);
      
      addNotification(
        `Order ${order.orderId} cancelled successfully`,
        NotificationType.SUCCESS
      );
      
      // Update order status
      setOrder({
        ...order,
        status: 'cancelled'
      });
    } catch (error) {
      console.error('Error cancelling order:', error);
      addNotification(
        'Failed to cancel order',
        NotificationType.ERROR,
        error instanceof Error ? error.message : 'Unknown error'
      );
    } finally {
      setIsCancelling(false);
    }
  };
  
  // Handle QR code decryption
  const handleDecryptQrCode = async () => {
    if (!isConnected || !order) {
      addNotification('Please connect your wallet first', NotificationType.WARNING);
      return;
    }
    
    if (!privateUuid) {
      addNotification('Please enter your Private Access UUID', NotificationType.WARNING);
      return;
    }
    
    try {
      setIsDecrypting(true);
      setDecryptedQRData(null);
      setUsedDecryptionMethod(null);
      
      // Append the decryption method as a parameter if not using auto
      const forcedMethod = decryptionMethod === 'auto' ? '' : `&forceMethod=${decryptionMethod}`;
      
      // Call the API to decrypt the QR code
      const result = await decryptQrCode({
        orderId: order.orderId,
        privateUuid,
        forcedMethod: decryptionMethod !== 'auto' ? decryptionMethod : undefined
      });
      
      // Check if there was an error
      if (result.includes('❌ Error') || result.includes('❌ Failed')) {
        throw new Error(result);
      }
      
      // Extract the decryption method
      const methodMatch = result.match(/\(using (\w+) storage\)/);
      const resultMethod = methodMatch ? methodMatch[1] : 'unknown';
      setUsedDecryptionMethod(resultMethod);
      
      // Set decrypted flag to true
      setIsDecrypted(true);
      
      // Parse the JSON data if possible
      try {
        if (result.includes('{')) {
          // Try to extract JSON from the result
          const jsonMatch = result.match(/{[\s\S]*}/);
          if (jsonMatch) {
            const jsonData = JSON.parse(jsonMatch[0]);
            setDecryptedData(jsonData);
          }
        }
      } catch (jsonError) {
        console.warn('Could not parse JSON from decrypted data:', jsonError);
        // Continue anyway since we have the raw data
      }
      
      // Extract the JSON from the result
      const jsonMatch = result.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        setDecryptedQRData(jsonMatch[1]);
        addNotification(
          `QR code decrypted successfully (${resultMethod} storage)`,
          NotificationType.SUCCESS
        );
      } else {
        setDecryptedQRData(result);
      }
    } catch (error) {
      console.error('Error decrypting QR code:', error);
      addNotification(
        'Failed to decrypt QR code',
        NotificationType.ERROR,
        error instanceof Error ? error.message : 'Incorrect Private Access UUID or other error'
      );
    } finally {
      setIsDecrypting(false);
    }
  };
  
  // Handle image download
  const handleImageDownload = async () => {
    if (!order || isLoading) return;
    
    setIsLoading(true);
    
    try {
      const response = await downloadBuyingOrderImage(order.orderId);
      
      if (response && response.imageUrl) {
        // Create a temporary hidden link to trigger download
        const link = document.createElement('a');
        link.href = response.imageUrl;
        link.download = `qr-code-${order.orderId}.${order.imageFileExt || 'png'}`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setImageDownloaded(true);
        addNotification(
          'QR code image downloaded successfully',
          NotificationType.SUCCESS,
          'The QR code image has been downloaded to your device.'
        );
      } else {
        throw new Error('Failed to get image download URL');
      }
    } catch (error) {
      console.error('Error downloading image:', error);
      addNotification(
        'Failed to download QR code image',
        NotificationType.ERROR,
        error instanceof Error ? error.message : 'Unknown error'
      );
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle form submission for QR code decryption
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!order) return;
    
    setIsDecrypting(true);
    setDecryptionError('');
    
    try {
      const result = await decryptQrCode({
        orderId: order.orderId,
        privateUuid,
        forcedMethod: decryptionMethod === 'auto' ? undefined : decryptionMethod
      });
      
      setIsDecrypting(false);
      
      if (result && result.includes('{')) {
        try {
          // Attempt to parse the decrypted data as JSON
          const jsonData = JSON.parse(result);
          setDecryptedData(jsonData);
          setIsDecrypted(true);
          
          addNotification(
            'QR code decrypted successfully',
            NotificationType.SUCCESS
          );
        } catch (jsonError) {
          // If it's not valid JSON, just display as text
          setDecryptedData({ rawData: result });
          setIsDecrypted(true);
          
          addNotification(
            'QR code decrypted successfully',
            NotificationType.SUCCESS
          );
        }
      } else {
        setDecryptionError('Could not decrypt QR code. Please check your Private Access UUID and try again.');
      }
    } catch (error) {
      console.error('Error decrypting QR code:', error);
      setIsDecrypting(false);
      setDecryptionError(error instanceof Error ? error.message : 'Unknown error');
      
      addNotification(
        'Failed to decrypt QR code',
        NotificationType.ERROR,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  };
  
  // Get token emoji
  const getTokenEmoji = (token: string) => {
    switch (token) {
      case 'XOC': return '🍫';
      case 'MXNe': return '🪙';
      case 'USDC': return '💵';
      default: return '💱';
    }
  };
  
  // Format status
  const formatStatus = (status: string) => {
    switch (status) {
      case 'active': return 'ACTIVE';
      case 'pending': return 'PENDING';
      case 'filled': return 'FILLED';
      case 'cancelled': return 'CANCELLED';
      case 'expired': return 'EXPIRED';
      default: return status.toUpperCase();
    }
  };
  
  // Get status color class
  const getStatusColorClass = (status: string) => {
    switch (status) {
      case 'active': return 'text-base-blue';
      case 'pending': return 'text-base-blue-light';
      case 'filled': return 'text-green-500';
      case 'cancelled': return 'text-red-500';
      case 'expired': return 'text-light-secondary dark:text-dark-secondary';
      default: return 'text-light-text dark:text-dark-text';
    }
  };
  
  // Check if user is the owner
  const isOwner = order && isConnected && order.buyer.toLowerCase() === connectedAddress?.toLowerCase();
  
  // Handle filling a buying order
  const handleFillOrder = async () => {
    if (!order || isFilling || order.status !== 'active') return;
    
    // Confirm before proceeding
    if (!window.confirm(`Are you sure you want to fill this order? You will need to send ${order.tokenAmount} ${order.token} to the escrow wallet.`)) {
      return;
    }
    
    setIsFilling(true);
    
    try {
      addNotification(
        'Preparing to fill order',
        NotificationType.INFO,
        'Please wait while we prepare the transaction.'
      );

      const result = await fillBuyingOrder(order.orderId);
      
      addNotification(
        'Order fill request sent',
        NotificationType.SUCCESS,
        'Your wallet will prompt you to approve the transaction. Please check your wallet.'
      );
      
      // Check if the response contains "Transaction created"
      if (result && typeof result === 'string' && result.includes('Transaction created')) {
        addNotification(
          'Wallet signature required',
          NotificationType.INFO,
          'Please sign the transaction in your wallet to complete the fill order process'
        );
      }
      
      // Refresh the order after a delay to show updated status
      setTimeout(() => {
        fetchOrderDetails();
      }, 3000);
    } catch (error) {
      console.error('Error filling order:', error);
      addNotification(
        'Failed to fill order',
        NotificationType.ERROR,
        error instanceof Error ? error.message : 'Unknown error'
      );
    } finally {
      setIsFilling(false);
    }
  };
  
  // Check if current user has filled this order
  const checkFilledStatus = async () => {
    if (!order || isCheckingFilledStatus || !connectedAddress) return;
    
    setIsCheckingFilledStatus(true);
    
    try {
      // First check if the filled address matches the current user's address directly
      if (order.status === 'filled' && order.filledBy && 
          order.filledBy.toLowerCase() === connectedAddress.toLowerCase()) {
        setIsFilledByCurrentUser(true);
        return;
      }
      
      // If not a direct match, check with the backend
      const result = await checkFilledOrderStatus(order.orderId);
      
      // Parse the result to see if this user has filled the order
      // We're looking for text that indicates this order was filled by a different address
      const filledByDifferentUser = result?.includes('filled by a different address');
      
      if (result && !filledByDifferentUser && order.status === 'filled') {
        setIsFilledByCurrentUser(true);
      } else {
        setIsFilledByCurrentUser(false);
      }
    } catch (error) {
      console.error('Error checking filled status:', error);
    } finally {
      setIsCheckingFilledStatus(false);
    }
  };
  
  // Request QR code download (for fillers)
  const handleRequestQRDownload = async () => {
    if (!order || !isFilledByCurrentUser) return;
    
    setIsLoading(true);
    
    try {
      const downloadUrl = await requestQRCodeDownload(order.orderId);
      
      // Check if we got a direct download URL
      if (typeof downloadUrl === 'string' && downloadUrl.startsWith('/api/')) {
        // Set the full URL
        const fullUrl = `${import.meta.env.VITE_API_URL || ''}${downloadUrl}`;
        setFillerQRDownloadUrl(fullUrl);
        
        // Show success notification
        addNotification(
          'QR code ready for download',
          NotificationType.SUCCESS,
          'The QR code is ready for download. Click the download button to get your file.'
        );
        
        // Automatically trigger download
        window.open(fullUrl, '_blank');
      } else {
        // The API didn't return a download URL directly
        addNotification(
          'QR code download requested',
          NotificationType.INFO,
          'The QR code download has been requested. Please refresh the page in a few moments to download it.'
        );
        
        // Refresh order details
        await fetchOrderDetails();
      }
    } catch (error) {
      console.error('Error requesting QR download:', error);
      addNotification(
        'Failed to request QR code download',
        NotificationType.ERROR,
        error instanceof Error ? error.message : 'Unknown error'
      );
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle direct QR download for filler
  const handleFillerQRDownload = () => {
    if (!fillerQRDownloadUrl) return;
    
    // Navigate to the download URL
    window.location.href = fillerQRDownloadUrl;
    
    // Set a flag to refresh the page after return
    localStorage.setItem('qrDownloadRequested', 'true');
  };
  
  // Handle manual token transfer trigger
  const handleManualTokenTransfer = async () => {
    if (!order) return;
    
    setIsLoading(true);
    
    try {
      const result = await manuallyTriggerTokenTransfer(order.orderId);
      
      addNotification(
        'Token transfer initiated',
        NotificationType.SUCCESS,
        'The token transfer has been initiated. Please refresh the page in a few moments to see the updated status.'
      );
      
      // Refresh order details after a short delay
      setTimeout(() => {
        fetchOrderDetails();
      }, 2000);
    } catch (error) {
      console.error('Error triggering token transfer:', error);
      addNotification(
        'Failed to trigger token transfer',
        NotificationType.ERROR,
        error instanceof Error ? error.message : 'Unknown error'
      );
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="bg-light-surface dark:bg-dark-surface border-3 border-base-blue shadow-pixel-lg p-8 flex justify-center items-center">
        <LoadingIcon className="w-10 h-10 text-base-blue" />
      </div>
    );
  }
  
  if (!order) {
    return (
      <div className="bg-light-surface dark:bg-dark-surface border-3 border-base-blue shadow-pixel-lg p-8">
        <div className="text-center">
          <h2 className="text-xl font-bold text-base-blue dark:text-base-blue-light mb-4">ORDER NOT FOUND</h2>
          <p className="text-light-text dark:text-dark-text mb-6">The buying order you're looking for does not exist or has been deleted.</p>
          <button
            onClick={() => navigate('/marketplace')}
            className="px-4 py-2 bg-base-blue text-white font-pixel hover:bg-base-blue-light"
          >
            BACK TO MARKETPLACE
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-light-surface dark:bg-dark-surface border-3 border-base-blue shadow-pixel-lg">
      <div className="p-4 bg-light-card dark:bg-dark-card border-b-3 border-base-blue/70 flex justify-between items-center">
        <h2 className="text-lg font-bold font-pixel text-base-blue dark:text-base-blue-light">
          BUYING ORDER DETAILS
        </h2>
        
        <button 
          onClick={() => navigate('/marketplace')}
          className="px-3 py-1 border-2 border-base-blue/70 hover:bg-base-blue/20 text-base-blue dark:text-base-blue-light transition-colors shadow-pixel text-sm"
          title="Back to marketplace"
        >
          BACK
        </button>
      </div>
      
      <div className="p-6">
        {/* Order ID and Status */}
        <div className="flex justify-between items-center mb-6 border-b-2 border-base-blue/30 pb-4">
          <div>
            <h3 className="text-xl font-pixel text-base-blue dark:text-base-blue-light">ORDER #{order.orderId}</h3>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-sm font-pixel ${getStatusColorClass(order.status)}`}>
                {formatStatus(order.status)}
              </span>
              <span className="text-light-text dark:text-dark-text text-sm">
                {formatTimeAgo(order.createdAt)}
              </span>
            </div>
          </div>
          
          {/* Cancel button (only for active orders by the connected user) */}
          {order.status === 'active' && isOwner && (
            <button
              onClick={handleCancelOrder}
              disabled={isCancelling}
              className="border-2 border-red-500 text-red-500 text-sm font-pixel py-1 px-3 hover:bg-red-500/20 transition-colors"
            >
              {isCancelling ? 'CANCELLING...' : 'CANCEL ORDER'}
            </button>
          )}
        </div>
        
        {/* Order Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="bg-light-card/30 dark:bg-dark-card/30 p-4 border-2 border-base-blue/30">
            <h4 className="text-light-secondary dark:text-dark-secondary font-pixel text-sm mb-3">TOKEN DETAILS</h4>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{getTokenEmoji(order.token)}</span>
              <div>
                <div className="text-base-blue dark:text-base-blue-light font-pixel">{order.token}</div>
                <div className="text-xl text-light-text dark:text-dark-text">{order.tokenAmount}</div>
              </div>
            </div>
            <div className="text-light-secondary dark:text-dark-secondary font-pixel text-sm mb-1">
              MXN Amount (OXXO Spin)
            </div>
            <div className="text-base-blue dark:text-base-blue-light font-pixel font-bold text-xl">
              💰 {order.mxnAmount.toFixed(2)}
            </div>
            
            <div className="mt-4 border-t border-light-border dark:border-dark-border pt-4">
              <div className="text-light-secondary dark:text-dark-secondary font-pixel text-sm mb-1">
                OXXO Reference Code
              </div>
              <div className="text-light-text dark:text-dark-text font-mono">
                {order.referenceCode}
              </div>
              <div className="text-light-secondary dark:text-dark-secondary text-xs mt-1">
                QR Expiration: {order.qrExpiration}
              </div>
            </div>
            
            {order.memo && (
              <div className="mt-4 border-t border-light-border dark:border-dark-border pt-4">
                <div className="text-light-secondary dark:text-dark-secondary font-pixel text-sm mb-1">
                  Memo
                </div>
                <div className="text-light-text dark:text-dark-text">
                  {order.memo}
                </div>
              </div>
            )}
          </div>
          
          {/* Buyer Details */}
          <div className="bg-light-card/30 dark:bg-dark-card/30 p-4 border-2 border-base-blue/30">
            <h4 className="text-light-secondary dark:text-dark-secondary font-pixel text-sm mb-3">BUYER DETAILS</h4>
            <div className="text-light-secondary dark:text-dark-secondary font-pixel text-sm mb-1">
              Buyer Address
            </div>
            <div className="text-light-text dark:text-dark-text break-all font-mono mb-6">
              {order.buyer}
            </div>
            
            {order.txHash && (
              <>
                <div className="text-light-secondary dark:text-dark-secondary font-pixel text-sm mb-1">
                  Transaction ID
                </div>
                <div className="text-base-blue dark:text-base-blue-light break-all font-mono mb-2">
                  {order.txHash}
                </div>
                
                {/* Show blockchain transaction hash and BaseScan link if available */}
                {order.onChainTxHash ? (
                  <>
                    <div className="text-light-secondary dark:text-dark-secondary font-pixel text-sm mb-1 mt-4">
                      Blockchain Transaction Hash
                    </div>
                    <div className="text-base-blue dark:text-base-blue-light break-all font-mono mb-2">
                      {order.onChainTxHash}
                    </div>
                    <a 
                      href={`https://basescan.org/tx/${order.onChainTxHash}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-block text-sm text-base-blue dark:text-base-blue-light hover:underline"
                    >
                      VIEW ON BASESCAN →
                    </a>
                  </>
                ) : (
                  <div className="text-light-secondary dark:text-dark-secondary text-sm">
                    Waiting for blockchain confirmation...
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        
        {/* QR Code Decryption Section */}
        <div className="mt-8 p-4 border-t-2 border-base-blue/30">
          <h3 className="text-base-blue dark:text-base-blue-light font-pixel text-lg mb-4">DECRYPT QR CODE DATA</h3>
          
          {!isDecrypted ? (
            <div>
              <p className="text-light-secondary dark:text-dark-secondary mb-4">
                Enter your Private Access UUID to decrypt the QR code data. Keep in mind that your Private Access UUID was shown to you when you created the order.
              </p>
              
              {/* Add a message about image download */}
              {order?.imageFileId && order?.imageFileExt && (
                <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-500/30 text-yellow-500/80">
                  <p className="flex items-center gap-2">
                    <span>⚠️</span>
                    <span>A QR code image is available for this order. You must decrypt the QR code first to access it.</span>
                  </p>
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <input
                    type="text"
                    value={privateUuid}
                    onChange={(e) => setPrivateUuid(e.target.value)}
                    className="flex-1 bg-light-card dark:bg-dark-card border-2 border-light-border dark:border-dark-border text-light-text dark:text-dark-text p-2 font-pixel focus:outline-none focus:border-base-blue"
                    placeholder="Enter your Private Access UUID"
                  />
                </div>
                
                {/* Decryption Method Selection */}
                <div className="mb-4 border-2 border-light-border dark:border-dark-border p-3 bg-light-card/50 dark:bg-dark-card/50">
                  <h5 className="text-light-secondary dark:text-dark-secondary font-pixel text-sm mb-2">SELECT DECRYPTION METHOD:</h5>
                  
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={(e) => { e.preventDefault(); setDecryptionMethod('auto'); }}
                      className={`px-3 py-2 border-2 font-pixel text-sm ${
                        decryptionMethod === 'auto'
                          ? 'border-base-blue bg-base-blue/20 text-base-blue dark:text-base-blue-light'
                          : 'border-light-border dark:border-dark-border text-light-text dark:text-dark-text hover:border-base-blue/50'
                      }`}
                    >
                      {decryptionMethod === 'auto' ? '✓ ' : ''}AUTO (TRY BOTH)
                    </button>
                    
                    <button
                      onClick={(e) => { e.preventDefault(); setDecryptionMethod('local'); }}
                      className={`px-3 py-2 border-2 font-pixel text-sm ${
                        decryptionMethod === 'local'
                          ? 'border-base-blue bg-base-blue/20 text-base-blue dark:text-base-blue-light'
                          : 'border-light-border dark:border-dark-border text-light-text dark:text-dark-text hover:border-base-blue/50'
                      }`}
                      disabled={!order.encryptedQrData}
                      title={!order.encryptedQrData ? 'No local data available' : 'Use locally stored encrypted data'}
                    >
                      {decryptionMethod === 'local' ? '✓ ' : ''}LOCAL STORAGE
                    </button>
                    
                    <button
                      onClick={(e) => { e.preventDefault(); setDecryptionMethod('blockchain'); }}
                      className={`px-3 py-2 border-2 font-pixel text-sm ${
                        decryptionMethod === 'blockchain'
                          ? 'border-base-blue bg-base-blue/20 text-base-blue dark:text-base-blue-light'
                          : 'border-light-border dark:border-dark-border text-light-text dark:text-dark-text hover:border-base-blue/50'
                      }`}
                      disabled={!order.onChainTxHash}
                      title={!order.onChainTxHash ? 'No blockchain transaction hash available' : 'Decrypt directly from blockchain data'}
                    >
                      {decryptionMethod === 'blockchain' ? '✓ ' : ''}BLOCKCHAIN
                      {!order.onChainTxHash && <span className="text-red-500 ml-1">(unavailable)</span>}
                    </button>
                  </div>
                  
                  {/* Details about selected method */}
                  <div className="mt-2 text-xs text-light-secondary dark:text-dark-secondary">
                    {decryptionMethod === 'auto' && 'Will try local storage first, then blockchain if needed.'}
                    {decryptionMethod === 'local' && 'Uses cached encrypted data for faster decryption.'}
                    {decryptionMethod === 'blockchain' && 'Retrieves and decrypts data directly from the blockchain transaction.'}
                  </div>
                </div>
                
                <button
                  type="submit"
                  disabled={isDecrypting || !privateUuid}
                  className={`px-4 py-2 font-pixel text-white ${
                    isDecrypting || !privateUuid
                      ? 'bg-base-blue/30 cursor-not-allowed'
                      : 'bg-base-blue hover:bg-base-blue/80'
                  } transition-colors flex items-center justify-center gap-2 w-full`}
                >
                  {isDecrypting ? (
                    <>
                      <LoadingIcon className="w-4 h-4" />
                      DECRYPTING...
                    </>
                  ) : (
                    `DECRYPT USING ${decryptionMethod.toUpperCase() === 'AUTO' ? 'AUTO DETECTION' : decryptionMethod.toUpperCase()}`
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-base-blue font-pixel text-sm">DECRYPTED QR CODE DATA</h4>
                <button
                  type="button"
                  onClick={() => {
                    setIsDecrypted(false);
                    setDecryptedData(null);
                    setImageDownloaded(false);
                  }}
                  className="text-base-blue text-xs hover:underline"
                >
                  Decrypt another
                </button>
              </div>
              
              <div className="bg-light-card dark:bg-dark-card p-4 border-2 border-base-blue/30 font-mono text-light-text dark:text-dark-text/80 text-sm mb-4 max-h-80 overflow-y-auto">
                <pre>{decryptedData ? JSON.stringify(decryptedData, null, 2) : decryptedQRData}</pre>
              </div>
              
              <div className="mt-3 mb-4">
                <p className="text-light-text dark:text-dark-text/50 text-xs">
                  Public UUID: {order.publicUuid}
                </p>
                {order.onChainTxHash && (
                  <p className="text-light-text dark:text-dark-text/50 text-xs">
                    Transaction Hash: <a 
                      href={`https://basescan.org/tx/${order.onChainTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-base-blue/50 hover:text-base-blue"
                    >
                      {order.onChainTxHash.substring(0, 10)}...{order.onChainTxHash.substring(order.onChainTxHash.length - 8)}
                    </a>
                  </p>
                )}
              </div>
              
              {/* Debug info - will help us troubleshoot (remove in production) */}
              <div className="border border-yellow-500/30 bg-yellow-900/20 p-2 mb-4 text-xs text-yellow-500/80">
                <p>Debug: Image available = {order?.imageFileId && order?.imageFileExt ? 'Yes' : 'No'}</p>
                {order?.imageFileId && <p>Image ID: {order.imageFileId}</p>}
                {order?.imageFileExt && <p>Image Ext: {order.imageFileExt}</p>}
              </div>
              
              {/* Display the decryption result (QR data) */}
              <div className="bg-light-card dark:bg-dark-card mt-6 p-4 border-2 border-base-blue/50">
                <h3 className="text-base-blue font-pixel text-lg mb-4">DECRYPTED QR CODE DATA</h3>
                <div className="text-light-text bg-light-card dark:bg-dark-card p-3 font-mono text-sm border border-base-blue/30 whitespace-pre-wrap max-h-60 overflow-y-auto">
                  {decryptedData ? JSON.stringify(decryptedData, null, 2) : decryptedQRData}
                </div>
                
                {/* Image download section */}
                {hasImage && (
                  <div className="mt-6 border-t-2 border-base-blue/30 pt-4">
                    <h3 className="text-base-blue font-pixel text-lg mb-4">QR CODE IMAGE</h3>
                    
                    <div className="bg-light-card dark:bg-dark-card p-4 border border-base-blue/50">
                      <div className="flex items-center gap-3">
                        <div className="text-base-blue text-3xl">🖼️</div>
                        <div>
                          <p className="text-light-text dark:text-dark-text mb-2">The QR code image is available for download.</p>
                          
                          {imageDownloaded ? (
                            <div className="flex items-center gap-2 text-base-blue">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span>Image downloaded successfully</span>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={handleImageDownload}
                                disabled={isLoading}
                                className={`px-4 py-2 ${isLoading ? 'bg-base-blue/30 cursor-wait' : 'bg-base-blue hover:bg-base-blue/80'} text-base-blue font-pixel flex items-center gap-2`}
                              >
                                {isLoading ? (
                                  <>
                                    <LoadingIcon className="w-4 h-4" />
                                    <span>DOWNLOADING...</span>
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    <span>DOWNLOAD IMAGE</span>
                                  </>
                                )}
                              </button>
                            
                              {downloadTimeRemaining > 0 && (
                                <div className="mt-2 text-light-text dark:text-dark-text/70">
                                  Time remaining: {downloadTimeRemaining} seconds
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Actions Buttons */}
        <div className="flex flex-col md:flex-row gap-4 mt-8">
          {/* Cancel Order button (only for owner) */}
          {isOwner && order.status === 'active' && (
            <button
              onClick={handleCancelOrder}
              disabled={isCancelling}
              className={`px-6 py-3 border ${
                isCancelling
                  ? 'bg-base-blue/20 cursor-wait border-base-blue/30'
                  : 'bg-base-blue/10 hover:bg-base-blue/30 border-base-blue/50'
              } font-pixel text-base-blue flex items-center justify-center`}
            >
              {isCancelling ? (
                <>
                  <LoadingIcon className="w-5 h-5 mr-2" />
                  CANCELLING...
                </>
              ) : (
                'CANCEL ORDER'
              )}
            </button>
          )}
          
          {/* Fill Order button (only shown to non-owners for active orders) */}
          {!isOwner && order.status === 'active' && isConnected && (
            <button
              onClick={handleFillOrder}
              disabled={isFilling}
              className="mt-4 w-full border-3 border-base-blue py-2 font-pixel text-base-blue hover:bg-base-blue/20 focus:bg-base-blue/30 shadow-pixel disabled:border-base-blue/30 disabled:text-base-blue/30 disabled:hover:bg-transparent transition-all"
            >
              {isFilling ? (
                <div className="flex items-center justify-center">
                  <LoadingIcon className="animate-spin h-5 w-5 mr-2" />
                  <span>PROCESSING...</span>
                </div>
              ) : (
                'FILL ORDER'
              )}
            </button>
          )}
          
          {/* Back button */}
          <button
            onClick={() => navigate('/marketplace')}
            className="px-6 py-3 bg-transparent border border-base-blue/30 hover:bg-base-blue/10 font-pixel text-base-blue"
          >
            BACK TO MARKETPLACE
          </button>
        </div>
        
        {/* Filler section - Show if user has filled this order */}
        {order?.status === 'filled' && isFilledByCurrentUser && (
          <div className="mt-8 border-t-2 border-base-blue/30 pt-6">
            <h3 className="text-base-blue font-pixel text-xl mb-4">FILLED ORDER ACTIONS</h3>
            
            <div className="bg-light-card dark:bg-dark-card p-4 border border-base-blue/50">
              <p className="text-light-text dark:text-dark-text mb-4">
                You've successfully filled this order. You can now download the OXXO Spin QR code to collect your payment.
              </p>
              
              {fillerQRDownloadUrl ? (
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleFillerQRDownload}
                    className="px-4 py-2 bg-base-blue hover:bg-base-blue/80 text-base-blue font-pixel flex items-center justify-center"
                  >
                    DOWNLOAD QR CODE
                  </button>
                  <p className="text-sm text-light-text dark:text-dark-text/60">
                    This download link will expire in 5 minutes for security reasons.
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleRequestQRDownload}
                  disabled={isLoading}
                  className={`px-4 py-2 ${
                    isLoading
                      ? 'bg-base-blue/30 cursor-wait'
                      : 'bg-base-blue hover:bg-base-blue/80'
                  } text-base-blue font-pixel flex items-center justify-center`}
                >
                  {isLoading ? (
                    <>
                      <LoadingIcon className="w-4 h-4 mr-2" />
                      PREPARING QR CODE...
                    </>
                  ) : (
                    'REQUEST QR CODE DOWNLOAD'
                  )}
                </button>
              )}
            </div>
          </div>
        )}
        
        {/* Token Transfer Section - Show if order is filled and QR code has been downloaded */}
        {order?.status === 'filled' && order?.qrCodeDownloaded && (
          <div className="mt-8 border-t-2 border-base-blue/30 pt-6">
            <h3 className="text-base-blue font-pixel text-xl mb-4">TOKEN TRANSFER STATUS</h3>
            
            <div className="bg-light-card dark:bg-dark-card p-4 border border-base-blue/50">
              {order.transferTxHash ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-green-500">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="font-pixel">Tokens have been transferred from escrow to buyer!</p>
                  </div>
                  
                  <div className="text-light-text dark:text-dark-text/70 text-sm mt-2">
                    <p>Transaction Hash: <a 
                      href={`https://basescan.org/tx/${order.transferTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-base-blue hover:underline break-all"
                    >
                      {order.transferTxHash}
                    </a></p>
                    
                    {order.transferTimestamp && (
                      <p className="mt-1">Transfer Time: {new Date(order.transferTimestamp).toLocaleString()}</p>
                    )}
                  </div>
                  
                  <div className="mt-4 p-3 border border-green-500/30 bg-green-900/20 text-green-500">
                    <p className="flex items-center gap-2">
                      <span>✓</span>
                      <span>
                        {order.tokenAmount} {order.token} has been sent from the escrow wallet to {isOwner ? 'your wallet' : 'the buyer\'s wallet'}.
                      </span>
                    </p>
                  </div>
                </div>
              ) : order.transferError ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-red-500">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="font-pixel">There was an error transferring tokens from escrow to buyer</p>
                  </div>
                  
                  <div className="mt-4 p-3 border border-red-500/30 bg-red-900/20 text-red-500">
                    <p>Error: {order.transferError}</p>
                    <p className="mt-2 text-sm">Please try again or contact support for assistance.</p>
                  </div>
                  
                  <button
                    onClick={handleManualTokenTransfer}
                    disabled={isLoading}
                    className="mt-2 px-4 py-2 bg-base-blue text-base-blue hover:bg-base-blue/80 font-pixel flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <LoadingIcon className="w-4 h-4" />
                        INITIATING TRANSFER...
                      </>
                    ) : (
                      'TRY AGAIN'
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-base-blue">
                    <LoadingIcon className="w-5 h-5" />
                    <p className="font-pixel">Waiting for token transfer from escrow to buyer</p>
                  </div>
                  
                  <div className="mt-4 p-3 border border-base-blue/30 bg-base-blue/10 text-base-blue/80">
                    <p>The token transfer should be processed shortly. Please check back in a few moments.</p>
                    {isOwner ? (
                      <p className="mt-2">You will receive {order.tokenAmount} {order.token} to your wallet: {formatAddress(order.buyer, 6, 4)}</p>
                    ) : (
                      <p className="mt-2">The buyer will receive {order.tokenAmount} {order.token} to their wallet: {formatAddress(order.buyer, 6, 4)}</p>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={fetchOrderDetails}
                      className="px-4 py-2 bg-base-blue/20 text-base-blue hover:bg-base-blue/30 font-pixel text-sm"
                    >
                      REFRESH STATUS
                    </button>
                    
                    <button
                      onClick={handleManualTokenTransfer}
                      disabled={isLoading}
                      className="px-4 py-2 bg-base-blue text-base-blue hover:bg-base-blue/80 font-pixel text-sm flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <LoadingIcon className="w-4 h-4" />
                          PROCESSING...
                        </>
                      ) : (
                        'TRIGGER TRANSFER MANUALLY'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 