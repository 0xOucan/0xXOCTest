import React from 'react';
import { PlayIcon, SkullIcon, FireIcon, CoinIcon } from './Icons';

interface InfoPanelProps {
  onActivateAgent: () => void;
}

export default function InfoPanel({ onActivateAgent }: InfoPanelProps) {
  return (
    <div className="max-w-4xl mx-auto">
      <section className="border-3 border-mictlai-gold/60 bg-black shadow-pixel-lg overflow-hidden pixel-panel">
        {/* Hero Section */}
        <div className="p-8 text-center">
          {/* Pixel art skull icon */}
          <div className="mx-auto w-32 h-32 mb-4 relative">
            <svg width="128" height="128" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" fill="#0D0D0D" />
              <rect x="6" y="6" width="20" height="16" fill="#FFD700" />
              <rect x="4" y="8" width="2" height="12" fill="#FFD700" />
              <rect x="26" y="8" width="2" height="12" fill="#FFD700" />
              <rect x="8" y="4" width="16" height="2" fill="#FFD700" />
              <rect x="8" y="22" width="6" height="2" fill="#FFD700" />
              <rect x="18" y="22" width="6" height="2" fill="#FFD700" />
              <rect x="6" y="24" width="8" height="2" fill="#FFD700" />
              <rect x="18" y="24" width="8" height="2" fill="#FFD700" />
              <rect x="10" y="10" width="4" height="4" fill="#0D0D0D" />
              <rect x="18" y="10" width="4" height="4" fill="#0D0D0D" />
              <rect x="14" y="14" width="4" height="4" fill="#40E0D0" />
              <rect x="12" y="18" width="8" height="2" fill="#0D0D0D" />
            </svg>
            <div className="absolute top-0 left-0 w-full h-full bg-mictlai-turquoise opacity-10 animate-pulse"></div>
          </div>
          <h1 className="text-4xl font-pixel font-bold text-mictlai-gold mb-2 tracking-wider">0xXOC</h1>
          <h2 className="text-xl text-mictlai-bone/80 mb-8 font-pixel">P2P TOKEN MARKETPLACE</h2>
          
          <button 
            onClick={onActivateAgent}
            className="pixel-btn flex items-center space-x-2 mx-auto px-6 py-3 font-pixel"
          >
            <PlayIcon className="h-5 w-5" />
            <span>GET STARTED</span>
          </button>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 border-t-3 border-mictlai-gold/50">
          <div className="p-6 border-b-3 md:border-b-0 md:border-r-3 border-mictlai-gold/50">
            <div className="text-2xl mb-2 pixel-pulse">💸</div>
            <h3 className="font-pixel font-bold text-mictlai-gold text-lg mb-2">SELL TOKENS</h3>
            <p className="text-mictlai-bone/70 font-pixel text-sm">
              EASILY CONVERT YOUR CRYPTO TO MEXICAN PESOS THROUGH OXXO
            </p>
          </div>
          <div className="p-6 border-b-3 md:border-b-0 md:border-r-3 border-mictlai-gold/50">
            <div className="text-2xl mb-2 pixel-pulse">💰</div>
            <h3 className="font-pixel font-bold text-mictlai-gold text-lg mb-2">BUY TOKENS</h3>
            <p className="text-mictlai-bone/70 font-pixel text-sm">
              PURCHASE CRYPTO WITH MEXICAN PESOS USING OXXO SPIN QR CODES
            </p>
          </div>
          <div className="p-6">
            <div className="text-2xl mb-2 pixel-pulse">🔒</div>
            <h3 className="font-pixel font-bold text-mictlai-gold text-lg mb-2">SECURE ESCROW</h3>
            <p className="text-mictlai-bone/70 font-pixel text-sm">
              TRADES SECURED BY SMART CONTRACT ESCROW FOR SAFE TRANSACTIONS
            </p>
          </div>
        </div>
      </section>

      {/* Description */}
      <section className="mt-10 px-4 md:px-8 py-8 bg-black border-3 border-mictlai-gold/60 shadow-pixel-lg pixel-panel">
        <h2 className="text-2xl font-pixel font-bold text-mictlai-gold mb-4">ABOUT 0xXOC</h2>
        <div className="pixel-divider"></div>
        <p className="mb-4 text-mictlai-bone/80 font-pixel text-sm">
          0xXOC IS A PEER-TO-PEER MARKETPLACE FOCUSED ON MAKING CRYPTO ACCESSIBLE TO EVERYONE IN MEXICO. 
          OUR PLATFORM ENABLES SEAMLESS TRANSACTIONS BETWEEN CRYPTO AND MEXICAN PESOS THROUGH OXXO CONVENIENCE STORES.
        </p>
        <p className="mb-4 text-mictlai-bone/80 font-pixel text-sm">
          USING OUR SECURE ESCROW SYSTEM, USERS CAN CONFIDENTLY BUY AND SELL DIGITAL ASSETS WITHOUT WORRYING ABOUT FRAUD OR SCAMS.
          ALL TRANSACTIONS ARE VERIFIED AND PROTECTED BY SMART CONTRACTS ON THE BASE NETWORK.
        </p>
        
        <h3 className="text-xl font-pixel font-bold text-mictlai-gold mt-6 mb-3">SUPPORTED TOKENS:</h3>
        <div className="pixel-divider"></div>
        <ul className="space-y-4 text-mictlai-bone/80 font-pixel text-sm">
          <li className="flex items-start">
            <span className="inline-block mr-2 text-mictlai-gold">▸</span>
            <span><span className="font-medium text-mictlai-gold">XOC (0xa411c9Aa00E020e4f88Bc19996d29c5B7ADB4ACf):</span> NATIVE 0xXOC TOKEN ON BASE NETWORK</span>
          </li>
          <li className="flex items-start">
            <span className="inline-block mr-2 text-mictlai-gold">▸</span>
            <span><span className="font-medium text-mictlai-gold">MXNe (0x269caE7Dc59803e5C596c95756faEeBb6030E0aF):</span> MEXICAN PESO STABLECOIN ON BASE NETWORK</span>
          </li>
          <li className="flex items-start">
            <span className="inline-block mr-2 text-mictlai-gold">▸</span>
            <span><span className="font-medium text-mictlai-gold">USDC (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913):</span> USD COIN ON BASE NETWORK</span>
          </li>
          <li className="flex items-start">
            <span className="inline-block mr-2 text-mictlai-gold">▸</span>
            <span><span className="font-medium text-mictlai-gold">ETH:</span> NATIVE BASE CHAIN ETHEREUM</span>
          </li>
        </ul>
        
        <div className="mt-8 text-center">
          <button 
            onClick={onActivateAgent}
            className="pixel-btn px-6 py-3 font-pixel"
          >
            EXPLORE MARKETPLACE
          </button>
        </div>
      </section>
    </div>
  );
} 