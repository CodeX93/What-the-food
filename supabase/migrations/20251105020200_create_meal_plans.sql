create table if not exists public.meal_plans (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  goal text,
  target_weight numeric,
  timeframe_weeks integer,
  plan jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.meal_plans enable row level security;

create policy "Meal plans are viewable by owner"
on public.meal_plans
for select
using (auth.uid() = user_id);

create policy "Meal plans are insertable by owner"
on public.meal_plans
for insert
with check (auth.uid() = user_id);

create policy "Meal plans are updatable by owner"
on public.meal_plans
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Meal plans are deletable by owner"
on public.meal_plans
for delete
using (auth.uid() = user_id);

