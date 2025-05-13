import React, { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWallet } from '../../providers/WalletContext';
import { 
  getSellingOrderById, 
  cancelSellingOrder, 
  SellingOrder, 
  fillSellingOrder,
  validateOxxoQrForSellingOrder,
  getSellingOrderFills
} from '../../services/marketplaceService';
import { formatAddress, formatTimeAgo } from '../../utils/formatting';
import { LoadingIcon } from '../Icons';
import { useNotification, NotificationType } from '../../utils/notification';
import QrScanner from 'qr-scanner';

export default function SellingOrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { connectedAddress, isConnected } = useWallet();
  const { addNotification } = useNotification();
  
  const [order, setOrder] = React.useState<SellingOrder | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isCancelling, setIsCancelling] = React.useState(false);
  const [fills, setFills] = useState<any[]>([]);
  
  // QR Code upload states
  const [showQrUploadModal, setShowQrUploadModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Fetch order details on component mount
  React.useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderId) return;
      
      try {
        setLoading(true);
        const orderData = await getSellingOrderById(orderId);
        setOrder(orderData);
        
        // Also fetch any existing fills for this order
        const fillsData = await getSellingOrderFills(orderId);
        setFills(fillsData);
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
  
  // Handle order cancellation
  const handleCancelOrder = async () => {
    if (!isConnected || !order) {
      addNotification('Please connect your wallet first', NotificationType.WARNING);
      return;
    }
    
    try {
      setIsCancelling(true);
      
      const result = await cancelSellingOrder(order.orderId);
      
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
  
  // Scan QR code from image file
  const scanQrCodeFromImage = async (file: File) => {
    try {
      setIsScanning(true);
      setScanError(null);
      
      const result = await QrScanner.scanImage(file, {
        returnDetailedScanResult: true,
      });
      
      if (result && result.data) {
        // Check if the QR code data is valid OXXO Spin format
        if (!order) {
          setScanError('Order information not available.');
          return;
        }
        
        const validation = validateOxxoQrForSellingOrder(result.data, order.mxnAmount || '0');
        
        if (validation.isValid) {
          setQrCodeData(result.data);
          
          addNotification(
            'QR code scanned successfully',
            NotificationType.SUCCESS,
            `Detected OXXO Spin QR code for ${validation.qrAmount} MXN`
          );
        } else {
          setScanError(validation.message || 'Invalid OXXO Spin QR code.');
          addNotification(
            'Invalid QR code format',
            NotificationType.WARNING,
            validation.message || 'The scanned QR code is not valid.'
          );
        }
      } else {
        setScanError('No QR code found in image');
        addNotification(
          'No QR code detected',
          NotificationType.WARNING,
          'No QR code was detected in the uploaded image.'
        );
      }
    } catch (error) {
      console.error('Error scanning QR code:', error);
      setScanError('Error scanning QR code: ' + (error instanceof Error ? error.message : 'Unknown error'));
      addNotification(
        'QR code scanning error',
        NotificationType.ERROR,
        error instanceof Error ? error.message : 'Unknown error'
      );
    } finally {
      setIsScanning(false);
    }
  };
  
  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        addNotification('Please select a valid image file (JPG, JPEG, or PNG)', NotificationType.WARNING);
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        addNotification('Image file is too large. Maximum size is 5MB', NotificationType.WARNING);
        return;
      }
      
      setSelectedImage(file);
      setScanError(null);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      // Scan QR code from the image
      scanQrCodeFromImage(file);
    }
  };
  
  // Clear selected image
  const clearSelectedImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setQrCodeData('');
    setScanError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Handle fill order submission
  const handleFillOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected) {
      addNotification('Please connect your wallet first', NotificationType.WARNING);
      return;
    }
    
    if (!order || !orderId) {
      addNotification('Order information not available', NotificationType.ERROR);
      return;
    }
    
    if (!qrCodeData) {
      addNotification('QR code data is required', NotificationType.WARNING);
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const response = await fillSellingOrder(orderId, qrCodeData);
      
      addNotification(
        'Order fill request submitted',
        NotificationType.SUCCESS,
        'Your OXXO QR code has been submitted to fill this selling order.'
      );
      
      // Refresh order details and fills
      const updatedOrder = await getSellingOrderById(orderId);
      setOrder(updatedOrder);
      
      const updatedFills = await getSellingOrderFills(orderId);
      setFills(updatedFills);
      
      // Close the modal and reset form
      setShowQrUploadModal(false);
      clearSelectedImage();
    } catch (error) {
      console.error('Error filling order:', error);
      addNotification(
        'Failed to fill order',
        NotificationType.ERROR,
        error instanceof Error ? error.message : 'Unknown error'
      );
    } finally {
      setIsSubmitting(false);
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
  
  // QR Code Upload Modal
  const QrCodeUploadModal = () => {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div className="bg-mictlai-obsidian border-3 border-mictlai-gold shadow-pixel-lg max-w-lg w-full p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-mictlai-gold font-pixel">FILL SELLING ORDER</h3>
            <button 
              onClick={() => setShowQrUploadModal(false)}
              className="text-mictlai-bone hover:text-mictlai-blood"
            >
              ✕
            </button>
          </div>
          
          <div className="mb-4">
            <div className="text-mictlai-bone mb-2">
              Upload an OXXO Spin QR code image to fill this selling order. The QR code must match the expected MXN amount.
            </div>
            
            <div className="bg-black/30 p-3 border border-mictlai-gold/30 mb-4">
              <div className="flex items-center gap-3">
                <span className="text-xl">{getTokenEmoji(order?.token || '')}</span>
                <div>
                  <div className="text-mictlai-gold font-pixel">{order?.token}</div>
                  <div className="text-mictlai-bone">{order?.amount}</div>
                </div>
              </div>
              <div className="mt-2 text-mictlai-gold font-pixel">
                Expected MXN: {order?.mxnAmount || '---'}
              </div>
            </div>
          </div>
          
          <form onSubmit={handleFillOrder}>
            <div className="space-y-4">
              {/* QR Code Image Upload */}
              <div>
                <label className="block text-mictlai-bone font-pixel text-sm mb-2">
                  UPLOAD OXXO SPIN QR CODE IMAGE
                </label>
                
                <div className="flex items-center">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageSelect}
                    accept=".jpg,.jpeg,.png"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="py-2 px-3 bg-black border-2 border-mictlai-gold text-mictlai-gold hover:bg-mictlai-gold/20 font-pixel text-sm"
                  >
                    {isScanning ? 'SCANNING...' : 'SELECT QR CODE IMAGE'}
                  </button>
                  {selectedImage && (
                    <button
                      type="button"
                      onClick={clearSelectedImage}
                      className="ml-2 py-2 px-3 bg-black border-2 border-mictlai-blood/50 text-mictlai-blood hover:border-mictlai-blood font-pixel text-sm"
                    >
                      CLEAR
                    </button>
                  )}
                </div>
                
                {selectedImage && (
                  <div className="mt-2 text-mictlai-bone/70 text-sm">
                    {selectedImage.name} ({Math.round(selectedImage.size / 1024)} KB)
                  </div>
                )}
                
                {imagePreview && (
                  <div className="mt-2 flex flex-col md:flex-row gap-4 items-start">
                    <div className="max-w-xs">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="border-2 border-mictlai-gold/30 max-h-40 object-contain"
                      />
                    </div>
                    <div className="flex-1">
                      {isScanning ? (
                        <div className="flex items-center gap-2 text-mictlai-turquoise">
                          <LoadingIcon className="w-4 h-4" />
                          <span>Scanning QR code...</span>
                        </div>
                      ) : scanError ? (
                        <div className="text-mictlai-blood text-sm p-3 border border-mictlai-blood/30 bg-mictlai-blood/10">
                          {scanError}
                        </div>
                      ) : qrCodeData ? (
                        <div className="text-mictlai-turquoise text-sm p-3 border border-mictlai-turquoise/30 bg-mictlai-turquoise/10">
                          ✓ QR code detected and valid!
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="text-mictlai-bone/50 text-xs">
                Upload a PNG or JPG/JPEG image containing an OXXO Spin QR code (max 5MB).
                The amount in the QR code must match the expected MXN amount for this order.
              </div>
              
              <div className="pt-4 flex justify-between">
                <button
                  type="button"
                  onClick={() => setShowQrUploadModal(false)}
                  className="py-2 px-4 border-2 border-mictlai-bone/30 text-mictlai-bone hover:bg-mictlai-bone/10 font-pixel"
                >
                  CANCEL
                </button>
                
                <button
                  type="submit"
                  disabled={!qrCodeData || isSubmitting}
                  className={`py-2 px-4 font-pixel ${qrCodeData && !isSubmitting
                    ? 'bg-mictlai-turquoise text-black hover:bg-mictlai-turquoise/80'
                    : 'bg-mictlai-bone/20 text-mictlai-bone/50 cursor-not-allowed'}`}
                >
                  {isSubmitting ? 'PROCESSING...' : 'FILL ORDER'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  };
  
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
          <p className="text-mictlai-bone mb-6">The selling order you're looking for does not exist or has been deleted.</p>
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
      {showQrUploadModal && <QrCodeUploadModal />}
      
      <div className="p-4 bg-black border-b-3 border-mictlai-gold/70 flex justify-between items-center">
        <h2 className="text-lg font-bold font-pixel text-mictlai-gold">
          SELLING ORDER DETAILS
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
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            {/* Cancel button (only for active orders by the connected user) */}
            {order.status === 'active' && isConnected && order.seller.toLowerCase() === connectedAddress?.toLowerCase() && (
              <button
                onClick={handleCancelOrder}
                disabled={isCancelling}
                className="border-2 border-mictlai-blood text-mictlai-blood text-sm font-pixel py-1 px-3 hover:bg-mictlai-blood/20 transition-colors"
              >
                {isCancelling ? 'CANCELLING...' : 'CANCEL ORDER'}
              </button>
            )}
            
            {/* Fill Order button (for active orders by other users) */}
            {order.status === 'active' && isConnected && order.seller.toLowerCase() !== connectedAddress?.toLowerCase() && (
              <button
                onClick={() => setShowQrUploadModal(true)}
                className="border-2 border-mictlai-turquoise text-mictlai-turquoise text-sm font-pixel py-1 px-3 hover:bg-mictlai-turquoise/20 transition-colors"
              >
                FILL ORDER
              </button>
            )}
          </div>
        </div>
        
        {/* Token Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="bg-black/30 p-4 border-2 border-mictlai-gold/30">
            <h4 className="text-mictlai-bone/70 font-pixel text-sm mb-3">TOKEN DETAILS</h4>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{getTokenEmoji(order.token)}</span>
              <div>
                <div className="text-mictlai-gold font-pixel">{order.token}</div>
                <div className="text-xl text-mictlai-bone">{order.amount}</div>
              </div>
            </div>
            <div className="text-mictlai-bone/70 font-pixel text-sm mb-1">
              Expected MXN
            </div>
            <div className="text-mictlai-gold font-pixel font-bold text-xl">
              💰 {order.mxnAmount || '---'}
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
          
          {/* Seller Details */}
          <div className="bg-black/30 p-4 border-2 border-mictlai-gold/30">
            <h4 className="text-mictlai-bone/70 font-pixel text-sm mb-3">SELLER DETAILS</h4>
            <div className="text-mictlai-bone/70 font-pixel text-sm mb-1">
              Seller Address
            </div>
            <div className="text-mictlai-bone break-all font-mono mb-6">
              {order.seller}
            </div>
            
            <div className="text-mictlai-bone/70 font-pixel text-sm mb-1">
              Transaction Hash
            </div>
            <div className="text-mictlai-turquoise break-all font-mono mb-2">
              {order.txHash}
            </div>
            <a 
              href={`https://basescan.org/tx/${order.txHash}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block text-sm text-mictlai-gold hover:underline"
            >
              VIEW ON BASESCAN →
            </a>
          </div>
        </div>
        
        {/* Order Fills (if any) */}
        {fills.length > 0 && (
          <div className="mb-8 bg-black/30 p-4 border-2 border-mictlai-gold/30">
            <h4 className="text-mictlai-bone/70 font-pixel text-sm mb-3">ORDER FILLS</h4>
            
            <div className="space-y-4">
              {fills.map((fill, index) => (
                <div key={fill.fillId || index} className="border-b border-mictlai-gold/20 pb-3 last:border-b-0 last:pb-0">
                  <div className="flex justify-between">
                    <span className="text-mictlai-gold font-pixel">FILL #{fill.fillId}</span>
                    <span className={`text-sm font-pixel ${getStatusColorClass(fill.status)}`}>
                      {formatStatus(fill.status)}
                    </span>
                  </div>
                  
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-mictlai-bone/70 text-xs mb-1">Submitted By</div>
                      <div className="text-mictlai-bone text-sm font-mono">
                        {formatAddress(fill.buyerAddress || 'Unknown')}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-mictlai-bone/70 text-xs mb-1">Timestamp</div>
                      <div className="text-mictlai-bone text-sm">
                        {new Date(fill.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  
                  {fill.txHash && (
                    <div className="mt-2">
                      <div className="text-mictlai-bone/70 text-xs mb-1">Transaction</div>
                      <a 
                        href={`https://basescan.org/tx/${fill.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-mictlai-turquoise text-sm hover:underline font-mono"
                      >
                        {formatAddress(fill.txHash)}
                      </a>
                    </div>
                  )}
                  
                  {fill.errorMessage && (
                    <div className="mt-2 p-2 bg-mictlai-blood/10 border border-mictlai-blood/20 text-mictlai-blood text-sm">
                      {fill.errorMessage}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Timeline */}
        <div className="bg-black/30 p-4 border-2 border-mictlai-gold/30">
          <h4 className="text-mictlai-bone/70 font-pixel text-sm mb-3">ORDER TIMELINE</h4>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-4 h-4 bg-mictlai-gold rounded-full mt-1"></div>
              <div>
                <div className="text-mictlai-gold font-pixel">CREATED</div>
                <div className="text-mictlai-bone text-sm">
                  {new Date(order.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-4 h-4 bg-mictlai-blood rounded-full mt-1"></div>
              <div>
                <div className="text-mictlai-blood font-pixel">EXPIRES</div>
                <div className="text-mictlai-bone text-sm">
                  {order.expiresAt ? new Date(order.expiresAt).toLocaleString() : 'No expiration date'}
                </div>
              </div>
            </div>
            
            {order.status === 'filled' && (
              <div className="flex items-start gap-3">
                <div className="w-4 h-4 bg-green-500 rounded-full mt-1"></div>
                <div>
                  <div className="text-green-500 font-pixel">FILLED</div>
                  <div className="text-mictlai-bone text-sm">
                    Order was filled
                  </div>
                </div>
              </div>
            )}
            
            {order.status === 'cancelled' && (
              <div className="flex items-start gap-3">
                <div className="w-4 h-4 bg-mictlai-blood rounded-full mt-1"></div>
                <div>
                  <div className="text-mictlai-blood font-pixel">CANCELLED</div>
                  <div className="text-mictlai-bone text-sm">
                    Order was cancelled by the seller
                  </div>
                </div>
              </div>
            )}
            
            {order.status === 'expired' && (
              <div className="flex items-start gap-3">
                <div className="w-4 h-4 bg-mictlai-bone/50 rounded-full mt-1"></div>
                <div>
                  <div className="text-mictlai-bone/50 font-pixel">EXPIRED</div>
                  <div className="text-mictlai-bone text-sm">
                    Order has expired
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 