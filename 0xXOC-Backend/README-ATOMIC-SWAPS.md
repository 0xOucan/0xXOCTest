# Cross-Chain Atomic Swaps: Base ↔ Arbitrum

This document explains how to set up and use the cross-chain atomic swap feature that allows exchanging tokens between Base and Arbitrum networks.

## Overview

The cross-chain atomic swap feature allows users to:
- Send XOC tokens on Base network and receive MXNB tokens on Arbitrum network
- Send MXNB tokens on Arbitrum network and receive XOC tokens on Base network

This is accomplished through an escrow service that:
1. Receives tokens from users on one network
2. Sends equivalent tokens to users on the other network

## Setup Instructions

### 1. Environment Variables

You need to set up the following environment variables in your `.env` file:

```
# Escrow wallet address (the wallet that holds tokens on both networks)
WALLET_ADDRESS=0x9c77c6fafc1eb0821F1De12972Ef0199C97C6e45

# Private key for the escrow wallet (required for the relay service)
# WARNING: Keep your private key secure! Never share it or commit it to version control.
ESCROW_PRIVATE_KEY=your_escrow_wallet_private_key_here
```

The `WALLET_ADDRESS` is used as the escrow address that receives tokens on both networks.
The `ESCROW_PRIVATE_KEY` is needed by the relay service to send tokens on both networks.

**IMPORTANT:** Make sure the private key corresponds to the wallet address. If there's a mismatch, the system will not be able to send tokens.

### 2. Verifying Wallet Setup

When the system starts up, it will verify that the private key generates the same wallet address as configured. If you see a warning like this:

```
⚠️ CRITICAL ERROR: The ESCROW_PRIVATE_KEY does not correspond to the configured ESCROW_WALLET_ADDRESS
Expected address: 0x9c77c6fafc1eb0821F1De12972Ef0199C97C6e45
Actual address from private key: 0x1Be31A94361a391bBaFB2a4CCd704F57dc04d4bb
```

You need to fix your `.env` file by either:
1. Updating the `WALLET_ADDRESS` to match the address derived from your private key
2. Updating the `ESCROW_PRIVATE_KEY` to the correct private key for the given wallet address

### 3. Funding the Escrow Wallet

The escrow wallet must be properly funded on both networks:

#### On Base:
- ETH for gas fees (≥ 0.01 ETH recommended)
- XOC tokens (at least enough to cover all expected MXNB → XOC swaps)

#### On Arbitrum:
- ETH for gas fees (≥ 0.01 ETH recommended)
- MXNB tokens (at least enough to cover all expected XOC → MXNB swaps)

⚠️ **Important:** Insufficient ETH on either network will cause the atomic swap to fail with "gas required exceeds allowance" errors.

### 4. Starting the Relay Service

The relay service starts automatically when you run the API server. It monitors for completed transactions on both networks and triggers the corresponding cross-chain transactions.

The service will check the escrow wallet's balances at startup and warn you if there are insufficient funds.

## How It Works

### XOC to MXNB Swap (Base to Arbitrum)

1. **User sends XOC to escrow on Base**:
   - User initiates a swap through the chat interface with "swap 0.01 XOC to MXNB"
   - Our system creates a transaction to send XOC tokens to the escrow wallet
   - User signs the transaction with their wallet on Base

2. **Relay service monitors for completed transactions**:
   - Once the Base transaction is confirmed
   - The relay service detects it and processes the swap

3. **Escrow sends MXNB to user on Arbitrum**:
   - The relay service calculates the equivalent amount of MXNB tokens
   - It creates and signs a transaction to send MXNB to the user's address
   - The transaction is submitted to the Arbitrum network

### MXNB to XOC Swap (Arbitrum to Base)

1. **User sends MXNB to escrow on Arbitrum**:
   - User initiates a swap through the chat interface with "swap 0.01 MXNB to XOC"
   - Our system creates a transaction to send MXNB tokens to the escrow wallet
   - User signs the transaction with their wallet on Arbitrum

2. **Relay service monitors for completed transactions**:
   - Once the Arbitrum transaction is confirmed
   - The relay service detects it and processes the swap

3. **Escrow sends XOC to user on Base**:
   - The relay service calculates the equivalent amount of XOC tokens
   - It creates and signs a transaction to send XOC to the user's address
   - The transaction is submitted to the Base network

## Troubleshooting

### "Escrow wallet address not configured"

Make sure you have `WALLET_ADDRESS` set in your `.env` file.

### "The ESCROW_PRIVATE_KEY does not correspond to the configured ESCROW_WALLET_ADDRESS"

This critical error indicates a mismatch between your configured wallet address and private key. Fix your `.env` file by making sure both values match and belong to the same wallet.

### "No tokens received after sending"

1. Check that the `ESCROW_PRIVATE_KEY` is correctly set in your `.env` file
2. Ensure the escrow wallet has sufficient tokens on the target network
3. Verify the escrow wallet has ETH for gas fees on the target network
4. Check the API server logs for any errors in the relay process

### "Transaction confirmation errors"

If you see errors like "invalid argument 0: json: cannot unmarshal hex string without 0x prefix", this indicates an issue with transaction hash formatting. We've fixed this in the latest version by ensuring:

1. The relay service uses the actual blockchain transaction hash (with 0x prefix) instead of internal transaction IDs
2. Transaction hashes are properly formatted before being passed to blockchain RPC methods

### "Gas required exceeds allowance" errors

This error typically means the escrow wallet doesn't have enough ETH to pay for the transaction gas. To fix:

1. Send more ETH to the escrow wallet address on the relevant network
2. Restart the API server to re-initialize the relay service
3. The pending swaps will be automatically processed once sufficient ETH is available

You can check the current ETH and token balances of the escrow wallet in the API server logs at startup.

## Security Considerations

- The escrow wallet's private key should be kept secure
- Consider using a dedicated wallet for the escrow service, not your personal wallet
- Regularly audit the escrow wallet's transaction history
- Implement limits on swap amounts to minimize risk

## Testing

To test the atomic swap functionality:

### XOC to MXNB:
1. Start the API and frontend servers
2. Connect your wallet
3. Use the chat to initiate a swap: "swap 0.01 XOC to MXNB"
4. Sign the transaction (on Base network)
5. The swap should complete automatically within a few minutes

### MXNB to XOC:
1. Start the API and frontend servers
2. Connect your wallet
3. Use the chat to initiate a swap: "swap 0.01 MXNB to XOC"
4. Sign the transaction (on Arbitrum network)
5. The swap should complete automatically within a few minutes 