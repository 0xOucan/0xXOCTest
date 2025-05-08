#!/usr/bin/env node

/**
 * This script tests environment variable loading specifically for the escrow wallet
 */

const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

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

// Now require and run the actual test (this will now have the env vars)
require('./dist/action-providers/cUSDescrowforiAmigoP2P/test').testBuyingOrder()
  .then(() => {
    console.log('Test completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  }); 