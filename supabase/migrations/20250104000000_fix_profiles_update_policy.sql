-- Fix profiles UPDATE RLS policy to ensure it works correctly
-- Drop existing update policy if it exists
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create update policy with both USING and WITH CHECK
-- This ensures users can update their own profile rows
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Verify the policy was created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Users can update own profile'
  ) THEN
    RAISE EXCEPTION 'Failed to create update policy';
  END IF;
END $$;

