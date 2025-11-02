-- Ensure profiles table exists (should be created by original migration)
-- If profiles doesn't exist, create it first
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure widget_subscription_type enum exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'widget_subscription_type') THEN
    CREATE TYPE public.widget_subscription_type AS ENUM ('free', 'plan1', 'plan2', 'plan3');
  END IF;
END $$;

-- Ensure widget_subscriptions table exists
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

-- Ensure widget_settings table exists (MUST be created before widget_sites which references it)
CREATE TABLE IF NOT EXISTS public.widget_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  widget_id TEXT NOT NULL UNIQUE,
  primary_color TEXT DEFAULT '#10b981',
  border_radius TEXT DEFAULT '8px',
  custom_text TEXT,
  branding_visible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create widget_sites table to track where widgets are embedded
-- This must be created AFTER widget_settings since it references it
CREATE TABLE IF NOT EXISTS public.widget_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  site_url TEXT NOT NULL,
  site_name TEXT,
  widget_id TEXT NOT NULL REFERENCES public.widget_settings(widget_id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, site_url)
);

-- Create widget_api_calls table to track API usage
CREATE TABLE IF NOT EXISTS public.widget_api_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_id TEXT NOT NULL REFERENCES public.widget_settings(widget_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  site_url TEXT,
  ip_address TEXT,
  user_agent TEXT,
  call_type TEXT NOT NULL DEFAULT 'scan', -- 'scan', 'preview', etc.
  status TEXT NOT NULL DEFAULT 'success', -- 'success', 'error', 'rate_limited'
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_widget_api_calls_widget_id ON public.widget_api_calls(widget_id);
CREATE INDEX IF NOT EXISTS idx_widget_api_calls_user_id ON public.widget_api_calls(user_id);
CREATE INDEX IF NOT EXISTS idx_widget_api_calls_created_at ON public.widget_api_calls(created_at);
CREATE INDEX IF NOT EXISTS idx_widget_sites_user_id ON public.widget_sites(user_id);

-- Enable RLS
ALTER TABLE public.widget_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widget_api_calls ENABLE ROW LEVEL SECURITY;

-- RLS Policies for widget_sites
CREATE POLICY "Users can view own widget sites" ON public.widget_sites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own widget sites" ON public.widget_sites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own widget sites" ON public.widget_sites
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own widget sites" ON public.widget_sites
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for widget_api_calls
-- Users can view their own API calls
CREATE POLICY "Users can view own widget API calls" ON public.widget_api_calls
  FOR SELECT USING (auth.uid() = user_id);

-- Allow anonymous inserts for widget usage tracking (from embedded widgets)
-- This is necessary because the widget is embedded on third-party sites
CREATE POLICY "Allow widget API call inserts" ON public.widget_api_calls
  FOR INSERT WITH CHECK (true);

-- Admins can view all API calls (you'll need to create an admin role/function)
-- For now, we'll handle admin access in the application layer

-- Enable RLS for widget_subscriptions if not already enabled
ALTER TABLE public.widget_subscriptions ENABLE ROW LEVEL SECURITY;

-- Enable RLS for widget_settings if not already enabled
ALTER TABLE public.widget_settings ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for widget_subscriptions if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'widget_subscriptions' 
    AND policyname = 'Users can view own widget subscription'
  ) THEN
    CREATE POLICY "Users can view own widget subscription" ON public.widget_subscriptions
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'widget_subscriptions' 
    AND policyname = 'Users can insert own widget subscription'
  ) THEN
    CREATE POLICY "Users can insert own widget subscription" ON public.widget_subscriptions
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'widget_subscriptions' 
    AND policyname = 'Users can update own widget subscription'
  ) THEN
    CREATE POLICY "Users can update own widget subscription" ON public.widget_subscriptions
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Add RLS policies for widget_settings if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'widget_settings' 
    AND policyname = 'Users can view own widget settings'
  ) THEN
    CREATE POLICY "Users can view own widget settings" ON public.widget_settings
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'widget_settings' 
    AND policyname = 'Users can insert own widget settings'
  ) THEN
    CREATE POLICY "Users can insert own widget settings" ON public.widget_settings
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'widget_settings' 
    AND policyname = 'Users can update own widget settings'
  ) THEN
    CREATE POLICY "Users can update own widget settings" ON public.widget_settings
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'widget_settings' 
    AND policyname = 'Users can delete own widget settings'
  ) THEN
    CREATE POLICY "Users can delete own widget settings" ON public.widget_settings
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

