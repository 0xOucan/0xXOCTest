import React from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallet } from '../providers/WalletContext';
import { SunIcon, MoonIcon } from './Icons';

// SVG Assets
const skullIcon = (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="4" fill="#0D0D0D" />
    <path d="M16 6C10.477 6 6 10.477 6 16C6 18.559 7.074 20.893 8.845 22.567C9.473 23.148 9.95 23.899 9.95 24.95C9.95 25.503 10.397 25.95 10.95 25.95H14.06C14.585 25.95 15.017 25.546 15.05 25.022C15.05 25.014 15.05 25.007 15.05 25C15.05 24.172 15.672 23.5 16.5 23.5C17.328 23.5 18 24.172 18 25V25.037C18.033 25.551 18.465 25.95 18.989 25.95H21.05C21.603 25.95 22.05 25.503 22.05 24.95C22.05 23.899 22.527 23.148 23.155 22.567C24.926 20.893 26 18.559 26 16C26 10.477 21.523 6 16 6Z" fill="#FFD700" />
    <path d="M13 16C13 17.1046 12.1046 18 11 18C9.89543 18 9 17.1046 9 16C9 14.8954 9.89543 14 11 14C12.1046 14 13 14.8954 13 16Z" fill="#0D0D0D" />
    <path d="M23 16C23 17.1046 22.1046 18 21 18C19.8954 18 19 17.1046 19 16C19 14.8954 19.8954 14 21 14C22.1046 14 23 14.8954 23 16Z" fill="#0D0D0D" />
    <rect x="14" y="14" width="4" height="4" rx="2" fill="#40E0D0" />
  </svg>
);

interface HeaderProps {
  toggleDarkMode: () => void;
  isDarkMode: boolean;
}

const Header: React.FC<HeaderProps> = ({ toggleDarkMode, isDarkMode }) => {
  const { login, authenticated, logout } = usePrivy();
  const { connectedAddress } = useWallet();
  
  // Helper function to format address
  const formatAddress = (): string => {
    if (!connectedAddress) return '';
    return `${connectedAddress.slice(0, 6)}...${connectedAddress.slice(-4)}`;
  };

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between p-4 border-b backdrop-blur transition-colors duration-200 dark:bg-dark-surface dark:border-dark-border bg-light-surface border-light-border">
      <div className="flex items-center space-x-2">
        <img 
          src="/0xXOC-logo/logo 0xXOC.png" 
          alt="0xXOC Logo" 
          className="h-10 w-10" 
        />
        <h1 className="text-xl font-aztec font-bold text-base-blue dark:text-base-blue-light">0xXOC</h1>
        <span className="px-2 py-0.5 bg-base-blue dark:bg-base-blue-dark text-white text-xs font-medium rounded">
          MARKETPLACE
        </span>
      </div>

      <div className="flex items-center space-x-3">
        <button 
          onClick={toggleDarkMode}
          className="p-2 rounded-full text-base-blue dark:text-base-blue-light hover:bg-light-surface dark:hover:bg-dark-surface transition-colors"
          aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDarkMode ? (
            <SunIcon className="w-5 h-5" />
          ) : (
            <MoonIcon className="w-5 h-5" />
          )}
        </button>
        
        {authenticated ? (
          <button 
            onClick={() => logout()}
            className="flex items-center space-x-2 py-1.5 px-3 bg-dark-card dark:bg-dark-surface hover:bg-dark-card/80 dark:hover:bg-dark-surface/70 text-dark-text border border-base-blue/30 dark:border-base-blue-dark/30 rounded-md transition-colors"
          >
            <span className="text-sm font-medium">{formatAddress()}</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
            </svg>
          </button>
        ) : (
          <button
            onClick={() => login()}
            className="flex items-center space-x-2 py-1.5 px-3 bg-base-blue hover:bg-base-blue-light text-white border border-base-blue-dark/30 rounded-md transition-colors"
          >
            <span className="text-sm font-medium">Connect Wallet</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3" />
            </svg>
          </button>
        )}
      </div>
    </header>
  );
};

export default Header; 