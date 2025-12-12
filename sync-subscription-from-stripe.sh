#!/bin/bash

# Script to manually sync a subscription from Stripe to Supabase database
# Usage: ./sync-subscription-from-stripe.sh [userId|subscriptionId|customerId]

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Supabase URL and keys are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
  echo -e "${RED}Error: SUPABASE_URL and SUPABASE_ANON_KEY must be set${NC}"
  echo "Set them in your .env file or export them:"
  echo "  export SUPABASE_URL='https://your-project.supabase.co'"
  echo "  export SUPABASE_ANON_KEY='your-anon-key'"
  exit 1
fi

# Get identifier from command line or prompt
IDENTIFIER=$1

if [ -z "$IDENTIFIER" ]; then
  echo -e "${YELLOW}Enter one of the following:${NC}"
  echo "  1. User ID (UUID)"
  echo "  2. Stripe Subscription ID (sub_xxx)"
  echo "  3. Stripe Customer ID (cus_xxx)"
  read -p "Identifier: " IDENTIFIER
fi

# Determine which field to use
if [[ $IDENTIFIER == sub_* ]]; then
  BODY="{\"subscriptionId\": \"$IDENTIFIER\"}"
elif [[ $IDENTIFIER == cus_* ]]; then
  BODY="{\"customerId\": \"$IDENTIFIER\"}"
else
  BODY="{\"userId\": \"$IDENTIFIER\"}"
fi

echo -e "${YELLOW}Syncing subscription from Stripe...${NC}"
echo "Request body: $BODY"

RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/sync-from-stripe" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "$BODY")

# Check if response contains error
if echo "$RESPONSE" | grep -q '"error"'; then
  echo -e "${RED}Error syncing subscription:${NC}"
  echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
  exit 1
else
  echo -e "${GREEN}✓ Subscription synced successfully!${NC}"
  echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
fi
