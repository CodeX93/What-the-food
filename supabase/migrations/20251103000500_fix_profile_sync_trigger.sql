-- Fix trigger to also sync platform_plan_id to profiles
CREATE OR REPLACE FUNCTION public.sync_profile_platform_subscription()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET platform_subscription_id = NEW.id,
      platform_subscription_type = NEW.subscription_type,
      platform_subscription_plan_id = NEW.platform_plan_id,
      updated_at = NOW()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Also add a function to manually sync existing subscriptions to profiles (one-time fix)
CREATE OR REPLACE FUNCTION public.sync_all_platform_subscriptions_to_profiles()
RETURNS void AS $$
BEGIN
  UPDATE public.profiles p
  SET platform_subscription_id = ps.id,
      platform_subscription_type = ps.subscription_type,
      platform_subscription_plan_id = ps.platform_plan_id,
      updated_at = NOW()
  FROM public.platform_subscriptions ps
  WHERE p.id = ps.user_id
    AND (
      p.platform_subscription_id IS DISTINCT FROM ps.id
      OR p.platform_subscription_type IS DISTINCT FROM ps.subscription_type
      OR p.platform_subscription_plan_id IS DISTINCT FROM ps.platform_plan_id
    );
END;
$$ LANGUAGE plpgsql;

-- Run the sync function once to fix existing data
SELECT public.sync_all_platform_subscriptions_to_profiles();

