#!/bin/bash

# Test script to verify edge functions are accessible and working
# Usage: ./test-edge-functions.sh

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Testing Supabase Edge Functions ===${NC}\n"

# Check if variables are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
  echo -e "${RED}Error: SUPABASE_URL and SUPABASE_ANON_KEY must be set${NC}"
  echo "Example:"
  echo "  export SUPABASE_URL='https://your-project.supabase.co'"
  echo "  export SUPABASE_ANON_KEY='your-anon-key'"
  exit 1
fi

echo -e "${YELLOW}1. Testing process-checkout health check...${NC}"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "${SUPABASE_URL}/functions/v1/process-checkout" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  if echo "$BODY" | grep -q '"status":"ok"'; then
    echo -e "${GREEN}✓ process-checkout is accessible${NC}"
    echo "Response: $BODY"
  else
    echo -e "${RED}✗ process-checkout returned unexpected response${NC}"
    echo "Status: $HTTP_STATUS"
    echo "Response: $BODY"
  fi
else
  echo -e "${RED}✗ process-checkout health check failed${NC}"
  echo "Status: $HTTP_STATUS"
  echo "Response: $BODY"
fi

echo -e "\n${YELLOW}2. Testing send-lifecycle-email health check...${NC}"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "${SUPABASE_URL}/functions/v1/send-lifecycle-email" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  if echo "$BODY" | grep -q '"status":"ok"'; then
    echo -e "${GREEN}✓ send-lifecycle-email is accessible${NC}"
    echo "Response: $BODY"
  else
    echo -e "${RED}✗ send-lifecycle-email returned unexpected response${NC}"
    echo "Status: $HTTP_STATUS"
    echo "Response: $BODY"
  fi
else
  echo -e "${RED}✗ send-lifecycle-email health check failed${NC}"
  echo "Status: $HTTP_STATUS"
  echo "Response: $BODY"
fi

echo -e "\n${YELLOW}3. Testing stripe-webhook health check...${NC}"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "${SUPABASE_URL}/functions/v1/stripe-webhook" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  if echo "$BODY" | grep -q '"status":"ok"'; then
    echo -e "${GREEN}✓ stripe-webhook is accessible${NC}"
    echo "Response: $BODY"
  else
    echo -e "${RED}✗ stripe-webhook returned unexpected response${NC}"
    echo "Status: $HTTP_STATUS"
    echo "Response: $BODY"
  fi
else
  echo -e "${RED}✗ stripe-webhook health check failed${NC}"
  echo "Status: $HTTP_STATUS"
  echo "Response: $BODY"
fi

echo -e "\n${YELLOW}=== Test Complete ===${NC}"
echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. If all tests pass, functions are deployed and accessible"
echo "2. Check Supabase Dashboard → Edge Functions → Logs"
echo "3. Look for: === FUNCTION LOADED === and === REQUEST RECEIVED ==="
echo "4. If no logs appear, check:"
echo "   - Functions are deployed: supabase functions list"
echo "   - You're viewing the correct project in dashboard"
echo "   - Logs are filtered correctly (check time range)"
