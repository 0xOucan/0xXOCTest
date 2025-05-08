// cUSDescrowforiAmigoP2P constants
export const ESCROW_WALLET_ADDRESS = "0x9c77c6fafc1eb0821F1De12972Ef0199C97C6e45"; // Escrow agent wallet

// Default buyer wallet address
export const DEFAULT_BUYER_WALLET_ADDRESS = "0x192E35d75e3725509ecA92C0A5185d6245E38182";

// Token constants (from Celo blockchain)
export const CUSD_TOKEN_ADDRESS = "0x765DE816845861e75A25fCA122bb6898B8B1282a"; // cUSD (Celo Dollar)

// Token decimals for formatting
export const CUSD_DECIMALS = 18;

// Min/max order amounts (in cUSD)
export const MIN_ORDER_AMOUNT = 0.001;
export const MAX_ORDER_AMOUNT = 0.025;

// Conversion rate: 0.025 cUSD = 500 MXN
export const MXN_TO_CUSD_RATE = 500 / 0.025; // 20000 MXN per cUSD

// ERC20 Token ABI for transfer function
export const ERC20_ABI = [
  {
    constant: false,
    inputs: [
      {
        name: "to",
        type: "address",
      },
      {
        name: "amount",
        type: "uint256",
      },
    ],
    name: "transfer",
    outputs: [
      {
        name: "",
        type: "bool",
      },
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const; 