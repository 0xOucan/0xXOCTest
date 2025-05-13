import {
  AgentKit,
  walletActionProvider,
  erc20ActionProvider,
  ViemWalletProvider,
} from "@coinbase/agentkit";

import { getLangChainTools } from "@coinbase/agentkit-langchain";
import { HumanMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import * as dotenv from "dotenv";
import * as readline from "readline";
import { TelegramInterface } from "./telegram-interface";
import "reflect-metadata";
import { ichiVaultActionProvider } from "./action-providers/ichi-vault";
import { aaveActionProvider } from "./action-providers/aave";
import { createPublicClient, http } from 'viem';
import { celo, base, arbitrum, mantle, zkSync } from 'viem/chains';
import { privateKeyToAccount } from "viem/accounts";
import { createWalletClient } from "viem";
import { balanceCheckerActionProvider } from "./action-providers/balance-checker";
import { mentoSwapActionProvider } from "./action-providers/mento-swap";
import { cUSDescrowforiAmigoP2PActionProvider } from "./action-providers/cUSDescrowforiAmigoP2P";
import { basicAtomicSwapActionProvider } from "./action-providers/basic-atomic-swaps";
import { tokenSellingOrderActionProvider } from "./action-providers/token-selling-order";
import { tokenBuyingOrderActionProvider } from "./action-providers/token-buying-order";
import { tokenBuyingOrderFillerActionProvider } from "./action-providers/token-buying-order-filler";
import { createPendingTransaction, pendingTransactions } from "./utils/transaction-utils";
import { startTokenBuyingOrderRelay } from "./services/token-buying-order-relay";
import { tokenSellingOrderFillerActionProvider } from "./action-providers/token-selling-order-filler";

dotenv.config();

// Interface type defined in transaction-utils module
import type { PendingTransaction } from './utils/transaction-utils';

/**
 * Validates that required environment variables are set
 */
function validateEnvironment(): void {
  const missingVars: string[] = [];

  const requiredVars = [
    "OPENAI_API_KEY",
    "WALLET_PRIVATE_KEY"
  ];
  
  // Optional but recommended variables
  const recommendedVars = [
    "ESCROW_WALLET_PRIVATE_KEY"
  ];
  
  requiredVars.forEach((varName) => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });

  if (missingVars.length > 0) {
    console.error("Error: Required environment variables are not set");
    missingVars.forEach((varName) => {
      console.error(`${varName}=your_${varName.toLowerCase()}_here`);
    });
    process.exit(1);
  }

  // Check for recommended variables and warn if missing
  const missingRecommended: string[] = [];
  recommendedVars.forEach((varName) => {
    if (!process.env[varName]) {
      missingRecommended.push(varName);
      console.warn(`Warning: Recommended variable ${varName} is not set`);
    }
  });
  
  // Set default for ESCROW_WALLET_PRIVATE_KEY if missing
  if (!process.env.ESCROW_WALLET_PRIVATE_KEY) {
    // Use the wallet private key as fallback for testing purposes
    console.warn("ESCROW_WALLET_PRIVATE_KEY not found, using WALLET_PRIVATE_KEY as fallback (for testing only)");
    process.env.ESCROW_WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;
  }

  console.log("Environment validated successfully");
}

validateEnvironment();

/**
 * Select network interactively
 */
async function selectNetwork(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("\nSelect network:");
  console.log("1. Base");
  console.log("2. Arbitrum");
  console.log("3. Mantle");
  console.log("4. zkSync Era");

  const answer = await new Promise<string>((resolve) => {
    rl.question("Enter network number (1-4): ", resolve);
  });
  
  rl.close();

  if (answer.trim() === "1") {
    return "base";
  } else if (answer.trim() === "2") {
    return "arbitrum";
  } else if (answer.trim() === "3") {
    return "mantle";
  } else if (answer.trim() === "4") {
    return "zkSync";
  }
  
  console.log("Invalid choice, defaulting to Base");
  return "base";
}

/**
 * Initialize the agent with CDP Agentkit
 *
 * @param options Optional parameters for non-interactive initialization
 * @returns Agent executor and config
 */
