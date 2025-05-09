import { apiUrl } from '../config';
import { createPublicClient, http, createWalletClient, custom } from 'viem';
import { celo } from 'viem/chains';
import { base, arbitrum, mantle, zkSync } from "viem/chains";
import { 
  CELO_CHAIN_HEX, 
  CELO_NETWORK_PARAMS,
  TransactionStatus,
  NetworkErrorType 
} from '../constants/network';
import { formatWeiToEther } from '../utils/formatting';

// Transaction interface matching backend pendingTransactions
export interface PendingTransaction {
  id: string;
  to: string;
  value: string;
  data?: string;
  status: string;
  timestamp: number;
  hash?: string;
  type?: string; // Add type field to identify transaction type
  metadata?: {
    source: string;
    walletAddress: string;
    requiresSignature: boolean;
    dataSize: number;
    dataType: string;
    chain?: 'celo' | 'base' | 'arbitrum' | 'mantle' | 'zksync';
    orderId?: string; // Add orderId for token selling orders
    postedToMarketplace?: boolean; // Track if the order has been posted to marketplace
    [key: string]: any; // Allow additional metadata properties
  };
}

// Custom error class for better error handling
export class TransactionError extends Error {
  type: string;
  details?: string;
  transaction?: PendingTransaction;

  constructor(message: string, type: string, details?: string, transaction?: PendingTransaction) {
    super(message);
    this.name = 'TransactionError';
    this.type = type;
    this.details = details;
    this.transaction = transaction;
  }
}

// Add Base and Arbitrum chain constants
export const BASE_CHAIN_ID = 8453;
export const BASE_CHAIN_HEX = `0x${BASE_CHAIN_ID.toString(16)}`;
export const ARBITRUM_CHAIN_ID = 42161;
export const ARBITRUM_CHAIN_HEX = `0x${ARBITRUM_CHAIN_ID.toString(16)}`;

// Mantle chain constants
export const MANTLE_CHAIN_ID = 5000;
export const MANTLE_CHAIN_HEX = `0x${MANTLE_CHAIN_ID.toString(16)}`;

// Add zkSync Era chain constants
export const ZKSYNC_CHAIN_ID = 324;
export const ZKSYNC_CHAIN_HEX = `0x${ZKSYNC_CHAIN_ID.toString(16)}`;

// Base RPC URLs in priority order
export const BASE_RPC_URLS = [
  'https://mainnet.base.org',
  'https://base-mainnet.public.blastapi.io',
  'https://base.meowrpc.com'
];

// Arbitrum RPC URLs in priority order
export const ARBITRUM_RPC_URLS = [
  'https://arb1.arbitrum.io/rpc',
  'https://arbitrum-one.public.blastapi.io',
  'https://arbitrum.meowrpc.com'
];

// Mantle RPC URLs in priority order
export const MANTLE_RPC_URLS = [
  'https://rpc.mantle.xyz',
  'https://mantle-mainnet.public.blastapi.io',
  'https://mantle.publicnode.com'
];

// zkSync Era RPC URLs in priority order
export const ZKSYNC_RPC_URLS = [
  'https://mainnet.era.zksync.io',
  'https://zksync-era.blockpi.network/v1/rpc/public',
  'https://zksync.meowrpc.com'
];

// Network parameters for wallet addition
export const BASE_NETWORK_PARAMS = {
  chainId: BASE_CHAIN_HEX,
  chainName: 'Base Mainnet',
  nativeCurrency: {
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18
  },
  rpcUrls: BASE_RPC_URLS,
  blockExplorerUrls: ['https://basescan.org/']
};

// Network parameters for wallet addition
export const ARBITRUM_NETWORK_PARAMS = {
  chainId: ARBITRUM_CHAIN_HEX,
  chainName: 'Arbitrum One',
  nativeCurrency: {
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18
  },
  rpcUrls: ARBITRUM_RPC_URLS,
  blockExplorerUrls: ['https://arbiscan.io/']
};

