import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWallet } from '../../providers/WalletContext';
import { getBuyingOrderById, cancelBuyingOrder } from '../../services/marketplaceService';
import { formatAddress, formatTimeAgo } from '../../utils/formatting';
import { LoadingIcon } from '../Icons';
import { useNotification, NotificationType } from '../../utils/notification';

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
};

export default function BuyingOrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { connectedAddress, isConnected } = useWallet();
  const { addNotification } = useNotification();
  
  const [order, setOrder] = React.useState<BuyingOrder | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isCancelling, setIsCancelling] = React.useState(false);
  
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
          {order.status === 'active' && isConnected && order.buyer.toLowerCase() === connectedAddress?.toLowerCase() && (
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
              </>
            )}
          </div>
        </div>
        
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
                  {new Date(order.expiresAt).toLocaleString()}
                </div>
              </div>
            </div>
            
            {order.status === 'filled' && order.filledAt && (
              <div className="flex items-start gap-3">
                <div className="w-4 h-4 bg-green-500 rounded-full mt-1"></div>
                <div>
                  <div className="text-green-500 font-pixel">FILLED</div>
                  <div className="text-mictlai-bone text-sm">
                    {new Date(order.filledAt).toLocaleString()}
                  </div>
                  {order.filledBy && (
                    <div className="text-mictlai-bone/70 text-xs mt-1">
                      Filled by: {formatAddress(order.filledBy, 6, 4)}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {order.status === 'cancelled' && (
              <div className="flex items-start gap-3">
                <div className="w-4 h-4 bg-mictlai-blood rounded-full mt-1"></div>
                <div>
                  <div className="text-mictlai-blood font-pixel">CANCELLED</div>
                  <div className="text-mictlai-bone text-sm">
                    Order was cancelled by the buyer
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