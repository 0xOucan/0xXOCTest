#!/usr/bin/env node

/**
 * This script tests environment variable loading specifically for the escrow wallet
 */

const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// Try multiple potential .env file locations
const potentialPaths = [
  '.env',
  '../.env',
  '../../.env',
  path.resolve(__dirname, '.env'),
  path.resolve(process.cwd(), '.env')
];

let envLoaded = false;

// Try to load from various potential paths
for (const envPath of potentialPaths) {
  console.log(`Trying to load .env from: ${envPath}`);
  
  try {
    if (fs.existsSync(envPath)) {
      console.log(`Found .env file at: ${envPath}`);
      const result = dotenv.config({ path: envPath });
      if (!result.error) {
        console.log(`Successfully loaded .env from ${envPath}`);
        envLoaded = true;
        break;
      } else {
        console.log(`Error loading from ${envPath}: ${result.error.message}`);
      }
    }
  } catch (error) {
    console.log(`Error checking ${envPath}: ${error.message}`);
  }
}

if (!envLoaded) {
  console.log('Could not find or load any .env file. Trying default dotenv.config()');
  dotenv.config();
}

// Check for ESCROW_WALLET_PRIVATE_KEY
if (process.env.ESCROW_WALLET_PRIVATE_KEY) {
  console.log('✅ ESCROW_WALLET_PRIVATE_KEY is available');
  // Only show first few characters for security
  console.log(`Key starts with: ${process.env.ESCROW_WALLET_PRIVATE_KEY.substring(0, 10)}...`);
  
  // Create minimal test for key format
  const key = process.env.ESCROW_WALLET_PRIVATE_KEY;
  if (key.startsWith('0x') && key.length >= 64) {
    console.log('✅ Key format looks valid');
  } else {
    console.log('❌ Key format may be invalid - should be 0x-prefixed and 64+ characters');
  }
} else {
  console.log('❌ ESCROW_WALLET_PRIVATE_KEY is not available');
  
  // Try to find it in .env file directly
  for (const envPath of potentialPaths) {
    try {
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        const match = content.match(/ESCROW_WALLET_PRIVATE_KEY="?([^"\n]+)"?/);
        if (match) {
          console.log(`Found key in ${envPath}, but it's not loaded into process.env`);
          console.log(`Key starts with: ${match[1].substring(0, 10)}...`);
        }
      }
    } catch (error) {
      // Ignore errors here
    }
  }
}

// Manual hardcoded fallback to allow testing
process.env.ESCROW_WALLET_PRIVATE_KEY = process.env.ESCROW_WALLET_PRIVATE_KEY || "0x0eecf4305e835";
console.log("Using ESCROW_WALLET_PRIVATE_KEY:", process.env.ESCROW_WALLET_PRIVATE_KEY.substring(0, 10) + "...");

// Base URL for the API
const API_URL = process.env.API_URL || 'http://localhost:4000';

// Test API key - this would be provided by users in production
const TEST_API_KEY = process.env.TEST_OPENAI_API_KEY || process.env.OPENAI_API_KEY || 'sk-example-key-for-testing123456';

// Temporary wallet address for testing
const TEST_WALLET_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';

/**
 * Test agent initialization with API key
 */
async function testAgentInitialization() {
  console.log('\n📝 Testing agent initialization with user-provided API key...');
  
  try {
    const response = await fetch(`${API_URL}/api/initialize-agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey: TEST_API_KEY,
      }),
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Success:', data.message);
    } else {
      console.error('❌ Error:', data.message);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Test chat with agent
 */
async function testAgentChat() {
  console.log('\n💬 Testing agent chat with API key in headers...');
  
  try {
    const response = await fetch(`${API_URL}/api/agent/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-openai-api-key': TEST_API_KEY,
      },
      body: JSON.stringify({
        userInput: 'Hello, what is 0xXOC?',
      }),
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Response received:');
      console.log(data.response.substring(0, 100) + '...');
    } else {
      console.error('❌ Error:', data.error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Test wallet connection
 */
async function testWalletConnection() {
  console.log('\n🔌 Testing wallet connection...');
  
  try {
    const response = await fetch(`${API_URL}/api/wallet/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: TEST_WALLET_ADDRESS,
      }),
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Success:', data.message);
    } else {
      console.error('❌ Error:', data.message);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Test server health
 */
async function testHealth() {
  console.log('\n🏥 Testing server health...');
  
  try {
    const response = await fetch(`${API_URL}/api/health`);
    const data = await response.json();
    
    console.log('📊 Health status:', data.status);
    console.log('🌐 Connected network:', data.network);
    console.log('🔌 Wallet connected:', data.walletConnected);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('🧪 Starting API tests...');
  
  await testHealth();
  await testWalletConnection();
  await testAgentInitialization();
  await testAgentChat();
  
  console.log('\n✅ All tests completed');
}

// Run tests
runTests().catch(console.error); 