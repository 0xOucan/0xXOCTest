import React from 'react';
import { useWallet } from '../providers/WalletContext';
import { LoadingIcon } from './Icons';

// Main header component for wallet connection
export default function WalletConnect() {
  const { 
    connectedAddress, 
    isConnected, 
    isConnecting, 
    isBackendSynced, 
    connect, 
    wallets 
  } = useWallet();
  
  // Format address for display
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Wait for wallet to be ready
  if (isConnecting) return (
    <button className="bg-mictlai-obsidian border-3 border-mictlai-gold/50 px-3 py-1.5 shadow-pixel flex items-center text-mictlai-bone">
      <LoadingIcon className="animate-spin h-4 w-4 mr-2" />
      <span className="text-sm font-pixel">CONNECTING...</span>
    </button>
  );

  // If not connected, show connect button
  if (!isConnected) {
    return (
      <button 
        onClick={connect} 
        className="pixel-btn text-sm font-pixel"
      >
        CONNECT WALLET
      </button>
    );
  }

  // If connected, show compact status
  return (
    <div className="flex items-center">
      <div className="bg-mictlai-obsidian border-3 border-mictlai-gold/70 px-3 py-1.5 shadow-pixel flex items-center">
        <span className={`h-2 w-2 ${isBackendSynced ? 'bg-mictlai-turquoise' : 'bg-mictlai-blood'} mr-2 pixel-pulse`}></span>
        <span className="text-sm text-mictlai-bone font-pixel">{formatAddress(connectedAddress || '')}</span>
      </div>
    </div>
  );
}

// Wallet status bar component
export function WalletStatusBar() {
  const { 
    connectedAddress, 
    isConnected, 
    isBackendSynced,
    wallets 
  } = useWallet();
  
  if (!isConnected) return null;
  
  return (
    <div className="w-full bg-black border-t-3 border-b-3 border-mictlai-gold/30 px-4 py-1.5 flex justify-between items-center text-sm font-pixel">
      {/* Left side - status */}
      <div className="flex items-center">
        <span className="text-mictlai-turquoise mr-1">✓</span>
        <span className="text-mictlai-bone mr-3">WALLET CONNECTED</span>
        
        {isBackendSynced && (
          <>
            <span className="text-mictlai-turquoise mr-1">✓</span>
            <span className="text-mictlai-bone">SYNCED WITH BACKEND</span>
          </>
        )}
      </div>
      
      {/* Right side - wallet info */}
      {wallets.length > 0 && (
        <div className="flex items-center">
          <span className="text-mictlai-gold/70 mr-2">
            {formatAddress(connectedAddress || wallets[0].address)}
          </span>
          <span className="bg-mictlai-obsidian border border-mictlai-blood px-1.5 py-0.5 text-xs text-mictlai-bone shadow-pixel-inner mr-2">
            WALLET
          </span>
          <a 
            href={`https://debank.com/profile/${connectedAddress || wallets[0].address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-mictlai-turquoise hover:text-mictlai-gold border border-mictlai-turquoise/50 px-2 hover:border-mictlai-gold/50"
          >
            VIEW
          </a>
        </div>
      )}
    </div>
  );
  
  // Helper function to format address
  function formatAddress(address: string) {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }
} 