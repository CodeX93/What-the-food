# Verify Webhook Auto-Update for Plan Changes

## Problem
When a user changes their plan in Stripe (e.g., monthly to yearly), the database should automatically update via the `customer.subscription.updated` webhook event.

## How It Works

1. **User changes plan in Stripe** (via Stripe Dashboard, Customer Portal, or API)
2. **Stripe sends `customer.subscription.updated` webhook** to your endpoint
3. **Webhook function (`stripe-webhook`) receives the event**
4. **Function determines billing cycle from Stripe subscription interval** (`'year'` → `'yearly'`)
5. **Function looks up plan by `billing_cycle + name`** (since `stripe_price_id` is null)
6. **Function updates database** with correct `platform_plan_id` and `billing_cycle`
7. **Function syncs to `profiles` table**

## Verification Steps

### 1. Verify Webhook is Configured in Stripe

1. Go to **Stripe Dashboard** → **Developers** → **Webhooks**
2. Find your webhook endpoint: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook`
3. Click on the webhook to view details
4. **Verify these events are enabled:**
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.updated` ← **CRITICAL for plan changes**
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.deleted`

### 2. Check Webhook is Receiving Events

1. In Stripe Dashboard → Webhooks → Your endpoint
2. Click **"Recent events"** or **"View logs"**
3. Look for `customer.subscription.updated` events
4. Check if they're being **delivered successfully** (green checkmark) or **failing** (red X)

### 3. Check Supabase Edge Function Logs

1. Go to **Supabase Dashboard** → **Edge Functions** → **`stripe-webhook`**
2. Click **"Logs"** tab
3. Look for:
   - `=== STRIPE WEBHOOK REQUEST RECEIVED ===`
   - `Processing customer.subscription.updated:`
   - `✓ Plan determined by billing_cycle + name (STRIPE SOURCE OF TRUTH):`
   - `✓ Both billing cycle and platform_plan_id correctly updated:`

### 4. Test the Webhook Manually

**Option A: Send Test Webhook from Stripe**

1. Stripe Dashboard → Webhooks → Your endpoint
2. Click **"Send test webhook"**
3. Select **`customer.subscription.updated`**
4. Click **"Send test webhook"**
5. Check Supabase logs immediately

**Option B: Use Stripe CLI**

```bash
# Install Stripe CLI if not installed
# brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local endpoint (for testing)
stripe listen --forward-to https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook

# In another terminal, trigger a subscription update
stripe trigger customer.subscription.updated
```

### 5. Verify Database Update

After a plan change, check the database:

```sql
-- Check the subscription
SELECT 
  user_id,
  subscription_type,
  billing_cycle,
  platform_plan_id,
  stripe_subscription_id,
  updated_at
FROM platform_subscriptions
WHERE user_id = 'YOUR_USER_ID';

-- Should show:
-- billing_cycle: 'yearly' (not 'monthly')
-- platform_plan_id: '7ad844e1-7013-443e-b7e3-b33cdc497622' (yearly plan ID, not monthly)
```

## Troubleshooting

### Webhook Not Receiving Events

**Symptoms:**
- No logs in Supabase for `customer.subscription.updated`
- Database not updating when plan changes in Stripe

**Solutions:**
1. **Verify webhook endpoint URL is correct** in Stripe Dashboard
2. **Check webhook secret** is set in Supabase Edge Function secrets (`STRIPE_WEBHOOK_SECRET`)
3. **Verify events are enabled** in Stripe webhook configuration
4. **Check webhook is not disabled** in Stripe Dashboard
5. **Test webhook endpoint** using health check: `GET https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook`

### Webhook Receiving Events But Database Not Updating

**Symptoms:**
- Logs show `Processing customer.subscription.updated:` but database still shows old plan

**Check logs for:**
- `✓ Plan determined by billing_cycle + name:` - Should show correct plan ID
- `✓ Both billing cycle and platform_plan_id correctly updated:` - Should confirm update
- Any error messages

**Solutions:**
1. **Check if plan lookup is failing:**
   - Look for: `CRITICAL: No plan found by billing_cycle + name:`
   - Verify `platform_plans` table has entries with `billing_cycle = 'yearly'` and `name = 'Premium'`

2. **Check if update is failing:**
   - Look for: `Error updating platform subscription:`
   - Check database permissions and RLS policies

3. **Check if force update is needed:**
   - Look for: `CRITICAL: Mismatch after update!`
   - The function should automatically retry, but verify it's working

### Webhook Failing with Signature Error

**Symptoms:**
- Logs show: `Webhook signature verification failed`

**Solutions:**
1. **Verify `STRIPE_WEBHOOK_SECRET`** is set correctly in Supabase Edge Function secrets
2. **Get the correct secret** from Stripe Dashboard → Webhooks → Your endpoint → "Signing secret"
3. **Redeploy the function** after updating the secret:
   ```bash
   supabase functions deploy stripe-webhook
   ```

## Manual Fix (If Webhook Still Not Working)

If the automatic webhook isn't working, use the manual sync function:

```bash
# Deploy sync function
supabase functions deploy sync-from-stripe

# Sync by user ID
./sync-subscription-from-stripe.sh YOUR_USER_ID

# Or by Stripe subscription ID
./sync-subscription-from-stripe.sh sub_xxxxxxxxxxxxx
```

## Expected Behavior

When a user changes from monthly to yearly in Stripe:

1. **Stripe sends webhook** within seconds
2. **Webhook logs appear** in Supabase within seconds
3. **Database updates** within seconds
4. **Profile syncs** automatically via trigger

The entire process should be **automatic and happen within seconds** of the plan change in Stripe.
