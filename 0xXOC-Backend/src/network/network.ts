import { Network } from "@coinbase/agentkit";

// Extend the chain ID to network ID mapping to include Celo
export const CHAIN_ID_TO_NETWORK_ID: Record<number, string> = {
  84531: "base-sepolia",
  8453: "base-mainnet",
  42220: "celo", // Adding Celo mainnet
  44787: "celo-alfajores", // Adding Celo testnet (Alfajores)
  5000: "mantle-mainnet", // Adding Mantle mainnet
};

// Create the reverse mapping
export const NETWORK_ID_TO_CHAIN_ID = Object.entries(
  CHAIN_ID_TO_NETWORK_ID
).reduce((acc: Record<string, number>, [chainId, networkId]) => {
  acc[networkId] = Number(chainId);
  return acc;
}, {});

// Function to get a network object from network ID
export function getNetwork(networkId: string): Network {
  const chainId = NETWORK_ID_TO_CHAIN_ID[networkId];
  return {
    protocolFamily: "evm",
    networkId,
    chainId: chainId ? String(chainId) : undefined
  };
} 