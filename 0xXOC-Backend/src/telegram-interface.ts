import TelegramBot from "node-telegram-bot-api";
import { HumanMessage } from "@langchain/core/messages";

interface TelegramInterfaceOptions {
  onExit: () => void;
  onKill: () => void;
}

export class TelegramInterface {
  private bot: TelegramBot;
  private agent: any;
  private config: any;
  private options: TelegramInterfaceOptions;
  private isStarted: boolean = false;

  constructor(agent: any, config: any, options: TelegramInterfaceOptions) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error("TELEGRAM_BOT_TOKEN must be provided!");
    }

    this.bot = new TelegramBot(token, { polling: true });
    this.agent = agent;
    this.config = config;
    this.options = options;

    this.setupHandlers();
    console.log("Telegram bot initialized. Waiting for /start command...");
  }

  private setupHandlers() {
    // Handle /start command
    this.bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      this.isStarted = true;
      console.log(
        `Telegram session started by user ${msg.from?.username || msg.from?.id}`,
      );
      this.bot.sendMessage(
        chatId,
        "👋 Hello! I am MictlAI, an AI-powered cross-chain bridge connecting Base, Arbitrum, and Mantle networks. 🤖\n\n" +
        "🚀 Use /menu to see all available commands.\n\n" +
        "⚙️ Use /exit to return to terminal or /kill to shut down the application.",
        { parse_mode: "Markdown" }
      );
    });

    // Handle /menu command
    this.bot.onText(/\/menu/, (msg) => {
      const chatId = msg.chat.id;
      
      const walletOptions = [
        "💼 **Wallet Check** - `check wallet balances`",
        "💰 **Get Address** - `get wallet address`",
        "💸 **Token Transfer** - `send 0.1 XOC to 0x123...`"
      ];
      
      const baseOptions = [
        "🔍 **Check Base** - `check balance on Base`",
        "💱 **Bridge from Base** - `transfer 0.1 XOC from Base to Arbitrum`",
        "💱 **Bridge to Mantle** - `transfer 0.1 XOC from Base to Mantle`",
        "💱 **Bridge to zkSync** - `transfer 0.1 XOC from Base to zkSync`"
      ];
      
      const arbitrumOptions = [
        "🔍 **Check Arbitrum** - `check balance on Arbitrum`",
        "💱 **Bridge from Arbitrum** - `transfer 0.1 MXNB from Arbitrum to Base`",
        "💱 **Bridge to Mantle** - `transfer 0.1 MXNB from Arbitrum to Mantle`",
        "💱 **Bridge to zkSync** - `transfer 0.1 MXNB from Arbitrum to zkSync`"
      ];
      
      const mantleOptions = [
        "🔍 **Check Mantle** - `check balance on Mantle`",
        "💱 **Bridge from Mantle** - `transfer 0.1 USDT from Mantle to Base`",
        "💱 **Bridge to Arbitrum** - `transfer 0.1 USDT from Mantle to Arbitrum`",
        "💱 **Bridge to zkSync** - `transfer 0.1 USDT from Mantle to zkSync`"
      ];
      
      const zkSyncOptions = [
        "🔍 **Check zkSync** - `check balance on zkSync`",
        "💱 **Bridge from zkSync** - `transfer 0.1 USDT from zkSync to Base`",
        "💱 **Bridge to Arbitrum** - `transfer 0.1 USDT from zkSync to Arbitrum`",
        "💱 **Bridge to Mantle** - `transfer 0.1 USDT from zkSync to Mantle`"
      ];
      
      const otherOptions = [
        "✅ **Approve Token** - `approve 10 XOC for bridge`",
        "📋 **Swap Status** - `get swap receipt swap-12345`",
        "❓ **Help** - `help me with bridging`",
        "❓ **/help_base** - Get Base Network commands",
        "❓ **/help_arbitrum** - Get Arbitrum Network commands",
        "❓ **/help_mantle** - Get Mantle Network commands",
        "❓ **/help_zksync** - Get zkSync Era Network commands",
        "❓ **/help_bridge** - Get bridge commands",
        "🚪 **/exit** - Return to terminal",
        "⚠️ **/kill** - Shut down application"
      ];
      
      const menuText = `
🤖 *MictlAI Bridge Assistant Menu* 🤖

💼 **WALLET COMMANDS:**
${walletOptions.join("\n")}

🔵 **BASE NETWORK:**
${baseOptions.join("\n")}

🟣 **ARBITRUM NETWORK:**
${arbitrumOptions.join("\n")}

🟢 **MANTLE NETWORK:**
${mantleOptions.join("\n")}

🟪 **ZKSYNC NETWORK:**
${zkSyncOptions.join("\n")}

🛠️ **OTHER COMMANDS:**
${otherOptions.join("\n")}

Copy and paste any command or type your own question!
`;
      
      this.bot.sendMessage(chatId, menuText, { parse_mode: "Markdown" });
    });

    // Handle /help command for specific features
    this.bot.onText(/\/help_bridge/, (msg) => {
      const chatId = msg.chat.id;
      
      const helpText = `
🌉 *Cross-Chain Bridge Commands* 🌉

Use these commands to transfer tokens between networks:

1. Transfer from Base to other networks:
\`\`\`
transfer 0.1 XOC from Base to Arbitrum
transfer 0.1 XOC from Base to Mantle
transfer 0.1 XOC from Base to zkSync
\`\`\`

2. Transfer from Arbitrum to other networks:
\`\`\`
transfer 0.1 MXNB from Arbitrum to Base
transfer 0.1 MXNB from Arbitrum to Mantle
transfer 0.1 MXNB from Arbitrum to zkSync
\`\`\`

3. Transfer from Mantle to other networks:
\`\`\`
transfer 0.1 USDT from Mantle to Base
transfer 0.1 USDT from Mantle to Arbitrum
transfer 0.1 USDT from Mantle to zkSync
\`\`\`

4. Transfer from zkSync Era to other networks:
\`\`\`
transfer 0.1 USDT from zkSync to Base
transfer 0.1 USDT from zkSync to Arbitrum
transfer 0.1 USDT from zkSync to Mantle
\`\`\`

5. Check swap status:
\`\`\`
get swap receipt swap-12345
\`\`\`

⚠️ A 0.5% fee is applied to all cross-chain transfers!
`;
      
      this.bot.sendMessage(chatId, helpText, { parse_mode: "Markdown" });
    });

    // Add a new help command for Mantle network
    this.bot.onText(/\/help_mantle/, (msg) => {
      const chatId = msg.chat.id;
      
      const helpText = `
🟢 *Mantle Network Commands* 🟢

Use these commands to interact with the Mantle network:

1. Check your USDT balance:
\`\`\`
check USDT balance on Mantle
check balance on Mantle
\`\`\`

2. Bridge USDT to other networks:
\`\`\`
transfer 0.1 USDT from Mantle to Base
transfer 0.1 USDT from Mantle to Arbitrum
transfer 0.1 USDT from Mantle to zkSync
\`\`\`

3. Approve USDT for bridging:
\`\`\`
approve 1 USDT for bridge
\`\`\`

4. Get quotes:
\`\`\`
get quote for bridging 0.1 USDT to Base
get quote for bridging 0.1 USDT to Arbitrum
get quote for bridging 0.1 USDT to zkSync
\`\`\`

⚠️ Always ensure you have enough MNT for gas fees on Mantle!
`;
      
      this.bot.sendMessage(chatId, helpText, { parse_mode: "Markdown" });
    });

    // Add a new help command for zkSync Era network
    this.bot.onText(/\/help_zksync/, (msg) => {
      const chatId = msg.chat.id;
      
      const helpText = `
🟣 *zkSync Era Network Commands* 🟣

Use these commands to interact with the zkSync Era network:

1. Check your USDT balance:
\`\`\`
check USDT balance on zkSync
check balance on zkSync
\`\`\`

2. Bridge USDT to other networks:
\`\`\`
transfer 0.1 USDT from zkSync to Base
transfer 0.1 USDT from zkSync to Arbitrum
transfer 0.1 USDT from zkSync to Mantle
\`\`\`

3. Approve USDT for bridging:
\`\`\`
approve 1 USDT for bridge
\`\`\`

4. Get quotes:
\`\`\`
get quote for bridging 0.1 USDT to Base
get quote for bridging 0.1 USDT to Arbitrum
get quote for bridging 0.1 USDT to Mantle
\`\`\`

⚠️ Always ensure you have enough ETH for gas fees on zkSync Era!
`;
      
      this.bot.sendMessage(chatId, helpText, { parse_mode: "Markdown" });
    });

    // Handle /exit command
    this.bot.onText(/\/exit/, async (msg) => {
      const chatId = msg.chat.id;
      if (this.isStarted) {
        await this.bot.sendMessage(chatId, "Goodbye! Returning to terminal...");
        console.log("Telegram session ended. Returning to terminal...");
        this.bot.stopPolling();
        this.options.onExit();
      }
    });

    // Handle /kill command
    this.bot.onText(/\/kill/, async (msg) => {
      const chatId = msg.chat.id;
      if (this.isStarted) {
        await this.bot.sendMessage(chatId, "Shutting down the application...");
        console.log("Kill command received. Shutting down...");
        this.bot.stopPolling();
        this.options.onKill();
      }
    });

    // Handle /demo command
    this.bot.onText(/\/demo/, async (msg) => {
      const chatId = msg.chat.id;
      if (!this.isStarted) {
        await this.bot.sendMessage(chatId, "Please start the bot with /start first!");
        return;
      }

      await this.bot.sendMessage(chatId, "🚀 Starting CeloMΔIND Demo Mode...\nExecuting all actions automatically with 5-second intervals.");

      const demoCommands = [
        "check wallet balances",
        "approve 0.01 USDC for aave",
        "supply 0.01 USDC to aave",
        "borrow 0.01 CELO from aave",
        "aave dashboard",
        "repay 0.01 CELO to aave",
        "withdraw 0.01 USDC from aave",
        "approve 0.01 CELO for ichi vault",
        "deposit 0.01 CELO into ichi vault strategy: CELO-USDC",
        "deposit 0.01 CELO into ichi vault strategy: CELO-USDT",
        "check ichi vault balance",
        "approve 0.01 CELO for mento swap",
        "swap 0.01 CELO to cUSD with 0.5% slippage",
        "swap 0.01 CELO to cEUR with 0.5% slippage",
        "check wallet balances"
      ];

      let currentStep = 1;
      const totalSteps = demoCommands.length;

      for (const command of demoCommands) {
        try {
          await this.bot.sendMessage(chatId, `🔄 Step ${currentStep}/${totalSteps}\n🤖 Executing: ${command}`);
          
          const stream = await this.agent.stream(
            { messages: [new HumanMessage(command)] },
            this.config
          );

          let response = "";
          for await (const chunk of stream) {
            if ("agent" in chunk) {
              response = chunk.agent.messages[0].content;
            }
          }

          await this.bot.sendMessage(chatId, response, { parse_mode: "Markdown" });
          
          if (currentStep < totalSteps) {
            await this.bot.sendMessage(chatId, "⏳ Waiting 5 seconds before next action...");
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        } catch (error) {
          console.error(`Error executing demo command '${command}':`, error);
          await this.bot.sendMessage(
            chatId,
            `⚠️ Error executing: ${command}\nContinuing with next command...`
          );
          if (currentStep < totalSteps) {
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        }
        currentStep++;
      }

      await this.bot.sendMessage(
        chatId,
        "✅ Demo completed! You've seen the main features of CeloMΔIND:\n" +
        "1. Wallet balance checking\n" +
        "2. AAVE lending and borrowing\n" +
        "3. ICHI vault strategies\n" +
        "4. Mento swaps\n\n" +
        "Use /menu to explore more commands!"
      );
    });

    // Handle all other messages
    this.bot.on("message", async (msg) => {
      if (msg.text && !msg.text.startsWith("/") && this.isStarted) {
        const chatId = msg.chat.id;
        console.log(
          `Received message from ${msg.from?.username || msg.from?.id}: ${msg.text}`,
        );

        try {
          await this.bot.sendChatAction(chatId, "typing");

          const stream = await this.agent.stream(
            { messages: [new HumanMessage(msg.text)] },
            this.config,
          );

          let response = "";
          for await (const chunk of stream) {
            if ("agent" in chunk) {
              response = chunk.agent.messages[0].content;
            }
          }

          console.log(
            `Sending response to ${msg.from?.username || msg.from?.id}: ${response}`,
          );
          await this.bot.sendMessage(chatId, response, { parse_mode: "Markdown" });
        } catch (error) {
          console.error("Error processing message:", error);
          await this.bot.sendMessage(
            chatId,
            "Sorry, I encountered an error processing your message.",
          );
        }
      }
    });
  }

  private escapeMarkdown(text: string): string {
    return text.replace(/[_*[\]()~`>#+-=|{}.!]/g, "\\$&");
  }
}
