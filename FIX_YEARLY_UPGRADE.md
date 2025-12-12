# Fix: Yearly Upgrade Not Updating Database

## Problem
When upgrading from monthly to yearly premium, the database still shows:
- `billing_cycle: "monthly"`
- `platform_plan_id: "6cf2d26f-5242-4608-a478-cee7557123aa"` (monthly plan ID)

Instead of:
- `billing_cycle: "yearly"`
- `platform_plan_id: "7ad844e1-7013-443e-b7e3-b33cdc497622"` (yearly plan ID)

## Root Cause
When switching from monthly to yearly, Stripe sends a `customer.subscription.updated` webhook event. The webhook doesn't have access to checkout session metadata (which contains `planId`), and since both plans have `stripe_price_id: null`, it can't look up the plan by price ID.

## Solution Applied
1. **Webhook now looks up plan by billing_cycle + name** when `stripe_price_id` is null
2. **Determines billing cycle from Stripe subscription interval** (`'year'` → `'yearly'`)
3. **Explicitly sets both `platform_plan_id` and `billing_cycle`** in the upsert
4. **Force update if mismatch detected** after upsert

## Manual Fix (Recommended)

**Option 1: Use the sync-from-stripe function (Recommended)**

This function fetches the subscription directly from Stripe and updates the database:

```bash
# Deploy the function first
supabase functions deploy sync-from-stripe

# Then sync by user ID
./sync-subscription-from-stripe.sh 71edac2b-2929-4409-b1cd-b275dbd419f7

# Or by Stripe subscription ID
./sync-subscription-from-stripe.sh sub_xxxxxxxxxxxxx

# Or by Stripe customer ID
./sync-subscription-from-stripe.sh cus_xxxxxxxxxxxxx
```

**Option 2: Direct SQL Update (If sync function doesn't work)**

```sql
-- Find the user's subscription
SELECT user_id, subscription_type, billing_cycle, platform_plan_id, stripe_subscription_id
FROM platform_subscriptions
WHERE user_id = '71edac2b-2929-4409-b1cd-b275dbd419f7';

-- Update to yearly plan
UPDATE platform_subscriptions
SET 
  billing_cycle = 'yearly',
  platform_plan_id = '7ad844e1-7013-443e-b7e3-b33cdc497622',
  updated_at = NOW()
WHERE user_id = '71edac2b-2929-4409-b1cd-b275dbd419f7';

-- Also update the profile
UPDATE profiles
SET 
  platform_subscription_plan_id = '7ad844e1-7013-443e-b7e3-b33cdc497622'
WHERE id = '71edac2b-2929-4409-b1cd-b275dbd419f7';
```

## Verify Functions Are Deployed

```bash
# List deployed functions
supabase functions list

# Should see:
# - process-checkout
# - stripe-webhook
# - send-lifecycle-email

# If missing, deploy:
supabase functions deploy stripe-webhook
supabase functions deploy process-checkout
```

## Check Webhook Configuration

1. Go to Stripe Dashboard → Webhooks
2. Verify endpoint: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook`
3. Ensure these events are enabled:
   - `checkout.session.completed` ✓
   - `customer.subscription.updated` ✓ (This is the one that fires when switching plans)
   - `customer.subscription.created` ✓
   - `customer.subscription.deleted` ✓

## Test the Fix

1. **Deploy updated functions:**
   ```bash
   supabase functions deploy stripe-webhook
   supabase functions deploy process-checkout
   ```

2. **Switch a user from monthly to yearly** (via Stripe checkout or customer portal)

3. **Check webhook logs:**
   - Supabase Dashboard → Edge Functions → `stripe-webhook` → Logs
   - Look for: `Processing customer.subscription.updated`
   - Look for: `✓ Plan found by billing_cycle + name:`
   - Look for: `✓ Both billing cycle and platform_plan_id correctly updated:`

4. **Verify database:**
   ```sql
   SELECT user_id, subscription_type, billing_cycle, platform_plan_id, updated_at
   FROM platform_subscriptions
   WHERE subscription_type = 'premium'
   ORDER BY updated_at DESC
   LIMIT 5;
   ```

## If Still Not Working

1. **Check if webhook is receiving events:**
   - Stripe Dashboard → Webhooks → Your endpoint → Recent events
   - Look for `customer.subscription.updated` events
   - Check if they're being delivered successfully

2. **Send a test webhook:**
   - Stripe Dashboard → Webhooks → Your endpoint → "Send test webhook"
   - Select `customer.subscription.updated`
   - Check Supabase logs immediately

3. **Check for errors in logs:**
   - Look for any error messages
   - Check if plan lookup is failing
   - Verify billing cycle normalization is working
