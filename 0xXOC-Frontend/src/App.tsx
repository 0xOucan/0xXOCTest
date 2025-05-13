import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import WalletBalances from './components/WalletBalances';
import LiquidityMonitor from './components/LiquidityMonitor';
import InfoPanel from './components/InfoPanel';
import WalletConnect, { WalletStatusBar } from './components/WalletConnect';
import { PrivyProvider } from './providers/PrivyProvider';
import { WalletProvider } from './providers/WalletContext';
import TransactionMonitor from './components/TransactionMonitor';
import MarketplacePage from './components/marketplace/MarketplacePage';
import { NotificationProvider } from './utils/notification';
import Header from './components/Header';
import { SunIcon, MoonIcon } from './components/Icons';

export default function App() {
  const [darkMode, setDarkMode] = useState(true);

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    localStorage.setItem('0xXOC-theme', darkMode ? 'light' : 'dark');
  };

  // Initialize theme from localStorage on mount
  useEffect(() => {
    // Check for saved theme or use system preference
    const savedTheme = localStorage.getItem('0xXOC-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    } else if (savedTheme === 'light') {
      setDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  return (
    <Router>
      <PrivyProvider>
        <WalletProvider>
          <NotificationProvider>
            <div className="min-h-screen bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text font-pixel transition-colors duration-200">
              {/* Main header */}
              <Header toggleDarkMode={toggleDarkMode} isDarkMode={darkMode} />
              
              {/* Wallet status bar */}
              <WalletStatusBar />
              
              {/* Main content */}
              <main className="container mx-auto px-4 py-6">
                <Routes>
                  <Route path="/" element={<InfoPanel />} />
                  <Route path="/marketplace/*" element={
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-2">
                        <MarketplacePage />
                      </div>
                      <div className="lg:col-span-1 space-y-6">
                        <WalletBalances />
                        <LiquidityMonitor />
                      </div>
                    </div>
                  } />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </main>
              
              {/* Transaction monitoring component */}
              <TransactionMonitor />
              
              <footer className="bg-light-surface dark:bg-dark-surface py-3 text-center border-t border-light-border dark:border-dark-border transition-colors duration-200">
                <p className="container mx-auto font-pixel text-base-blue dark:text-base-blue-light">⛧ 0xXOC - P2P $MXN-$USDC $MXNe $XOC MARKETPLACE ⛧</p>
              </footer>
            </div>
          </NotificationProvider>
        </WalletProvider>
      </PrivyProvider>
    </Router>
  );
} 