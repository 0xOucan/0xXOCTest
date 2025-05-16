import React, { useState, useEffect } from 'react';
import { PlayIcon, LoadingIcon } from './Icons';
import { useNavigate } from 'react-router-dom';
import { useNotification, NotificationType } from '../utils/notification';

const InfoPanel: React.FC = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotification();
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Check if API key is already stored in localStorage
  useEffect(() => {
    const storedApiKey = localStorage.getItem('openai_api_key');
    if (storedApiKey) {
      setApiKey(storedApiKey);
      setIsInitialized(true);
    }
  }, []);

  const goToMarketplace = () => {
    navigate('/marketplace');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKey.trim()) {
      addNotification('Please enter your OpenAI API key', NotificationType.WARNING);
      return;
    }

    setIsLoading(true);

    try {
      // Send API key to backend
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/initialize-agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to initialize agent');
      }

      // Store API key in localStorage
      localStorage.setItem('openai_api_key', apiKey);
      setIsInitialized(true);
      
      addNotification(
        'Agent initialized successfully',
        NotificationType.SUCCESS,
        'You can now use the marketplace and AI features'
      );
    } catch (error) {
      console.error('Error initializing agent:', error);
      addNotification(
        'Failed to initialize agent',
        NotificationType.ERROR,
        error instanceof Error ? error.message : 'Invalid API key or server error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const resetApiKey = () => {
    localStorage.removeItem('openai_api_key');
    setApiKey('');
    setIsInitialized(false);
    addNotification('API key removed', NotificationType.INFO);
  };

  return (
    <div className="py-8 px-4 flex flex-col items-center space-y-10 transition-colors duration-200">
      {/* Hero Section */}
      <div className="text-center space-y-6 w-full max-w-xl">
        <div className="flex justify-center mb-6">
          <img 
            src="/0xXOC-logo/logo 0xXOC.png" 
            alt="0xXOC Logo" 
            className="w-40 h-40"
          />
        </div>

        <h1 className="text-4xl font-pixel text-base-blue dark:text-base-blue-light">
          Welcome to 0xXOC P2P Exchange
        </h1>
        
        <p className="text-light-text dark:text-dark-text">
          A decentralized peer-to-peer exchange for XOC, MXNe, and USDC tokens
        </p>
      </div>

      {/* OpenAI API Key Section */}
      <div className="w-full max-w-xl bg-light-card dark:bg-dark-card border-3 border-base-blue shadow-pixel p-6">
        <h2 className="text-xl font-pixel text-base-blue dark:text-base-blue-light mb-4">
          {isInitialized ? 'AI Agent Ready' : 'Enter Your OpenAI API Key'}
        </h2>
        
        {!isInitialized ? (
          <>
            <p className="text-light-text dark:text-dark-text mb-4">
              This is a testing version of 0xXOC. Please provide your own OpenAI API key to use the AI features.
              Your key is stored in your browser and sent securely to the server.
            </p>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input 
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full border-3 border-light-border dark:border-dark-border focus:border-base-blue p-3 bg-light-surface dark:bg-dark-surface text-light-text dark:text-dark-text font-pixel"
                />
                <p className="mt-1 text-xs text-light-secondary dark:text-dark-secondary">
                  Your API key is stored locally and never shared with third parties
                </p>
              </div>
              
              <button 
                type="submit"
                disabled={isLoading || !apiKey.trim()}
                className={`w-full flex items-center justify-center border-3 border-base-blue py-3 px-6 font-pixel text-base-blue dark:text-base-blue-light ${
                  isLoading || !apiKey.trim() 
                    ? 'bg-base-blue/20 cursor-not-allowed' 
                    : 'hover:bg-base-blue/20 active:bg-base-blue/30'
                }`}
              >
                {isLoading ? (
                  <>
                    <LoadingIcon className="w-5 h-5 mr-2" />
                    INITIALIZING...
                  </>
                ) : (
                  <>
                    GET STARTED
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center text-green-500 mb-4">
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>AI agent initialized with your API key</span>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={goToMarketplace}
                className="flex-1 flex items-center justify-center border-3 border-base-blue py-3 px-6 font-pixel text-base-blue dark:text-base-blue-light hover:bg-base-blue/20 active:bg-base-blue/30"
              >
                <PlayIcon className="w-5 h-5 mr-2" />
                GO TO MARKETPLACE
              </button>
              
              <button
                onClick={resetApiKey}
                className="flex-1 border-3 border-red-500/50 py-3 px-6 font-pixel text-red-500 hover:bg-red-500/10 active:bg-red-500/20"
              >
                RESET API KEY
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Feature Icons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-3xl">
        <div className="border-3 border-base-blue/50 p-6 flex flex-col items-center text-center space-y-3 bg-light-card dark:bg-dark-card shadow-pixel">
          <div className="text-4xl">🔄</div>
          <h3 className="font-pixel text-base-blue dark:text-base-blue-light">P2P Exchange</h3>
          <p className="text-light-secondary dark:text-dark-secondary text-sm">Buy and sell tokens directly with other users</p>
        </div>
        
        <div className="border-3 border-base-blue/50 p-6 flex flex-col items-center text-center space-y-3 bg-light-card dark:bg-dark-card shadow-pixel">
          <div className="text-4xl">🤖</div>
          <h3 className="font-pixel text-base-blue dark:text-base-blue-light">AI Powered</h3>
          <p className="text-light-secondary dark:text-dark-secondary text-sm">Smart contract interaction with AI assistance</p>
        </div>
        
        <div className="border-3 border-base-blue/50 p-6 flex flex-col items-center text-center space-y-3 bg-light-card dark:bg-dark-card shadow-pixel">
          <div className="text-4xl">🔒</div>
          <h3 className="font-pixel text-base-blue dark:text-base-blue-light">Secure Escrow</h3>
          <p className="text-light-secondary dark:text-dark-secondary text-sm">Trade with confidence using our secure escrow system</p>
        </div>
      </div>

      {/* Moving Footer Disclaimer */}
      <div className="w-full fixed bottom-0 left-0 bg-base-blue text-white py-3 overflow-hidden">
        <div className="marquee-container">
          <div className="marquee-content">
            ⚠️ THIS IS A TESTING WEBSITE - NOT FOR PRODUCTION USE ⚠️ Report issues by 
            <a 
              href="https://twitter.com/intent/tweet?text=@0xoucan%20I%20found%20an%20issue%20with%200xXOC%20P2P%20Exchange%20testing%20site:" 
              target="_blank" 
              rel="noopener noreferrer"
              className="mx-2 underline font-bold"
            >
              tagging @0xoucan on Twitter
            </a>
            with a screenshot ⚠️ THIS IS A TESTING WEBSITE - NOT FOR PRODUCTION USE ⚠️
          </div>
        </div>
      </div>
      
      <style>
        {`
        .marquee-container {
          width: 100%;
          overflow: hidden;
        }
        
        .marquee-content {
          display: inline-block;
          white-space: nowrap;
          animation: marquee 30s linear infinite;
          padding-left: 100%;
        }
        
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-100%);
          }
        }
        `}
      </style>
    </div>
  );
};

export default InfoPanel; 