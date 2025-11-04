-- Add platform_plan_id to platform_subscriptions and profiles; sync via trigger
ALTER TABLE public.platform_subscriptions
ADD COLUMN IF NOT EXISTS platform_plan_id UUID REFERENCES public.platform_plans(id) ON DELETE SET NULL;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS platform_subscription_plan_id UUID REFERENCES public.platform_plans(id) ON DELETE SET NULL;

-- Update trigger function to sync plan id as well
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


