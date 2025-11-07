-- Allow temporary (non-authenticated) users to upload to FoodScans bucket
-- This is needed for the free scan feature where users can try without signing up

-- Drop the existing policy
DROP POLICY IF EXISTS "Allow authenticated users to manage their own food scans" ON storage.objects;

-- Create new policy that allows both authenticated and temporary users
CREATE POLICY "Allow users to manage their own food scans"
ON storage.objects FOR ALL
USING (
  bucket_id = 'FoodScans' AND (
    -- Authenticated users can access their own folder
    (auth.uid() IS NOT NULL AND auth.uid()::text = (storage.foldername(name))[1])
    OR
    -- Allow temp user uploads (name starts with 'temp_') - works for non-authenticated users
    ((storage.foldername(name))[1] LIKE 'temp_%')
  )
)
WITH CHECK (
  bucket_id = 'FoodScans' AND (
    -- Authenticated users can upload to their own folder
    (auth.uid() IS NOT NULL AND auth.uid()::text = (storage.foldername(name))[1])
    OR
    -- Allow temp user uploads (name starts with 'temp_') - works for non-authenticated users
    ((storage.foldername(name))[1] LIKE 'temp_%')
  )
);

