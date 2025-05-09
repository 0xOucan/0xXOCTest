import React, { useState } from 'react';
import CreateSellingOrder from './CreateSellingOrder';
import CreateBuyingOrder from './CreateBuyingOrder';
import OrdersDisplay from './OrdersDisplay';

export default function MarketplacePage() {
  const [activeTab, setActiveTab] = useState<'orders' | 'sell' | 'buy'>('orders');
  
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold font-pixel text-mictlai-gold mb-6 text-center">
        TOKEN MARKETPLACE
      </h1>
      
      {/* Tab navigation */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex border-3 border-mictlai-gold shadow-pixel">
          <button
            className={`px-4 py-2 font-pixel ${
              activeTab === 'orders' 
                ? 'bg-mictlai-gold text-black'
                : 'bg-black text-mictlai-gold hover:bg-mictlai-gold/20'
            }`}
            onClick={() => setActiveTab('orders')}
          >
            VIEW ORDERS
          </button>
          <button
            className={`px-4 py-2 font-pixel ${
              activeTab === 'sell' 
                ? 'bg-mictlai-gold text-black'
                : 'bg-black text-mictlai-gold hover:bg-mictlai-gold/20'
            }`}
            onClick={() => setActiveTab('sell')}
          >
            SELL TOKENS
          </button>
          <button
            className={`px-4 py-2 font-pixel ${
              activeTab === 'buy' 
                ? 'bg-mictlai-gold text-black'
                : 'bg-black text-mictlai-gold hover:bg-mictlai-gold/20'
            }`}
            onClick={() => setActiveTab('buy')}
          >
            BUY TOKENS
          </button>
        </div>
      </div>
      
      {/* Tab content */}
      <div className="max-w-4xl mx-auto">
        {activeTab === 'orders' && (
          <OrdersDisplay />
        )}
        
        {activeTab === 'sell' && (
          <CreateSellingOrder />
        )}
        
        {activeTab === 'buy' && (
          <CreateBuyingOrder />
        )}
      </div>
    </div>
  );
} 