# Debugging: No Edge Function Logs

## Critical Issue
If you're seeing **no logs at all** in the Supabase Dashboard, this indicates a fundamental problem. Follow these steps in order:

## Step 1: Verify Functions Are Deployed

```bash
# List all deployed functions
supabase functions list

# You should see:
# - process-checkout
# - stripe-webhook
# - send-lifecycle-email
```

If functions are missing, deploy them:
```bash
supabase functions deploy process-checkout
supabase functions deploy stripe-webhook
supabase functions deploy send-lifecycle-email
```

## Step 2: Test Function Accessibility

Run the test script:
```bash
# Set your variables
export SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key"

# Run tests
./test-edge-functions.sh
```

Or test manually:
```bash
curl -X GET "${SUPABASE_URL}/functions/v1/process-checkout" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}"
```

Expected response: `{"status":"ok","function":"process-checkout","timestamp":"..."}`

## Step 3: Check Supabase Dashboard Logs

1. **Go to Supabase Dashboard**
   - Visit: https://app.supabase.com
   - Select your project

2. **Navigate to Edge Functions**
   - Click **Edge Functions** in left sidebar
   - You should see all your functions listed

3. **Check Logs for Each Function**
   - Click on `process-checkout`
   - Click **Logs** tab
   - Look for: `=== PROCESS-CHECKOUT FUNCTION LOADED ===`
   - This should appear when the function is first loaded

4. **Check Log Filters**
   - Make sure time range includes "Last hour" or "Last 24 hours"
   - Check if there are any log level filters applied
   - Try refreshing the page

## Step 4: Verify You're Looking at the Right Project

**Common mistake**: You might be looking at a different project or environment.

1. Check the project URL in your browser
2. Verify the project ref matches your local `.supabase/config.toml`
3. Check if you have multiple Supabase projects

## Step 5: Check Browser Console

When upgrading to yearly plan, check your browser's developer console:

1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for:
   - `Calling process-checkout function with sessionId: ...`
   - `process-checkout response: ...`
   - Any error messages

## Step 6: Verify Function Is Being Called

Add this to your browser console after checkout:
```javascript
// Check if function was called
const { data, error } = await supabase.functions.invoke('process-checkout', {
  body: { sessionId: 'YOUR_SESSION_ID' }
});
console.log('Manual test:', { data, error });
```

## Step 7: Check Network Tab

1. Open browser DevTools → Network tab
2. Filter by "functions"
3. Complete a checkout
4. Look for requests to:
   - `/functions/v1/process-checkout`
   - `/functions/v1/stripe-webhook`
5. Check the response status and body

## Step 8: Verify Stripe Webhook Configuration

If webhook isn't being called:

1. **Go to Stripe Dashboard** → Webhooks
2. **Check webhook endpoint URL**:
   - Should be: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook`
3. **Check webhook events**:
   - `checkout.session.completed` ✓
   - `customer.subscription.updated` ✓
   - `customer.subscription.created` ✓
4. **Send a test webhook**:
   - Click on your webhook endpoint
   - Click "Send test webhook"
   - Select `checkout.session.completed`
   - Check Supabase logs immediately

## Step 9: Check Environment Variables

Verify all required secrets are set:

```bash
# Check if secrets are set (requires Supabase CLI)
supabase secrets list
```

Required secrets:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `MAILERSEND_API_KEY`

## Step 10: Manual Database Check

Check the database directly:

```sql
-- Check if subscription was updated
SELECT 
  user_id,
  subscription_type,
  billing_cycle,
  is_active,
  stripe_subscription_id,
  updated_at
FROM platform_subscriptions
ORDER BY updated_at DESC
LIMIT 10;

-- Check specific user
SELECT * FROM platform_subscriptions
WHERE user_id = 'YOUR_USER_ID';
```

## Common Issues and Solutions

### Issue 1: Functions Not Deployed
**Symptoms**: Functions don't appear in `supabase functions list`

**Solution**: Deploy functions:
```bash
supabase functions deploy process-checkout
supabase functions deploy stripe-webhook
supabase functions deploy send-lifecycle-email
```

### Issue 2: Wrong Project
**Symptoms**: Functions exist but logs are empty, or functions don't match your code

**Solution**: 
1. Verify project ref in dashboard URL
2. Check `.supabase/config.toml` for linked project
3. Re-link if needed: `supabase link --project-ref YOUR_PROJECT_REF`

### Issue 3: Logs Not Showing
**Symptoms**: Functions are deployed but no logs appear

**Solution**:
1. Check log time range (try "Last hour")
2. Refresh the page
3. Check if logs are filtered by level
4. Try a different browser or incognito mode

### Issue 4: Function Not Being Called
**Symptoms**: No network requests to functions in browser DevTools

**Solution**:
1. Check browser console for errors
2. Verify `supabase.functions.invoke` is being called
3. Check if user is authenticated
4. Verify function name is correct

### Issue 5: Webhook Not Receiving Events
**Symptoms**: No webhook logs, but checkout completes

**Solution**:
1. Verify webhook URL in Stripe matches Supabase function URL
2. Check webhook secret is correct
3. Send test webhook from Stripe Dashboard
4. Check Stripe webhook logs for delivery status

## Next Steps

1. **Run the test script**: `./test-edge-functions.sh`
2. **Check browser console** during checkout
3. **Verify webhook configuration** in Stripe
4. **Check database directly** to see if updates are happening
5. **Review network requests** in browser DevTools

If logs are still empty after all these steps, there may be an issue with:
- Supabase project configuration
- Function deployment process
- Logging service availability

Contact Supabase support if the issue persists.
