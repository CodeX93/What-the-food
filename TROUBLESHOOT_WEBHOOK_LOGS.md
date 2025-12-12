# Troubleshooting: No Logs for Stripe Webhook and send-lifecycle-email

## Quick Checks

### 1. Verify Functions Are Deployed

```bash
# List all deployed functions
supabase functions list

# You should see:
# - stripe-webhook
# - send-lifecycle-email
```

If functions are not listed, deploy them:
```bash
supabase functions deploy stripe-webhook
supabase functions deploy send-lifecycle-email
```

### 2. Test Functions Are Accessible

#### Test send-lifecycle-email:
```bash
# Get your project URL and anon key
SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
ANON_KEY="your-anon-key"

# Test health check
curl -X GET "${SUPABASE_URL}/functions/v1/send-lifecycle-email" \
  -H "Authorization: Bearer ${ANON_KEY}"

# Should return: {"status":"ok","function":"send-lifecycle-email","timestamp":"..."}
```

#### Test stripe-webhook:
```bash
curl -X GET "${SUPABASE_URL}/functions/v1/stripe-webhook" \
  -H "Authorization: Bearer ${ANON_KEY}"

# Should return: {"status":"ok","function":"stripe-webhook","timestamp":"..."}
```

### 3. Check Stripe Webhook Configuration

1. **Go to Stripe Dashboard**
   - Visit: https://dashboard.stripe.com/webhooks
   - Find your webhook endpoint

2. **Verify Webhook URL**
   - Should be: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook`
   - Make sure it matches your Supabase project URL

3. **Check Webhook Events**
   - Ensure these events are enabled:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`

4. **Verify Webhook Secret**
   - In Stripe Dashboard → Webhooks → Your endpoint → Signing secret
   - Copy the signing secret
   - Make sure it's set in Supabase: `STRIPE_WEBHOOK_SECRET`

### 4. Check Supabase Environment Variables

Go to Supabase Dashboard → Project Settings → Edge Functions → Secrets

Required secrets:
- `STRIPE_SECRET_KEY` - Your Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Webhook signing secret from Stripe
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (for admin access)
- `SUPABASE_ANON_KEY` - Anon key (for calling send-lifecycle-email)
- `MAILERSEND_API_KEY` - MailerSend API key (for sending emails)

### 5. View Logs in Supabase Dashboard

1. **Go to Supabase Dashboard**
   - Visit: https://app.supabase.com
   - Select your project

2. **Navigate to Edge Functions**
   - Click **Edge Functions** in left sidebar
   - Click on **stripe-webhook**
   - Click **Logs** tab
   - Look for: `=== STRIPE WEBHOOK REQUEST RECEIVED ===`

3. **Check send-lifecycle-email Logs**
   - Click on **send-lifecycle-email**
   - Click **Logs** tab
   - Look for: `=== SEND-LIFECYCLE-EMAIL REQUEST RECEIVED ===`

### 6. Test Webhook Manually

#### Option A: Use Stripe CLI (Recommended)

```bash
# Install Stripe CLI if not installed
# macOS: brew install stripe/stripe-cli/stripe
# Or download from: https://stripe.com/docs/stripe-cli

# Login to Stripe
stripe login

# Forward webhooks to local endpoint (for testing)
stripe listen --forward-to https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook

# In another terminal, trigger a test event
stripe trigger checkout.session.completed
```

#### Option B: Send Test Event from Stripe Dashboard

1. Go to Stripe Dashboard → Webhooks
2. Click on your webhook endpoint
3. Click "Send test webhook"
4. Select event type (e.g., `checkout.session.completed`)
5. Click "Send test webhook"
6. Check Supabase logs immediately

### 7. Common Issues

#### Issue: No logs at all
**Possible causes:**
- Function not deployed
- Wrong project URL
- Webhook not configured in Stripe
- Network/firewall blocking requests

**Solution:**
1. Deploy functions: `supabase functions deploy stripe-webhook`
2. Verify webhook URL in Stripe matches your Supabase URL
3. Test health check endpoint (see step 2)

#### Issue: Logs show request but no processing
**Possible causes:**
- Missing environment variables
- Webhook signature verification failing
- Invalid request body

**Solution:**
1. Check logs for error messages
2. Verify all environment variables are set
3. Check webhook secret matches Stripe

#### Issue: Webhook receives events but downgrade email not sent
**Possible causes:**
- `send-lifecycle-email` not being called
- Authorization error
- MailerSend API error

**Solution:**
1. Check webhook logs for: `Calling send-lifecycle-email function:`
2. Check send-lifecycle-email logs for errors
3. Verify `SUPABASE_ANON_KEY` is set correctly

### 8. Debug Checklist

- [ ] Functions are deployed (`supabase functions list`)
- [ ] Health check endpoints return `{"status":"ok"}`
- [ ] Stripe webhook URL is correct
- [ ] Webhook events are enabled in Stripe
- [ ] `STRIPE_WEBHOOK_SECRET` matches Stripe signing secret
- [ ] All environment variables are set in Supabase
- [ ] Logs are visible in Supabase Dashboard
- [ ] Test webhook event was sent from Stripe Dashboard

### 9. Manual Test Script

Create a file `test-webhook.sh`:

```bash
#!/bin/bash

# Set these variables
SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
ANON_KEY="your-anon-key"

echo "Testing send-lifecycle-email health check..."
curl -X GET "${SUPABASE_URL}/functions/v1/send-lifecycle-email" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -v

echo -e "\n\nTesting stripe-webhook health check..."
curl -X GET "${SUPABASE_URL}/functions/v1/stripe-webhook" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -v

echo -e "\n\nTesting send-lifecycle-email with downgrade event..."
curl -X POST "${SUPABASE_URL}/functions/v1/send-lifecycle-email" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "downgrade",
    "email": "test@example.com",
    "name": "Test User",
    "metadata": {
      "premium_expiration_date": "December 31, 2024",
      "monthly_price": "9.99",
      "monthly_original_price": "14.99",
      "yearly_price": "99.99",
      "yearly_original_price": "149.99",
      "monthly_checkout_url": "https://what-the-food-theta.vercel.app/plans?plan=premium&cycle=monthly",
      "yearly_checkout_url": "https://what-the-food-theta.vercel.app/plans?plan=premium&cycle=yearly"
    }
  }' \
  -v
```

Make it executable and run:
```bash
chmod +x test-webhook.sh
./test-webhook.sh
```

### 10. Next Steps

If you still don't see logs after following these steps:

1. **Check Supabase Status**: Visit https://status.supabase.com
2. **Check Function Deployment**: Ensure functions are deployed to the correct project
3. **Verify Project Link**: Run `supabase link --project-ref YOUR_PROJECT_REF`
4. **Contact Support**: If issues persist, check Supabase community forums or support
