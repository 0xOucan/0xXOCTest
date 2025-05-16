#!/bin/bash

# Colors for better output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print header
echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}    0xXOC P2P Exchange - Vercel Setup Script      ${NC}"
echo -e "${BLUE}==================================================${NC}"

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check for required commands
echo -e "\n${YELLOW}Checking dependencies...${NC}"
missing_deps=0

if ! command_exists node; then
  echo -e "${RED}❌ Node.js is not installed. Please install Node.js v16 or higher.${NC}"
  missing_deps=1
else
  node_version=$(node -v | cut -d'v' -f2)
  echo -e "${GREEN}✓ Node.js is installed (version $node_version)${NC}"
fi

if ! command_exists npm; then
  echo -e "${RED}❌ npm is not installed. Please install npm.${NC}"
  missing_deps=1
else
  npm_version=$(npm -v)
  echo -e "${GREEN}✓ npm is installed (version $npm_version)${NC}"
fi

if [ $missing_deps -eq 1 ]; then
  echo -e "${RED}Please install missing dependencies and try again.${NC}"
  exit 1
fi

# Check if .env file exists in root directory
if [ ! -f ".env" ]; then
  echo -e "\n${YELLOW}No .env file found in root directory.${NC}"
  if [ -f "this is the .env.example.md" ]; then
    echo -e "${YELLOW}Creating .env from example file...${NC}"
    # Extract the code block from the markdown file
    grep -n '```' "this is the .env.example.md" | cut -d':' -f1 > temp_lines.txt
    start_line=$(($(head -n 1 temp_lines.txt) + 1))
    end_line=$(($(tail -n 1 temp_lines.txt) - 1))
    sed -n "${start_line},${end_line}p" "this is the .env.example.md" > .env
    rm temp_lines.txt
    echo -e "${GREEN}✓ Created .env file from example${NC}"
    echo -e "${YELLOW}⚠️ Please edit the .env file with your actual values!${NC}"
    echo -e "${YELLOW}Press Enter to continue after editing .env file, or Ctrl+C to exit...${NC}"
    read
  else
    echo -e "${RED}❌ No .env example file found. Please create a .env file manually.${NC}"
    exit 1
  fi
else
  echo -e "${GREEN}✓ Found .env file in root directory${NC}"
fi

# Function to create symbolic links for .env
create_env_symlinks() {
  echo -e "\n${YELLOW}Creating .env symlinks...${NC}"
  
  # Backend symlink
  if [ -f "0xXOC-Backend/.env" ]; then
    echo -e "${YELLOW}Removing existing .env symlink in backend...${NC}"
    rm "0xXOC-Backend/.env"
  fi
  ln -sf "$(pwd)/.env" "0xXOC-Backend/.env"
  echo -e "${GREEN}✓ Created symlink for backend .env${NC}"
  
  # No need for frontend symlink as it uses env vars from root through Vite
  echo -e "${YELLOW}Note: Frontend will access .env variables through Vite config${NC}"
}

# Install dependencies
install_dependencies() {
  echo -e "\n${YELLOW}Installing dependencies...${NC}"
  echo -e "${YELLOW}Installing root dependencies...${NC}"
  npm install
  
  echo -e "\n${YELLOW}Installing backend dependencies...${NC}"
  cd 0xXOC-Backend
  npm install
  cd ..
  
  echo -e "\n${YELLOW}Installing frontend dependencies...${NC}"
  cd 0xXOC-Frontend
  npm install
  cd ..
  
  echo -e "${GREEN}✓ All dependencies installed${NC}"
}

# Build the project
build_project() {
  echo -e "\n${YELLOW}Building project...${NC}"
  echo -e "${YELLOW}Making vercel-build.sh executable...${NC}"
  chmod +x vercel-build.sh
  
  echo -e "${YELLOW}Running vercel-build.sh...${NC}"
  ./vercel-build.sh
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Project built successfully${NC}"
  else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
  fi
}

# Install Vercel CLI
install_vercel_cli() {
  if ! command_exists vercel; then
    echo -e "\n${YELLOW}Installing Vercel CLI...${NC}"
    npm install -g vercel
    if [ $? -eq 0 ]; then
      echo -e "${GREEN}✓ Vercel CLI installed${NC}"
    else
      echo -e "${RED}❌ Failed to install Vercel CLI${NC}"
      return 1
    fi
  else
    echo -e "${GREEN}✓ Vercel CLI already installed${NC}"
  fi
  return 0
}

