-- Add country field to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS country TEXT;

-- Add check constraint for valid country codes (ISO 3166-1 alpha-2)
-- This allows any 2-letter country code or NULL
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_country') THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT check_country CHECK (country IS NULL OR LENGTH(country) = 2);
  END IF;
END $$;

