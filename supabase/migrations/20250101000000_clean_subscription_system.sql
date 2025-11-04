-- ============================================
-- CLEAN SUBSCRIPTION SYSTEM MIGRATION
-- ============================================
-- This migration creates a clean, simple subscription system
-- Platform Subscriptions and Widget Subscriptions are separate

-- ============================================
-- 1. CREATE ENUMS
-- ============================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'subscription_type' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.subscription_type AS ENUM ('free', 'premium');
  END IF;
END$$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'widget_subscription_type' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.widget_subscription_type AS ENUM ('free', 'plan1', 'plan2', 'plan3');
  END IF;
END$$;

-- ============================================
-- 2. CREATE PLATFORM_PLANS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.platform_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 0,
  interval TEXT NOT NULL DEFAULT 'month', -- 'month' | 'year' | 'free'
  description TEXT,
  features JSONB DEFAULT '[]'::jsonb,
  stripe_price_id TEXT, -- null for free plan
  billing_cycle TEXT NOT NULL DEFAULT 'monthly', -- 'monthly' | 'yearly' | 'free'
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_popular BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.platform_plans ENABLE ROW LEVEL SECURITY;

-- RLS: Public can read, only service role can write
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='platform_plans' AND policyname='Public can read platform plans'
  ) THEN
    CREATE POLICY "Public can read platform plans" ON public.platform_plans
      FOR SELECT USING (true);
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_platform_plans_active ON public.platform_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_platform_plans_billing_cycle ON public.platform_plans(billing_cycle);

-- ============================================
-- 3. CREATE PLATFORM_SUBSCRIPTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.platform_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_type public.subscription_type NOT NULL DEFAULT 'free',
  platform_plan_id UUID REFERENCES public.platform_plans(id),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  billing_cycle TEXT, -- 'monthly' | 'yearly'
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE public.platform_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for platform_subscriptions
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

-- ============================================
-- 4. CREATE WIDGET_SUBSCRIPTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.widget_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_type public.widget_subscription_type NOT NULL DEFAULT 'free',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  billing_cycle TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  site_limit INTEGER NOT NULL DEFAULT 1,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE public.widget_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for widget_subscriptions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='widget_subscriptions' AND policyname='Users can view own widget subscription'
  ) THEN
    CREATE POLICY "Users can view own widget subscription" ON public.widget_subscriptions
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='widget_subscriptions' AND policyname='Users can insert own widget subscription'
  ) THEN
    CREATE POLICY "Users can insert own widget subscription" ON public.widget_subscriptions
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='widget_subscriptions' AND policyname='Users can update own widget subscription'
  ) THEN
    CREATE POLICY "Users can update own widget subscription" ON public.widget_subscriptions
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END$$;

-- ============================================
-- 5. UPDATE PROFILES TABLE
-- ============================================
-- Add subscription fields to profiles (denormalized for quick access)
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS platform_subscription_id UUID REFERENCES public.platform_subscriptions(id),
  ADD COLUMN IF NOT EXISTS platform_subscription_type public.subscription_type DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS platform_subscription_plan_id UUID REFERENCES public.platform_plans(id);

-- ============================================
-- 6. CREATE TRIGGER TO SYNC PLATFORM_SUBSCRIPTIONS TO PROFILES
-- ============================================
CREATE OR REPLACE FUNCTION public.sync_profile_platform_subscription()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET 
    platform_subscription_id = NEW.id,
    platform_subscription_type = NEW.subscription_type,
    platform_subscription_plan_id = NEW.platform_plan_id,
    updated_at = NOW()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_profile_platform_subscription ON public.platform_subscriptions;
CREATE TRIGGER trg_sync_profile_platform_subscription
AFTER INSERT OR UPDATE ON public.platform_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_platform_subscription();

-- ============================================
-- 7. CREATE FUNCTION TO INITIALIZE PLATFORM SUBSCRIPTION ON USER CREATION
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  
  -- Create free platform subscription
  INSERT INTO public.platform_subscriptions (user_id, subscription_type)
  VALUES (NEW.id, 'free')
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update trigger if exists, create if not
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 8. SEED DEFAULT PLATFORM PLANS
-- ============================================
INSERT INTO public.platform_plans (name, price_cents, interval, description, features, stripe_price_id, billing_cycle, is_active, is_popular)
SELECT * FROM (
  VALUES
    ('Free', 0, 'free', 'Perfect for trying out our service',
      '["3 scans per day","Basic nutritional information","Scan history","Email support"]'::jsonb,
      NULL, 'free', TRUE, FALSE),
    ('Premium', 699, 'month', 'Unlimited access to all features',
      '["Unlimited scans","Advanced nutritional analysis","Macro tracking","Meal planning","Export reports","Priority support"]'::jsonb,
      NULL, 'monthly', TRUE, TRUE),
    ('Premium', 6999, 'year', 'Best value - Save with yearly billing',
      '["Unlimited scans","Advanced nutritional analysis","Macro tracking","Meal planning","Export reports","Priority support"]'::jsonb,
      NULL, 'yearly', TRUE, FALSE)
) AS seed(name, price_cents, interval, description, features, stripe_price_id, billing_cycle, is_active, is_popular)
WHERE NOT EXISTS (SELECT 1 FROM public.platform_plans);

