-- Manual sync: Update profiles table from platform_subscriptions
-- This ensures all profiles are in sync with their active subscriptions

UPDATE public.profiles p
SET 
  platform_subscription_id = ps.id,
  platform_subscription_type = ps.subscription_type,
  platform_subscription_plan_id = ps.platform_plan_id,
  updated_at = NOW()
FROM public.platform_subscriptions ps
WHERE p.id = ps.user_id
  AND ps.is_active = TRUE
  AND (
    p.platform_subscription_id IS DISTINCT FROM ps.id
    OR p.platform_subscription_type IS DISTINCT FROM ps.subscription_type
    OR p.platform_subscription_plan_id IS DISTINCT FROM ps.platform_plan_id
  );

-- For users without active subscriptions, set to free
UPDATE public.profiles p
SET 
  platform_subscription_id = NULL,
  platform_subscription_type = 'free',
  platform_subscription_plan_id = NULL,
  updated_at = NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.platform_subscriptions ps 
  WHERE ps.user_id = p.id AND ps.is_active = TRUE
)
AND (
  p.platform_subscription_type != 'free'
  OR p.platform_subscription_id IS NOT NULL
);

