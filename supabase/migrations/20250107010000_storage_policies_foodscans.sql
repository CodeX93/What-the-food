-- Storage RLS policies for FoodScans bucket
-- Authenticated users can:
--  - upload to paths under their UID:  <uid>/filename
--  - read their own objects (if bucket is not public)
--  - delete their own objects

-- Ensure storage is enabled; policies apply to storage.objects

-- SELECT policy (if bucket is private). Keep even for clarity.
drop policy if exists "FoodScans read own objects" on storage.objects;
create policy "FoodScans read own objects"
on storage.objects for select to authenticated
using (
  bucket_id = 'FoodScans' and (
    name like (auth.uid()::text || '/%')
  )
);

-- INSERT policy
drop policy if exists "FoodScans upload to own folder" on storage.objects;
create policy "FoodScans upload to own folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'FoodScans' and (
    name like (auth.uid()::text || '/%')
  )
);

-- DELETE policy
drop policy if exists "FoodScans delete own objects" on storage.objects;
create policy "FoodScans delete own objects"
on storage.objects for delete to authenticated
using (
  bucket_id = 'FoodScans' and (
    name like (auth.uid()::text || '/%')
  )
);

-- Optional: UPDATE policy (usually not needed)
drop policy if exists "FoodScans update own objects" on storage.objects;
create policy "FoodScans update own objects"
on storage.objects for update to authenticated
using (
  bucket_id = 'FoodScans' and (
    name like (auth.uid()::text || '/%')
  )
)
with check (
  bucket_id = 'FoodScans' and (
    name like (auth.uid()::text || '/%')
  )
);


