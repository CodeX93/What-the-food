-- Ensure enum exists (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'subscription_type' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.subscription_type AS ENUM ('free', 'premium');
  END IF;
END$$;

-- Add platform subscription fields to profiles for efficient checks
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS platform_subscription_id UUID,
ADD COLUMN IF NOT EXISTS platform_subscription_type public.subscription_type DEFAULT 'free';

-- Optional: keep it consistent when subscription row is deleted
-- (Cannot add FK easily without handling nulls; skip strict FK for flexibility)

CREATE INDEX IF NOT EXISTS idx_profiles_platform_subscription_id ON public.profiles(platform_subscription_id);