export async function initializeAgent(options?: { network?: string, nonInteractive?: boolean, walletAddress?: string }) {
  try {
    console.log("Initializing agent...");

    // Select network either interactively or from provided option
    const selectedNetwork = options?.nonInteractive 
      ? (options.network || "base") 
      : await selectNetwork();
      
    console.log(`Selected network: ${selectedNetwork}`);

    // Set the chain based on selected network
    let selectedChain;
    switch (selectedNetwork) {
      case "base":
        selectedChain = base;
        break;
      case "arbitrum":
        selectedChain = arbitrum;
        break;
      case "mantle":
        selectedChain = mantle;
        break;
      case "zkSync":
        selectedChain = zkSync;
        break;
      default:
        selectedChain = base;
        break;
    }

    // Create wallet provider
    let walletProvider;
    let connectedWalletAddress = options?.walletAddress;
    
    // Always use the environment private key for now, but track if we have a frontend wallet connected
    let privateKey = process.env.WALLET_PRIVATE_KEY;

    if (!privateKey) {
      throw new Error("Wallet private key not found in environment variables");
    }

    // Ensure private key has 0x prefix
    if (!privateKey.startsWith('0x')) {
      privateKey = `0x${privateKey}`;
    }

    // Validate private key format
    if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
      throw new Error("Invalid private key format. Must be a 0x-prefixed 32-byte hex string (64 characters after 0x)");
    }

    // Create Viem account and client
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    
    const transport = http(selectedChain.rpcUrls.default.http[0], {
      batch: true,
      fetchOptions: {},
      retryCount: 3,
      retryDelay: 100,
      timeout: 30_000,
    });

    const client = createWalletClient({
      account,
      chain: selectedChain,
      transport,
    });

    // Create Viem wallet provider with gas multipliers for better transaction handling
    walletProvider = new ViemWalletProvider(client, {
      gasLimitMultiplier: 1.2,
      feePerGasMultiplier: 1.1
    });
    
    // If we have a connected wallet from the frontend, use it for reference
    if (connectedWalletAddress) {
      console.log(`Connected wallet from frontend: ${connectedWalletAddress}`);
      
      // Make sure the address is valid
      if (!/^0x[0-9a-fA-F]{40}$/.test(connectedWalletAddress)) {
        console.warn(`Invalid wallet address format: ${connectedWalletAddress}. Using backend wallet instead.`);
      } else {
        console.log(`Patching wallet provider methods to use connected wallet: ${connectedWalletAddress}`);
        
        // 1. Patch nativeTransfer
        const origNativeTransfer = walletProvider.nativeTransfer.bind(walletProvider);
        walletProvider.nativeTransfer = async (to: `0x${string}`, value: string): Promise<`0x${string}`> => {
          console.log(`Intercepting nativeTransfer: to=${to}, value=${value}`);
          // Use the imported utility function
          const txId = createPendingTransaction(to, value, undefined, connectedWalletAddress);
          return `0x${txId.replace('tx-', '')}` as `0x${string}`;
        };
        
        // 2. Patch sendTransaction
        const origSendTx = walletProvider.sendTransaction.bind(walletProvider);
        walletProvider.sendTransaction = async (tx: any): Promise<`0x${string}`> => {
          // Convert BigInt to string to avoid JSON serialization issues
          const txForLogging = {
            ...tx,
            value: tx.value ? tx.value.toString() : '0',
          };
          
          console.log(`Intercepting sendTransaction:`, JSON.stringify(txForLogging, null, 2));
          
          // Use the imported utility function
          const txId = createPendingTransaction(
            tx.to, 
            tx.value ? tx.value.toString() : '0',
            tx.data,
            connectedWalletAddress
          );
          return `0x${txId.replace('tx-', '')}` as `0x${string}`;
        };
        
        // 3. Patch getAddress
        const origGetAddress = walletProvider.getAddress.bind(walletProvider);
        walletProvider.getAddress = (): string => {
          console.log(`Returning connected wallet address: ${connectedWalletAddress}`);
          return connectedWalletAddress;
        };
        
        // 4. Patch readContract (still use original but log)
        const origReadContract = walletProvider.readContract.bind(walletProvider);
        walletProvider.readContract = async (params: any) => {
          console.log(`Reading contract for connected wallet ${connectedWalletAddress}`);
          return origReadContract(params);
        };
        
        console.log("Wallet provider methods patched successfully");
      }
    }

    // Initialize LLM
    const llm = new ChatOpenAI({
      model: "gpt-4o-mini",
      temperature: 0,
    });

    console.log("LLM initialized");

    // Initialize AgentKit with action providers
    const agentkit = await AgentKit.from({
      walletProvider,
      actionProviders: [
        // Core providers
        walletActionProvider(),
        erc20ActionProvider(),
        
        // Include action providers based on selected network
        ...(selectedNetwork === "celo" ? [
          // Celo-specific providers
        ichiVaultActionProvider(),
        aaveActionProvider(),
        balanceCheckerActionProvider(),
        mentoSwapActionProvider(),
        cUSDescrowforiAmigoP2PActionProvider(),
        ] : []),
        
        // Include the multi-chain basic atomic swap provider for all networks
        basicAtomicSwapActionProvider(),
        
        // Include our token selling/buying order providers when on Base network
        ...(selectedNetwork === "base" ? [
          tokenSellingOrderActionProvider(),
          tokenBuyingOrderActionProvider(),
          tokenBuyingOrderFillerActionProvider(),
          tokenSellingOrderFillerActionProvider(),
        ] : []),
      ],
    });

    const tools = await getLangChainTools(agentkit);
    const memory = new MemorySaver();
    const agentConfig = {
      configurable: { thread_id: "MictlAItecuhtli Agent" },
    };

    const agent = createReactAgent({
      llm,
      tools,
      checkpointSaver: memory,
      messageModifier: `
        You are MictlAItecuhtli, an AI-powered multichain agent that helps users interact with the Base, Arbitrum, Mantle, and zkSync Era blockchain ecosystems.
        Your goal is to provide seamless cross-chain token swaps, balance checking, and liquidity management.
        
        Current Network: ${selectedNetwork} 
                          
        Current User Wallet: ${connectedWalletAddress || "Using default wallet"}

        💰 Available Functionality 💰
        
        🔹 MultiChain Balance Checker:
        - Check balances on Base, Arbitrum, Mantle, and zkSync Era networks
        - View specific token balances including ETH, XOC (on Base), MXNB (on Arbitrum), USDT (on Mantle), and USDT (on zkSync Era)
        - Get a detailed breakdown of your total portfolio value
        - Commands: 'check multichain balances', 'check token balance'
        
        🔹 Cross-Chain Atomic Swaps:
        - Swap XOC on Base for MXNB on Arbitrum
        - Swap XOC on Base for USDT on Mantle
        - Swap XOC on Base for USDT on zkSync Era
        - Swap MXNB on Arbitrum for XOC on Base
        - Swap MXNB on Arbitrum for USDT on Mantle
        - Swap MXNB on Arbitrum for USDT on zkSync Era
        - Swap USDT on Mantle for XOC on Base
        - Swap USDT on Mantle for MXNB on Arbitrum
        - Swap USDT on Mantle for USDT on zkSync Era
        - Swap USDT on zkSync Era for XOC on Base
        - Swap USDT on zkSync Era for MXNB on Arbitrum
        - Swap USDT on zkSync Era for USDT on Mantle
        - Monitor swap status with receipts
        - Seamless cross-chain token transfers without bridges
        - Commands: 'swap XOC to MXNB', 'swap 0.1 XOC to USDT on Mantle', 'swap 0.1 XOC to USDT on zkSync', 'get swap receipt'
        
        🔹 Liquidity Provision:
        - Provide XOC tokens as liquidity on Base
        - Provide MXNB tokens as liquidity on Arbitrum
        - Provide USDT tokens as liquidity on Mantle
        - Commands: 'provide XOC liquidity', 'provide 1.5 XOC as liquidity'
        
        ${
          selectedNetwork === "base" ? `
          🔹 Token Selling Orders:
          - Create selling orders for XOC, MXNe, and USDC tokens
          - List and view details of your selling orders
          - Cancel your active orders
          - Commands: 'create selling order for 10 XOC', 'list my selling orders', 'get selling order details'
          
          🔹 Token Buying Orders:
          - Create buying orders for XOC, MXNe, and USDC tokens using OXXO Spin vouchers
          - List and view details of your buying orders
          - Cancel your active orders
          - Commands: 'create buying order for 100 XOC with OXXO QR', 'list my buying orders', 'get buying order details'
          ` : ''
        }
        
        ${
          selectedNetwork === "celo" ? `
          🔹 Legacy Celo Functionality:
          - AAVE lending and borrowing
          - ICHI vault strategies
          - Mento swaps
          - iAmigo P2P cUSD escrow
          ` : ''
        }
        
        ${connectedWalletAddress ? `
        ⚠️ Important Wallet Guidance:
        - The user has connected their wallet with address ${connectedWalletAddress}
        - For transactions like swaps, token approvals, or lending actions, inform the user that they will need to confirm these actions in their wallet
        - When a transaction is needed, mention that their wallet will prompt them to sign the transaction
        - Emphasize the importance of reviewing transaction details before signing
        ` : ''}

        ⚠️ Important Notes:
        - XOC on Base is an overcollateralized stablecoin paired with MXN (Mexican Peso)
        - MXNB on Arbitrum is a fiat-backed stablecoin also paired with MXN
        - USDT on Mantle is a stablecoin pegged to USD
        - USDT on zkSync Era is a stablecoin pegged to USD
        - Atomic swaps have a ${0.5}% fee
        - All USD values are approximations based on current market prices
        - OXXO Spin QR codes are used to create buying orders with MXN (Mexican Pesos)

        First Steps:
        1) Greet the user and introduce yourself as MictlAItecuhtli.
        2) Check that the user is on the right network (Base, Arbitrum, Mantle, or zkSync Era recommended for cross-chain swaps).
        3) Recommend checking their multichain wallet balances.
        4) Explain that you can perform atomic swaps between Base, Arbitrum, Mantle, and zkSync Era without any bridges.
        5) Mention the ability to provide liquidity to the protocol.
        
        ${connectedWalletAddress ? `
        If the user requests a swap or transaction:
        1) Always process their request directly
        2) Don't ask permission or suggest checking balances first unless there's a clear need
        3) Provide the exact output of the transaction after it's processed
        4) Don't send follow-up messages about checking transaction status
        ` : ''}
      `,
    });

    console.log("Agent initialization complete");
    return { agent, config: agentConfig };
  } catch (error) {
    console.error("Failed to initialize agent:", error);
    throw error;
  }
}

