# 🏛️ 0xXOC: P2P Token Marketplace for Mexico

## 📑 Table of Contents
- [Overview](#-overview)
- [Problem Statement](#-problem-statement)
- [Solution](#-solution)
- [Features](#-features)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Contract Information](#-contract-information)
- [Supported Networks](#-supported-networks)
- [Backend Integration](#-backend-integration)
- [Core Features](#-core-features)
- [Web Interface](#-web-interface)
- [Key Components](#-key-components)
- [Security](#-security)
- [Marketplace Features](#-marketplace-features)
- [Technical Documentation](#-technical-documentation)
- [Contributing](#-contributing)
- [Contact](#-contact)
- [License](#-license)

## 🌟 Overview

0xXOC is a peer-to-peer marketplace platform that bridges the gap between Mexican Pesos (MXN) and cryptocurrencies through seamless integration with OXXO Spin QR codes. By leveraging Mexico's most accessible payment method, we're making crypto accessible to everyone in Mexico - regardless of technical expertise or banking status.

## 🇲🇽 Problem Statement

In Mexico, many people face significant barriers when trying to access cryptocurrency:

- **Complex KYC Processes**: Traditional crypto exchanges require extensive verification procedures
- **Technical Barriers**: Many platforms assume technical knowledge that average users don't possess
- **Banking Limitations**: Not all Mexicans have access to bank accounts or credit cards required by exchanges
- **Trust Issues**: Concerns about security and fraud prevent many from exploring crypto options

Meanwhile, OXXO stores are ubiquitous in Mexico (19,000+ locations), and the OXXO Spin app has become a widely adopted payment method with a simplified KYC process that millions of Mexicans already use daily.

## 💡 Solution

0xXOC connects these two worlds by building a bridge between OXXO Spin QR codes and cryptocurrency:

1. **Simplified Access**: Users can buy crypto using OXXO Spin QR codes they're already familiar with
2. **Trusted Environment**: The platform uses a secure escrow system to protect both buyers and sellers
3. **Local Integration**: Designed specifically for the Mexican market and local payment methods
4. **No Technical Barriers**: User-friendly interface with straightforward buying and selling processes
5. **Direct P2P Trading**: Connects buyers and sellers directly without centralized exchange fees

## 🌟 Features

- 🛒 Create and browse buying/selling orders for cryptocurrency
- 💸 Seamless integration with OXXO Spin QR codes for fiat payments
- 🏦 Support for multiple tokens: XOC, MXNe, USDC, and ETH on Base network
- 👛 External wallet support with secure transaction handling
- 🔐 Secure escrow system for protected trades
- 🔄 Real-time transaction monitoring and status tracking
- 💰 Wallet balance tracking with USD conversion
- 🌓 Light/Dark theme toggle with system preference detection
- 📱 Responsive design for desktop and mobile devices
- 🔒 Enhanced security with browser extension wallet integration

## 🏗️ Architecture

The 0xXOC project consists of two main components:

### Backend (0xXOC-Backend)
```
0xXOC-Backend/
├── src/                    # Source code
│   ├── marketplace/        # P2P marketplace implementation
│   ├── api-server.ts       # API server for frontend integration
│   ├── services/           # Blockchain and QR code services
│   ├── utils/              # Utility functions
│   └── security/           # Security and encryption utilities
├── dist/                   # Compiled JavaScript
├── node_modules/           # Dependencies
├── README.md               # Backend documentation
├── package.json            # Dependencies and scripts
└── tsconfig.json           # TypeScript configuration
```

### Frontend (0xXOC-Frontend)
```
0xXOC-Frontend/
├── src/                    # Source code
│   ├── components/         # React UI components
│   │   ├── WalletBalances.tsx # Wallet balance display
│   │   ├── TransactionMonitor.tsx # Transaction monitoring UI
│   │   ├── OrdersDisplay.tsx # Marketplace orders display
│   │   └── QrCodeUploader.tsx # QR code upload and processing
│   ├── providers/          # Context providers
│   ├── services/           # API and blockchain services
│   └── App.tsx             # Main application component
├── public/                 # Static assets
├── build/                  # Production build
├── node_modules/           # Dependencies
├── README.md               # Frontend documentation
└── package.json            # Dependencies and scripts
```

## 🚀 Getting Started

### Prerequisites
- Node.js v16+
- npm v7+
- A browser extension wallet (MetaMask, Rabby, etc.) connected to Base network

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

The launch script automatically:
1. Installs dependencies for both repositories
2. Starts the backend API server
3. Starts the frontend development server
4. Connects them together with proper configuration

### Environment Setup

Required in your `.env` file:
```
OPENAI_API_KEY=your_openai_api_key_here
WALLET_PRIVATE_KEY=your_wallet_private_key_here  # Only for escrow wallet operations
ESCROW_WALLET_PRIVATE_KEY=your_escrow_private_key_here  # Optional

# For frontend
VITE_API_URL=http://localhost:4000
VITE_BASE_EXPLORER_URL=https://basescan.org
VITE_PRIVY_APP_ID=your_privy_app_id
VITE_ESCROW_WALLET_ADDRESS=0x9c77c6fafc1eb0821F1De12972Ef0199C97C6e45
```

> **Security Note**: Private keys are only required for the backend escrow operations. Users connect using browser extension wallets without exposing private keys.

## 🔗 Contract Information

### 📍 Supported Tokens on Base Network
- **USDC** (💵): `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` - USD Coin on Base
- **MXNe** (🪙): `0x269caE7Dc59803e5C596c95756faEeBb6030E0aF` - Mexican Peso stablecoin backed by tokenized CETES
- **XOC** (🍫): `0xa411c9Aa00E020e4f88Bc19996d29c5B7ADB4ACf` - Base chain Mexican Peso paired CDP stable coin
- **ETH** (💎): Native Base chain Ethereum

### 📊 Token Statistics
- **Explorer**: [BaseScan](https://basescan.org)
- **Escrow Wallet**: [0x9c77c6fafc1eb0821F1De12972Ef0199C97C6e45](https://basescan.org/address/0x9c77c6fafc1eb0821F1De12972Ef0199C97C6e45)

## 🛠️ Supported Networks

0xXOC currently operates on the Base network, with support for:

- **Base**: Fast, low-cost network with all supported tokens (USDC, MXNe, XOC, ETH)
- **Future Networks**: Expansion to additional networks planned based on community feedback

## 🔌 Backend Integration

This platform connects the web interface to the 0xXOC backend API to process marketplace orders and execute blockchain operations.

### Communication Flow

1. **User Interface**: The web frontend collects user inputs for creating or filling orders
2. **API Requests**: Frontend sends order data and OXXO QR codes to appropriate endpoints
3. **Order Processing**: Backend processes orders and manages the escrow system
4. **Blockchain Operations**: Backend creates transaction requests for the frontend wallet to sign
5. **Transaction Handling**: Frontend monitors and processes pending transactions with the connected wallet
6. **Response Handling**: Frontend displays results and updates wallet balances

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

## 🌐 Web Interface

0xXOC's web interface provides:

- 🛒 Token marketplace with buying and selling order creation
- 🧾 OXXO Spin QR code scanning and processing
- 👛 Browser extension wallet integration (MetaMask, Rabby, etc.)
- 🔄 Transaction monitoring and status tracking
- 💰 Real-time wallet balance with USD conversion
- 🌓 Light/Dark theme based on system preference

## 🧩 Key Components

### 1. WalletContext
The central wallet management system provides:
- Wallet connection state management
- Backend synchronization
- Address tracking and formatting
- Integration with Privy authentication

### 2. TransactionMonitor
Monitors and processes transactions by:
- Polling for pending transactions
- Creating wallet clients for signing
- Network validation and switching
- Transaction status tracking
- Error handling with helpful messages

### 3. WalletBalances
Real-time balance tracking with:
- Direct blockchain data fetching with viem
- USD conversion with market prices
- Visual indicators for token types
- One-click refresh functionality
- Blockchain explorer integration for verification

### 4. OrdersDisplay
Marketplace orders management:
- Display active and historical orders
- Create new buying and selling orders
- Fill existing orders with the appropriate assets
- Cancel your own active orders
- Filter and search through available orders

### 5. QrCodeHandler
Processes OXXO Spin QR codes:
- Secure upload and parsing of QR code data
- QR code image encryption and storage
- QR code decryption for verified buyers
- Validation of QR code data and expiration
- Status tracking for QR code redemption

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

## 🛒 Marketplace Features

0xXOC implements a comprehensive P2P marketplace system:

### Order Types

1. **Buying Orders**:
   - User provides an OXXO Spin QR code with MXN amount
   - Specifies which token and amount they want to buy
   - QR code is encrypted and stored securely
   - Sellers can fill the order by transferring tokens

2. **Selling Orders**:
   - User escrows tokens they want to sell
   - Specifies the MXN amount they want to receive
   - Buyers can fill the order with an OXXO Spin QR code
   - Once verified, tokens are released to the buyer

### Escrow System

The 0xXOC marketplace uses a secure escrow system to protect all trades:
- Tokens are held in escrow during the trading process
- Escrow is controlled by smart contracts and verified by Coinbase Agent Kit
- All transactions are recorded on-chain for full transparency
- Escrow is only released when all conditions are met

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

## 👨‍💻 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📧 Contact

- Twitter: [@0xoucan](https://x.com/0xoucan)

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) file for details.