// Network parameters for wallet addition
export const MANTLE_NETWORK_PARAMS = {
  chainId: MANTLE_CHAIN_HEX,
  chainName: 'Mantle Mainnet',
  nativeCurrency: {
    name: 'MNT',
    symbol: 'MNT',
    decimals: 18
  },
  rpcUrls: MANTLE_RPC_URLS,
  blockExplorerUrls: ['https://explorer.mantle.xyz/']
};

// Network parameters for zkSync Era
export const ZKSYNC_NETWORK_PARAMS = {
  chainId: ZKSYNC_CHAIN_HEX,
  chainName: 'zkSync Era Mainnet',
  nativeCurrency: {
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18
  },
  rpcUrls: ZKSYNC_RPC_URLS,
  blockExplorerUrls: ['https://explorer.zksync.io/']
};

/**
 * Fetch pending transactions from the backend
 */
export const getPendingTransactions = async (): Promise<PendingTransaction[]> => {
  try {
    const response = await fetch(`${apiUrl}/api/transactions/pending`);
    
    if (!response.ok) {
      throw new TransactionError(
        `Failed to fetch pending transactions: ${response.statusText}`,
        'fetch_error',
        `Status: ${response.status}`
      );
    }
    
    const data = await response.json();
    return data.transactions || [];
  } catch (error) {
    if (error instanceof TransactionError) {
      throw error;
    }
    
    console.error('Error fetching pending transactions:', error);
    throw new TransactionError(
      'Failed to fetch pending transactions',
      'fetch_error',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
};

/**
 * Update transaction status on the backend
 */
export const updateTransactionStatus = async (
  txId: string, 
  status: TransactionStatus, 
  hash?: string
): Promise<PendingTransaction | null> => {
  try {
    const response = await fetch(`${apiUrl}/api/transactions/${txId}/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status, hash })
    });
    
    if (!response.ok) {
      throw new TransactionError(
        `Failed to update transaction: ${response.statusText}`,
        'update_error',
        `Status: ${response.status}`
      );
    }
    
    const data = await response.json();
    return data.transaction || null;
  } catch (error) {
    if (error instanceof TransactionError) {
      throw error;
    }
    
    console.error(`Error updating transaction ${txId}:`, error);
    throw new TransactionError(
      'Failed to update transaction status',
      'update_error',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
};

/**
 * Update transaction hash on the backend
 */
export const updateTransactionHash = async (
  txId: string, 
  hash: string
): Promise<PendingTransaction | null> => {
  try {
    const response = await fetch(`${apiUrl}/api/transactions/${txId}/hash`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ hash })
    });
    
    if (!response.ok) {
      throw new TransactionError(
        `Failed to update transaction hash: ${response.statusText}`,
        'update_error',
        `Status: ${response.status}`
      );
    }
    
    const data = await response.json();
    return data.transaction || null;
  } catch (error) {
    if (error instanceof TransactionError) {
      throw error;
    }
    
    console.error(`Error updating transaction hash for ${txId}:`, error);
    throw new TransactionError(
      'Failed to update transaction hash',
      'update_error',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
};

/**
 * Switch to a specific chain based on the chain parameter
 */
export const switchToChain = async (provider: any, chain: 'celo' | 'base' | 'arbitrum' | 'mantle' | 'zksync'): Promise<boolean> => {
  try {
    // Get current chain ID
    const currentChainId = await provider.request({ method: 'eth_chainId' });
    
    let targetChainHex: string;
    let targetChainName: string;
    let networkParams: any;
    
    // Determine target chain parameters
    switch (chain) {
      case 'base':
        targetChainHex = BASE_CHAIN_HEX;
        targetChainName = 'Base';
        networkParams = BASE_NETWORK_PARAMS;
        break;
      case 'arbitrum':
        targetChainHex = ARBITRUM_CHAIN_HEX;
        targetChainName = 'Arbitrum';
        networkParams = ARBITRUM_NETWORK_PARAMS;
        break;
      case 'mantle':
        targetChainHex = MANTLE_CHAIN_HEX;
        targetChainName = 'Mantle';
        networkParams = MANTLE_NETWORK_PARAMS;
        break;
      case 'zksync':
        targetChainHex = ZKSYNC_CHAIN_HEX;
        targetChainName = 'zkSync Era';
        networkParams = ZKSYNC_NETWORK_PARAMS;
        break;
      case 'celo':
      default:
        targetChainHex = CELO_CHAIN_HEX;
        targetChainName = 'Celo';
        networkParams = CELO_NETWORK_PARAMS;
    }
    
    console.log(`Need to switch chains from ${currentChainId} to ${targetChainName} (${targetChainHex})`);
    
    // Try to switch to target chain
    try {
      // First try the standard wallet_switchEthereumChain method
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: targetChainHex }]
      });
      console.log(`Successfully switched to ${targetChainName} chain`);
      return true;
    } catch (switchError: any) {
      // Chain doesn't exist yet in wallet
      if (switchError.code === 4902 || 
          (switchError.message && switchError.message.includes('chain hasn\'t been added'))) {
        try {
          // Try to add the chain to the wallet
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [networkParams]
          });
          console.log(`Successfully added and switched to ${targetChainName} chain`);
          return true;
        } catch (addError) {
          console.error(`Failed to add ${targetChainName} chain to wallet:`, addError);
          throw new TransactionError(
            `Failed to add ${targetChainName} network to wallet. Please add it manually.`,
            NetworkErrorType.CHAIN_ADD_FAILED,
            addError instanceof Error ? addError.message : 'Unknown error'
          );
        }
      } else {
        console.error(`Failed to switch to ${targetChainName} chain:`, switchError);
        throw new TransactionError(
          `Failed to switch to ${targetChainName} network. Please switch manually in your wallet.`,
          NetworkErrorType.NETWORK_SWITCH_FAILED,
          switchError.message || 'Unknown error'
        );
      }
    }
  } catch (error) {
    if (error instanceof TransactionError) {
      throw error;
    }
    
    console.error('Error during chain switching:', error);
    throw new TransactionError(
      `Error switching to ${chain} network`,
      NetworkErrorType.CONNECTION_FAILED,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
};

// Preserve the old function for backward compatibility
export const switchToCeloChain = async (provider: any): Promise<boolean> => {
  return switchToChain(provider, 'celo');
};

/**
 * Execute a pending transaction
 * @param transaction The pending transaction to execute
 * @param walletClient Viem wallet client with signing capabilities
 */
export const executeTransaction = async (
  transaction: PendingTransaction, 
  walletClient: any
): Promise<string | null> => {
  try {
    if (!walletClient) {
      throw new TransactionError(
        'No wallet client available',
        'wallet_error',
        'Please connect your wallet and try again'
      );
    }
    
    console.log(`🔶 Executing transaction: ${transaction.id}`, {
      to: transaction.to,
      value: transaction.value,
      valueInEther: formatWeiToEther(transaction.value),
      dataLength: transaction.data ? transaction.data.length : 0,
      dataPrefix: transaction.data ? transaction.data.substring(0, 10) : 'none' // First 4 bytes is the function selector
    });
    
    // First try to get the provider from walletClient
    const provider = walletClient.transport?.getProvider?.() || 
                    walletClient.transport?.provider || 
                    walletClient.provider;
    
    if (provider) {
      // Determine which chain to use based on the transaction
      let targetChain: 'celo' | 'base' | 'arbitrum' | 'mantle' | 'zksync' = 'celo'; // Default to Celo for backward compatibility
      
      // Check transaction metadata or destination address to determine chain
      if (transaction.metadata?.chain) {
        // If the transaction metadata specifies a chain, use that
        targetChain = transaction.metadata.chain as 'celo' | 'base' | 'arbitrum' | 'mantle' | 'zksync';
      } else {
        // Try to determine chain from the destination address
        // Base and Arbitrum token addresses we know about
        const BASE_TOKENS = [
          "0xa411c9Aa00E020e4f88Bc19996d29c5B7ADB4ACf".toLowerCase(), // XOC on Base
        ];
        
        const ARBITRUM_TOKENS = [
          "0xF197FFC28c23E0309B5559e7a166f2c6164C80aA".toLowerCase(), // MXNB on Arbitrum
        ];
        
        // Add Mantle tokens we know about
        const MANTLE_TOKENS = [
          "0x201EBa5CC46D216Ce6DC03F6a759e8E766e956aE".toLowerCase(), // USDT on Mantle
        ];
        
        const toAddressLower = transaction.to.toLowerCase();
        
        if (BASE_TOKENS.includes(toAddressLower)) {
          targetChain = 'base';
          console.log('Detected Base chain transaction based on token address');
        } else if (ARBITRUM_TOKENS.includes(toAddressLower)) {
          targetChain = 'arbitrum';
          console.log('Detected Arbitrum chain transaction based on token address');
        } else if (MANTLE_TOKENS.includes(toAddressLower)) {
          targetChain = 'mantle';
          console.log('Detected Mantle chain transaction based on token address');
        }
        // Otherwise, keep the default of 'celo'
      }
      
      // Try to switch to the correct chain before executing transaction
      try {
        await switchToChain(provider, targetChain);
        
        // After switching, create the appropriate chain client based on the target chain
        let chain;
        switch(targetChain) {
          case 'base':
            chain = base;
            break;
          case 'arbitrum':
            chain = arbitrum;
            break;
          case 'mantle':
            chain = mantle;
            break;
          case 'celo':
          default:
            chain = celo;
            break;
        }
        
        // Log detailed information about the transaction
        console.log(`Executing transaction on ${targetChain} chain:`, {
          to: transaction.to,
          value: transaction.value,
          dataPrefix: transaction.data ? transaction.data.substring(0, 10) : 'none',
          isTokenTransfer: transaction.data?.startsWith('0xa9059cbb') || false
        });
        
        // Check if this is a token transfer transaction (selling order)
        if (transaction.data?.startsWith('0xa9059cbb')) {
          // This is the signature for ERC20 transfer(address,uint256)
          console.log('🔍 Detected ERC20 token transfer transaction - likely for a selling order');
          
          // Extract recipient address from token transfer data
          const recipientAddress = '0x' + transaction.data.substring(34, 74);
          console.log(`Token transfer to address: ${recipientAddress}`);
          
          // Define known token addresses to recognize what's being transferred
          const BASE_TOKEN_ADDRESSES = {
            XOC: '0xa411c9Aa00E020e4f88Bc19996d29c5B7ADB4ACf',
            MXNe: '0x269caE7Dc59803e5C596c95756faEeBb6030E0aF',
            USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
          };
          
          // Check which token is being transferred
          const tokenAddress = transaction.to.toLowerCase();
          let tokenSymbol = 'Unknown';
          
          for (const [symbol, address] of Object.entries(BASE_TOKEN_ADDRESSES)) {
            if (tokenAddress === address.toLowerCase()) {
              tokenSymbol = symbol;
              break;
            }
          }
          
          console.log(`Transferring ${tokenSymbol} tokens to escrow wallet`);
        }
        
        // Re-create walletClient with the new chain ID to avoid mismatch errors
        walletClient = createWalletClient({
          account: walletClient.account,
          chain: chain,
          transport: custom(provider)
        });
        
        console.log(`Successfully switched to ${targetChain} chain and recreated wallet client`);
      } catch (switchError) {
        if (switchError instanceof TransactionError) {
          throw switchError;
        }
        console.warn('Chain switching failed, transaction may fail:', switchError);
        // Continue with transaction attempt even if switching fails
        // Some wallets handle this gracefully on their end
      }
    } else {
      console.warn('Could not access provider for chain switching, transaction may fail');
    }
    
    // Update transaction status to submitted before sending to prevent duplicate attempts
    await updateTransactionStatus(transaction.id, TransactionStatus.SUBMITTED);
    
    // Prepare transaction parameters
    const txParams: any = {
      to: transaction.to as `0x${string}`,
      value: BigInt(transaction.value || '0'),
    };
    
    // Only add data if it exists and is non-empty
    if (transaction.data && transaction.data !== '0x') {
      txParams.data = transaction.data as `0x${string}`;
    }
    
    console.log('🔷 Sending transaction to wallet for signing...', {
      to: txParams.to,
      value: txParams.value.toString(),
      valueInEther: formatWeiToEther(txParams.value),
      hasData: !!txParams.data
    });

    // Send the transaction
    try {
      const hash = await walletClient.sendTransaction(txParams);
      
      // Update transaction status with hash
      await updateTransactionStatus(transaction.id, TransactionStatus.CONFIRMED, hash);
      
      console.log('✅ Transaction submitted successfully:', hash);
      return hash;
    } catch (txError: any) {
      // Check if user rejected the transaction
      if (
        txError.code === 4001 ||  // MetaMask/standard rejection code
        (txError.message && (
          txError.message.includes('rejected') ||
          txError.message.includes('denied') ||
          txError.message.includes('cancelled') ||
          txError.message.includes('canceled')
        ))
      ) {
        console.warn('Transaction rejected by user:', txError);
        await updateTransactionStatus(transaction.id, TransactionStatus.REJECTED);
        throw new TransactionError(
          'Transaction rejected by user',
          'user_rejection',
          'You rejected the transaction in your wallet',
          transaction
        );
      } else {
        // Other transaction error
        console.error('Transaction failed:', txError);
        await updateTransactionStatus(transaction.id, TransactionStatus.FAILED);
        throw new TransactionError(
          'Transaction failed to process',
          'transaction_error',
          txError.message || 'Unknown error',
          transaction
        );
      }
    }
  } catch (error) {
    // Handle errors that might have occurred outside transaction execution
    if (error instanceof TransactionError) {
      throw error;
    }
    
    console.error('Error executing transaction:', error);
    throw new TransactionError(
      'Failed to execute transaction',
      'execution_error',
      error instanceof Error ? error.message : 'Unknown error',
      transaction
    );
  }
};

/**
 * Create a Viem wallet client for the connected wallet using Privy
 * This function needs to be called in a component with access to Privy hooks
 */
export const createPrivyWalletClient = async (wallet: any) => {
  try {
    if (!wallet) {
      console.error('No wallet provided to createPrivyWalletClient');
      throw new Error('No wallet available');
    }
    
    console.log('Creating wallet client with wallet type:', wallet.walletClientType);
    console.log('Wallet address:', wallet.address);
    
    // Different wallets provide the provider differently
    let provider;
    
    try {
      // Try to get the Ethereum provider - works for most browser extensions
      const ethProvider = await wallet.getEthereumProvider();
      
      if (ethProvider) {
        console.log('Retrieved EthereumProvider successfully', {
          hasRequest: !!ethProvider.request,
          hasAccounts: !!ethProvider.getAccounts,
          hasSendAsync: !!ethProvider.sendAsync,
          hasSend: !!ethProvider.send
        });
        provider = ethProvider;
      } else if (wallet.provider) {
        // Fallback to wallet.provider if getEthereumProvider() returns null
        console.log('Using wallet.provider as fallback');
        provider = wallet.provider;
      } else {
        throw new Error('No provider available in wallet');
      }
    } catch (error) {
      console.error('Error getting ethereum provider:', error);
      // Last resort fallback to wallet.provider
      if (wallet.provider) {
        console.log('Using wallet.provider as last resort fallback');
        provider = wallet.provider;
      } else {
        throw new Error('No provider available in wallet after fallback attempts');
      }
    }
    
    // Verify provider has required methods
    if (!provider.request) {
      console.error('Provider missing request method:', provider);
      throw new Error('Provider is missing required request method');
    }

    // Test the provider with a simple request
    try {
      const chainId = await provider.request({ method: 'eth_chainId' });
      console.log('Provider test successful. Chain ID:', chainId);
      
      // Determine which chain the wallet is currently on
      let currentChain;
      if (chainId === BASE_CHAIN_HEX) {
        currentChain = base;
        console.log('Wallet is on Base chain');
      } else if (chainId === ARBITRUM_CHAIN_HEX) {
        currentChain = arbitrum;
        console.log('Wallet is on Arbitrum chain');
      } else if (chainId === CELO_CHAIN_HEX) {
        currentChain = celo;
        console.log('Wallet is on Celo chain');
      } else if (chainId === MANTLE_CHAIN_HEX) {
        currentChain = mantle;
        console.log('Wallet is on Mantle chain');
      } else {
        // Default to Base if not on a known chain
        currentChain = base;
        console.log(`Wallet is on unknown chain ${chainId}, defaulting to Base`);
      }
      
      // Create wallet client with transport to the wallet's provider and use the detected chain
      console.log(`Creating walletClient for chain: ${currentChain.name}`);
      const walletClient = createWalletClient({
        account: wallet.address as `0x${string}`,
        chain: currentChain,
        transport: custom(provider)
      });
      
      return walletClient;
      
    } catch (e) {
      console.error('Provider test failed:', e);
      // Continue anyway with Base as the default chain
      console.log('Creating walletClient with Base as default chain due to provider test failure');
    }
    
    // Create wallet client with transport to the wallet's provider
    console.log('Creating walletClient with custom transport');
    const walletClient = createWalletClient({
      account: wallet.address as `0x${string}`,
      chain: base, // Default to Base instead of Celo
      transport: custom(provider)
    });
    
    // Verify wallet client by testing key methods
    try {
      const addresses = await walletClient.getAddresses();
      console.log('Wallet client working: retrieved addresses', addresses);
      
      // Test chain access
      const chainId = await walletClient.getChainId();
      console.log('Chain ID from wallet client:', chainId);
      
      // Additional check to make sure wallet can sign
      console.log('Wallet client ready for signing transactions');
    } catch (error) {
      console.error('Error testing wallet client:', error);
      throw new Error('Wallet client creation succeeded but testing failed');
    }
    
    return walletClient;
  } catch (error: any) {
    console.error('Error creating wallet client:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      wallet: wallet ? {
        address: wallet.address,
        type: wallet.walletClientType,
        hasProvider: !!wallet.provider
      } : 'null'
    });
    return null;
  }
};

/**
 * Poll for pending transactions and process them
 * @param walletClient Viem wallet client with signing capabilities
 */
export const processPendingTransactions = async (walletClient: any): Promise<void> => {
  try {
    const pendingTxs = await getPendingTransactions();
    
    if (pendingTxs.length > 0) {
      console.log(`📋 Found ${pendingTxs.length} pending transactions`);
    }
    
    // Process only the first pending transaction - better UX to handle one at a time
    // This gives the user time to interact with their wallet between transactions
    for (const tx of pendingTxs) {
      if (tx.status === TransactionStatus.PENDING) {
        console.log(`⚡ Processing pending transaction: ${tx.id}`);
        
        try {
          const hash = await executeTransaction(tx, walletClient);
          if (hash) {
            console.log(`✅ Transaction executed successfully! Hash: ${hash}`);
          } else {
            console.log(`❌ Transaction was not completed (likely rejected)`);
          }
          
          // Only process one transaction at a time, then exit
          // This prevents overwhelming the user with multiple wallet popups
          break;
        } catch (error) {
          console.error(`Error executing transaction ${tx.id}:`, error);
          
          // Continue to the next transaction if this one fails
          continue;
        }
      }
    }
  } catch (error) {
    console.error('❌ Error processing pending transactions:', error);
  }
};

/**
 * Get transaction details from the backend
 */
export const getTransactionDetails = async (txId: string): Promise<PendingTransaction | null> => {
  try {
    const response = await fetch(`${apiUrl}/api/transactions/${txId}`);
    
    if (!response.ok) {
      throw new TransactionError(
        `Failed to fetch transaction details: ${response.statusText}`,
        'fetch_error',
        `Status: ${response.status}`
      );
    }
    
    const data = await response.json();
    return data.transaction || null;
  } catch (error) {
    if (error instanceof TransactionError) {
      throw error;
    }
    
    console.error(`Error fetching transaction details for ${txId}:`, error);
    throw new TransactionError(
      'Failed to fetch transaction details',
      'fetch_error',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}; 