# Subscription Sync Debugging Guide

## Issue
UI shows premium subscription, but database shows `subscription_type: 'free'`.

## Root Causes to Check

### 1. Webhook Not Processing
Check if the webhook is receiving events:
```bash
supabase functions logs stripe-webhook --follow
```

Look for:
- `Processing webhook event: checkout.session.completed`
- `Processing checkout.session.completed:`
- Any error messages

### 2. Webhook Processing But Failing
Check for errors in the webhook logs:
- Database connection errors
- RLS policy blocking updates
- Missing userId in metadata
- Subscription status not 'active'

### 3. Check Stripe Dashboard
1. Go to Stripe Dashboard → Webhooks
2. Check if `checkout.session.completed` events are being sent
3. Check if webhook responses are 200 (success) or errors
4. View webhook event details to see the payload

### 4. Verify Checkout Session Metadata
The checkout session should include:
- `metadata.userId` - User ID
- `metadata.subscriptionType` - Should be 'platform'
- `metadata.planId` - Plan ID (optional)
- `client_reference_id` - User ID (backup)

### 5. Check Database Directly
Query to see what's in the database:
```sql
SELECT 
  id,
  user_id,
  subscription_type,
  is_active,
  stripe_subscription_id,
  stripe_price_id,
  billing_cycle,
  platform_plan_id,
  updated_at
FROM platform_subscriptions
WHERE user_id = 'YOUR_USER_ID';
```

### 6. Manual Sync
If webhook failed, you can manually sync:
```bash
# Call the sync-subscription edge function
curl -X POST \
  https://YOUR_PROJECT.supabase.co/functions/v1/sync-subscription \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

Or from the app, the checkout success page will automatically try to sync if the subscription isn't found.

## Fixes Applied

1. **Added client_reference_id** to checkout session as backup for userId
2. **Improved error logging** in webhook handler
3. **Added manual sync fallback** in checkout success page
4. **Better subscription status checking** - now checks both `is_active` and `subscription_type === 'premium'`
5. **Profile refresh on mount** - Profile page now refreshes subscription data on load

## Next Steps

1. **Check webhook logs** to see if events are being received
2. **Verify Stripe webhook configuration** - ensure endpoint is correct
3. **Test with a new checkout** and monitor logs in real-time
4. **If webhook is failing**, check:
   - Webhook secret is correct
   - Service role key has proper permissions
   - Database RLS policies allow updates

## Common Issues

### Issue: Webhook returns 200 but subscription not updated
**Solution**: Check webhook logs for silent errors. The webhook might be catching errors but not throwing them.

### Issue: Multiple subscription records for same user
**Solution**: The UNIQUE constraint should prevent this, but if it happens, delete duplicates and keep the one with `stripe_subscription_id`.

### Issue: Subscription status is 'trialing' not 'active'
**Solution**: The code handles this - 'trialing' subscriptions are marked as active and premium.

### Issue: RLS blocking updates
**Solution**: The webhook uses service role key which bypasses RLS. Verify `SUPABASE_SERVICE_ROLE_KEY` is set correctly.
