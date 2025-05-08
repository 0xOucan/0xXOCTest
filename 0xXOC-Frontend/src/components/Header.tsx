import React from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallet } from '../providers/WalletContext';

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
    <header className="sticky top-0 z-10 flex items-center justify-between p-4 bg-mictlai-obsidian border-b border-mictlai-gold/30 backdrop-blur">
        <div className="flex items-center space-x-2">
        {skullIcon}
        <h1 className="text-xl font-aztec font-bold text-mictlai-gold">MictlAI</h1>
        </div>

      <div className="flex items-center space-x-3">
            <button 
          onClick={toggleDarkMode}
          className="p-2 rounded-full text-mictlai-bone/70 hover:text-mictlai-bone"
          aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDarkMode ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
            </svg>
          )}
        </button>
        
        {authenticated ? (
          <button 
            onClick={() => logout()}
            className="flex items-center space-x-2 py-1.5 px-3 bg-black hover:bg-black/80 dark:bg-black/40 dark:hover:bg-black/70 text-mictlai-bone border border-mictlai-gold/30 rounded-md transition-colors"
          >
            <span className="text-sm font-medium">{formatAddress()}</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
            </svg>
          </button>
        ) : (
          <button
            onClick={() => login()}
            className="flex items-center space-x-2 py-1.5 px-3 bg-mictlai-blood hover:bg-mictlai-blood/80 text-mictlai-bone border border-mictlai-gold/30 rounded-md transition-colors"
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