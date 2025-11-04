-- Manual fix script to update platform_subscriptions based on stripe_subscription_id
-- Run this in Supabase SQL Editor after checking your Stripe subscription

-- First, check what subscriptions exist in platform_subscriptions
-- SELECT * FROM platform_subscriptions WHERE user_id = 'YOUR_USER_ID';

-- Then update a specific user's subscription (replace with actual values):
-- Example: Update subscription_type to premium and set platform_plan_id
-- You need to find your stripe_subscription_id from Stripe Dashboard or platform_subscriptions table

-- Update subscription type to premium for active Stripe subscriptions
UPDATE public.platform_subscriptions ps
SET 
  subscription_type = 'premium',
  is_active = true,
  updated_at = NOW()
WHERE ps.stripe_subscription_id IS NOT NULL
  AND ps.stripe_subscription_id != ''
  AND ps.subscription_type = 'free';

-- Now sync the updated subscriptions to profiles
UPDATE public.profiles p
SET 
  platform_subscription_id = ps.id,
  platform_subscription_type = ps.subscription_type,
  platform_subscription_plan_id = ps.platform_plan_id,
  updated_at = NOW()
FROM public.platform_subscriptions ps
WHERE p.id = ps.user_id
  AND ps.subscription_type = 'premium';

-- If you need to set platform_plan_id based on stripe_price_id, use this:
-- First, update platform_subscriptions with the plan_id
UPDATE public.platform_subscriptions ps
SET platform_plan_id = pp.id
FROM public.platform_plans pp
WHERE ps.stripe_price_id IS NOT NULL
  AND ps.stripe_price_id = pp.stripe_price_id
  AND ps.platform_plan_id IS NULL;

-- Then sync to profiles again
SELECT public.sync_all_platform_subscriptions_to_profiles();

