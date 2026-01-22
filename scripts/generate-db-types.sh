#!/bin/bash

# Generate TypeScript types from Supabase database schema
# This script requires the Supabase CLI to be installed globally or via npx
#
# Prerequisites:
# - Valid .env file with PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
# - Supabase project must be accessible
#
# Usage: pnpm db:types

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Generating database types from Supabase...${NC}"

# Check if .env file exists
if [ ! -f ".env" ]; then
  echo -e "${YELLOW}Warning: .env file not found${NC}"
  echo "Creating .env from .env.example..."
  if [ -f ".env.example" ]; then
    cp .env.example .env
    echo -e "${YELLOW}Please update .env with your Supabase credentials before running this command again${NC}"
    exit 1
  else
    echo -e "${RED}Error: .env.example not found${NC}"
    exit 1
  fi
fi

# Source .env file to get credentials
source .env

# Check if required environment variables are set
if [ -z "$PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo -e "${RED}Error: Missing required environment variables${NC}"
  echo "Please ensure PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env"
  exit 1
fi

# Check if they are placeholder values
if [[ "$PUBLIC_SUPABASE_URL" == *"your-project"* ]] || [[ "$SUPABASE_SERVICE_ROLE_KEY" == *"your-service"* ]]; then
  echo -e "${YELLOW}Warning: Environment variables appear to be placeholder values${NC}"
  echo "Please update .env with real Supabase credentials from your project at https://supabase.com/dashboard"
  echo ""
  echo "For now, keeping the existing placeholder types in src/lib/types/database.ts"
  exit 0
fi

# Extract project ref from URL (format: https://abc123.supabase.co)
PROJECT_REF=$(echo "$PUBLIC_SUPABASE_URL" | sed -E 's/https:\/\/([^.]+).*/\1/')

echo "Project: $PROJECT_REF"
echo "Generating types..."

# Try using npx to run supabase CLI
if command -v npx &> /dev/null; then
  npx supabase gen types typescript --project-id "$PROJECT_REF" --schema public > src/lib/types/database.ts
  echo -e "${GREEN}✓ Types generated successfully at src/lib/types/database.ts${NC}"
elif command -v supabase &> /dev/null; then
  # Use globally installed CLI if available
  supabase gen types typescript --project-id "$PROJECT_REF" --schema public > src/lib/types/database.ts
  echo -e "${GREEN}✓ Types generated successfully at src/lib/types/database.ts${NC}"
else
  echo -e "${RED}Error: Supabase CLI not found${NC}"
  echo "Install it with: npm install -g supabase"
  echo "Or use npx (recommended): ensure npm is installed"
  exit 1
fi

echo -e "${GREEN}Done!${NC}"
