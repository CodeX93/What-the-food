-- Create saved_recipes table
create table if not exists public.saved_recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  food_name text not null,
  recipe_text text not null,
  image_url text,
  image_path text,
  food_scan_id uuid references public.food_scans(id) on delete set null,
  nutrition_summary jsonb,
  created_at timestamptz not null default now()
);

alter table public.saved_recipes enable row level security;

-- Policies: users can manage their own saved recipes
drop policy if exists "Saved recipes are viewable by owner" on public.saved_recipes;
create policy "Saved recipes are viewable by owner"
  on public.saved_recipes for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own saved recipes" on public.saved_recipes;
create policy "Users can insert own saved recipes"
  on public.saved_recipes for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own saved recipes" on public.saved_recipes;
create policy "Users can update own saved recipes"
  on public.saved_recipes for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own saved recipes" on public.saved_recipes;
create policy "Users can delete own saved recipes"
  on public.saved_recipes for delete
  using (auth.uid() = user_id);

-- Helpful indexes
create index if not exists idx_saved_recipes_user_created_at on public.saved_recipes (user_id, created_at desc);
create index if not exists idx_saved_recipes_food_scan_id on public.saved_recipes (food_scan_id);

