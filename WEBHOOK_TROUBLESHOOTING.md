# Webhook Troubleshooting Guide

## Issue: Database Not Updating After Checkout

If checkout completes but database shows `subscription_type: 'free'`, the webhook isn't processing correctly.

## Step 1: Verify Webhook is Configured in Stripe

1. **Go to Stripe Dashboard**: https://dashboard.stripe.com/webhooks
2. **Check if webhook endpoint exists**:
   - URL should be: `https://begjeguienmqpmrcokud.supabase.co/functions/v1/stripe-webhook`
   - Or: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook`

3. **Verify Events Selected**:
   - ✅ `checkout.session.completed` (REQUIRED)
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`

4. **Check Webhook Status**:
   - Look for recent events
   - Check if events show as "Succeeded" or "Failed"
   - If "Failed", click to see error details

## Step 2: Check Webhook Logs in Supabase Dashboard

1. Go to https://app.supabase.com
2. Select your project
3. Navigate to **Edge Functions** → `stripe-webhook`
4. Click **Logs** tab
5. Look for:
   - `Processing webhook event: checkout.session.completed`
   - Any error messages
   - `Processing checkout.session.completed:`

## Step 3: Verify Webhook Secret

The webhook secret must match between Stripe and Supabase:

1. **In Stripe Dashboard**:
   - Go to Webhooks → Your endpoint
   - Click "Reveal" next to "Signing secret"
   - Copy the secret (starts with `whsec_`)

2. **In Supabase**:
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET
   ```

3. **Verify it's set**:
   - Dashboard → Edge Functions → `stripe-webhook` → Settings
   - Check if `STRIPE_WEBHOOK_SECRET` is listed

## Step 4: Test Webhook Manually

### Option A: Use Stripe Dashboard Test Webhook

1. Go to Stripe Dashboard → Webhooks → Your endpoint
2. Click "Send test webhook"
3. Select `checkout.session.completed`
4. Click "Send test webhook"
5. Check Supabase logs to see if it was received

### Option B: Check Recent Events in Stripe

1. Go to Stripe Dashboard → Webhooks → Your endpoint
2. Scroll to "Recent events"
3. Find the `checkout.session.completed` event from your test
4. Click on it to see:
   - Request payload
   - Response status
   - Response body
   - Any errors

## Step 5: Common Issues

### Issue 1: Webhook Not Receiving Events

**Symptoms**: No logs in Supabase, no events in Stripe

**Solutions**:
- Verify webhook URL is correct in Stripe
- Check if webhook is enabled (not disabled)
- Ensure you're using the correct Stripe account (test vs live)
- Check if webhook endpoint is accessible (not blocked by firewall)

### Issue 2: Webhook Receiving Events But Failing

**Symptoms**: Events show in Stripe but marked as "Failed", or logs show errors

**Check**:
- Webhook secret matches
- All required secrets are set in Supabase
- Function is deployed correctly
- Check error message in Stripe webhook event details

### Issue 3: Webhook Succeeds But Database Not Updated

**Symptoms**: Webhook returns 200, but database still shows "free"

**Check**:
- Look at webhook logs for database errors
- Verify RLS policies allow updates
- Check if `updatePlatformSubscription` function is being called
- Verify service role key has proper permissions

### Issue 4: Missing userId in Webhook

**Symptoms**: Logs show "No userId found"

**Check**:
- Verify checkout session includes `metadata.userId`
- Check if `client_reference_id` is set in checkout session
- Look at checkout session creation code

## Step 6: Manual Fix (If Webhook Failed)

If the webhook didn't process, you can manually update the subscription:

1. **Get the Stripe Subscription ID**:
   - Go to Stripe Dashboard → Customers
   - Find your customer
   - Click on the subscription
   - Copy the subscription ID (starts with `sub_`)

2. **Manually Trigger Webhook** (if you have the event data):
   - Use Stripe CLI to resend the event
   - Or manually update the database (not recommended)

3. **Better Solution**: Create a manual sync function (see below)

## Step 7: Verify Function is Deployed

```bash
supabase functions list
```

Should show `stripe-webhook` in the list. If not:

```bash
supabase functions deploy stripe-webhook
```

## Step 8: Check Required Secrets

All these must be set:

```bash
# Check if secrets are set
supabase secrets list

# Set missing secrets
supabase secrets set STRIPE_SECRET_KEY=sk_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## Quick Checklist

- [ ] Webhook endpoint configured in Stripe Dashboard
- [ ] Webhook URL is correct: `https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook`
- [ ] `checkout.session.completed` event is selected
- [ ] Webhook secret matches in Stripe and Supabase
- [ ] Function is deployed: `supabase functions list` shows `stripe-webhook`
- [ ] All secrets are set (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY)
- [ ] Check webhook logs in Supabase Dashboard
- [ ] Check recent events in Stripe Dashboard
- [ ] Verify checkout session includes `metadata.userId`

## Next Steps

1. **Check Stripe Dashboard** for webhook events
2. **Check Supabase Dashboard** for function logs
3. **Verify webhook configuration** matches this guide
4. **Test with a new checkout** and monitor both dashboards in real-time
