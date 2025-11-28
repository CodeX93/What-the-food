-- Add share_id column to meal_plans table for public sharing
ALTER TABLE public.meal_plans
ADD COLUMN IF NOT EXISTS share_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_meal_plans_share_id ON public.meal_plans(share_id);

-- Update existing meal plans to use their id as share_id
UPDATE public.meal_plans
SET share_id = id::text
WHERE share_id IS NULL;

