import React from 'react';
import { PlayIcon } from './Icons';
import { useNavigate } from 'react-router-dom';

const InfoPanel: React.FC = () => {
  const navigate = useNavigate();

  const goToMarketplace = () => {
    navigate('/marketplace');
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
        <h1 className="text-4xl font-aztec text-base-blue dark:text-base-blue-light">0xXOC</h1>
        <p className="text-lg font-pixel text-light-secondary dark:text-dark-secondary">P2P $MXN - $MXNe $USDC $XOC MARKETPLACE</p>
        <div className="mt-8">
          <button 
            className="pixel-btn inline-flex items-center space-x-2"
            onClick={goToMarketplace}
          >
            <PlayIcon className="w-4 h-4 mr-2" />
            <span>GET STARTED</span>
          </button>
        </div>
      </div>

      {/* Feature Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        <div className="pixel-card flex flex-col items-center text-center space-y-3">
          <div className="text-base-blue dark:text-base-blue-light text-xl mb-2">🪙</div>
          <h3 className="font-aztec text-base-blue dark:text-base-blue-light">SELL TOKENS</h3>
          <p className="text-sm">EASILY CONVERT YOUR CRYPTO TO MEXICAN PESOS THROUGH OXXO</p>
        </div>
        
        <div className="pixel-card flex flex-col items-center text-center space-y-3">
          <div className="text-base-blue dark:text-base-blue-light text-xl mb-2">💰</div>
          <h3 className="font-aztec text-base-blue dark:text-base-blue-light">BUY TOKENS</h3>
          <p className="text-sm">PURCHASE CRYPTO WITH MEXICAN PESOS USING OXXO SPIN QR CODES</p>
        </div>
        
        <div className="pixel-card flex flex-col items-center text-center space-y-3">
          <div className="text-base-blue dark:text-base-blue-light text-xl mb-2">🔒</div>
          <h3 className="font-aztec text-base-blue dark:text-base-blue-light">SECURE ESCROW</h3>
          <p className="text-sm">TRADES SECURED BY COINBASE AGENT KIT FOR SAFE TRANSACTIONS</p>
        </div>
      </div>

      {/* Description */}
      <div className="w-full">
        <h2 className="font-aztec text-xl text-base-blue dark:text-base-blue-light border-b border-light-border dark:border-dark-border pb-2 mb-4">ABOUT 0xXOC</h2>
        <div className="space-y-4 text-light-text dark:text-dark-text">
          <p className="text-sm">
            0xXOC IS A PEER-TO-PEER MARKETPLACE FOCUSED ON MAKING CRYPTO ACCESSIBLE TO EVERYONE IN MEXICO. OUR PLATFORM ENABLES SEAMLESS TRANSACTIONS BETWEEN CRYPTO AND MEXICAN PESOS THROUGH OXXO CONVENIENCE STORES.
          </p>
          <p className="text-sm">
            USING OUR SECURE ESCROW SYSTEM, USERS CAN CONFIDENTLY BUY AND SELL DIGITAL ASSETS WITHOUT WORRYING ABOUT FRAUD OR SCAMS. ALL THE DATA IS ENCRYPTED AND STORED ONCHAIN, AND THE TRANSACTIONS ARE VERIFIED AND PROTECTED BY COINBASE AGENTKIT AI AGENT ON THE BASE NETWORK.
          </p>
        </div>
      </div>

      {/* Supported Tokens */}
      <div className="w-full">
        <h2 className="font-aztec text-xl text-base-blue dark:text-base-blue-light border-b border-light-border dark:border-dark-border pb-2 mb-4">SUPPORTED TOKENS:</h2>
        <ul className="space-y-3 text-sm">
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span><span className="font-medium text-base-blue dark:text-base-blue-light">USDC (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913):</span> USD COIN ON BASE NETWORK</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span><span className="font-medium text-base-blue dark:text-base-blue-light">MXNe (0x269caE7Dc59803e5C596c95756faEeBb6030E0aF):</span> <a href="https://brale.xyz/stablecoins/MXNe" target="_blank" rel="noopener noreferrer" className="underline hover:text-base-blue dark:hover:text-base-blue-light">MEXICAN PESO STABLECOIN ON BASE NETWORK BACKED BY TOKENIZED CETES AS COLLATERAL</a></span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span><span className="font-medium text-base-blue dark:text-base-blue-light">XOC (0xa411c9Aa00E020e4f88Bc19996d29c5B7ADB4ACf):</span> <a href="https://www.xocolatl.finance/" target="_blank" rel="noopener noreferrer" className="underline hover:text-base-blue dark:hover:text-base-blue-light">BASE CHAIN MEXICAN PESO PAIRED CDP STABLE COIN</a></span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span><span className="font-medium text-base-blue dark:text-base-blue-light">ETH:</span> NATIVE BASE CHAIN ETHEREUM</span>
          </li>
        </ul>
      </div>

      <div className="pt-4">
        <button 
          className="pixel-btn"
          onClick={goToMarketplace}
        >
          EXPLORE MARKETPLACE
        </button>
      </div>
    </div>
  );
};

export default InfoPanel; 