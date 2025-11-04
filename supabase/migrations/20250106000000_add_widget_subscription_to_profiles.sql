-- ============================================
-- ADD WIDGET SUBSCRIPTION COLUMNS TO PROFILES
-- ============================================
-- Add widget subscription fields to profiles table (similar to platform subscriptions)

-- Add widget subscription columns to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS widget_subscription_id UUID REFERENCES public.widget_subscriptions(id),
  ADD COLUMN IF NOT EXISTS widget_subscription_type public.widget_subscription_type DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS widget_site_limit INTEGER DEFAULT 1;

-- ============================================
-- CREATE TRIGGER TO SYNC WIDGET_SUBSCRIPTIONS TO PROFILES
-- ============================================
CREATE OR REPLACE FUNCTION public.sync_profile_widget_subscription()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET 
    widget_subscription_id = NEW.id,
    widget_subscription_type = NEW.subscription_type,
    widget_site_limit = NEW.site_limit,
    updated_at = NOW()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_profile_widget_subscription ON public.widget_subscriptions;
CREATE TRIGGER trg_sync_profile_widget_subscription
AFTER INSERT OR UPDATE ON public.widget_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_widget_subscription();

-- ============================================
-- SYNC EXISTING WIDGET SUBSCRIPTIONS TO PROFILES
-- ============================================
CREATE OR REPLACE FUNCTION public.sync_all_widget_subscriptions_to_profiles()
RETURNS void AS $$
BEGIN
  UPDATE public.profiles p
  SET 
    widget_subscription_id = ws.id,
    widget_subscription_type = ws.subscription_type,
    widget_site_limit = ws.site_limit,
    updated_at = NOW()
  FROM public.widget_subscriptions ws
  WHERE p.id = ws.user_id AND ws.is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the sync function
SELECT public.sync_all_widget_subscriptions_to_profiles();

