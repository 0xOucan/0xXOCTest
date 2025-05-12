import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWallet } from '../../providers/WalletContext';
import { getBuyingOrderById, cancelBuyingOrder, decryptQrCode, downloadBuyingOrderImage } from '../../services/marketplaceService';
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
};

export default function BuyingOrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { connectedAddress, isConnected } = useWallet();
  const { addNotification } = useNotification();
  
  const [order, setOrder] = React.useState<BuyingOrder | null>(null);
  const [loading, setLoading] = React.useState(true);
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
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [downloadTimeRemaining, setDownloadTimeRemaining] = useState<number>(0);
  
  // Fetch order details on component mount
  React.useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderId) return;
      
      try {
        setLoading(true);
        const orderData = await getBuyingOrderById(orderId);
        setOrder(orderData);
      } catch (error) {
        console.error('Error fetching order details:', error);
        addNotification(
          'Failed to fetch order details',
          NotificationType.ERROR,
          error instanceof Error ? error.message : 'Unknown error'
        );
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrderDetails();
  }, [orderId]);
  
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
    if (!order) return;
    
    try {
      setIsLoading(true);
      await downloadBuyingOrderImage(order.orderId);
      
      // Start countdown timer for 60 seconds
      setDownloadTimeRemaining(60);
      
      addNotification(
        'Image download started',
        NotificationType.SUCCESS,
        'The image will be available for download for 60 seconds. If you need to download again, please do so quickly.'
      );
    } catch (error) {
      console.error('Error downloading image:', error);
      addNotification(
        'Failed to download image',
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
      case 'active': return 'text-mictlai-turquoise';
      case 'pending': return 'text-mictlai-gold';
      case 'filled': return 'text-green-500';
      case 'cancelled': return 'text-mictlai-blood';
      case 'expired': return 'text-mictlai-bone/50';
      default: return 'text-mictlai-bone';
    }
  };
  
  // Check if user is the owner
  const isOwner = order && isConnected && order.buyer.toLowerCase() === connectedAddress?.toLowerCase();
  
  if (loading) {
    return (
      <div className="bg-mictlai-obsidian border-3 border-mictlai-gold shadow-pixel-lg p-8 flex justify-center items-center">
        <LoadingIcon className="w-10 h-10 text-mictlai-gold" />
      </div>
    );
  }
  
  if (!order) {
    return (
      <div className="bg-mictlai-obsidian border-3 border-mictlai-gold shadow-pixel-lg p-8">
        <div className="text-center">
          <h2 className="text-xl font-bold text-mictlai-gold mb-4">ORDER NOT FOUND</h2>
          <p className="text-mictlai-bone mb-6">The buying order you're looking for does not exist or has been deleted.</p>
          <button
            onClick={() => navigate('/marketplace')}
            className="px-4 py-2 bg-mictlai-gold text-black font-pixel hover:bg-mictlai-gold/80"
          >
            BACK TO MARKETPLACE
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-mictlai-obsidian border-3 border-mictlai-gold shadow-pixel-lg">
      <div className="p-4 bg-black border-b-3 border-mictlai-gold/70 flex justify-between items-center">
        <h2 className="text-lg font-bold font-pixel text-mictlai-gold">
          BUYING ORDER DETAILS
        </h2>
        
        <button 
          onClick={() => navigate('/marketplace')}
          className="px-3 py-1 border-2 border-mictlai-gold/70 hover:bg-mictlai-gold/20 text-mictlai-gold transition-colors shadow-pixel text-sm"
          title="Back to marketplace"
        >
          BACK
        </button>
      </div>
      
      <div className="p-6">
        {/* Order ID and Status */}
        <div className="flex justify-between items-center mb-6 border-b-2 border-mictlai-gold/30 pb-4">
          <div>
            <h3 className="text-xl font-pixel text-mictlai-gold">ORDER #{order.orderId}</h3>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-sm font-pixel ${getStatusColorClass(order.status)}`}>
                {formatStatus(order.status)}
              </span>
              <span className="text-mictlai-bone/50 text-sm">
                {formatTimeAgo(order.createdAt)}
              </span>
            </div>
          </div>
          
          {/* Cancel button (only for active orders by the connected user) */}
          {order.status === 'active' && isOwner && (
            <button
              onClick={handleCancelOrder}
              disabled={isCancelling}
              className="border-2 border-mictlai-blood text-mictlai-blood text-sm font-pixel py-1 px-3 hover:bg-mictlai-blood/20 transition-colors"
            >
              {isCancelling ? 'CANCELLING...' : 'CANCEL ORDER'}
            </button>
          )}
        </div>
        
        {/* Order Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="bg-black/30 p-4 border-2 border-mictlai-gold/30">
            <h4 className="text-mictlai-bone/70 font-pixel text-sm mb-3">TOKEN DETAILS</h4>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{getTokenEmoji(order.token)}</span>
              <div>
                <div className="text-mictlai-gold font-pixel">{order.token}</div>
                <div className="text-xl text-mictlai-bone">{order.tokenAmount}</div>
              </div>
            </div>
            <div className="text-mictlai-bone/70 font-pixel text-sm mb-1">
              MXN Amount (OXXO Spin)
            </div>
            <div className="text-mictlai-gold font-pixel font-bold text-xl">
              💰 {order.mxnAmount.toFixed(2)}
            </div>
            
            <div className="mt-4 border-t border-mictlai-bone/20 pt-4">
              <div className="text-mictlai-bone/70 font-pixel text-sm mb-1">
                OXXO Reference Code
              </div>
              <div className="text-mictlai-bone font-mono">
                {order.referenceCode}
              </div>
              <div className="text-mictlai-bone/70 text-xs mt-1">
                QR Expiration: {order.qrExpiration}
              </div>
            </div>
            
            {order.memo && (
              <div className="mt-4 border-t border-mictlai-bone/20 pt-4">
                <div className="text-mictlai-bone/70 font-pixel text-sm mb-1">
                  Memo
                </div>
                <div className="text-mictlai-bone">
                  {order.memo}
                </div>
              </div>
            )}
          </div>
          
          {/* Buyer Details */}
          <div className="bg-black/30 p-4 border-2 border-mictlai-gold/30">
            <h4 className="text-mictlai-bone/70 font-pixel text-sm mb-3">BUYER DETAILS</h4>
            <div className="text-mictlai-bone/70 font-pixel text-sm mb-1">
              Buyer Address
            </div>
            <div className="text-mictlai-bone break-all font-mono mb-6">
              {order.buyer}
            </div>
            
            {order.txHash && (
              <>
                <div className="text-mictlai-bone/70 font-pixel text-sm mb-1">
                  Transaction ID
                </div>
                <div className="text-mictlai-turquoise break-all font-mono mb-2">
                  {order.txHash}
                </div>
                
                {/* Show blockchain transaction hash and BaseScan link if available */}
                {order.onChainTxHash ? (
                  <>
                    <div className="text-mictlai-bone/70 font-pixel text-sm mb-1 mt-4">
                      Blockchain Transaction Hash
                    </div>
                    <div className="text-mictlai-turquoise break-all font-mono mb-2">
                      {order.onChainTxHash}
                    </div>
                    <a 
                      href={`https://basescan.org/tx/${order.onChainTxHash}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-block text-sm text-mictlai-gold hover:underline"
                    >
                      VIEW ON BASESCAN →
                    </a>
                  </>
                ) : (
                  <div className="text-mictlai-bone/50 text-sm">
                    Waiting for blockchain confirmation...
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        
        {/* QR Code Decryption Section */}
        <div className="mt-8 p-4 border-t-2 border-mictlai-gold/30">
          <h3 className="text-mictlai-gold font-pixel text-lg mb-4">DECRYPT QR CODE DATA</h3>
          
          {!isDecrypted ? (
            <div>
              <p className="text-mictlai-bone/70 mb-4">
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
                    className="flex-1 bg-black border-2 border-mictlai-bone/30 text-mictlai-bone p-2 font-pixel focus:outline-none focus:border-mictlai-gold"
                    placeholder="Enter your Private Access UUID"
                  />
                </div>
                
                {/* Decryption Method Selection */}
                <div className="mb-4 border-2 border-mictlai-bone/20 p-3 bg-black/50">
                  <h5 className="text-mictlai-bone/70 font-pixel text-sm mb-2">SELECT DECRYPTION METHOD:</h5>
                  
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={(e) => { e.preventDefault(); setDecryptionMethod('auto'); }}
                      className={`px-3 py-2 border-2 font-pixel text-sm ${
                        decryptionMethod === 'auto'
                          ? 'border-mictlai-turquoise bg-mictlai-turquoise/20 text-mictlai-turquoise'
                          : 'border-mictlai-bone/30 text-mictlai-bone hover:border-mictlai-turquoise/50'
                      }`}
                    >
                      {decryptionMethod === 'auto' ? '✓ ' : ''}AUTO (TRY BOTH)
                    </button>
                    
                    <button
                      onClick={(e) => { e.preventDefault(); setDecryptionMethod('local'); }}
                      className={`px-3 py-2 border-2 font-pixel text-sm ${
                        decryptionMethod === 'local'
                          ? 'border-mictlai-turquoise bg-mictlai-turquoise/20 text-mictlai-turquoise'
                          : 'border-mictlai-bone/30 text-mictlai-bone hover:border-mictlai-turquoise/50'
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
                          ? 'border-mictlai-turquoise bg-mictlai-turquoise/20 text-mictlai-turquoise'
                          : 'border-mictlai-bone/30 text-mictlai-bone hover:border-mictlai-turquoise/50'
                      }`}
                      disabled={!order.onChainTxHash}
                      title={!order.onChainTxHash ? 'No blockchain transaction hash available' : 'Decrypt directly from blockchain data'}
                    >
                      {decryptionMethod === 'blockchain' ? '✓ ' : ''}BLOCKCHAIN
                      {!order.onChainTxHash && <span className="text-mictlai-blood ml-1">(unavailable)</span>}
                    </button>
                  </div>
                  
                  {/* Details about selected method */}
                  <div className="mt-2 text-xs text-mictlai-bone/60">
                    {decryptionMethod === 'auto' && 'Will try local storage first, then blockchain if needed.'}
                    {decryptionMethod === 'local' && 'Uses cached encrypted data for faster decryption.'}
                    {decryptionMethod === 'blockchain' && 'Retrieves and decrypts data directly from the blockchain transaction.'}
                  </div>
                </div>
                
                <button
                  type="submit"
                  disabled={isDecrypting || !privateUuid}
                  className={`px-4 py-2 font-pixel text-black ${
                    isDecrypting || !privateUuid
                      ? 'bg-mictlai-gold/30 cursor-not-allowed'
                      : 'bg-mictlai-gold hover:bg-mictlai-gold/80'
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
                <h4 className="text-mictlai-gold font-pixel text-sm">DECRYPTED QR CODE DATA</h4>
                <button
                  type="button"
                  onClick={() => {
                    setIsDecrypted(false);
                    setDecryptedData(null);
                    setImageDownloaded(false);
                  }}
                  className="text-mictlai-gold text-xs hover:underline"
                >
                  Decrypt another
                </button>
              </div>
              
              <div className="bg-black/30 p-4 border-2 border-mictlai-gold/30 font-mono text-mictlai-bone/80 text-sm mb-4 max-h-80 overflow-y-auto">
                <pre>{decryptedData ? JSON.stringify(decryptedData, null, 2) : decryptedQRData}</pre>
              </div>
              
              <div className="mt-3 mb-4">
                <p className="text-mictlai-bone/50 text-xs">
                  Public UUID: {order.publicUuid}
                </p>
                {order.onChainTxHash && (
                  <p className="text-mictlai-bone/50 text-xs">
                    Transaction Hash: <a 
                      href={`https://basescan.org/tx/${order.onChainTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-mictlai-turquoise/50 hover:text-mictlai-turquoise"
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
              
              {order?.imageFileId && order?.imageFileExt && !imageDownloaded && isDecrypted && (
                <div className="mt-4 p-4 bg-mictlai-gold/10 border-2 border-mictlai-gold/30">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-mictlai-gold font-pixel text-sm mb-2">IMAGE FILE AVAILABLE</h4>
                      <p className="text-mictlai-bone/70 text-xs mb-2">
                        This order has an associated QR code image that you can download.
                        The image will be permanently deleted from the server after download.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleImageDownload}
                      disabled={isLoading}
                      className="py-2 px-4 bg-mictlai-gold hover:bg-mictlai-gold/80 text-black font-pixel text-sm flex items-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <LoadingIcon className="w-4 h-4" />
                          DOWNLOADING...
                        </>
                      ) : downloadTimeRemaining > 0 ? (
                        <>
                          DOWNLOAD IMAGE ({downloadTimeRemaining}s)
                        </>
                      ) : (
                        'DOWNLOAD IMAGE'
                      )}
                    </button>
                  </div>
                  
                  {downloadTimeRemaining > 0 && (
                    <div className="mt-2 text-sm text-yellow-500">
                      ⏱️ The image will be available for {downloadTimeRemaining} more seconds
                    </div>
                  )}
                </div>
              )}
              
              {/* Alternative button if normal download button isn't showing */}
              {isDecrypted && !imageDownloaded && !(order?.imageFileId && order?.imageFileExt) && order?.orderId && (
                <div className="mt-4 p-4 bg-mictlai-turquoise/10 border-2 border-mictlai-turquoise/30">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-mictlai-turquoise font-pixel text-sm mb-2">DOWNLOAD QR CODE IMAGE</h4>
                      <p className="text-mictlai-bone/70 text-xs mb-2">
                        Try downloading the QR code image directly with this backup button.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!order) return;
                        try {
                          setIsLoading(true);
                          await downloadBuyingOrderImage(order.orderId);
                          setImageDownloaded(true);
                          addNotification(
                            'Image download started',
                            NotificationType.SUCCESS,
                            'The image has been downloaded to your device and removed from the server.'
                          );
                        } catch (error) {
                          console.error('Error downloading image:', error);
                          addNotification(
                            'Failed to download image',
                            NotificationType.ERROR,
                            error instanceof Error ? error.message : 'Unknown error'
                          );
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                      disabled={isLoading}
                      className="py-2 px-4 bg-mictlai-turquoise hover:bg-mictlai-turquoise/80 text-black font-pixel text-sm flex items-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <LoadingIcon className="w-4 h-4" />
                          DOWNLOADING...
                        </>
                      ) : (
                        'DOWNLOAD IMAGE'
                      )}
                    </button>
                  </div>
                </div>
              )}
              
              {imageDownloaded && (
                <div className="mt-4 p-4 bg-green-900/20 border-2 border-green-500/30">
                  <h4 className="text-green-400 font-pixel text-sm mb-2">IMAGE DOWNLOADED</h4>
                  <p className="text-mictlai-bone/70 text-xs">
                    The image has been downloaded to your device and removed from the server.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 