/**
 * Run the agent autonomously with specified intervals
 */
async function runAutonomousMode(agent: any, config: any, interval = 10) {
  console.log("Starting autonomous mode...");

  while (true) {
    try {
      const thought =
        "Be creative and do something interesting on the blockchain. " +
        "Choose an action or set of actions and execute it that highlights your abilities.";

      const stream = await agent.stream(
        { messages: [new HumanMessage(thought)] },
        config,
      );

      for await (const chunk of stream) {
        if ("agent" in chunk) {
          console.log(chunk.agent.messages[0].content);
        } else if ("tools" in chunk) {
          console.log(chunk.tools.messages[0].content);
        }
        console.log("-------------------");
      }

      await new Promise((resolve) => setTimeout(resolve, interval * 1000));
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error:", error.message);
      }
      process.exit(1);
    }
  }
}

/**
 * Run demo mode with predefined commands
 */
async function runDemoMode(agent: any, config: any) {
  console.log("\n🚀 Starting MictlAI Demo Mode...\n");

  const demoCommands = [
    "check wallet balances",
    "view balance on Base",
    "view balance on Arbitrum",
    "view balance on Mantle",
    "approve 0.01 XOC for bridge on Base",
    "get quote for bridging 0.01 XOC from Base to Arbitrum",
    "initiate bridge transfer of 0.01 XOC from Base to Arbitrum",
    "check status of most recent transaction",
    "approve 0.005 USDT for bridge on Mantle",
    "get quote for bridging 0.005 USDT from Mantle to Base",
    "initiate bridge transfer of 0.005 USDT from Mantle to Base",
    "check status of most recent transaction",
    "approve 0.01 MXNB for bridge on Arbitrum",
    "get quote for bridging 0.01 MXNB from Arbitrum to Mantle",
    "initiate bridge transfer of 0.01 MXNB from Arbitrum to Mantle",
    "check wallet balances on all networks"
  ];

  for (const command of demoCommands) {
    try {
      console.log(`\n🤖 Executing: ${command}`);
      
      const stream = await agent.stream(
        { messages: [new HumanMessage(command)] },
        config
      );

      let finalResponse = "";
      for await (const chunk of stream) {
        if ("agent" in chunk) {
          finalResponse = chunk.agent.messages[0].content;
        }
      }
      
      console.log(finalResponse);
      // Add a small delay between commands
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`Error executing demo command '${command}':`, error);
      console.log(`⚠️ Error executing: ${command}\nContinuing with next command...`);
    }
  }

  console.log("\n✅ Demo completed! You've seen the main features of MictlAI:");
  console.log("1. Wallet balance checking across Base, Arbitrum and Mantle");
  console.log("2. Cross-chain bridging between Base, Arbitrum and Mantle");
  console.log("3. Atomic swap operations with XOC, MXNB, and USDT tokens");
  console.log("4. Token transfers and approvals");
  console.log("5. Transaction monitoring across all networks");
  console.log("\nType 'menu' to explore more commands!");
}

