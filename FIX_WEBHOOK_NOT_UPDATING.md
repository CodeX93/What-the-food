# Fix: Webhook Not Updating Database After Checkout

## Problem
After successful Stripe checkout, the database still shows `subscription_type: 'free'` instead of `'premium'`.

## Root Cause
The Stripe webhook (`checkout.session.completed`) is either:
1. Not being called by Stripe
2. Failing silently
3. Not configured correctly

## Solution 1: Verify Webhook Configuration (MOST IMPORTANT)

### Step 1: Check Stripe Dashboard
1. Go to https://dashboard.stripe.com/webhooks
2. Look for your webhook endpoint
3. **Verify the URL is correct**:
   ```
   https://begjeguienmqpmrcokud.supabase.co/functions/v1/stripe-webhook
   ```
   (Replace with your project ref if different)

4. **Check if events are being sent**:
   - Click on your webhook endpoint
   - Scroll to "Recent events"
   - Look for `checkout.session.completed` events
   - Check if they show "Succeeded" or "Failed"

5. **If events show "Failed"**:
   - Click on the failed event
   - Check the error message
   - Common issues:
     - Webhook secret mismatch
     - Function not deployed
     - Function returning error

### Step 2: Verify Webhook Secret
1. **In Stripe Dashboard**:
   - Webhooks → Your endpoint → "Reveal" signing secret
   - Copy the secret (starts with `whsec_`)

2. **In Supabase**:
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE
   ```

3. **Verify in Dashboard**:
   - Edge Functions → `stripe-webhook` → Settings
   - Check if `STRIPE_WEBHOOK_SECRET` is listed

### Step 3: Verify Function is Deployed
```bash
supabase functions list
```

Should show `stripe-webhook`. If not:
```bash
supabase functions deploy stripe-webhook
```

## Solution 2: Check Webhook Logs

1. **Go to Supabase Dashboard**:
   - https://app.supabase.com
   - Select your project
   - Edge Functions → `stripe-webhook` → **Logs** tab

2. **Look for**:
   - `Processing webhook event: checkout.session.completed`
   - `Processing checkout.session.completed:`
   - Any error messages

3. **If no logs appear**:
   - Webhook is not being called by Stripe
   - Check Stripe Dashboard to see if events are being sent
   - Verify webhook URL is correct

## Solution 3: Manual Processing (Fallback)

I've created a new function `process-checkout` that can manually process a checkout session if the webhook hasn't fired.

### Deploy the New Function
```bash
supabase functions deploy process-checkout
```

### How It Works
The checkout success page will automatically:
1. Poll the database for 10 seconds
2. If subscription still not active, call `process-checkout` function
3. This function retrieves the checkout session from Stripe and updates the database

### Manual Trigger (If Needed)
You can also manually trigger it from the browser console:
```javascript
const { data, error } = await supabase.functions.invoke('process-checkout', {
  body: { sessionId: 'cs_test_...' } // Your checkout session ID
});
console.log(data, error);
```

## Solution 4: Test Webhook Manually

### Using Stripe Dashboard
1. Go to Stripe Dashboard → Webhooks → Your endpoint
2. Click "Send test webhook"
3. Select `checkout.session.completed`
4. Click "Send test webhook"
5. Check Supabase logs to see if it was received

### Using Stripe CLI (If Installed)
```bash
stripe listen --forward-to https://begjeguienmqpmrcokud.supabase.co/functions/v1/stripe-webhook
```

Then trigger a test event:
```bash
stripe trigger checkout.session.completed
```

## Common Issues & Fixes

### Issue 1: Webhook Not Configured
**Fix**: Create webhook endpoint in Stripe Dashboard with correct URL

### Issue 2: Wrong Webhook URL
**Fix**: Update webhook URL in Stripe to match your Supabase project

### Issue 3: Webhook Secret Mismatch
**Fix**: 
1. Get secret from Stripe Dashboard
2. Set in Supabase: `supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...`
3. Redeploy function: `supabase functions deploy stripe-webhook`

### Issue 4: Function Not Deployed
**Fix**: `supabase functions deploy stripe-webhook`

### Issue 5: Missing Secrets
**Fix**: Set all required secrets:
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Issue 6: Webhook Receiving But Failing
**Check**:
- Look at error in Stripe Dashboard (webhook event details)
- Check Supabase function logs
- Verify all secrets are set correctly
- Check if database RLS policies allow updates

## Quick Checklist

- [ ] Webhook endpoint exists in Stripe Dashboard
- [ ] Webhook URL is correct: `https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook`
- [ ] `checkout.session.completed` event is selected
- [ ] Webhook secret matches in Stripe and Supabase
- [ ] Function `stripe-webhook` is deployed
- [ ] All secrets are set (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY)
- [ ] Check webhook logs in Supabase Dashboard
- [ ] Check recent events in Stripe Dashboard
- [ ] Deploy `process-checkout` function as fallback

## Next Steps

1. **First**: Check Stripe Dashboard for webhook events
2. **Second**: Check Supabase Dashboard for function logs
3. **Third**: Verify webhook configuration matches this guide
4. **Fourth**: Deploy `process-checkout` function as fallback
5. **Fifth**: Test with a new checkout and monitor both dashboards

## Expected Behavior

After successful checkout:
1. ✅ Stripe sends `checkout.session.completed` webhook
2. ✅ Webhook is received by Supabase function
3. ✅ Function updates `platform_subscriptions` table
4. ✅ Function updates `profiles` table
5. ✅ Database shows `subscription_type: 'premium'`
6. ✅ User sees premium status in app

If step 1-2 fail, the `process-checkout` function will handle it as a fallback.
