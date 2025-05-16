# Environment Variables for 0xXOC P2P Exchange

This file describes the environment variables needed to run the 0xXOC P2P Exchange application on Vercel.

## Backend Environment Variables (Vercel Deployment)

```
# API Key (Optional in production, provided by users in frontend)
OPENAI_API_KEY=sk-your_openai_api_key_here

# Wallet Private Keys (Required for escrow operations)
WALLET_PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
ESCROW_WALLET_PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

# Escrow Wallet Addresses (Required for monitoring liquidity)
BASE_ESCROW_ADDRESS=0x9c77c6fafc1eb0821F1De12972Ef0199C97C6e45
ARBITRUM_ESCROW_ADDRESS=your_arbitrum_escrow_address_here
MANTLE_ESCROW_ADDRESS=your_mantle_escrow_address_here
ZKSYNC_ESCROW_ADDRESS=your_zksync_escrow_address_here

# Node Environment
NODE_ENV=production
```

## Frontend Environment Variables (Vercel Deployment)

```
# Escrow Wallet Addresses (Required for UI components)
VITE_BASE_ESCROW_ADDRESS=0x9c77c6fafc1eb0821F1De12972Ef0199C97C6e45
VITE_ARBITRUM_ESCROW_ADDRESS=your_arbitrum_escrow_address_here
VITE_MANTLE_ESCROW_ADDRESS=your_mantle_escrow_address_here
VITE_ZKSYNC_ESCROW_ADDRESS=your_zksync_escrow_address_here

# API URL (Will be set automatically in the deployed environment)
# For local development use:
# VITE_API_URL=http://localhost:4000
# For production, this will point to your Vercel deployment automatically
VITE_API_URL=/api

# Privy Authentication
VITE_PRIVY_APP_ID="use privy id"
```

## Setting up Environment Variables in Vercel

When deploying to Vercel:
1. Go to your project settings in Vercel dashboard
2. Navigate to the "Environment Variables" tab
3. Add each variable with its appropriate value
4. Make sure to set the correct environment scope (Production, Preview, Development)

### Monorepo Configuration in Vercel

When deploying a monorepo to Vercel:
1. The backend API can be accessed at the `/api` endpoint
2. All frontend assets will be served from the root
3. The frontend will automatically communicate with the backend at the `/api` endpoint
4. No need to set a separate PORT variable as Vercel handles this automatically
