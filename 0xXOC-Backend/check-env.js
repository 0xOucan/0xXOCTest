#!/usr/bin/env node

/**
 * This script checks if the environment variables are properly loaded
 * Usage: node check-env.js
 */

const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

console.log('🔍 Checking environment variables...');
console.log('Current working directory:', process.cwd());

// Try to locate the .env file
const envPath = path.resolve(process.cwd(), '.env');
console.log('Looking for .env file at:', envPath);

if (fs.existsSync(envPath)) {
  console.log('✅ .env file found');
  
  // Read the file content
  const envContent = fs.readFileSync(envPath, 'utf8');
  console.log('\n.env file content preview (partial):');
  
  // Print first line of each variable (for security, don't print full private keys)
  const lines = envContent.split('\n')
    .filter(line => line.trim() && !line.startsWith('#'))
    .map(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        // For private keys, only show first 10 chars
        if (key.includes('PRIVATE_KEY')) {
          return `${key}=${value.substring(0, 10)}...`;
        }
        return line;
      }
      return line;
    });
  
  console.log(lines.join('\n'));
  
  // Load the env file
  const result = dotenv.config();
  if (result.error) {
    console.error('❌ Error loading .env file:', result.error.message);
  } else {
    console.log('\n✅ dotenv successfully loaded the .env file');
  }
  
  // Check for specific variables
  const vars = [
    'WALLET_PRIVATE_KEY',
    'ESCROW_WALLET_PRIVATE_KEY',
    'OPENAI_API_KEY'
  ];
  
  console.log('\nChecking for required variables:');
  vars.forEach(variable => {
    if (process.env[variable]) {
      console.log(`✅ ${variable}: present`);
    } else {
      console.log(`❌ ${variable}: missing`);
    }
  });
} else {
  console.error('❌ .env file not found');
}

console.log('\nEnvironment Variables Check Complete'); 