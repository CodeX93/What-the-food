-- Modify food_scans table to allow temporary (non-authenticated) users
-- This is needed for the free scan feature where users can try without signing up

-- STEP 1: Drop all existing policies first (they depend on the column type)
DROP POLICY IF EXISTS "Food scans are viewable by owner" ON public.food_scans;
DROP POLICY IF EXISTS "Users can insert own food scans" ON public.food_scans;
DROP POLICY IF EXISTS "Users can delete own food scans" ON public.food_scans;

-- STEP 2: Drop the foreign key constraint
ALTER TABLE public.food_scans DROP CONSTRAINT IF EXISTS food_scans_user_id_fkey;

-- STEP 3: Change user_id to allow any text value (not just UUIDs from auth.users)
ALTER TABLE public.food_scans ALTER COLUMN user_id TYPE text;

-- STEP 4: Recreate RLS policies to allow temp users
CREATE POLICY "Food scans are viewable by owner"
  ON public.food_scans FOR SELECT
  USING (
    -- Authenticated users can view their own scans
    (auth.uid() IS NOT NULL AND auth.uid()::text = user_id)
    OR
    -- Temp users can view their temp scans (starts with 'temp_')
    (user_id LIKE 'temp_%')
  );

CREATE POLICY "Users can insert own food scans"
  ON public.food_scans FOR INSERT
  WITH CHECK (
    -- Authenticated users can insert with their own ID
    (auth.uid() IS NOT NULL AND auth.uid()::text = user_id)
    OR
    -- Allow temp user inserts (starts with 'temp_') even when not authenticated
    (user_id LIKE 'temp_%')
  );

CREATE POLICY "Users can delete own food scans"
  ON public.food_scans FOR DELETE
  USING (
    -- Authenticated users can delete their own scans
    (auth.uid() IS NOT NULL AND auth.uid()::text = user_id)
    OR
    -- Temp users can delete their temp scans (starts with 'temp_')
    (user_id LIKE 'temp_%')
  );

-- Update index to work with text user_id
DROP INDEX IF EXISTS idx_food_scans_user_created_at;
CREATE INDEX IF NOT EXISTS idx_food_scans_user_created_at ON public.food_scans (user_id, created_at DESC);

-- Add a comment explaining temp users
COMMENT ON COLUMN public.food_scans.user_id IS 'User ID - can be a UUID for authenticated users or temp_{timestamp}_{random} for non-authenticated users';

