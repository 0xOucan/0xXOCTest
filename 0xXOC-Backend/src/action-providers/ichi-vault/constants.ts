import { type Abi } from 'viem';

// 🏦 ICHI Vault Contract Addresses
export const ICHI_DEPOSIT_FORWARDER = "0x62fd1824C810906F449227F1f453528bb54774C2" as const;
export const ICHI_VAULT = "0xaCEa643370334558285DD94437fC4f6B25426fA1" as const; // CELO-USDT vault
export const ICHI_VAULT_USDC = "0xdCac915e2e98F2B9888898c2d69BcA89f764E690" as const; // CELO-USDC vault
export const CELO_TOKEN = "0x471ece3750da237f93b8e339c536989b8978a438" as const;
export const USDT_TOKEN = "0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e";
export const USDC_TOKEN = "0xceba9300f2b948710d2653dd7b07f33a8b32118c";

// 🔄 ICHI Deposit Forwarder ABI
export const ICHI_DEPOSIT_FORWARDER_ABI = [
  {
    inputs: [
      { name: "vault", type: "address" },
      { name: "vaultDeployer", type: "address" },
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "minimumProceeds", type: "uint256" },
      { name: "to", type: "address" }
    ],
    name: "forwardDepositToICHIVault",
    outputs: [{ name: "vaultTokens", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function"
  }
] as const;

// 🔐 ICHI Vault ABI (works for both USDT and USDC vaults)
export const ICHI_VAULT_ABI = [
  {
    inputs: [
      { internalType: "uint256", name: "shares", type: "uint256" },
      { internalType: "address", name: "to", type: "address" }
    ],
    name: "withdraw",
    outputs: [
      { internalType: "uint256", name: "amount0", type: "uint256" },
      { internalType: "uint256", name: "amount1", type: "uint256" }
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getTotalAmounts",
    outputs: [
      { internalType: "uint256", name: "total0", type: "uint256" },
      { internalType: "uint256", name: "total1", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "collectFees",
    outputs: [
      {
        internalType: "uint256",
        name: "fees0",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "fees1",
        type: "uint256"
      }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "token0",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "token1",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// 💰 CELO Token ABI
export const CELO_TOKEN_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// 🪙 ERC20 Token ABI
export const ERC20_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" }
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function"
  }
] as const;

// 🏭 ICHI Vault Factory details
export const ICHI_VAULT_FACTORY = "0xfacd9c86f7766a5171bb0f9927de808929429a47" as const;
export const VAULT_DEPLOYER = "0xfacd9c86f7766a5171bb0f9927de808929429a47" as const;

// ⚙️ Minimum proceeds - can be adjusted as needed
export const DEFAULT_MIN_PROCEEDS = "299125"; // For USDC strategy

/**
 * �� ABI for ICHI Vault Analytics
 */
export const ICHI_VAULT_ANALYTICS_ABI = [
  {
    inputs: [
      {
        internalType: "address",
        name: "vault",
        type: "address"
      }
    ],
    name: "getVaultAPR",
    outputs: [
      {
        internalType: "uint256",
        name: "apr",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  }
] as const;

/**
 * 📊 ICHI Vault Analytics contract address
 * This contract provides official APR calculations
 */
export const ICHI_VAULT_ANALYTICS = "0xaCEa643370334558285DD94437fC4f6B25426fA1" as const; 

/**
 * 🏷️ Vault Strategy Names
 */
export enum IchiVaultStrategy {
  CELO_USDT = "CELO-USDT",
  CELO_USDC = "CELO-USDC"
} 