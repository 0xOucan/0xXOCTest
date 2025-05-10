import React, { useEffect, useState, useCallback } from 'react';
import { useWallet } from '../providers/WalletContext';
import { useWallets } from '@privy-io/react-auth';
import { TransactionStatus } from '../constants/network';
import { 
  getPendingTransactions, 
  processPendingTransactions, 
  createPrivyWalletClient,
  updateTransactionStatus,
  PendingTransaction,
  switchToCeloChain,
  switchToChain,
  executeTransaction,
  getTransactionDetails,
  updateTransactionHash
} from '../services/transactionService';
import { useNotification, NotificationType } from '../utils/notification';
import { LoadingIcon } from './Icons';
import { formatAddress } from '../utils/formatting';
import { activateSellingOrder } from '../services/marketplaceService';

// Define the ExtendedTransaction type that extends PendingTransaction
// No need for a separate type as PendingTransaction already has all the fields we need
// We'll just use PendingTransaction directly

// Polling interval for checking pending transactions
const POLL_INTERVAL = 3000; // 3 seconds
// How long to keep completed transactions visible (5 minutes)
const KEEP_COMPLETED_FOR_MS = 5 * 60 * 1000;

export default function TransactionMonitor() {
  const { connectedAddress, isConnected } = useWallet();
  const { wallets } = useWallets();
  const [pendingTransactions, setPendingTransactions] = useState<PendingTransaction[]>([]);
  const [completedTransactions, setCompletedTransactions] = useState<PendingTransaction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastProcessed, setLastProcessed] = useState<Date | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [forceVisible, setForceVisible] = useState(false);
  const { addNotification } = useNotification();
  const [processingTx, setProcessingTx] = useState<string | null>(null);

  // Helper to get the primary wallet
  const getPrimaryWallet = () => {
    if (!wallets || wallets.length === 0) return null;
    return wallets[0];
  };

  // Format transaction hash for display
  const formatTxHash = (hash: string | undefined): string => {
    if (!hash) return 'Pending...';
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  // Get blockchain explorer link for a transaction
  const getExplorerLink = (tx: PendingTransaction): string => {
    if (!tx.hash) return '#';
    
    // Determine which explorer to use based on chain
    const chain = tx.metadata?.chain || 'celo';
    
    switch(chain) {
      case 'base':
        return `https://basescan.org/tx/${tx.hash}`;
      case 'arbitrum':
        return `https://arbiscan.io/tx/${tx.hash}`;
      case 'mantle':
        return `https://explorer.mantle.xyz/tx/${tx.hash}`;
      case 'zksync':
        return `https://explorer.zksync.io/tx/${tx.hash}`;
      case 'celo':
      default:
        return `https://celoscan.io/tx/${tx.hash}`;
    }
  };

  // Get explorer name based on chain
  const getExplorerName = (tx: PendingTransaction): string => {
    const chain = tx.metadata?.chain || 'celo';
    
    switch(chain) {
      case 'base':
        return 'Basescan';
      case 'arbitrum':
        return 'Arbiscan';
      case 'mantle':
        return 'Mantle Explorer';
      case 'zksync':
        return 'zkSync Explorer';
      case 'celo':
      default:
        return 'Celoscan';
    }
  };

  // Switch to the correct network based on the transaction's chain
  const ensureCorrectNetwork = async (transaction?: PendingTransaction) => {
    if (!isConnected) return;
    
    try {
      setNetworkError(null);
      const wallet = getPrimaryWallet();
      if (!wallet) return;
      
      // Determine which chain to use
      let targetChain: 'celo' | 'base' | 'arbitrum' | 'mantle' | 'zksync' = 'celo'; // Default to Celo
      
      if (transaction?.metadata?.chain) {
        // Use the chain from transaction metadata if available
        targetChain = transaction.metadata.chain as 'celo' | 'base' | 'arbitrum' | 'mantle' | 'zksync';
      }
      
      try {
        const provider = await wallet.getEthereumProvider();
        if (provider) {
          await switchToChain(provider, targetChain);
          console.log(`Network verified for ${targetChain.toUpperCase()} transactions`);
        } else {
          console.warn('Could not get provider to switch networks');
        }
      } catch (error) {
        console.error(`Error switching to ${targetChain} network:`, error);
        const errMsg = error instanceof Error ? error.message : 'Unknown error switching networks';
        setNetworkError(`Network Error: ${errMsg}`);
      }
    } catch (error) {
      console.error('Error in ensureCorrectNetwork:', error);
    }
  };

  // Fetch pending transactions from the backend
  const fetchPendingTransactions = async () => {
    if (!isConnected) return;
    
    try {
      const transactions = await getPendingTransactions();
      console.log('Fetched transactions:', transactions);
      
      // If new transactions arrived, show a notification
      if (transactions.length > pendingTransactions.length) {
        console.log(`New transactions detected: ${transactions.length - pendingTransactions.length}`);
        // Force the UI to be visible when new transactions arrive
        setForceVisible(true);
        setIsMinimized(false);
        
        // Try to switch to the right network for the newest transaction
        if (transactions.length > 0) {
          const newestTransaction = transactions[transactions.length - 1];
          // Log transaction metadata for debugging
          console.log('New transaction details:', {
            id: newestTransaction.id,
            to: newestTransaction.to,
            dataType: newestTransaction.metadata?.dataType,
            dataSize: newestTransaction.metadata?.dataSize,
            chain: newestTransaction.metadata?.chain || 'unknown'
          });
          
          // Check if this might be a token selling order transaction
          if (newestTransaction.metadata?.dataType === 'contract-call' && 
              newestTransaction.data && 
              newestTransaction.data.startsWith('0xa9059cbb')) {
            console.log('🔶 Detected potential token transfer transaction for selling order');
          }
          
          ensureCorrectNetwork(newestTransaction);
        }
      }
      
      // Process and categorize transactions
      const currentTime = Date.now();
      const pendingTxs: PendingTransaction[] = [];
      const completedTxs: PendingTransaction[] = [];
        
      // Sort transactions into pending and completed
      transactions.forEach(tx => {
        if (tx.status === 'pending' || tx.status === 'submitted') {
          pendingTxs.push(tx);
        } else if (tx.status === 'confirmed' || tx.status === 'failed' || tx.status === 'rejected') {
          // Ensure the timestamp is properly set
          tx.timestamp = tx.timestamp || currentTime;
          
          // Preserve the postedToMarketplace flag if it was previously set
          const existingTx = pendingTransactions.find(t => t.id === tx.id) || 
                            completedTransactions.find(t => t.id === tx.id);
          
          if (existingTx && existingTx.metadata?.postedToMarketplace && tx.metadata) {
            tx.metadata.postedToMarketplace = true;
          }
          
          completedTxs.push(tx);
        }
      });
      
      // Update completed transactions state
        setCompletedTransactions(prev => {
          // Filter out expired completed transactions (older than KEEP_COMPLETED_FOR_MS)
          const filteredPrev = prev.filter(tx => 
            currentTime - (tx.timestamp || 0) < KEEP_COMPLETED_FOR_MS
          );
          
        // Merge with new completed transactions, avoiding duplicates
        const existingIds = new Set(filteredPrev.map(tx => tx.id));
        const newCompletedTxs = completedTxs.filter(tx => !existingIds.has(tx.id));
        
          return [...filteredPrev, ...newCompletedTxs];
        });
      
      // Update pending transactions state
      setPendingTransactions(pendingTxs);

      // Log current state of transactions for debugging
      console.log('Current pending transactions:', pendingTxs.length);
      console.log('Current completed transactions:', completedTxs.length);
    } catch (error) {
      console.error('Error fetching pending transactions:', error);
    }
  };

  // Process pending transactions with the wallet
  const processTransactions = async () => {
    if (!isConnected || isProcessing) return;
    
    try {
      setIsProcessing(true);
      const wallet = getPrimaryWallet();
      
      if (!wallet) {
        console.warn('No wallet available for transaction processing');
        return;
      }
      
      console.log('👛 Creating wallet client for connected wallet:', connectedAddress);
      
      try {
        // Get provider to check current chain before creating wallet client
        const provider = await wallet.getEthereumProvider();
        if (provider) {
          const chainId = await provider.request({ method: 'eth_chainId' });
          console.log('Wallet currently on chain ID:', chainId);
        }
      } catch (e) {
        console.error('Error checking current chain:', e);
      }
      
      const walletClient = await createPrivyWalletClient(wallet);
      
      if (!walletClient) {
        console.error('Failed to create wallet client');
        return;
      }
      
      console.log('🚀 Wallet client created successfully, processing pending transactions...');
      
      try {
        // Get pending transactions
        const pendingTxs = await getPendingTransactions();
        console.log('Pending transactions to process:', pendingTxs.length);
        
        if (pendingTxs.length === 0) {
          console.log('No pending transactions to process');
          return;
        }
        
        // Process only one transaction at a time to ensure proper wallet interaction
        for (const tx of pendingTxs) {
          if (tx.status === 'pending') {
            console.log(`Processing transaction ${tx.id} targeting chain ${tx.metadata?.chain || 'unknown'}`);
            console.log(`Transaction details: to=${tx.to}, value=${tx.value}, data=${tx.data ? tx.data.substring(0, 20) + '...' : 'none'}`);
            
            // Ensure we're on the right network for this transaction
            await ensureCorrectNetwork(tx);
            
            // Execute this specific transaction
            try {
              const hash = await executeTransaction(tx, walletClient);
              console.log(`✅ Transaction executed with hash: ${hash}`);
              // Only process one transaction, then break
              break;
            } catch (txError) {
              console.error(`Failed to execute transaction ${tx.id}:`, txError);
              // Continue to next transaction if this one fails
              continue;
            }
          }
        }
        
        setLastProcessed(new Date());
      } catch (error) {
        console.error('Error processing transactions:', error);
        const errMsg = error instanceof Error ? error.message : 'Unknown error processing transactions';
        
        // Handle network-related errors
        if (errMsg.includes('network') || errMsg.includes('chain')) {
          setNetworkError(`Network Error: ${errMsg}`);
        }
      }
    } catch (error) {
      console.error('Error in transaction processing:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Polling for pending transactions
  useEffect(() => {
    if (!isConnected) return;
    
    // Initial check
    fetchPendingTransactions();
    
    // Set up polling
    const intervalId = setInterval(fetchPendingTransactions, POLL_INTERVAL);
    
    // Clean up on unmount
    return () => clearInterval(intervalId);
  }, [isConnected, connectedAddress]);
  
  // Process transactions when they arrive
  useEffect(() => {
    if (pendingTransactions.length > 0 && !isProcessing) {
      processTransactions();
    }
  }, [pendingTransactions, isProcessing]);

  // Clean up completed transactions periodically
  useEffect(() => {
    const cleanup = () => {
      const currentTime = Date.now();
      setCompletedTransactions(prev => 
        prev.filter(tx => {
          // Ensure timestamp exists, default to current time if missing
          const txTime = tx.timestamp || currentTime;
          return currentTime - txTime < KEEP_COMPLETED_FOR_MS;
        })
      );
    };
    
    const intervalId = setInterval(cleanup, 60000); // Check every minute
    
    return () => clearInterval(intervalId);
  }, []);

  // Reset force visibility after some time
  useEffect(() => {
    if (forceVisible) {
      const timer = setTimeout(() => {
        setForceVisible(false);
      }, 10000); // Reset after 10 seconds
      return () => clearTimeout(timer);
    }
  }, [forceVisible]);

  // Add a rendering function for the UI part of the component
  const renderTransactionMonitor = () => {
    // Don't render if no wallet is connected
    if (!isConnected) return null;
    
    // Only show when there are pending/completed transactions or when forced visible
    const shouldShow = pendingTransactions.length > 0 || 
                       (completedTransactions.length > 0 && 
                        Date.now() - (lastProcessed?.getTime() || 0) < KEEP_COMPLETED_FOR_MS) ||
                       forceVisible;
    
    if (!shouldShow) return null;

    return (
      <div className="fixed bottom-16 right-4 z-50 max-w-lg" style={{ maxHeight: 'calc(100vh - 300px)' }}>
        <div className="bg-mictlai-obsidian border-3 border-mictlai-gold shadow-pixel-lg pixel-panel w-96">
          <div className="p-3 bg-black border-b-3 border-mictlai-gold/70 flex justify-between items-center">
            <h3 className="text-sm font-pixel text-mictlai-gold flex items-center space-x-2">
              <span className="mr-2">📡</span>
              <span>TRANSACTION MONITOR</span>
              {isProcessing && (
                <svg className="animate-spin ml-2 h-4 w-4 text-mictlai-turquoise" viewBox="0 0 24 24">
                  <circle 
                    className="opacity-25" 
                    cx="12" 
                    cy="12" 
                    r="10" 
                    stroke="currentColor" 
                    strokeWidth="4"
                  ></circle>
                  <path 
                    className="opacity-75" 
                    fill="currentColor" 
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              )}
            </h3>
            
            <div className="flex space-x-1">
              <button 
                onClick={() => {
                  setIsMinimized(!isMinimized);
                  setForceVisible(false);
                }}
                className="px-2 py-1 border border-mictlai-gold/50 text-mictlai-gold hover:bg-mictlai-gold/20"
              >
                {isMinimized ? '+' : '-'}
              </button>
            </div>
          </div>
          
          {!isMinimized && (
            <div className="max-h-80 overflow-y-auto">
              {networkError && (
                <div className="p-3 border-b border-mictlai-blood bg-black text-mictlai-blood font-pixel text-xs">
                  <strong>NETWORK ERROR:</strong> {networkError}
                  <button 
                    onClick={() => ensureCorrectNetwork()}
                    className="ml-2 px-2 py-0.5 border border-mictlai-blood hover:bg-mictlai-blood/20 text-xs"
                  >
                    RETRY
                  </button>
                </div>
              )}
              
              {pendingTransactions.length > 0 && (
                <div className="p-3 border-b-3 border-mictlai-gold/30">
                  <h4 className="font-pixel text-mictlai-turquoise text-xs mb-2">PENDING TRANSACTIONS</h4>
                  <div className="space-y-2">
                    {pendingTransactions.map((tx) => (
                      <div key={tx.id} className="border-3 border-mictlai-gold/30 p-2 shadow-pixel bg-black">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-pixel text-mictlai-gold text-xs">
                            {(tx.metadata as any)?.description || tx.metadata?.dataType || 'Transaction'}
                          </span>
                          <div className="flex items-center">
                            <span 
                              className={`inline-block h-2 w-2 ${
                                tx.status === 'submitted' ? 'bg-mictlai-turquoise' : 'bg-mictlai-gold'
                              } mr-1 animate-pulse`}
                            ></span>
                            <span className="text-mictlai-bone/70 text-xs font-pixel">
                              {tx.status === 'pending' ? 'PENDING' : 'SUBMITTED'}
                            </span>
                          </div>
                        </div>
                        <div className="text-mictlai-bone/60 text-xs font-pixel">
                          {tx.to ? `TO: ${tx.to.substring(0, 10)}...` : ''}
                          {tx.value ? ` | VALUE: ${tx.value}` : ''}
                        </div>
                        <div className="flex justify-between items-center mt-1 text-xs font-pixel">
                          <span className="text-mictlai-bone/60">
                            {tx.metadata?.chain ? `CHAIN: ${tx.metadata.chain.toUpperCase()}` : ''}
                          </span>
                          {tx.hash && (
                            <a 
                              href={getExplorerLink(tx)} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-mictlai-turquoise hover:text-mictlai-gold"
                            >
                              TX: {formatTxHash(tx.hash)}
                            </a>
                          )}
                        </div>
                        {/* Additional actions based on transaction type */}
                        {tx.status === 'confirmed' && 
                         tx.metadata?.orderId && 
                         !tx.metadata?.postedToMarketplace && (
                          <div className="mt-3">
                            <button
                              onClick={() => handlePostToMarketplace(tx)}
                              disabled={processingTx === tx.id}
                              className="w-full bg-mictlai-gold text-black font-pixel text-xs py-1.5 px-3 hover:bg-mictlai-gold/80 transition-colors flex items-center justify-center gap-2"
                            >
                              {processingTx === tx.id ? (
                                <>
                                  <LoadingIcon className="w-3 h-3" />
                                  POSTING...
                                </>
                              ) : (
                                'POST TO MARKETPLACE'
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {completedTransactions.length > 0 && (
                <div className="p-3">
                  <h4 className="font-pixel text-mictlai-turquoise text-xs mb-2">COMPLETED TRANSACTIONS</h4>
                  <div className="space-y-2">
                    {completedTransactions.slice(0, 5).map((tx) => (
                      <div 
                        key={tx.id} 
                        className={`border-3 p-2 shadow-pixel bg-black ${
                          tx.status === 'confirmed' 
                            ? 'border-mictlai-turquoise/30' 
                            : tx.status === 'failed' 
                              ? 'border-mictlai-blood/30' 
                              : 'border-mictlai-bone/30'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-pixel text-mictlai-bone text-xs">
                            {(tx.metadata as any)?.description || tx.metadata?.dataType || 'Transaction'}
                          </span>
                          <div className="flex items-center">
                            <span 
                              className={`inline-block h-2 w-2 ${
                                tx.status === 'confirmed' 
                                  ? 'bg-mictlai-turquoise' 
                                  : tx.status === 'failed' 
                                    ? 'bg-mictlai-blood' 
                                    : 'bg-mictlai-bone'
                              } mr-1`}
                            ></span>
                            <span className={`text-xs font-pixel ${
                              tx.status === 'confirmed' 
                                ? 'text-mictlai-turquoise' 
                                : tx.status === 'failed' 
                                  ? 'text-mictlai-blood' 
                                  : 'text-mictlai-bone/70'
                            }`}>
                              {tx.status.toUpperCase()}
                            </span>
                          </div>
                        </div>
                        
                        {/* Transaction content */}
                        <div className="text-mictlai-bone/60 text-xs font-pixel">
                          {tx.to ? `TO: ${tx.to.substring(0, 10)}...` : ''}
                          {tx.value ? ` | VALUE: ${tx.value}` : ''}
                        </div>
                        
                        {/* Add Post to Marketplace button for completed transactions too */}
                        {tx.status === 'confirmed' && 
                         tx.metadata?.orderId && 
                         !tx.metadata?.postedToMarketplace && (
                          <div className="mt-2">
                            <button
                              onClick={() => handlePostToMarketplace(tx)}
                              disabled={processingTx === tx.id}
                              className="w-full bg-mictlai-gold text-black font-pixel text-xs py-1.5 px-3 hover:bg-mictlai-gold/80 transition-colors flex items-center justify-center gap-2"
                            >
                              {processingTx === tx.id ? (
                                <>
                                  <LoadingIcon className="w-3 h-3" />
                                  POSTING...
                                </>
                              ) : (
                                'POST TO MARKETPLACE'
                              )}
                            </button>
                          </div>
                        )}
                        
                        {tx.hash && (
                          <div className="mt-2 text-right">
                            <a 
                              href={getExplorerLink(tx)} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-mictlai-turquoise hover:text-mictlai-gold text-xs font-pixel hover:border-b hover:border-mictlai-gold"
                            >
                              VIEW ON {getExplorerName(tx)}
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                    {completedTransactions.length > 5 && (
                      <div className="text-center text-mictlai-bone/50 text-xs font-pixel">
                        +{completedTransactions.length - 5} MORE TRANSACTIONS
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const refreshTransaction = async (txId: string) => {
    // ... existing code ...
  };
  
  // Function to handle posting selling order to marketplace
  const handlePostToMarketplace = async (transaction: PendingTransaction) => {
    // Check if we have the required order ID
    if (!transaction.metadata?.orderId) {
      addNotification('Cannot post to marketplace: missing order ID', NotificationType.ERROR);
      return;
    }
    
    try {
      setProcessingTx(transaction.id);
      
      // Check if this is a confirmed transaction with a hash
      if (transaction.status === 'confirmed' && transaction.hash) {
        const orderId = transaction.metadata.orderId;
        
        // First update the transaction hash if needed
        await updateTransactionHash(transaction.id, transaction.hash);
        
        // Then activate the selling order with the transaction hash
        await activateSellingOrder(orderId, transaction.hash);
        
        // Show success notification
        addNotification(
          'Selling order posted to marketplace', 
          NotificationType.SUCCESS,
          `Order ${orderId} is now active and visible in the marketplace.`
        );
        
        // Check if this transaction is in pendingTransactions or completedTransactions
        const isPending = pendingTransactions.some(tx => tx.id === transaction.id);
        
        if (isPending) {
          // Update pending transactions to mark this one as posted
          const updatedTransactions = [...pendingTransactions];
          const txIndex = updatedTransactions.findIndex(tx => tx.id === transaction.id);
          
          if (txIndex !== -1 && updatedTransactions[txIndex].metadata) {
            // Create a safely updated transaction
            updatedTransactions[txIndex] = {
              ...updatedTransactions[txIndex],
              metadata: {
                ...(updatedTransactions[txIndex].metadata || {}),
                postedToMarketplace: true
              }
            };
            
            // Update state with the new array
            setPendingTransactions(updatedTransactions);
          }
        } else {
          // Update completed transactions to mark this one as posted
          const updatedCompletedTransactions = [...completedTransactions];
          const txIndex = updatedCompletedTransactions.findIndex(tx => tx.id === transaction.id);
          
          if (txIndex !== -1 && updatedCompletedTransactions[txIndex].metadata) {
            // Create a safely updated transaction
            updatedCompletedTransactions[txIndex] = {
              ...updatedCompletedTransactions[txIndex],
              metadata: {
                ...(updatedCompletedTransactions[txIndex].metadata || {}),
                postedToMarketplace: true
              }
            };
            
            // Update state with the new array
            setCompletedTransactions(updatedCompletedTransactions);
          }
        }
      }
    } catch (error) {
      console.error('Error posting to marketplace:', error);
      addNotification(
        'Failed to post order to marketplace', 
        NotificationType.ERROR,
        error instanceof Error ? error.message : 'Unknown error'
      );
    } finally {
      setProcessingTx(null);
    }
  };

  // Simply return the transaction monitor UI
  return renderTransactionMonitor();
} 