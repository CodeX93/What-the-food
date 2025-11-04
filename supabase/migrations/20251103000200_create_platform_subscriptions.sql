-- Create platform_subscriptions table mirroring subscriptions (non-widget)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'subscription_type' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.subscription_type AS ENUM ('free', 'premium');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.platform_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_type public.subscription_type NOT NULL DEFAULT 'free',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  billing_cycle TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE public.platform_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='platform_subscriptions' AND policyname='Users can view own platform subscription'
  ) THEN
    CREATE POLICY "Users can view own platform subscription" ON public.platform_subscriptions
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='platform_subscriptions' AND policyname='Users can insert own platform subscription'
  ) THEN
    CREATE POLICY "Users can insert own platform subscription" ON public.platform_subscriptions
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='platform_subscriptions' AND policyname='Users can update own platform subscription'
  ) THEN
    CREATE POLICY "Users can update own platform subscription" ON public.platform_subscriptions
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END$$;

-- Keep profiles synchronized when platform_subscriptions change
CREATE OR REPLACE FUNCTION public.sync_profile_platform_subscription()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET platform_subscription_id = NEW.id,
      platform_subscription_type = NEW.subscription_type,
      updated_at = NOW()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_profile_platform_subscription_ins ON public.platform_subscriptions;
CREATE TRIGGER trg_sync_profile_platform_subscription_ins
AFTER INSERT OR UPDATE ON public.platform_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_platform_subscription();


