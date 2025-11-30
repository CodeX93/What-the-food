-- Add default_language field to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS default_language TEXT DEFAULT 'en';

-- Add check constraint for valid language values
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_default_language') THEN
    ALTER TABLE public.profiles DROP CONSTRAINT check_default_language;
  END IF;
END $$;

ALTER TABLE public.profiles
ADD CONSTRAINT check_default_language CHECK (default_language IS NULL OR default_language IN ('en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ar'));

-- Update existing profiles to have 'en' as default language
UPDATE public.profiles
SET default_language = 'en'
WHERE default_language IS NULL;

-- Set NOT NULL constraint after updating existing rows
ALTER TABLE public.profiles
ALTER COLUMN default_language SET NOT NULL;

