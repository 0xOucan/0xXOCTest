'use client';

import { PrivyProvider as PrivyClientProvider } from '@privy-io/react-auth';
import { celo } from 'viem/chains';
import { ReactNode } from 'react';
import { PRIVY_APP_ID } from '../config';

export function PrivyProvider({ children }: { children: ReactNode }) {
  return (
    <PrivyClientProvider
      appId={PRIVY_APP_ID}
      config={{
        appearance: {
          theme: 'light',
          accentColor: '#FBCC5C', // Celo yellow
          logo: 'https://cryptologos.cc/logos/celo-celo-logo.png',
          landingHeader: 'Connect your wallet to CeloMΔIND',
          loginMessage: 'Access the AI-powered DeFi interface on Celo'
        },
        // Only allow wallet connections, no social/email login
        loginMethods: ['wallet'],
        // Configure for Celo network
        defaultChain: celo,
        supportedChains: [celo],
        // Disable embedded wallets
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'off'
          }
        }
      }}
    >
      {children}
    </PrivyClientProvider>
  );
} 