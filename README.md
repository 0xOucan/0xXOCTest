# 💀 MictlAI 💀: AI-Powered Cross-Chain Bridge

[![MictlAI Demo Video](https://img.youtube.com/vi/-fRQruMqX_Y/0.jpg)](https://www.youtube.com/watch?v=-fRQruMqX_Y)

> 🏆 **ETH Cinco de Mayo Hackathon Project** - [View Submission](https://taikai.network/ethcdm/hackathons/ethcdm-2/projects/cma9asf3z0fw2u9xxkax97kvm/idea)  
> 🛠️ **Tracks**: Mantle, $MXNB, ZKsync  
> 📂 **Repository**: [GitHub](https://github.com/0xOucan/MictlAI)

## 📑 Table of Contents
- [The MictlAI Legend](#-the-mictlai-legend)
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
- [Cross-Chain Bridge Features](#-cross-chain-bridge-features)
- [Technical Documentation](#-technical-documentation)
- [Development History](#-development-history)
- [Contributing](#-contributing)
- [Contact](#-contact)
- [License](#-license)

## 🏺 The MictlAI Legend

In ancient Aztec mythology, **Mictlantecuhtli ruled Mictlán**, the underworld—a realm where souls journeyed after death, navigating nine challenging levels to reach their final destination.

Today, **💀MictlAI💀** emerges as a digital guardian of the blockchain underworld, facilitating seamless passage between disparate realms. Just as Mictlantecuhtli guided souls through Mictlan's levels, **MictlAI guides your assets across the complex landscape of multiple blockchains.**

The journey of your tokens—from **Base to Arbitrum, Mantle to zkSync Era**—mirrors the soul's journey through Mictlan's territories. With MictlAI as your guide, these journeys become seamless, secure, and swift.

Where **traditional bridges have failed through hacks and exploits**, **💀MictlAI💀**'s atomic swap mechanism creates a **direct, trustless pathway between blockchain worlds**—a pathway guarded by the wisdom of AI and the security of decentralized protocols.

## 🌟 Features

- 🌉 Seamless cross-chain transfers between Base, Arbitrum, Mantle, and zkSync Era
- ⚛️ Bidirectional atomic swaps for trustless token exchanges
- 💬 Natural language AI chat interface for cross-chain operations
- 👛 External wallet support with secure transaction handling
- 🔄 Real-time transaction monitoring and status tracking
- 💰 Real-time wallet balance tracking with USD conversion
- 📱 Responsive design for desktop and mobile devices
- 🔒 No private key storage - transactions require explicit wallet approval
- 🤖 Intelligent AI assistance for navigating blockchain interoperability
- 📈 Real-time market insights for informed decisions

## 🏗️ Architecture

The MictlAI project consists of two main components:

### Backend (celo-mind-dn)
```
celo-mind-dn/
├── src/                    # Source code
│   ├── action-providers/   # Cross-chain actions implementation
│   ├── api-server.ts       # API server for frontend integration
│   ├── chatbot.ts          # Core AI agent functionality
│   ├── services/           # Blockchain services
│   ├── telegram-interface.ts # Telegram bot interface
│   └── utils/              # Utility functions
├── dist/                   # Compiled JavaScript
├── node_modules/           # Dependencies
├── README.md               # Backend documentation
├── package.json            # Dependencies and scripts
└── tsconfig.json           # TypeScript configuration
```

### Frontend (celo-mind-web)
```
celo-mind-web/
├── src/                    # Source code
│   ├── components/         # React UI components
│   │   ├── ChatInterface.tsx # AI chat interface
│   │   ├── WalletBalances.tsx # Wallet balance display
│   │   └── TransactionMonitor.tsx # Transaction monitoring UI
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
- A browser extension wallet (MetaMask, Rabby, etc.) connected to Base, Arbitrum, Mantle, or zkSync Era networks

### Installation

```bash
# Clone both repositories
git clone https://github.com/0xOucan/celo-mind-dn.git
git clone https://github.com/0xOucan/celo-mind-web.git

# Use the launch script to start both services
cp celo-mind-dn/launch.sh ./
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
WALLET_PRIVATE_KEY=your_wallet_private_key_here  # Only needed for CLI/Telegram modes
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here  # Optional, for Telegram mode

# For frontend
VITE_API_URL=http://localhost:4000
```

> **Security Update**: With the latest version, private keys are no longer required for the web interface. All transactions are now signed directly using your browser extension wallet, significantly improving security.

## 🔗 Contract Information

### 📍 Network Contracts
- **Base Network**: `0xabc123...` (XOC token contract)
- **Arbitrum Network**: `0xdef456...` (MXNB token contract)
- **Mantle Network**: `0xghi789...` (USDT token contract)
- **zkSync Era Network**: `0xjkl012...` (USDT token contract)

#### 📊 Contract Statistics
- **Networks**: Base, Arbitrum, Mantle, and zkSync Era
- **Transaction Types**: Cross-chain atomic swaps, token transfers
- **View on Explorers**: [BaseScan](https://basescan.org), [ArbiScan](https://arbiscan.io), [MantleScan](https://mantlescan.xyz), [zkScan](https://era.zksync.network)

## 🛠️ Supported Networks

MictlAI seamlessly connects multiple blockchain networks:

### Base
- Transfer XOC tokens to Arbitrum (receive MXNB)
- Transfer XOC tokens to Mantle (receive USDT)
- Transfer XOC tokens to zkSync Era (receive USDT)

### Arbitrum
- Transfer MXNB tokens to Base (receive XOC)
- Transfer MXNB tokens to Mantle (receive USDT)
- Transfer MXNB tokens to zkSync Era (receive USDT)

### Mantle
- Transfer USDT tokens to Base (receive XOC)
- Transfer USDT tokens to Arbitrum (receive MXNB)
- Transfer USDT tokens to zkSync Era (receive USDT)

### zkSync Era
- Transfer USDT tokens to Base (receive XOC)
- Transfer USDT tokens to Arbitrum (receive MXNB)
- Transfer USDT tokens to Mantle (receive USDT)

## 🔌 Backend Integration

This web interface connects to the MictlAI backend API to process commands and execute blockchain operations.

### Communication Flow

1. **User Interface**: The web frontend collects user inputs through a conversational interface
2. **API Requests**: Frontend sends natural language commands to the `/api/agent/chat` endpoint
3. **AI Processing**: Backend processes commands using advanced AI and Agent Orchestration
4. **Blockchain Operations**: Backend creates transaction requests for the frontend wallet to sign
5. **Transaction Handling**: Frontend monitors and processes pending transactions with the connected wallet
6. **Response Handling**: Frontend displays results and updates wallet balances

### API Architecture

The API server is implemented in `src/api-server.ts` and provides:

- **Express Backend**: Lightweight and fast Node.js server
- **CORS Support**: Cross-origin requests for frontend integration
- **Streaming Responses**: Real-time updates during AI processing
- **Error Handling**: Robust error reporting for debugging
- **Wallet Connection**: Secure connection of browser extension wallets
- **Transaction Management**: Pending transaction tracking and status updates

## 🔑 Core Features

### Cross-Chain Operations
- Initiate cross-chain transfers with atomic swap security
- Monitor transaction status across all networks
- Verify transaction completion with explorer links

### Token Operations
- Check token balances with USD conversion
- Transfer tokens between wallets on the same network
- Approve token spending for cross-chain operations

### Bridge Operations
- Initiate atomic swaps between networks
- Verify transaction completion on both sides
- Recover from failed transactions with safety mechanisms

### Operating Modes
- 💬 Interactive web interface with AI chat
- 🤖 CLI mode for command-line operations
- 📱 Telegram bot interface for mobile access

## 🌐 Web Interface

MictlAI's web interface provides:

- 💬 Interactive AI chat interface for cross-chain commands
- 💰 Real-time wallet balance tracking with USD conversion
- 🌓 Light/Dark theme toggle with system preference detection
- 📱 Responsive design for desktop and mobile
- 🔒 Browser extension wallet integration (MetaMask, Rabby, etc.)
- 🔄 Transaction monitoring and signing directly from your wallet

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

### 4. LiquidityMonitor
Escrow wallet liquidity tracking with:
- Displays available liquidity of specific tokens (MXNB, USDT, XOC)
- Monitors balances across multiple chains (Base, Arbitrum, Mantle, zkSync)
- Direct link to Debank profile for detailed analysis

## 🔐 Security

### Smart Contract Security
- ✅ Proven contract track record
- 🔍 Continuous monitoring of all contract interactions
- 🛡️ Automated security checks before transactions

### User Security
- 🔒 No private key storage for web users - browser wallets only
- ✅ Explicit transaction approval required through wallet
- 🛡️ Cross-chain transaction verification
- 🔍 Clear transaction status monitoring
- 🚨 Comprehensive error handling
- 🔐 Network validation to ensure correct network connection

### Enhanced Backend Security
- 🔑 Secure transaction management with dedicated transaction utilities
- 📋 Centralized logging system for monitoring and troubleshooting
- 🚦 API rate limiting to prevent abuse and denial-of-service attacks

## 🔄 Cross-Chain Bridge Features

MictlAI implements a robust cross-chain bridging system:

1. **Multiple Networks**: Supports bridging between Base, Arbitrum, Mantle, and zkSync Era networks
2. **Multiple Tokens**: Transfer XOC, MXNB, and USDT tokens across chains
3. **Atomic Swaps**: Trustless cross-chain token swaps using an escrow mechanism
4. **Real-time Status**: Monitor swap progress across chains in real-time
5. **Fee Transparency**: Clear display of bridge fees (0.5%) and final received amount
6. **Explorer Integration**: Direct links to view transactions on BaseScan, ArbiScan, MantleScan, and zkSync Explorer

### Supported Bridges

| From | To | Tokens |
|------|----|----|
| Base | Arbitrum | XOC → MXNB |
| Arbitrum | Base | MXNB → XOC |
| Base | Mantle | XOC → USDT |
| Mantle | Base | USDT → XOC |
| Arbitrum | Mantle | MXNB → USDT |
| Mantle | Arbitrum | USDT → MXNB |
| Base | zkSync Era | XOC → USDT |
| zkSync Era | Base | USDT → XOC |
| Arbitrum | zkSync Era | MXNB → USDT |
| zkSync Era | Arbitrum | USDT → MXNB |
| Mantle | zkSync Era | USDT → USDT |
| zkSync Era | Mantle | USDT → USDT |

## 📚 Technical Documentation

### Protocol Examples

#### Bridge Commands
```
transfer 5 XOC from Base to Arbitrum
transfer 10 MXNB from Arbitrum to Base
transfer 5 XOC from Base to Mantle
transfer 1 USDT from Mantle to Base
transfer 10 MXNB from Arbitrum to Mantle
transfer 2 USDT from Mantle to Arbitrum
transfer 0.5 XOC from Base to zkSync Era
transfer 1 USDT from zkSync Era to Base
check status of transaction 0x123...
view balance on Base
view balance on Arbitrum
view balance on Mantle
view balance on zkSync Era
```

### Interface Examples

```
### 💰 **Complete Portfolio Overview** 💰
**Address**: `0x9c77c6fafc1eb0821F1De12972Ef0199C97C6e45`  
**Total Portfolio Value**: **$4.47 USD**

#### 💵 **Token Balances on Base** 💼
- 🟡 **XOC**: 1.32 ($0.66)

#### 💵 **Token Balances on Arbitrum** 💼
- 💵 **MXNB**: 0.28 ($0.28)

#### 💵 **Token Balances on Mantle** 💼
- 💵 **USDT**: 0.5 ($0.5)

#### 💵 **Token Balances on zkSync Era** 💼
- 💵 **USDT**: 1.0 ($1.0)
```

## 📝 Development History

### Backend Repository (celo-mind-dn)
- **Commit History**: [View All Commits](https://github.com/0xOucan/celo-mind-dn/commits/MictlAI/)
- **First MictlAI Commit**: [MictlAI Hola Mictlán](https://github.com/0xOucan/celo-mind-dn/commit/2ac63f0db5548f83f3edc70f71f42b5be79d0b56) - This commit marked the transformation of the project into MictlAI, including the implementation of cross-chain atomic swaps.

### Frontend Repository (celo-mind-web)
- **Commit History**: [View All Commits](https://github.com/0xOucan/celo-mind-web/commits/MictlAI/)
- **First MictlAI Commit**: [MictlAI Interface Initial Implementation](https://github.com/0xOucan/celo-mind-web/commit/5a869181adea6f52ded957bdfcedf61a9a8c9203) - Initial implementation of the MictlAI web interface with AI chat and cross-chain bridging capabilities.

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
