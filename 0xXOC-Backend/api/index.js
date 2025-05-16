// Serverless function entry point for Vercel
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Try to load .env from multiple locations
const envPaths = [
  '.env',
  '../.env',
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../../.env'),
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    console.log(`Loading environment from ${envPath}`);
    const result = dotenv.config({ path: envPath });
    if (!result.error) {
      envLoaded = true;
      break;
    }
  }
}

if (!envLoaded) {
  console.log('No .env file found, trying default dotenv.config()');
  dotenv.config();
}

// Create Express app
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Add CORS headers to allow requests from any origin
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,Authorization');
  res.setHeader('Access-Control-Allow-Credentials', true);
  
  // Handle OPTIONS method
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'MictlAI API (Vercel Serverless)',
    walletConnected: false,
    network: 'base',
    supportedNetworks: ['base', 'arbitrum', 'mantle', 'zkSync'],
    environment: process.env.NODE_ENV || 'development'
  });
});

// Simplified endpoint for testing
app.post('/api/agent/chat', (req, res) => {
  // Check if OpenAI API key is provided
  const apiKey = req.headers['x-openai-api-key'];
  
  if (!apiKey && !process.env.OPENAI_API_KEY) {
    return res.status(403).json({
      error: "OpenAI API key required. Please provide your API key on the home page before using the chat feature."
    });
  }
  
  // Return a simple response for now
  res.json({
    response: 'This is a serverless test response. The full agent will be available soon!'
  });
});

// Add more API routes as needed

// Export the Express app for Vercel serverless function
module.exports = app;
