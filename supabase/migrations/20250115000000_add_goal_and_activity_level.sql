-- Add goal and activity_level fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS goal TEXT,
ADD COLUMN IF NOT EXISTS activity_level TEXT;

-- Add check constraints for valid values
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_goal') THEN
    ALTER TABLE public.profiles DROP CONSTRAINT check_goal;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_activity_level') THEN
    ALTER TABLE public.profiles DROP CONSTRAINT check_activity_level;
  END IF;
END $$;

ALTER TABLE public.profiles
ADD CONSTRAINT check_goal CHECK (goal IS NULL OR goal IN ('weight_loss', 'weight_gain', 'maintain_weight', 'build_muscle', 'improve_fitness', 'general_health')),
ADD CONSTRAINT check_activity_level CHECK (activity_level IS NULL OR activity_level IN ('sedentary', 'light_active', 'moderately_active', 'very_active', 'extremely_active'));

-- Note: bio field is kept for backward compatibility but is no longer required for profile completion

