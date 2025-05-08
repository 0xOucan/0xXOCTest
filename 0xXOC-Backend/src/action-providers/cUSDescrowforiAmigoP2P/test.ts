import { CUSDescrowforiAmigoP2PActionProvider } from "./cUSDescrowforiAmigoP2PActionProvider";
import dotenv from "dotenv";
import path from "path";

// Load environment variables with explicit path to .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
console.log("Environment variables loaded. ESCROW_WALLET_PRIVATE_KEY present:", !!process.env.ESCROW_WALLET_PRIVATE_KEY);

/**
 * Test the buying order functionality
 */
async function testBuyingOrder() {
  // Create the action provider
  const provider = new CUSDescrowforiAmigoP2PActionProvider();
  
  // Example QR code in the correct format
  // This is a test QR code with future expiration date and 100 MXN
  const qrCode = `{
    "TipoOperacion": "0004",
    "VersionQR": "01.01",
    "FechaExpiracionQR": "25/12/25 00:00:00",
    "FechaCreacionQR": "25/04/15 14:39:50",
    "EmisorQR": "101",
    "Monto": 100,
    "Concepto": "Test Payment",
    "Operacion": {
      "Mensaje": "",
      "CR": "1011499855001003",
      "Comisiones": "12",
      "CadenaEncriptada": "",
      "Aux1": "",
      "Aux2": ""
    }
  }`;
  
  console.log("Starting buying order test...");
  console.log("QR Code:", qrCode);
  
  try {
    // Call the action provider method
    const result = await provider.processBuyingOrder(
      { walletProvider: null } as any, // Mock wallet provider
      { qrCode }
    );
    
    console.log("Result:", result);
  } catch (error) {
    console.error("Test failed:", error);
  }
}

/**
 * Run the test if this file is executed directly
 */
if (require.main === module) {
  testBuyingOrder().catch(console.error);
}

export { testBuyingOrder }; 