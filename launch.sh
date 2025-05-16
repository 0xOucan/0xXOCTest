#!/bin/bash

# Set colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Launching 0xXOC Marketplace Interface${NC}"
echo "======================================"

# Check if required dependencies are installed
echo -e "${YELLOW}Checking dependencies...${NC}"
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js v16 or higher."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "npm is not installed. Please install npm."
    exit 1
fi

# Create symlinks for .env file if root .env exists
if [ -f ".env" ]; then
    echo -e "${YELLOW}Found root .env file, creating symlinks...${NC}"
    # Create symlink for backend
    if [ ! -f "./0xXOC-Backend/.env" ]; then
        ln -sf "$(pwd)/.env" "./0xXOC-Backend/.env"
        echo "Created symlink for backend .env"
    fi
    # No need for frontend symlink as it uses env vars from root through Vite
else
    echo -e "${YELLOW}No root .env file found.${NC}"
    echo "Please create a .env file in the root directory with required environment variables."
    echo "See .env.example for reference."
    
    # Check if backend has its own .env file
    if [ ! -f "./0xXOC-Backend/.env" ]; then
        echo -e "${YELLOW}Warning: No .env file found for backend.${NC}"
    fi
fi

# Configuration message
echo -e "${YELLOW}Before starting, make sure you have:.${NC}"
echo "1. Created a .env file in the 0xXOC-Backend directory with OPENAI_API_KEY and WALLET_PRIVATE_KEY"
echo "2. Installed dependencies in both backend and frontend directories"
echo ""
read -p "Press Enter to continue or Ctrl+C to exit..."

# Start the backend API server
echo -e "${YELLOW}Building and starting 0xXOC API server...${NC}"
cd ./0xXOC-Backend
npm install
npm run build
npm run api &
API_PID=$!
echo -e "${GREEN}✓ API server started (PID: $API_PID)${NC}"

# Wait for API server to initialize
echo -e "${YELLOW}Waiting for API server to initialize...${NC}"
sleep 5

# Start the frontend development server
echo -e "${YELLOW}Building and starting frontend development server...${NC}"
cd ../0xXOC-Frontend
npm install
npm run dev &
FRONTEND_PID=$!
echo -e "${GREEN}✓ Frontend server started (PID: $FRONTEND_PID)${NC}"

echo -e "${GREEN}======================================"
echo -e "🌟 0xXOC Marketplace is running!"
echo -e "📡 API: http://localhost:4000"
echo -e "🖥️ Frontend: http://localhost:5173"
echo -e "======================================${NC}"

# Handle script termination
trap "echo -e '${YELLOW}Shutting down servers...${NC}'; kill $API_PID $FRONTEND_PID; echo -e '${GREEN}Servers stopped.${NC}'" SIGINT SIGTERM

# Keep script running
wait 