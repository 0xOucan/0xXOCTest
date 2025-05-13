import React, { ReactNode } from 'react';
import { SunIcon, MoonIcon } from './Icons';
import WalletConnect from './WalletConnect';
import { useWallet } from '../providers/WalletContext';

interface MainLayoutProps {
  children: ReactNode;
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export default function MainLayout({ children, darkMode, toggleDarkMode }: MainLayoutProps) {
  const { connectedAddress, isConnected, isBackendSynced } = useWallet();
  
  // Format the wallet address for display
  const formatAddress = (address: string | null) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <div className="flex flex-col min-h-screen bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text transition-colors duration-200">
      {/* Header */}
      <header className="bg-light-surface dark:bg-dark-surface px-6 py-3 shadow-lg border-b border-light-border dark:border-dark-border transition-colors duration-200">
        <div className="container mx-auto flex justify-between items-center">
          {/* Branding Section - Left */}
          <div className="flex items-center">
            <div className="flex items-center">
              <img 
                src="/0xXOC-logo/logo 0xXOC.png" 
                alt="0xXOC Logo" 
                className="h-8 w-8 mr-2" 
              />
              <h1 className="text-xl font-bold tracking-tight text-base-blue dark:text-base-blue-light">0xXOC</h1>
              <span className="ml-2 bg-base-blue dark:bg-base-blue-dark text-white text-xs font-medium px-2 py-1 rounded">
                P2P Marketplace
              </span>
            </div>
          </div>
          
          {/* Controls Section - Right */}
          <div className="flex items-center space-x-4">
            <WalletConnect />
            
            <button 
              onClick={toggleDarkMode}
              className="p-1.5 rounded-full bg-light-card dark:bg-dark-card hover:bg-light-surface dark:hover:bg-dark-surface text-base-blue dark:text-base-blue-light transition-colors duration-200"
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? (
                <SunIcon className="h-5 w-5" />
              ) : (
                <MoonIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </header>
      
      {/* Wallet Status Indicator - Minimal */}
      {isConnected && (
        <div className="bg-light-surface dark:bg-dark-surface border-t border-light-border dark:border-dark-border transition-colors duration-200">
          <div className="container mx-auto flex justify-end py-1 px-6">
            <div className="flex items-center text-xs text-light-secondary dark:text-dark-secondary">
              <span className="inline-flex items-center mr-2">
                <span className="h-2 w-2 rounded-full bg-base-blue mr-1"></span>
                <span className="font-medium text-base-blue dark:text-base-blue-light">Connected</span>
              </span>
              {isBackendSynced && (
                <span className="inline-flex items-center">
                  <span className="h-2 w-2 rounded-full bg-base-blue mr-1"></span>
                  <span>Synced</span>
                </span>
              )}
              <span className="mx-2">|</span>
              <span className="font-mono">{formatAddress(connectedAddress)}</span>
              <a 
                href={`https://basescan.org/address/${connectedAddress}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="ml-1 text-base-blue hover:text-base-blue-light hover:underline"
              >
                View
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-grow container mx-auto px-4 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-light-surface dark:bg-dark-surface py-3 text-center text-light-secondary dark:text-dark-secondary text-sm border-t border-light-border dark:border-dark-border transition-colors duration-200">
        <p className="container mx-auto">⛧ 0xXOC - P2P TOKEN MARKETPLACE ⛧</p>
      </footer>
    </div>
  );
} 