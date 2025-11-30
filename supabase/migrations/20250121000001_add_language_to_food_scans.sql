-- Add language column to food_scans table
ALTER TABLE public.food_scans
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';

-- Update existing records to have 'en' as default language
UPDATE public.food_scans
SET language = 'en'
WHERE language IS NULL;

-- Add check constraint for valid language values
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_food_scans_language') THEN
    ALTER TABLE public.food_scans DROP CONSTRAINT check_food_scans_language;
  END IF;
END $$;

ALTER TABLE public.food_scans
ADD CONSTRAINT check_food_scans_language CHECK (language IS NULL OR language IN ('en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ar'));

-- Set NOT NULL constraint after updating existing rows
ALTER TABLE public.food_scans
ALTER COLUMN language SET NOT NULL;

-- Add index for faster language lookups
CREATE INDEX IF NOT EXISTS idx_food_scans_language ON public.food_scans(language);

