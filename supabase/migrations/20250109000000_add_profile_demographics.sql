-- Add demographic fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS age INTEGER,
ADD COLUMN IF NOT EXISTS weight_kg DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS height_cm INTEGER;

-- Add check constraints for valid values (drop first if they exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_gender') THEN
    ALTER TABLE public.profiles DROP CONSTRAINT check_gender;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_age') THEN
    ALTER TABLE public.profiles DROP CONSTRAINT check_age;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_weight') THEN
    ALTER TABLE public.profiles DROP CONSTRAINT check_weight;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_height') THEN
    ALTER TABLE public.profiles DROP CONSTRAINT check_height;
  END IF;
END $$;

ALTER TABLE public.profiles
ADD CONSTRAINT check_gender CHECK (gender IS NULL OR gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
ADD CONSTRAINT check_age CHECK (age IS NULL OR (age >= 0 AND age <= 150)),
ADD CONSTRAINT check_weight CHECK (weight_kg IS NULL OR (weight_kg > 0 AND weight_kg <= 1000)),
ADD CONSTRAINT check_height CHECK (height_cm IS NULL OR (height_cm > 0 AND height_cm <= 300));