/**
 * Run the agent interactively based on user input
 */
async function runChatMode(agent: any, config: any) {
  console.log("Starting chat mode... Type 'exit' to end or 'demo' to run demo mode.");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> =>
    new Promise((resolve) => rl.question(prompt, resolve));

  try {
    while (true) {
      const userInput = await question("\nPrompt: ");

      if (userInput.toLowerCase() === "exit") {
        break;
      }

      if (userInput.toLowerCase() === "demo") {
        await runDemoMode(agent, config);
        continue;
      }

      let finalResponse = "";
      const stream = await agent.stream(
        { messages: [new HumanMessage(userInput)] },
        config,
      );

      // Show a minimal loading indicator
      process.stdout.write("Processing...");
      
      for await (const chunk of stream) {
        // Clear the loading indicator
        process.stdout.write("\r" + " ".repeat(12) + "\r");
        
        if ("agent" in chunk) {
          finalResponse = chunk.agent.messages[0].content;
        }
      }
      
      console.log(finalResponse);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error:", error.message);
    }
    process.exit(1);
  } finally {
    rl.close();
  }
}

/**
 * Run the Telegram interface mode
 */
async function runTelegramMode(agent: any, config: any) {
  console.log("Starting Telegram mode... Waiting for /start command");

  return new Promise<void>((resolve) => {
    const telegram = new TelegramInterface(agent, config, {
      onExit: () => {
        console.log("Exiting Telegram mode...");
        resolve();
      },
      onKill: () => {
        console.log("Kill command received. Shutting down...");
        process.exit(0);
      },
    });
  });
}

