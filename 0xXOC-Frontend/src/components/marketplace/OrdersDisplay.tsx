import React, { useState, useEffect } from 'react';
import { useWallet } from '../../providers/WalletContext';
import { 
  getSellingOrders, 
  getBuyingOrders, 
  SellingOrder, 
  BuyingOrder, 
  getMockSellingOrders, 
  getMockBuyingOrders,
  cancelSellingOrder,
  cancelBuyingOrder
} from '../../services/marketplaceService';
import { LoadingIcon } from '../Icons';
import { useNotification, NotificationType } from '../../utils/notification';
import { formatAddress, formatTimeAgo } from '../../utils/formatting';

export default function OrdersDisplay() {
  const { connectedAddress, isConnected } = useWallet();
  const { addNotification } = useNotification();
  
  // State variables
  const [activeTab, setActiveTab] = useState<'sell' | 'buy'>('sell');
  const [loadingSellingOrders, setLoadingSellingOrders] = useState(false);
  const [loadingBuyingOrders, setLoadingBuyingOrders] = useState(false);
  const [sellingOrders, setSellingOrders] = useState<SellingOrder[]>([]);
  const [buyingOrders, setBuyingOrders] = useState<BuyingOrder[]>([]);
  const [tokenFilter, setTokenFilter] = useState<'ALL' | 'XOC' | 'MXNe' | 'USDC'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'active' | 'pending' | 'filled' | 'cancelled' | 'expired'>('active');
  const [isCancelling, setIsCancelling] = useState<string | null>(null);
  
  // Fetch orders on component mount and when filters change
  useEffect(() => {
    fetchOrders();
  }, [tokenFilter, statusFilter]);
  
  // Function to fetch orders from the backend
  const fetchOrders = async () => {
    // For now, use mock data
    setSellingOrders(getMockSellingOrders());
    setBuyingOrders(getMockBuyingOrders());
    
    // When the backend is ready, use this code instead:
    /*
    try {
      setLoadingSellingOrders(true);
      setLoadingBuyingOrders(true);
      
      const [sellOrders, buyOrders] = await Promise.all([
        getSellingOrders(tokenFilter, statusFilter),
        getBuyingOrders(tokenFilter, statusFilter)
      ]);
      
      setSellingOrders(sellOrders);
      setBuyingOrders(buyOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      addNotification(
        'Failed to fetch marketplace orders',
        NotificationType.ERROR,
        error instanceof Error ? error.message : 'Unknown error'
      );
    } finally {
      setLoadingSellingOrders(false);
      setLoadingBuyingOrders(false);
    }
    */
  };
  
  // Handle order cancellation
  const handleCancelOrder = async (orderId: string, type: 'sell' | 'buy') => {
    if (!isConnected) {
      addNotification('Please connect your wallet first', NotificationType.WARNING);
      return;
    }
    
    try {
      setIsCancelling(orderId);
      
      const result = type === 'sell' 
        ? await cancelSellingOrder(orderId)
        : await cancelBuyingOrder(orderId);
      
      addNotification(
        `Order ${orderId} cancelled successfully`,
        NotificationType.SUCCESS
      );
      
      // Refresh orders
      fetchOrders();
    } catch (error) {
      console.error(`Error cancelling ${type} order:`, error);
      addNotification(
        `Failed to cancel ${type} order`,
        NotificationType.ERROR,
        error instanceof Error ? error.message : 'Unknown error'
      );
    } finally {
      setIsCancelling(null);
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
  
  return (
    <div className="bg-mictlai-obsidian border-3 border-mictlai-gold shadow-pixel-lg overflow-hidden">
      <div className="p-4 bg-black border-b-3 border-mictlai-gold/70 flex justify-between items-center">
        <h2 className="text-lg font-bold font-pixel text-mictlai-gold">
          MARKETPLACE ORDERS
        </h2>
        
        <button 
          onClick={fetchOrders}
          className="p-1.5 border-2 border-mictlai-gold/70 hover:bg-mictlai-blood transition-colors shadow-pixel"
          title="Refresh orders"
        >
          {loadingSellingOrders || loadingBuyingOrders ? (
            <LoadingIcon className="w-4 h-4 text-mictlai-gold" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" className="w-4 h-4 text-mictlai-gold">
              <rect x="7" y="1" width="2" height="2" fill="currentColor" />
              <rect x="9" y="3" width="2" height="2" fill="currentColor" />
              <rect x="11" y="5" width="2" height="2" fill="currentColor" />
              <rect x="13" y="7" width="2" height="2" fill="currentColor" />
              <rect x="3" y="7" width="2" height="2" fill="currentColor" />
              <rect x="5" y="9" width="2" height="2" fill="currentColor" />
              <rect x="7" y="11" width="2" height="2" fill="currentColor" />
              <rect x="9" y="13" width="2" height="2" fill="currentColor" />
              <rect x="11" y="11" width="2" height="2" fill="currentColor" />
              <rect x="13" y="9" width="2" height="2" fill="currentColor" />
              <rect x="1" y="9" width="2" height="2" fill="currentColor" />
              <rect x="3" y="11" width="2" height="2" fill="currentColor" />
            </svg>
          )}
        </button>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b-3 border-mictlai-gold/50">
        <button 
          className={`flex-1 py-2 font-pixel text-sm ${
            activeTab === 'sell' 
            ? 'bg-mictlai-gold/20 text-mictlai-gold border-b-3 border-mictlai-gold' 
            : 'text-mictlai-bone/70 hover:bg-black/30'
          }`}
          onClick={() => setActiveTab('sell')}
        >
          SELLING ORDERS
        </button>
        <button 
          className={`flex-1 py-2 font-pixel text-sm ${
            activeTab === 'buy' 
            ? 'bg-mictlai-gold/20 text-mictlai-gold border-b-3 border-mictlai-gold' 
            : 'text-mictlai-bone/70 hover:bg-black/30'
          }`}
          onClick={() => setActiveTab('buy')}
        >
          BUYING ORDERS
        </button>
      </div>
      
      {/* Filters */}
      <div className="bg-black/40 p-3 border-b-3 border-mictlai-gold/30 flex flex-wrap items-center gap-4">
        {/* Token filter */}
        <div className="space-y-1">
          <label className="text-xs text-mictlai-bone/70 font-pixel">TOKEN</label>
          <select 
            value={tokenFilter}
            onChange={(e) => setTokenFilter(e.target.value as any)}
            className="bg-black border-2 border-mictlai-bone/30 text-mictlai-bone py-1 px-2 font-pixel text-sm focus:outline-none focus:border-mictlai-gold"
          >
            <option value="ALL">ALL TOKENS</option>
            <option value="XOC">XOC 🍫</option>
            <option value="MXNe">MXNe 🪙</option>
            <option value="USDC">USDC 💵</option>
          </select>
        </div>
        
        {/* Status filter */}
        <div className="space-y-1">
          <label className="text-xs text-mictlai-bone/70 font-pixel">STATUS</label>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-black border-2 border-mictlai-bone/30 text-mictlai-bone py-1 px-2 font-pixel text-sm focus:outline-none focus:border-mictlai-gold"
          >
            <option value="active">ACTIVE</option>
            <option value="pending">PENDING</option>
            <option value="filled">FILLED</option>
            <option value="cancelled">CANCELLED</option>
            <option value="expired">EXPIRED</option>
            <option value="ALL">ALL STATUSES</option>
          </select>
        </div>
      </div>
      
      {/* Content */}
      <div className="bg-mictlai-obsidian p-4">
        {activeTab === 'sell' ? (
          <div className="space-y-4">
            <h3 className="text-mictlai-gold font-pixel text-sm border-b border-mictlai-gold/30 pb-1">
              SELLING ORDERS ({sellingOrders.length})
            </h3>
            
            {loadingSellingOrders ? (
              <div className="flex justify-center py-8">
                <LoadingIcon className="w-8 h-8 text-mictlai-gold" />
              </div>
            ) : sellingOrders.length === 0 ? (
              <div className="text-center text-mictlai-bone/50 font-pixel py-8">
                NO SELLING ORDERS FOUND
              </div>
            ) : (
              <div className="space-y-3">
                {sellingOrders.map(order => (
                  <div 
                    key={order.orderId} 
                    className="border-3 border-mictlai-gold/30 shadow-pixel bg-black p-3"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl">{getTokenEmoji(order.token)}</span>
                          <span className="text-mictlai-gold font-pixel">{order.token}</span>
                          <span className="text-mictlai-bone font-pixel">{order.amount}</span>
                        </div>
                        <div className="text-mictlai-bone/70 font-pixel text-xs mb-1">
                          Seller: {formatAddress(order.seller, 6, 4)}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-pixel ${getStatusColorClass(order.status)}`}>
                            {formatStatus(order.status)}
                          </span>
                          <span className="text-mictlai-bone/50 font-pixel text-xs">
                            {formatTimeAgo(order.createdAt)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-mictlai-bone/70 font-pixel text-xs mb-1">
                          Expected MXN
                        </div>
                        <div className="text-mictlai-gold font-pixel font-bold">
                          💰 {order.mxnAmount || '---'}
                        </div>
                        
                        {/* Cancel button (only for active orders by the connected user) */}
                        {order.status === 'active' && isConnected && order.seller.toLowerCase() === connectedAddress?.toLowerCase() && (
                          <button
                            onClick={() => handleCancelOrder(order.orderId, 'sell')}
                            disabled={isCancelling === order.orderId}
                            className="mt-2 border-2 border-mictlai-blood text-mictlai-blood text-xs font-pixel py-1 px-2 hover:bg-mictlai-blood/20 transition-colors"
                          >
                            {isCancelling === order.orderId ? 'CANCELLING...' : 'CANCEL'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-mictlai-gold font-pixel text-sm border-b border-mictlai-gold/30 pb-1">
              BUYING ORDERS ({buyingOrders.length})
            </h3>
            
            {loadingBuyingOrders ? (
              <div className="flex justify-center py-8">
                <LoadingIcon className="w-8 h-8 text-mictlai-gold" />
              </div>
            ) : buyingOrders.length === 0 ? (
              <div className="text-center text-mictlai-bone/50 font-pixel py-8">
                NO BUYING ORDERS FOUND
              </div>
            ) : (
              <div className="space-y-3">
                {buyingOrders.map(order => (
                  <div 
                    key={order.orderId} 
                    className="border-3 border-mictlai-gold/30 shadow-pixel bg-black p-3"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl">{getTokenEmoji(order.token)}</span>
                          <span className="text-mictlai-gold font-pixel">{order.token}</span>
                          <span className="text-mictlai-bone font-pixel">{order.tokenAmount}</span>
                        </div>
                        <div className="text-mictlai-bone/70 font-pixel text-xs mb-1">
                          Buyer: {formatAddress(order.buyer, 6, 4)}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-pixel ${getStatusColorClass(order.status)}`}>
                            {formatStatus(order.status)}
                          </span>
                          <span className="text-mictlai-bone/50 font-pixel text-xs">
                            {formatTimeAgo(order.createdAt)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-mictlai-bone/70 font-pixel text-xs mb-1">
                          MXN Amount
                        </div>
                        <div className="text-mictlai-gold font-pixel font-bold">
                          💰 {order.mxnAmount}
                        </div>
                        <div className="text-mictlai-bone/50 font-pixel text-xs mt-1">
                          Ref: {order.referenceCode}
                        </div>
                        
                        {/* Cancel button (only for active orders by the connected user) */}
                        {order.status === 'active' && isConnected && order.buyer.toLowerCase() === connectedAddress?.toLowerCase() && (
                          <button
                            onClick={() => handleCancelOrder(order.orderId, 'buy')}
                            disabled={isCancelling === order.orderId}
                            className="mt-2 border-2 border-mictlai-blood text-mictlai-blood text-xs font-pixel py-1 px-2 hover:bg-mictlai-blood/20 transition-colors"
                          >
                            {isCancelling === order.orderId ? 'CANCELLING...' : 'CANCEL'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 