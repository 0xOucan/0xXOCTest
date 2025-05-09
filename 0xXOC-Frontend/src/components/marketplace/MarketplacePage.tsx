import React, { useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import CreateSellingOrder from './CreateSellingOrder';
import CreateBuyingOrder from './CreateBuyingOrder';
import OrdersDisplay from './OrdersDisplay';
import SellingOrderDetail from './SellingOrderDetail';
import BuyingOrderDetail from './BuyingOrderDetail';

export default function MarketplacePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'orders' | 'sell' | 'buy'>('orders');
  
  // Update the active tab based on current route
  React.useEffect(() => {
    if (location.pathname.includes('/selling-order/') || location.pathname.includes('/buying-order/')) {
      // Don't change the tab on detail pages
      return;
    }
    
    if (location.pathname.endsWith('/sell')) {
      setActiveTab('sell');
    } else if (location.pathname.endsWith('/buy')) {
      setActiveTab('buy');
    } else {
      setActiveTab('orders');
    }
  }, [location.pathname]);
  
  // Handle tab change
  const handleTabChange = (tab: 'orders' | 'sell' | 'buy') => {
    setActiveTab(tab);
    
    switch (tab) {
      case 'orders':
        navigate('/marketplace');
        break;
      case 'sell':
        navigate('/marketplace/sell');
        break;
      case 'buy':
        navigate('/marketplace/buy');
        break;
    }
  };
  
  // Check if we're on a detail page
  const isDetailPage = location.pathname.includes('/selling-order/') || location.pathname.includes('/buying-order/');
  
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold font-pixel text-mictlai-gold mb-6 text-center">
        TOKEN MARKETPLACE
      </h1>
      
      {/* Tab navigation - hide on detail pages */}
      {!isDetailPage && (
        <div className="flex justify-center mb-6">
          <div className="inline-flex border-3 border-mictlai-gold shadow-pixel">
            <button
              className={`px-4 py-2 font-pixel ${
                activeTab === 'orders' 
                  ? 'bg-mictlai-gold text-black'
                  : 'bg-black text-mictlai-gold hover:bg-mictlai-gold/20'
              }`}
              onClick={() => handleTabChange('orders')}
            >
              VIEW ORDERS
            </button>
            <button
              className={`px-4 py-2 font-pixel ${
                activeTab === 'sell' 
                  ? 'bg-mictlai-gold text-black'
                  : 'bg-black text-mictlai-gold hover:bg-mictlai-gold/20'
              }`}
              onClick={() => handleTabChange('sell')}
            >
              SELL TOKENS
            </button>
            <button
              className={`px-4 py-2 font-pixel ${
                activeTab === 'buy' 
                  ? 'bg-mictlai-gold text-black'
                  : 'bg-black text-mictlai-gold hover:bg-mictlai-gold/20'
              }`}
              onClick={() => handleTabChange('buy')}
            >
              BUY TOKENS
            </button>
          </div>
        </div>
      )}
      
      {/* Content with routes */}
      <div className="max-w-4xl mx-auto">
        <Routes>
          <Route path="/" element={<OrdersDisplay />} />
          <Route path="/sell" element={<CreateSellingOrder />} />
          <Route path="/buy" element={<CreateBuyingOrder />} />
          <Route path="/selling-order/:orderId" element={<SellingOrderDetail />} />
          <Route path="/buying-order/:orderId" element={<BuyingOrderDetail />} />
        </Routes>
      </div>
    </div>
  );
} 