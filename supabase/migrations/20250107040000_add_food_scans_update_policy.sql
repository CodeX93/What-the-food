-- Add missing UPDATE policy for food_scans table
-- This allows users to update their own scans (e.g., change serving size)

DROP POLICY IF EXISTS "Users can update own food scans" ON public.food_scans;

CREATE POLICY "Users can update own food scans"
  ON public.food_scans FOR UPDATE
  USING (
    -- Authenticated users can update their own scans
    (auth.uid() IS NOT NULL AND auth.uid()::text = user_id)
    OR
    -- Temp users can update their temp scans (starts with 'temp_')
    (user_id LIKE 'temp_%')
  )
  WITH CHECK (
    -- Authenticated users can update with their own ID
    (auth.uid() IS NOT NULL AND auth.uid()::text = user_id)
    OR
    -- Allow temp user updates (starts with 'temp_')
    (user_id LIKE 'temp_%')
  );