# Create a vercel.json file if it doesn't exist
ensure_vercel_json() {
  if [ ! -f "vercel.json" ]; then
    echo -e "\n${YELLOW}Creating vercel.json...${NC}"
    cat > vercel.json << 'EOL'
{
  "version": 2,
  "buildCommand": "npm run vercel-build",
  "outputDirectory": "0xXOC-Frontend/dist",
  "builds": [
    {
      "src": "0xXOC-Backend/api/index.js",
      "use": "@vercel/node"
    },
    {
      "src": "0xXOC-Frontend/dist/**",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/0xXOC-Backend/api/index.js"
    },
    {
      "src": "/(.*)",
      "dest": "/0xXOC-Frontend/dist/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
EOL
    echo -e "${GREEN}✓ Created vercel.json${NC}"
  else
    echo -e "${GREEN}✓ vercel.json already exists${NC}"
  fi
}

# Ensure API directory exists and has necessary files
setup_api_directory() {
  echo -e "\n${YELLOW}Setting up API directory for Vercel...${NC}"
  
  if [ ! -d "0xXOC-Backend/api" ]; then
    mkdir -p "0xXOC-Backend/api"
    echo -e "${GREEN}✓ Created API directory${NC}"
  else
    echo -e "${GREEN}✓ API directory already exists${NC}"
  fi
  
  # Create or update index.js in API directory
  cat > "0xXOC-Backend/api/index.js" << 'EOL'
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
EOL
  echo -e "${GREEN}✓ Created/updated API index.js${NC}"
}

# Start the local server for testing
run_local_server() {
  echo -e "\n${BLUE}==================================================${NC}"
  echo -e "${BLUE}    Starting local server for testing             ${NC}"
  echo -e "${BLUE}==================================================${NC}"
  
  if command_exists vercel; then
    echo -e "${YELLOW}Running with Vercel CLI for local testing...${NC}"
    echo -e "${GREEN}This will simulate the Vercel environment locally${NC}"
    echo -e "${YELLOW}Press Ctrl+C to stop the server when done testing${NC}"
    vercel dev
  else
    echo -e "${YELLOW}Vercel CLI not available. Using alternative approach...${NC}"
    
    # Check if we have serve installed
    if ! command_exists serve; then
      echo -e "${YELLOW}Installing serve package for static file serving...${NC}"
      npm install -g serve
    fi
    
    # Start the backend server
    echo -e "${YELLOW}Starting backend server...${NC}"
    cd 0xXOC-Backend
    node api/index.js &
    BACKEND_PID=$!
    cd ..
    
    # Start the frontend server
    echo -e "${YELLOW}Starting frontend server...${NC}"
    serve -s 0xXOC-Frontend/dist &
    FRONTEND_PID=$!
    
    echo -e "${GREEN}✓ Servers started${NC}"
    echo -e "${GREEN}📡 Backend: http://localhost:4000/api/health${NC}"
    echo -e "${GREEN}🖥️ Frontend: http://localhost:3000${NC}"
    echo -e "${YELLOW}Press Enter to stop servers when done testing...${NC}"
    
    # Wait for user to press Enter
    read
    
    # Kill the servers
    echo -e "${YELLOW}Stopping servers...${NC}"
    kill $BACKEND_PID $FRONTEND_PID
    echo -e "${GREEN}✓ Servers stopped${NC}"
  fi
}

# Prepare for Vercel deployment
prepare_for_deployment() {
  echo -e "\n${BLUE}==================================================${NC}"
  echo -e "${BLUE}    Preparing for Vercel deployment               ${NC}"
  echo -e "${BLUE}==================================================${NC}"
  
  echo -e "${YELLOW}Your project is now ready for Vercel deployment.${NC}"
  echo -e "${YELLOW}To deploy to Vercel, follow these steps:${NC}"
  echo -e "\n${GREEN}1. Push your code to GitHub${NC}"
  echo -e "${GREEN}2. Go to https://vercel.com/new${NC}"
  echo -e "${GREEN}3. Import your GitHub repository${NC}"
  echo -e "${GREEN}4. Configure the deployment with these settings:${NC}"
  echo -e "   ${BLUE}Framework Preset:${NC} Other"
  echo -e "   ${BLUE}Root Directory:${NC} ./"
  echo -e "   ${BLUE}Build Command:${NC} npm run vercel-build"
  echo -e "   ${BLUE}Output Directory:${NC} 0xXOC-Frontend/dist"
  echo -e "   ${BLUE}Install Command:${NC} npm install"
  echo -e "${GREEN}5. Paste your environment variables from .env${NC}"
  echo -e "${GREEN}6. Click Deploy${NC}"
  
  echo -e "\n${YELLOW}Do you want to deploy with Vercel CLI now? (y/n)${NC}"
  read deploy_choice
  
  if [ "$deploy_choice" = "y" ] || [ "$deploy_choice" = "Y" ]; then
    if command_exists vercel; then
      echo -e "${YELLOW}Running Vercel CLI deployment...${NC}"
      vercel
    else
      echo -e "${RED}Vercel CLI not installed. Please install it with 'npm install -g vercel' and try again.${NC}"
    fi
  else
    echo -e "${YELLOW}Skipping Vercel CLI deployment.${NC}"
  fi
}

# Main execution
create_env_symlinks
install_dependencies
build_project
ensure_vercel_json
setup_api_directory
install_vercel_cli

# Ask user what they want to do
echo -e "\n${BLUE}==================================================${NC}"
echo -e "${BLUE}    0xXOC P2P Exchange - Setup Complete            ${NC}"
echo -e "${BLUE}==================================================${NC}"
echo -e "\n${YELLOW}What would you like to do next?${NC}"
echo -e "${GREEN}1. Run local server for testing${NC}"
echo -e "${GREEN}2. Prepare for Vercel deployment${NC}"
echo -e "${GREEN}3. Both${NC}"
echo -e "${GREEN}4. Exit${NC}"
echo -e "\n${YELLOW}Enter your choice (1-4):${NC}"
read choice

case $choice in
  1)
    run_local_server
    ;;
  2)
    prepare_for_deployment
    ;;
  3)
    run_local_server
    prepare_for_deployment
    ;;
  4)
    echo -e "${GREEN}Exiting. Setup is complete!${NC}"
    exit 0
    ;;
  *)
    echo -e "${RED}Invalid choice. Exiting.${NC}"
    exit 1
    ;;
esac

echo -e "\n${BLUE}==================================================${NC}"
echo -e "${BLUE}    0xXOC P2P Exchange - Setup Complete            ${NC}"
echo -e "${BLUE}==================================================${NC}"
echo -e "\n${GREEN}Thank you for using the Vercel Setup Script!${NC}" 