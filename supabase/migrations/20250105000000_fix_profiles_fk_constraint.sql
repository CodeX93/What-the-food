-- ============================================
-- FIX PROFILES FK CONSTRAINT
-- ============================================
-- Fix the profiles.id foreign key to point to auth.users instead of public.users

-- Drop the incorrect foreign key constraint if it exists
ALTER TABLE public.profiles 
  DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Create the correct foreign key constraint pointing to auth.users
ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_id_fkey 
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Verify the constraint was created correctly
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'profiles_id_fkey' 
    AND conrelid = 'public.profiles'::regclass
  ) THEN
    RAISE EXCEPTION 'Failed to create profiles_id_fkey constraint';
  END IF;
END $$;

