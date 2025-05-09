import React, { useState, useEffect } from 'react';
import ChatInterface from './components/ChatInterface';
import WalletBalances from './components/WalletBalances';
import LiquidityMonitor from './components/LiquidityMonitor';
import InfoPanel from './components/InfoPanel';
import WalletConnect, { WalletStatusBar } from './components/WalletConnect';
import { PrivyProvider } from './providers/PrivyProvider';
import { WalletProvider } from './providers/WalletContext';
import TransactionMonitor from './components/TransactionMonitor';
import MarketplacePage from './components/marketplace/MarketplacePage';
import { NotificationProvider } from './utils/notification';

export default function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [isAgentActive, setIsAgentActive] = useState(false);
  const [activeSection, setActiveSection] = useState<'chat' | 'marketplace'>('chat');

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    localStorage.setItem('mictlai-theme', darkMode ? 'light' : 'dark');
  };

  // Initialize theme from localStorage on mount
  useEffect(() => {
    // Check for saved theme or use system preference
    const savedTheme = localStorage.getItem('mictlai-theme');
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
    <PrivyProvider>
      <WalletProvider>
        <NotificationProvider>
        <div className="min-h-screen bg-mictlai-obsidian text-mictlai-bone font-pixel">
          {/* Main header - Pixel Art Style */}
          <header className="bg-black border-b-3 border-mictlai-gold px-4 py-3 shadow-pixel-lg">
            <div className="container mx-auto flex justify-between items-center">
              {/* Branding Section - Left */}
              <div className="flex items-center">
                {/* Pixel Skull icon */}
                <div className="h-10 w-10 mr-3 relative">
                  <svg width="32" height="32" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="pixel-pulse">
                    <rect width="16" height="16" fill="#0D0D0D" />
                    <rect x="3" y="3" width="10" height="8" fill="#FFD700" />
                    <rect x="2" y="4" width="1" height="6" fill="#FFD700" />
                    <rect x="13" y="4" width="1" height="6" fill="#FFD700" />
                    <rect x="4" y="2" width="8" height="1" fill="#FFD700" />
                    <rect x="4" y="11" width="3" height="1" fill="#FFD700" />
                    <rect x="9" y="11" width="3" height="1" fill="#FFD700" />
                    <rect x="3" y="12" width="4" height="1" fill="#FFD700" />
                    <rect x="9" y="12" width="4" height="1" fill="#FFD700" />
                    <rect x="5" y="5" width="2" height="2" fill="#0D0D0D" />
                    <rect x="9" y="5" width="2" height="2" fill="#0D0D0D" />
                    <rect x="7" y="7" width="2" height="2" fill="#40E0D0" />
                    <rect x="6" y="9" width="4" height="1" fill="#0D0D0D" />
                  </svg>
                  <div className="absolute top-0 left-0 w-full h-full bg-mictlai-turquoise opacity-10 animate-pulse"></div>
                </div>
                <h1 className="text-xl font-pixel font-bold tracking-widest text-mictlai-gold">MICTLAI</h1>
                <span className="ml-3 bg-mictlai-blood border border-mictlai-gold text-xs font-pixel px-2 py-1 shadow-pixel">
                  AI BRIDGE
                </span>
              </div>
                
                {/* Navigation - Center */}
                {isAgentActive && (
                  <nav className="hidden md:flex items-center space-x-4">
                    <button
                      onClick={() => setActiveSection('chat')}
                      className={`px-3 py-1 font-pixel text-sm ${
                        activeSection === 'chat' 
                          ? 'border-b-2 border-mictlai-gold text-mictlai-gold'
                          : 'text-mictlai-bone/70 hover:text-mictlai-bone'
                      }`}
                    >
                      AI ASSISTANT
                    </button>
                    <button
                      onClick={() => setActiveSection('marketplace')}
                      className={`px-3 py-1 font-pixel text-sm ${
                        activeSection === 'marketplace' 
                          ? 'border-b-2 border-mictlai-gold text-mictlai-gold'
                          : 'text-mictlai-bone/70 hover:text-mictlai-bone'
                      }`}
                    >
                      MARKETPLACE
                    </button>
                  </nav>
                )}
              
              {/* Controls Section - Right */}
              <div className="flex items-center space-x-4">
                <WalletConnect />
                
                <button 
                  onClick={toggleDarkMode}
                  className="p-1.5 rounded-none bg-mictlai-obsidian border-2 border-mictlai-gold hover:bg-mictlai-blood text-mictlai-bone shadow-pixel"
                  aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {darkMode ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </header>
          
          {/* Wallet status bar - Pixel Style */}
          <WalletStatusBar />
            
            {/* Mobile menu (only for activated agent) */}
            {isAgentActive && (
              <div className="md:hidden flex border-b-3 border-mictlai-gold/30">
                <button
                  onClick={() => setActiveSection('chat')}
                  className={`flex-1 py-2 font-pixel text-sm ${
                    activeSection === 'chat' 
                      ? 'bg-mictlai-gold/20 text-mictlai-gold border-b-3 border-mictlai-gold'
                      : 'text-mictlai-bone/70 hover:bg-black/30'
                  }`}
                >
                  AI ASSISTANT
                </button>
                <button
                  onClick={() => setActiveSection('marketplace')}
                  className={`flex-1 py-2 font-pixel text-sm ${
                    activeSection === 'marketplace' 
                      ? 'bg-mictlai-gold/20 text-mictlai-gold border-b-3 border-mictlai-gold'
                      : 'text-mictlai-bone/70 hover:bg-black/30'
                  }`}
                >
                  MARKETPLACE
                </button>
              </div>
            )}
          
          {/* Main content */}
          <main className="container mx-auto px-4 py-6">
            {!isAgentActive ? (
              <InfoPanel onActivateAgent={() => setIsAgentActive(true)} />
              ) : activeSection === 'chat' ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <ChatInterface />
                </div>
                <div className="lg:col-span-1 space-y-6">
                  <WalletBalances />
                  <LiquidityMonitor />
                </div>
              </div>
              ) : (
                <MarketplacePage />
            )}
          </main>
          
          {/* Transaction monitoring component */}
          <TransactionMonitor />
          
          <footer className="bg-black py-3 text-center text-mictlai-gold/70 text-sm border-t-3 border-mictlai-gold/20">
            <p className="container mx-auto font-pixel">⛧ MICTLAI - BRIDGING WORLDS BEYOND TIME ⛧</p>
          </footer>
        </div>
        </NotificationProvider>
      </WalletProvider>
    </PrivyProvider>
  );
} 