/**
 * Choose whether to run in autonomous, chat, or telegram mode
 */
async function chooseMode(): Promise<"chat" | "auto" | "telegram"> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> =>
    new Promise((resolve) => rl.question(prompt, resolve));

  while (true) {
    console.log("\nAvailable modes:");
    console.log("1. chat      - Interactive chat mode");
    console.log("2. telegram  - Telegram bot mode");
    console.log("3. auto      - Autonomous action mode");

    const choice = (await question("\nChoose a mode (enter number or name): "))
      .toLowerCase()
      .trim();

    rl.close();

    if (choice === "1" || choice === "chat") {
      return "chat";
    } else if (choice === "2" || choice === "telegram") {
      return "telegram";
    } else if (choice === "3" || choice === "auto") {
      return "auto";
    }
    console.log("Invalid choice. Please try again.");
  }
}

/**
 * Main entry point
 */
async function main() {
  try {
    console.log("Starting initialization...");
    const { agent, config } = await initializeAgent();
    console.log("Agent initialized successfully");

    while (true) {
      const mode = await chooseMode();
      console.log(`Selected mode: ${mode}`);

      if (mode === "chat") {
        await runChatMode(agent, config);
      } else if (mode === "telegram") {
        await runTelegramMode(agent, config);
      } else {
        await runAutonomousMode(agent, config);
      }

      // After any mode exits, we'll loop back to mode selection
      console.log("\nReturning to mode selection...");
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error("Fatal error:", error.message);
    }
    process.exit(1);
  }
}

main();
