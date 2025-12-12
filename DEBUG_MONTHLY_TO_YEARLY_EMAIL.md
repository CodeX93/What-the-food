# Debugging: Monthly to Yearly Email Not Sending

## Issue
Email is not being sent when users switch from monthly to yearly premium plan, and edge function logs are empty.

## Quick Checks

### 1. Verify Functions Are Deployed
```bash
supabase functions list
```

You should see:
- `stripe-webhook`
- `process-checkout`
- `send-lifecycle-email`

If missing, deploy them:
```bash
supabase functions deploy stripe-webhook
supabase functions deploy process-checkout
supabase functions deploy send-lifecycle-email
```

### 2. Test Health Check Endpoints

```bash
# Get your project URL and anon key
SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
ANON_KEY="your-anon-key"

# Test process-checkout
curl -X GET "${SUPABASE_URL}/functions/v1/process-checkout" \
  -H "Authorization: Bearer ${ANON_KEY}"

# Test send-lifecycle-email
curl -X GET "${SUPABASE_URL}/functions/v1/send-lifecycle-email" \
  -H "Authorization: Bearer ${ANON_KEY}"

# Test stripe-webhook
curl -X GET "${SUPABASE_URL}/functions/v1/stripe-webhook" \
  -H "Authorization: Bearer ${ANON_KEY}"
```

All should return: `{"status":"ok","function":"...","timestamp":"..."}`

### 3. Check Logs in Supabase Dashboard

1. Go to https://app.supabase.com
2. Select your project
3. Navigate to **Edge Functions**
4. Click on each function and check the **Logs** tab
5. Look for:
   - `=== PROCESS-CHECKOUT REQUEST RECEIVED ===`
   - `=== STRIPE WEBHOOK REQUEST RECEIVED ===`
   - `=== SEND-LIFECYCLE-EMAIL REQUEST RECEIVED ===`

### 4. Verify Billing Cycle Values

The detection logic checks:
- **Previous cycle**: Should be `monthly` (or contain "month")
- **New cycle**: Should be `yearly` (or contain "year"/"annual")

Check your database:
```sql
SELECT 
  user_id,
  subscription_type,
  billing_cycle,
  stripe_price_id,
  updated_at
FROM platform_subscriptions
WHERE subscription_type = 'premium'
ORDER BY updated_at DESC
LIMIT 10;
```

### 5. Test Monthly to Yearly Detection

When switching from monthly to yearly, check logs for:
```
Monthly to yearly detection: {
  prevCycle: "monthly",
  newCycle: "yearly",
  isMonthly: true,
  isYearly: true,
  wasPremium: true,
  isMonthlyToYearly: true
}
```

## Common Issues

### Issue 1: Empty Logs
**Possible causes:**
- Functions not deployed
- Functions not being called
- Wrong project/environment

**Solution:**
1. Verify deployment: `supabase functions list`
2. Test health check endpoints (see step 2)
3. Check if you're looking at the correct project in dashboard

### Issue 2: Detection Not Working
**Possible causes:**
- Billing cycle values don't match expected format
- User doesn't have existing subscription to compare
- Stripe interval format differs from database format

**Solution:**
1. Check logs for `Billing cycle normalization:` and `Monthly to yearly detection:`
2. Verify billing cycle values in database match expected format
3. Ensure user has an existing monthly subscription before switching

### Issue 3: Email Not Sending After Detection
**Possible causes:**
- `SUPABASE_ANON_KEY` not set
- `send-lifecycle-email` function not accessible
- MailerSend API key not configured

**Solution:**
1. Check logs for: `Calling send-lifecycle-email for monthly to yearly:`
2. Verify `SUPABASE_ANON_KEY` is set in edge function secrets
3. Check `send-lifecycle-email` logs for errors
4. Verify `MAILERSEND_API_KEY` is set

## Debugging Steps

### Step 1: Check if Functions Are Being Called

When a user switches from monthly to yearly:
1. Check `stripe-webhook` logs for: `Processing customer.subscription.updated`
2. Check `process-checkout` logs for: `=== PROCESS-CHECKOUT REQUEST RECEIVED ===`
3. Look for: `Billing cycle comparison:` or `Monthly to yearly detection:`

### Step 2: Verify Detection Logic

Look for these log entries:
```
Billing cycle normalization: {
  stripeInterval: "year",
  planBillingCycle: "yearly",
  finalBillingCycle: "yearly"
}

Monthly to yearly detection: {
  prevCycle: "monthly",
  newCycle: "yearly",
  isMonthly: true,
  isYearly: true,
  wasPremium: true,
  isMonthlyToYearly: true
}
```

### Step 3: Check Email Sending

Look for:
```
Detected monthly to yearly switch, sending email: {...}
Calling send-lifecycle-email for monthly to yearly: {...}
Monthly to yearly email sent successfully: {...}
```

Or errors:
```
Failed to send monthly to yearly email: {...}
Error sending monthly to yearly email: {...}
```

## Manual Test

You can manually test the email by calling `send-lifecycle-email`:

```bash
curl -X POST "${SUPABASE_URL}/functions/v1/send-lifecycle-email" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "monthly_to_annual",
    "email": "test@example.com",
    "name": "Test User",
    "metadata": {
      "next_renewal_date": "December 31, 2024",
      "manage_subscription_url": "https://what-the-food-theta.vercel.app/profile"
    }
  }'
```

## Next Steps

1. **Deploy updated functions** with enhanced logging:
   ```bash
   supabase functions deploy process-checkout
   supabase functions deploy stripe-webhook
   supabase functions deploy send-lifecycle-email
   ```

2. **Switch a user from monthly to yearly** and immediately check logs

3. **Look for the detection logs** to see what values are being compared

4. **Check if email is being called** even if detection fails

5. **Verify all environment variables** are set correctly
