import React, { useState } from 'react';
import { useWallet } from '../../providers/WalletContext';
import { createSellingOrder, CreateSellingOrderParams } from '../../services/marketplaceService';
import { LoadingIcon } from '../Icons';
import { useNotification, NotificationType } from '../../utils/notification';

export default function CreateSellingOrder() {
  const { connectedAddress, isConnected } = useWallet();
  const { addNotification } = useNotification();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<CreateSellingOrderParams>({
    token: 'XOC',
    amount: '',
    mxnAmount: '',
    memo: ''
  });
  
  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected) {
      addNotification('Please connect your wallet first', NotificationType.WARNING);
      return;
    }
    
    if (!formData.token || !formData.amount) {
      addNotification('Please fill in all required fields', NotificationType.WARNING);
      return;
    }
    
    if (!formData.mxnAmount) {
      addNotification('Please enter the MXN amount you expect to receive', NotificationType.WARNING);
      return;
    }
    
    try {
      setIsSubmitting(true);
      setResponse(null);
      
      // Show a notification to check wallet
      addNotification(
        'Please check your wallet to approve the transaction',
        NotificationType.INFO,
        'Your wallet will ask you to approve sending tokens to the escrow wallet'
      );
      
      // Log information about the transaction
      console.log('Creating selling order:', {
        token: formData.token,
        amount: formData.amount,
        mxnAmount: formData.mxnAmount
      });
      
      const result = await createSellingOrder(formData);
      
      setResponse(result);
      addNotification('Selling order created successfully', NotificationType.SUCCESS);
      
      // Wait a moment to ensure transaction monitoring picks up the pending transaction
      setTimeout(() => {
        // Tell the user to confirm in their wallet if the response indicates transaction is pending
        if (result.includes('PENDING') || result.includes('pending')) {
          addNotification(
            'Your wallet should prompt you to confirm the transaction',
            NotificationType.INFO,
            'Please check your browser wallet extension'
          );
        }
      }, 500);
      
      // Reset form after successful submission
      setFormData({
        token: 'XOC',
        amount: '',
        mxnAmount: '',
        memo: ''
      });
    } catch (error) {
      console.error('Error creating selling order:', error);
      addNotification(
        'Failed to create selling order',
        NotificationType.ERROR,
        error instanceof Error ? error.message : 'Unknown error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="bg-light-surface dark:bg-dark-surface border-3 border-base-blue shadow-pixel-lg overflow-hidden">
      <div className="p-4 bg-light-card dark:bg-dark-card border-b-3 border-base-blue/70 flex justify-between items-center">
        <h2 className="text-lg font-bold font-pixel text-base-blue dark:text-base-blue-light">
          SELL TOKENS
        </h2>
      </div>
      
      <div className="p-4">
        {!isConnected ? (
          <div className="text-center text-light-secondary dark:text-dark-secondary font-pixel py-4">
            CONNECT YOUR WALLET TO CREATE SELLING ORDERS
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Token selection */}
            <div className="space-y-2">
              <label className="block text-light-text dark:text-dark-text font-pixel text-sm">
                TOKEN TO SELL
              </label>
              <div className="grid grid-cols-3 gap-2">
                <div className={`
                  border-3 p-3 ${formData.token === 'XOC' 
                    ? 'border-base-blue bg-base-blue/20' 
                    : 'border-light-border dark:border-dark-border hover:border-base-blue/50'} 
                  cursor-pointer flex items-center justify-center shadow-pixel
                `}
                  onClick={() => setFormData(prev => ({ ...prev, token: 'XOC' }))}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-1">🍫</div>
                    <div className="font-pixel text-light-text dark:text-dark-text text-sm">XOC</div>
                  </div>
                </div>
                
                <div className={`
                  border-3 p-3 ${formData.token === 'MXNe' 
                    ? 'border-base-blue bg-base-blue/20' 
                    : 'border-light-border dark:border-dark-border hover:border-base-blue/50'} 
                  cursor-pointer flex items-center justify-center shadow-pixel
                `}
                  onClick={() => setFormData(prev => ({ ...prev, token: 'MXNe' }))}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-1">🪙</div>
                    <div className="font-pixel text-light-text dark:text-dark-text text-sm">MXNe</div>
                  </div>
                </div>
                
                <div className={`
                  border-3 p-3 ${formData.token === 'USDC' 
                    ? 'border-base-blue bg-base-blue/20' 
                    : 'border-light-border dark:border-dark-border hover:border-base-blue/50'} 
                  cursor-pointer flex items-center justify-center shadow-pixel
                `}
                  onClick={() => setFormData(prev => ({ ...prev, token: 'USDC' }))}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-1">💵</div>
                    <div className="font-pixel text-light-text dark:text-dark-text text-sm">USDC</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Token amount */}
            <div className="space-y-2">
              <label htmlFor="amount" className="block text-light-text dark:text-dark-text font-pixel text-sm">
                TOKEN AMOUNT
              </label>
              <div className="border-3 border-light-border dark:border-dark-border focus-within:border-base-blue/70 shadow-pixel bg-light-card dark:bg-dark-card">
                <input
                  type="text"
                  id="amount"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="100.00"
                  className="w-full p-3 bg-transparent text-light-text dark:text-dark-text font-pixel focus:outline-none"
                />
              </div>
            </div>
            
            {/* Expected MXN amount */}
            <div className="space-y-2">
              <label htmlFor="mxnAmount" className="block text-light-text dark:text-dark-text font-pixel text-sm">
                EXPECTED MXN AMOUNT 💰
              </label>
              <div className="border-3 border-light-border dark:border-dark-border focus-within:border-base-blue/70 shadow-pixel bg-light-card dark:bg-dark-card">
                <input
                  type="text"
                  id="mxnAmount"
                  name="mxnAmount"
                  value={formData.mxnAmount}
                  onChange={handleChange}
                  placeholder="2000.00"
                  className="w-full p-3 bg-transparent text-light-text dark:text-dark-text font-pixel focus:outline-none"
                />
              </div>
              <p className="text-light-secondary dark:text-dark-secondary font-pixel text-xs">
                AMOUNT OF MXN YOU EXPECT TO RECEIVE FOR YOUR TOKENS
              </p>
            </div>
            
            {/* Memo (optional) */}
            <div className="space-y-2">
              <label htmlFor="memo" className="block text-light-text dark:text-dark-text font-pixel text-sm">
                MEMO (OPTIONAL)
              </label>
              <div className="border-3 border-light-border dark:border-dark-border focus-within:border-base-blue/70 shadow-pixel bg-light-card dark:bg-dark-card">
                <textarea
                  id="memo"
                  name="memo"
                  value={formData.memo}
                  onChange={handleChange}
                  placeholder="Additional information for this order"
                  rows={3}
                  className="w-full p-3 bg-transparent text-light-text dark:text-dark-text font-pixel focus:outline-none"
                />
              </div>
            </div>
            
            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting || !formData.token || !formData.amount || !formData.mxnAmount}
              className="w-full border-3 border-base-blue py-3 font-pixel text-base-blue dark:text-base-blue-light hover:bg-base-blue/20 focus:bg-base-blue/30 shadow-pixel disabled:border-light-border dark:disabled:border-dark-border disabled:text-light-secondary dark:disabled:text-dark-secondary disabled:hover:bg-transparent transition-all"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <LoadingIcon className="animate-spin h-5 w-5 mr-2" />
                  <span>CREATING ORDER...</span>
                </div>
              ) : (
                'CREATE SELLING ORDER'
              )}
            </button>
          </form>
        )}
        
        {/* Response display */}
        {response && (
          <div className="mt-4 border-3 border-base-blue/50 p-3 shadow-pixel bg-light-card dark:bg-dark-card">
            <h3 className="text-base-blue dark:text-base-blue-light font-pixel text-sm mb-2">RESPONSE:</h3>
            <div className="text-light-text dark:text-dark-text/80 font-pixel text-xs overflow-auto max-h-32">
              {response}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 