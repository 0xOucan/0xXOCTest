# Environment Variables for 0xXOC P2P Exchange

This file describes the environment variables needed to run the 0xXOC P2P Exchange application.

## Required Variables

```
# Backend - OpenAI API Key (Optional in production, provided by users in frontend)
OPENAI_API_KEY=sk-your_openai_api_key_here

# Backend - Wallet Private Key (Required for escrow operations)
WALLET_PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

# Backend - Escrow Wallet Private Key (Optional, can fallback to WALLET_PRIVATE_KEY for testing)
ESCROW_WALLET_PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

# Escrow Wallet Addresses (Required for monitoring liquidity)
# Backend usage
BASE_ESCROW_ADDRESS=0x9c77c6fafc1eb0821F1De12972Ef0199C97C6e45
ARBITRUM_ESCROW_ADDRESS=your_arbitrum_escrow_address_here
MANTLE_ESCROW_ADDRESS=your_mantle_escrow_address_here
ZKSYNC_ESCROW_ADDRESS=your_zksync_escrow_address_here

# Frontend usage (Vite requires the VITE_ prefix for frontend environment variables)
VITE_BASE_ESCROW_ADDRESS=0x9c77c6fafc1eb0821F1De12972Ef0199C97C6e45
VITE_ARBITRUM_ESCROW_ADDRESS=your_arbitrum_escrow_address_here
VITE_MANTLE_ESCROW_ADDRESS=your_mantle_escrow_address_here
VITE_ZKSYNC_ESCROW_ADDRESS=your_zksync_escrow_address_here

# Backend - API Server Port
PORT=4000

# Frontend - API URL
VITE_API_URL=http://localhost:4000

# Node Environment
NODE_ENV=production
```

## Note for Production

In the production environment:
- The OpenAI API key is optional as users will provide their own keys via the frontend
- The wallet private key is required for escrow operations
- The escrow wallet addresses are required for the LiquidityMonitor component
- Frontend environment variables must have the VITE_ prefix to be accessible
- Set NODE_ENV to 'production' for optimized builds

## Note for Vercel Deployment

When deploying to Vercel:
1. Copy the contents of the code block above
2. Paste it into the Environment Variables section during project creation
3. Replace the placeholder values with your actual credentials
