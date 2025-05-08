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
    <div className="flex flex-col min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-800 px-6 py-3 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
          {/* Branding Section - Left */}
          <div className="flex items-center">
            <div className="flex items-center">
              <span role="img" aria-label="brain" className="text-2xl mr-2">🧠</span>
              <h1 className="text-xl font-bold tracking-tight">CeloMAIND</h1>
              <span className="ml-2 bg-yellow-600 text-xs font-medium px-2 py-1 rounded">
                AI-Powered DeFi
              </span>
            </div>
          </div>
          
          {/* Controls Section - Right */}
          <div className="flex items-center space-x-4">
            <WalletConnect />
            
            <button 
              onClick={toggleDarkMode}
              className="p-1.5 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-200"
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
        <div className="bg-slate-800 border-t border-slate-700">
          <div className="container mx-auto flex justify-end py-1 px-6">
            <div className="flex items-center text-xs text-slate-400">
              <span className="inline-flex items-center mr-2">
                <span className="h-2 w-2 rounded-full bg-green-500 mr-1"></span>
                <span className="font-medium text-green-400">Connected</span>
              </span>
              {isBackendSynced && (
                <span className="inline-flex items-center">
                  <span className="h-2 w-2 rounded-full bg-blue-500 mr-1"></span>
                  <span>Synced</span>
                </span>
              )}
              <span className="mx-2">|</span>
              <span className="font-mono">{formatAddress(connectedAddress)}</span>
              <a 
                href={`https://celoscan.io/address/${connectedAddress}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="ml-1 text-blue-400 hover:underline"
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
      <footer className="bg-slate-800 py-3 text-center text-slate-400 text-sm">
        <p className="container mx-auto">🧠 CeloMΔIND - AI-Powered DeFi Interface</p>
      </footer>
    </div>
  );
} 