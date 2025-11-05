-- Create food_scans table and RLS policies
create table if not exists public.food_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  image_path text not null,
  image_url text,
  serving numeric not null default 1,
  result_json jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.food_scans enable row level security;

-- Policies: users can manage their own scans
drop policy if exists "Food scans are viewable by owner" on public.food_scans;
create policy "Food scans are viewable by owner"
  on public.food_scans for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own food scans" on public.food_scans;
create policy "Users can insert own food scans"
  on public.food_scans for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own food scans" on public.food_scans;
create policy "Users can delete own food scans"
  on public.food_scans for delete
  using (auth.uid() = user_id);

-- Helpful indexes
create index if not exists idx_food_scans_user_created_at on public.food_scans (user_id, created_at desc);

-- Note: Create a public storage bucket named "FoodScans" and mark it public for fast delivery,
-- or generate signed URLs from the client if you prefer private buckets.

