#!/bin/bash

# Set colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Vercel Build: 0xXOC Marketplace Interface${NC}"
echo "======================================"

# Check if .env exists in root
if [ -f ".env" ]; then
    echo -e "${YELLOW}Found root .env file, creating symlinks...${NC}"
    # Create symlink for backend
    ln -sf "$(pwd)/.env" "./0xXOC-Backend/.env"
    echo "Created symlink for backend .env"
else
    echo -e "${YELLOW}No root .env file found. Using Vercel environment variables.${NC}"
fi

# Build Backend
echo -e "${YELLOW}Building 0xXOC Backend...${NC}"
cd ./0xXOC-Backend
npm install
npm run build
echo -e "${GREEN}✓ Backend built successfully${NC}"

# Build Frontend
echo -e "${YELLOW}Building 0xXOC Frontend...${NC}"
cd ../0xXOC-Frontend
npm install
npm run build
echo -e "${GREEN}✓ Frontend built successfully${NC}"

echo -e "${GREEN}======================================"
echo -e "🌟 0xXOC Marketplace build completed!"
echo -e "======================================${NC}" 