import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { sendWalletAddress } from '../services/agentService';

interface WalletContextType {
  connectedAddress: string | null;
  isConnecting: boolean;
  isConnected: boolean;
  isBackendSynced: boolean;
  syncStatus: string;
  connect: () => void;
  disconnect: () => void;
  wallets: any[];
}

const WalletContext = createContext<WalletContextType>({
  connectedAddress: null,
  isConnecting: false,
  isConnected: false,
  isBackendSynced: false,
  syncStatus: '',
  connect: () => {},
  disconnect: () => {},
  wallets: [],
});

export const useWallet = () => useContext(WalletContext);

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider = ({ children }: WalletProviderProps) => {
  const { login, logout, ready, authenticated } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isBackendSynced, setIsBackendSynced] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string>('');

  // Update connected wallet address when wallets change
  useEffect(() => {
    if (authenticated && walletsReady && wallets.length > 0) {
      const primaryWallet = wallets[0];
      setConnectedAddress(primaryWallet.address);
      syncWithBackend(primaryWallet.address);
    } else {
      setConnectedAddress(null);
      setIsBackendSynced(false);
      setSyncStatus('');
    }
  }, [authenticated, wallets, walletsReady]);

  // Sync wallet with backend
  const syncWithBackend = async (address: string) => {
    if (!address) return;
    
    setIsConnecting(true);
    
    try {
      const result = await sendWalletAddress(address);
      setIsBackendSynced(result.success);
      setSyncStatus(result.message);
      
      if (result.success) {
        console.log('Successfully connected wallet to backend:', address);
      } else {
        console.warn('Failed to connect wallet to backend:', result.message);
      }
    } catch (error) {
      setIsBackendSynced(false);
      setSyncStatus(error instanceof Error ? error.message : 'Unknown error connecting wallet');
      console.error('Error connecting wallet to backend:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const connect = () => {
    login();
  };

  const disconnect = () => {
    logout();
    setConnectedAddress(null);
    setIsBackendSynced(false);
  };

  const value = {
    connectedAddress,
    isConnecting,
    isConnected: !!connectedAddress,
    isBackendSynced,
    syncStatus,
    connect,
    disconnect,
    wallets,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}; 