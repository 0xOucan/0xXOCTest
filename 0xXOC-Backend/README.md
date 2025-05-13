# 🏛️ 0xXOC Backend: P2P Token Marketplace API

## 📑 Table of Contents
- [Overview](#-overview)
- [Features](#-features)
- [Contract Information](#-contract-information)
- [Quick Start](#-quick-start)
- [Supported Tokens](#-supported-tokens)
- [Core Features](#-core-features)
- [API Server](#-api-server)
- [Web Interface](#-web-interface)
- [Technical Documentation](#-technical-documentation)
- [Security](#-security)
- [Resources](#-resources)

## 🌟 Overview

0xXOC is a P2P token marketplace that enables seamless trading between Mexican Pesos (MXN) and various cryptocurrencies on the Base network. Our platform leverages Coinbase's Agent Kit for secure escrow services and OXXO Spin QR codes for fiat on/off ramps. The 0xXOC backend provides:

- 🏦 P2P marketplace for MXN-to-cryptocurrency trading
- 🧾 OXXO Spin QR code integration for Mexican Peso deposits
- 🔐 Secure escrow wallet system with USDC, MXNe, XOC, and ETH support
- 🔄 Automated order matching and fulfillment
- 🤖 AI-powered assistance for transaction validation

## 🚀 Features

The 0xXOC backend implements several key features:

### 🛒 P2P Marketplace
- ✅ **Buying Orders**: Create and fulfill buying orders with OXXO Spin QR codes
- ✅ **Selling Orders**: Create and fulfill selling orders with OXXO payments
- ✅ **Order Management**: Track, cancel, and view detailed order history
- ✅ **Escrow System**: Secure trading with automated escrow contract

### 🔐 Security Enhancements
- ✅ **Wallet Integration**: Browser extension wallet signing instead of storing private keys
- 🔑 **Transaction Handling**: Secure browser wallet signatures for all transactions
- 🔒 **QR Code Encryption**: End-to-end encryption for OXXO Spin QR code data
- 🔍 **Transaction Verification**: Coinbase Agent Kit verification for all transactions

### 📊 Technical Infrastructure
- 📋 **Centralized Logging**: Structured logging system with multiple severity levels
- 🚦 **Rate Limiting**: API rate limiting to prevent abuse and DOS attacks
- ⚡ **Error Handling**: Enhanced error reporting with specific error types and better context
- 📚 **API Documentation**: Comprehensive API documentation for frontend integration

## 🔗 Contract Information

### 📍 Supported Tokens on Base Network
- **USDC**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` - USD Coin on Base
- **MXNe**: `0x269caE7Dc59803e5C596c95756faEeBb6030E0aF` - Mexican Peso stablecoin on Base
- **XOC**: `0xa411c9Aa00E020e4f88Bc19996d29c5B7ADB4ACf` - Base chain Mexican Peso paired CDP stable coin
- **ETH**: Native Base chain Ethereum token

### 📊 Token Statistics
- **View on Explorer**: [BaseScan](https://basescan.org)
- **Escrow Wallet**: [0x9c77c6fafc1eb0821F1De12972Ef0199C97C6e45](https://basescan.org/address/0x9c77c6fafc1eb0821F1De12972Ef0199C97C6e45)

## 🚀 Quick Start

### Prerequisites
- Node.js v16+
- npm v7+
- A browser extension wallet (MetaMask, Rabby, etc.) connected to Base network
- OpenAI API key for AI-powered transaction validation

### Installation

```bash
# Clone both repositories
git clone https://github.com/yourusername/0xXOC-Backend.git
git clone https://github.com/yourusername/0xXOC-Frontend.git

# Use the launch script to start both services
cp 0xXOC-Backend/launch.sh ./
chmod +x launch.sh
./launch.sh
```

### Environment Setup

Required in your `.env` file:
```
OPENAI_API_KEY=your_openai_api_key_here
WALLET_PRIVATE_KEY=your_wallet_private_key_here  # For escrow wallet operations
ESCROW_WALLET_PRIVATE_KEY=your_escrow_wallet_private_key_here  # Optional, falls back to WALLET_PRIVATE_KEY
```

> **Security Note**: The escrow wallet private key is only required for the API server to process escrow operations. Users connect to the marketplace using their browser extension wallets without exposing private keys.

### Running Tests

The project includes comprehensive unit tests:

```bash
# Run all tests
npm test

# Run tests with watch mode (for development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## 🛠️ Supported Tokens

0xXOC marketplace supports the following tokens on the Base network:

### USDC (💵)
- USD Coin on Base network
- Contract: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
- Decimals: 6
- Buy with MXN through OXXO Spin QR codes
- Sell for MXN payment

### MXNe (🪙)
- Mexican Peso stablecoin on Base network backed by tokenized CETES
- Contract: 0x269caE7Dc59803e5C596c95756faEeBb6030E0aF
- Decimals: 6
- Buy with MXN through OXXO Spin QR codes
- Sell for MXN payment
- Visit [Brale.xyz/stablecoins/MXNe](https://brale.xyz/stablecoins/MXNe) for more information

### XOC (🍫)
- Base chain Mexican Peso paired CDP stable coin
- Contract: 0xa411c9Aa00E020e4f88Bc19996d29c5B7ADB4ACf
- Decimals: 18
- Buy with MXN through OXXO Spin QR codes
- Sell for MXN payment
- Visit [Xocolatl Finance](https://www.xocolatl.finance/) for more information

### ETH (💎)
- Native Base chain Ethereum
- Decimals: 18
- Buy with MXN through OXXO Spin QR codes
- Sell for MXN payment

## 🔑 Core Features

### Marketplace Operations
- Create buying orders with specific tokens and MXN amounts
- Create selling orders with tokens held in your wallet
- Fill existing orders with OXXO Spin QR codes or token transfers
- Cancel your orders and recover escrowed assets
- Track all your marketplace activity in real-time

### Token Operations
- Check token balances with USD conversion
- Transfer tokens between wallets on Base network
- Approve token spending for marketplace operations

### OXXO Integration
- Upload and process OXXO Spin QR codes
- Validate QR code data and expiration
- Securely store and retrieve QR code images
- End-to-end encryption for sensitive payment data

### Safety Features
- Pre-transaction wallet validation
- Balance and allowance verification
- Detailed error messages
- Transaction confirmation monitoring
- Escrow wallet security with multi-layer protection

## 🔌 API Server

0xXOC includes a built-in API server that powers the frontend marketplace and provides comprehensive endpoints for all marketplace functionality.

### API Architecture

The API server is implemented in `src/api-server.ts` and provides:

- **Express Backend**: Lightweight and fast Node.js server
- **CORS Support**: Cross-origin requests for frontend integration
- **Streaming Responses**: Real-time updates during processing
- **Error Handling**: Robust error reporting for debugging
- **Wallet Connection**: Secure connection of browser extension wallets
- **Transaction Management**: Pending transaction tracking and status updates
- **AI Verification**: Optional AI-powered transaction validation using Coinbase Agent Kit

### Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/wallet/connect` | POST | Connect a browser extension wallet address |
| `/api/transactions/pending` | GET | Retrieve pending transactions that need wallet signatures |
| `/api/transactions/:txId/update` | POST | Update transaction status after signing |
| `/api/selling-orders` | GET | Get all selling orders matching specified criteria |
| `/api/selling-orders` | POST | Create a new selling order |
| `/api/selling-orders/:orderId` | GET | Get details for a specific selling order |
| `/api/selling-orders/:orderId/fill` | POST | Fill a selling order with OXXO QR code |
| `/api/buying-orders` | GET | Get all buying orders matching specified criteria |
| `/api/buying-orders` | POST | Create a new buying order |
| `/api/buying-orders/:orderId` | GET | Get details for a specific buying order |
| `/api/buying-orders/:orderId/fill` | POST | Fill a buying order with token transfer |
| `/api/health` | GET | Health check endpoint for monitoring |

### Starting the API Server

```bash
# Start the API server
npm run api

# Or to run in production with PM2
npm run api:prod
```

## 🌐 Web Interface

0xXOC has a companion web interface available in the [0xXOC-Frontend](https://github.com/yourusername/0xXOC-Frontend) repository that provides:

- 💰 Token marketplace with buying and selling order creation
- 🧾 OXXO Spin QR code scanning and processing
- 👛 Browser extension wallet integration
- 💼 Order management and transaction history
- 📊 Wallet and escrow balance monitoring
- 🌓 Light/Dark theme toggle

### Connection Setup

To connect the web interface to the backend, use the included launch script:

```bash
# In the root directory
./launch.sh
```

This script:
1. Starts the API server on port 4000
2. Starts the frontend server on port 5173
3. Handles dependency installation
4. Monitors both processes

## 📚 Technical Documentation

### API Examples

#### Marketplace Commands
```
# Create a selling order
POST /api/selling-orders
{
  "token": "XOC",
  "amount": "100",
  "mxnAmount": "100",
  "memo": "Optional note about the order"
}

# Fill a selling order
POST /api/selling-orders/:orderId/fill
{
  "qrCodeData": "OXXO Spin QR Code JSON data"
}

# Create a buying order
POST /api/buying-orders
{
  "token": "XOC",
  "tokenAmount": "100",
  "mxnAmount": 100,
  "qrCodeData": "OXXO Spin QR Code JSON data",
  "memo": "Optional note about the order"
}

# Fill a buying order
POST /api/buying-orders/:orderId/fill
```

### Error Handling
0xXOC handles various error scenarios with clear messaging:
- Insufficient balances
- Invalid QR code data
- Invalid order status
- Transaction failures
- Input validation failures
- Authorization failures

## 🔐 Security

### Smart Contract Security
- ✅ Proven token contracts with audit history
- 🔍 Continuous monitoring of all escrow operations
- 🛡️ Automated security checks before transactions

### User Security
- 🔒 No private key storage for users - browser wallets only
- ✅ Explicit transaction approval required through wallet
- 🛡️ End-to-end encryption for payment data
- 🔍 Clear transaction status monitoring
- 🚨 Comprehensive error handling

### Enhanced Backend Security
- 🔑 Secure transaction management with dedicated transaction utilities
- 📋 Centralized logging system for monitoring and troubleshooting
- 🚦 API rate limiting to prevent abuse and denial-of-service attacks
- 🛑 Improved input validation across all endpoints
- 🧩 Modular error handling with context-rich errors
- 🔒 Transaction status management with verification

### Best Practices
- 📝 Regular security audits
- 🚫 No storage of sensitive data in plaintext
- 📊 Real-time transaction monitoring
- ⚡ Rate limiting for API calls
- 🔄 Automatic session timeouts
- 🧪 Comprehensive unit testing for critical components

## 🔗 Resources

### Repository Links
- **Backend (0xXOC-Backend)**: [GitHub Repository](https://github.com/yourusername/0xXOC-Backend)
- **Frontend (0xXOC-Frontend)**: [GitHub Repository](https://github.com/yourusername/0xXOC-Frontend)

### Contact & Social
- **Twitter**: [@0xoucan](https://x.com/0xoucan)

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) file for details.