#!/bin/bash

# Test script for Supabase Edge Functions
# Usage: ./test-functions.sh

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

echo -e "${YELLOW}1. Testing send-lifecycle-email health check...${NC}"
RESPONSE=$(curl -s -X GET "${SUPABASE_URL}/functions/v1/send-lifecycle-email" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}")

if echo "$RESPONSE" | grep -q '"status":"ok"'; then
  echo -e "${GREEN}✓ send-lifecycle-email is accessible${NC}"
  echo "Response: $RESPONSE"
else
  echo -e "${RED}✗ send-lifecycle-email health check failed${NC}"
  echo "Response: $RESPONSE"
fi

echo -e "\n${YELLOW}2. Testing stripe-webhook health check...${NC}"
RESPONSE=$(curl -s -X GET "${SUPABASE_URL}/functions/v1/stripe-webhook" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}")

if echo "$RESPONSE" | grep -q '"status":"ok"'; then
  echo -e "${GREEN}✓ stripe-webhook is accessible${NC}"
  echo "Response: $RESPONSE"
else
  echo -e "${RED}✗ stripe-webhook health check failed${NC}"
  echo "Response: $RESPONSE"
fi

echo -e "\n${YELLOW}3. Testing send-lifecycle-email with downgrade event (dry run)...${NC}"
RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/send-lifecycle-email" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "downgrade",
    "email": "test@example.com",
    "name": "Test User",
    "dry_run": true,
    "metadata": {
      "premium_expiration_date": "December 31, 2024",
      "monthly_price": "9.99",
      "monthly_original_price": "14.99",
      "yearly_price": "99.99",
      "yearly_original_price": "149.99",
      "monthly_checkout_url": "https://what-the-food-theta.vercel.app/plans?plan=premium&cycle=monthly",
      "yearly_checkout_url": "https://what-the-food-theta.vercel.app/plans?plan=premium&cycle=yearly"
    }
  }')

if echo "$RESPONSE" | grep -q '"dry_run":true'; then
  echo -e "${GREEN}✓ send-lifecycle-email downgrade event processed${NC}"
  echo "Response: $RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
else
  echo -e "${RED}✗ send-lifecycle-email downgrade event failed${NC}"
  echo "Response: $RESPONSE"
fi

echo -e "\n${YELLOW}=== Test Complete ===${NC}"
echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Check Supabase Dashboard → Edge Functions → Logs"
echo "2. Look for: === SEND-LIFECYCLE-EMAIL REQUEST RECEIVED ==="
echo "3. If no logs appear, verify functions are deployed:"
echo "   supabase functions list"
echo "4. Deploy if needed:"
echo "   supabase functions deploy send-lifecycle-email"
echo "   supabase functions deploy stripe-webhook"
