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
          <h1 className="text-4xl font-pixel font-bold text-mictlai-gold mb-2 tracking-wider">MICTLAI</h1>
          <h2 className="text-xl text-mictlai-bone/80 mb-8 font-pixel">BRIDGING WORLDS BEYOND TIME</h2>
          
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
            <div className="text-2xl mb-2 pixel-pulse">⛓️</div>
            <h3 className="font-pixel font-bold text-mictlai-gold text-lg mb-2">CROSS-CHAIN BRIDGE</h3>
            <p className="text-mictlai-bone/70 font-pixel text-sm">
              TRANSFER ASSETS BETWEEN BASE, ARBITRUM, MANTLE, AND ZKSYNC ERA NETWORKS
            </p>
          </div>
          <div className="p-6 border-b-3 md:border-b-0 md:border-r-3 border-mictlai-gold/50">
            <div className="text-2xl mb-2 pixel-pulse">💰</div>
            <h3 className="font-pixel font-bold text-mictlai-gold text-lg mb-2">ATOMIC SWAPS</h3>
            <p className="text-mictlai-bone/70 font-pixel text-sm">
              EXECUTE TRUSTLESS CROSS-CHAIN TOKEN SWAPS WITHOUT INTERMEDIARIES
            </p>
          </div>
          <div className="p-6">
            <div className="text-2xl mb-2 pixel-pulse">🤖</div>
            <h3 className="font-pixel font-bold text-mictlai-gold text-lg mb-2">AI-POWERED</h3>
            <p className="text-mictlai-bone/70 font-pixel text-sm">
              INTELLIGENT ASSISTANCE FOR BLOCKCHAIN INTEROPERABILITY
            </p>
          </div>
        </div>
      </section>

      {/* Description */}
      <section className="mt-10 px-4 md:px-8 py-8 bg-black border-3 border-mictlai-gold/60 shadow-pixel-lg pixel-panel">
        <h2 className="text-2xl font-pixel font-bold text-mictlai-gold mb-4">ABOUT MICTLAI</h2>
        <div className="pixel-divider"></div>
        <p className="mb-4 text-mictlai-bone/80 font-pixel text-sm">
          IN THE ANCIENT AZTEC BELIEF SYSTEM, MICTLANTECUHTLI RULED THE UNDERWORLD, MICTLAN — A REALM WHERE SOULS JOURNEYED AFTER DEATH. 
          TODAY, IN THE DIGITAL AGE, MICTLAI EMERGES AS A GUARDIAN OF THE DECENTRALIZED WORLD, FACILITATING SEAMLESS 
          INTERACTIONS BETWEEN DISPARATE BLOCKCHAIN REALMS.
        </p>
        <p className="mb-4 text-mictlai-bone/80 font-pixel text-sm">
          HARNESSING THE POWER OF AI AND THE SECURITY OF EVM-COMPATIBLE WALLETS, MICTLAI ACTS AS AN AI-DRIVEN BRIDGE, 
          ENABLING TRUSTLESS, CONTRACT-FREE EXCHANGES ACROSS MULTIPLE BLOCKCHAINS.
        </p>
        
        <h3 className="text-xl font-pixel font-bold text-mictlai-gold mt-6 mb-3">SUPPORTED NETWORKS:</h3>
        <div className="pixel-divider"></div>
        <ul className="space-y-4 text-mictlai-bone/80 font-pixel text-sm">
          <li className="flex items-start">
            <span className="inline-block mr-2 text-mictlai-gold">▸</span>
            <span><span className="font-medium text-mictlai-gold">BASE NETWORK:</span> TRANSFER XOC TOKENS TO ARBITRUM</span>
          </li>
          <li className="flex items-start">
            <span className="inline-block mr-2 text-mictlai-gold">▸</span>
            <span><span className="font-medium text-mictlai-gold">ARBITRUM NETWORK:</span> TRANSFER MXNB TOKENS TO BASE</span>
          </li>
          <li className="flex items-start">
            <span className="inline-block mr-2 text-mictlai-gold">▸</span>
            <span><span className="font-medium text-mictlai-gold">MANTLE NETWORK:</span> BRIDGE ASSETS BETWEEN MANTLE AND OTHER NETWORKS</span>
          </li>
          <li className="flex items-start">
            <span className="inline-block mr-2 text-mictlai-gold">▸</span>
            <span><span className="font-medium text-mictlai-gold">ZKSYNC ERA:</span> TRANSFER USDT TOKENS TO AND FROM OTHER NETWORKS</span>
          </li>
        </ul>
        
        <div className="mt-8 text-center">
          <button 
            onClick={onActivateAgent}
            className="pixel-btn px-6 py-3 font-pixel"
          >
            EXPLORE MICTLAI
          </button>
        </div>
      </section>
    </div>
  );
} 