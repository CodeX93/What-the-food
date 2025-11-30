-- Add language column to meal_plans table
ALTER TABLE public.meal_plans
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';

-- Update existing records to have 'en' as default language
UPDATE public.meal_plans
SET language = 'en'
WHERE language IS NULL;

-- Add check constraint for valid language values
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_meal_plans_language') THEN
    ALTER TABLE public.meal_plans DROP CONSTRAINT check_meal_plans_language;
  END IF;
END $$;

ALTER TABLE public.meal_plans
ADD CONSTRAINT check_meal_plans_language CHECK (language IS NULL OR language IN ('en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ar'));

-- Set NOT NULL constraint after updating existing rows
ALTER TABLE public.meal_plans
ALTER COLUMN language SET NOT NULL;

-- Add index for faster language lookups
CREATE INDEX IF NOT EXISTS idx_meal_plans_language ON public.meal_plans(language);

