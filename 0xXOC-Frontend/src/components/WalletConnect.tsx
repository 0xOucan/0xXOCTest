import React from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallet } from '../providers/WalletContext';
import { LoadingIcon } from './Icons';

// Format wallet address
const formatAddress = (address: string) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export default function WalletConnect() {
  const { login, authenticated, user, ready } = usePrivy();
  const { isConnected, connectedAddress } = useWallet();
  
  if (!ready) {
    return (
      <button className="flex items-center justify-center space-x-2 px-4 py-2 bg-light-card dark:bg-dark-card border border-base-blue/30 rounded-md shadow-sm">
        <LoadingIcon className="w-4 h-4 text-base-blue dark:text-base-blue-light" />
        <span className="text-light-secondary dark:text-dark-secondary">Loading...</span>
      </button>
    );
  }
  
  if (authenticated && isConnected) {
    return (
      <button 
        className="flex items-center justify-center space-x-2 px-4 py-2 bg-light-card dark:bg-dark-card border border-base-blue/30 text-base-blue dark:text-base-blue-light rounded-md shadow-sm hover:bg-base-blue/10 transition-colors"
        onClick={() => {}}
      >
        <span className="font-pixel text-sm">{formatAddress(connectedAddress || '')}</span>
        <span className="inline-flex w-2 h-2 bg-green-500 rounded-full"></span>
      </button>
    );
  }
  
  return (
    <button 
      className="flex items-center justify-center space-x-2 px-4 py-2 bg-base-blue text-white rounded-md shadow-sm hover:bg-base-blue-light transition-colors"
      onClick={() => login()}
    >
      <span className="font-pixel text-sm">CONNECT WALLET</span>
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    </button>
  );
}

export function WalletStatusBar() {
  const { isConnected, connectedAddress, isBackendSynced } = useWallet();
  
  if (!isConnected) return null;
  
  return (
    <div className="bg-light-surface dark:bg-dark-surface border-t border-light-border dark:border-dark-border px-4 py-1 text-xs text-light-secondary dark:text-dark-secondary flex items-center justify-end">
      <div className="flex items-center space-x-3">
        <div className="flex items-center">
          <span className="inline-block w-2 h-2 bg-base-blue rounded-full mr-1"></span>
          <span className="text-base-blue dark:text-base-blue-light">Connected</span>
        </div>
        
        {isBackendSynced && (
          <div className="flex items-center">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1"></span>
            <span>Synced</span>
          </div>
        )}
        
        <div className="flex items-center space-x-1">
          <span className="font-mono">{formatAddress(connectedAddress || '')}</span>
          <a 
            href={`https://basescan.org/address/${connectedAddress}`}
            target="_blank" 
            rel="noopener noreferrer"
            className="text-base-blue dark:text-base-blue-light hover:underline"
          >
            View
          </a>
        </div>
      </div>
    </div>
  );
} 