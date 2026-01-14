-- Create streaks table to track user streaks
create table if not exists public.user_streaks (
  id uuid primary key default gen_random_uuid(),
  user_id text not null, -- text to support both UUID and temp users
  streak_type text not null, -- 'login', 'scan_1', 'scan_3', etc.
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_activity_date date,
  streak_start_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, streak_type)
);

-- Create achievements table to track unlocked achievements
create table if not exists public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  achievement_type text not null, -- 'login_30', 'login_100', 'scan_1_30', 'scan_3_30', etc.
  unlocked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(user_id, achievement_type)
);

-- Create daily activity log for tracking login and scan activity
create table if not exists public.daily_activity (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  activity_date date not null default current_date,
  login_count integer not null default 0,
  scan_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, activity_date)
);

-- Indexes for performance
create index if not exists idx_user_streaks_user_id on public.user_streaks (user_id);
create index if not exists idx_user_streaks_type on public.user_streaks (streak_type);
create index if not exists idx_user_achievements_user_id on public.user_achievements (user_id);
create index if not exists idx_daily_activity_user_date on public.daily_activity (user_id, activity_date desc);

-- Enable RLS
alter table public.user_streaks enable row level security;
alter table public.user_achievements enable row level security;
alter table public.daily_activity enable row level security;

-- RLS Policies for user_streaks
drop policy if exists "Users can view own streaks" on public.user_streaks;
create policy "Users can view own streaks"
  on public.user_streaks for select
  using (
    (auth.uid() IS NOT NULL AND auth.uid()::text = user_id)
    OR (user_id LIKE 'temp_%')
  );

drop policy if exists "Users can insert own streaks" on public.user_streaks;
create policy "Users can insert own streaks"
  on public.user_streaks for insert
  with check (
    (auth.uid() IS NOT NULL AND auth.uid()::text = user_id)
    OR (user_id LIKE 'temp_%')
  );

drop policy if exists "Users can update own streaks" on public.user_streaks;
create policy "Users can update own streaks"
  on public.user_streaks for update
  using (
    (auth.uid() IS NOT NULL AND auth.uid()::text = user_id)
    OR (user_id LIKE 'temp_%')
  );

-- RLS Policies for user_achievements
drop policy if exists "Users can view own achievements" on public.user_achievements;
create policy "Users can view own achievements"
  on public.user_achievements for select
  using (
    (auth.uid() IS NOT NULL AND auth.uid()::text = user_id)
    OR (user_id LIKE 'temp_%')
  );

drop policy if exists "Users can insert own achievements" on public.user_achievements;
create policy "Users can insert own achievements"
  on public.user_achievements for insert
  with check (
    (auth.uid() IS NOT NULL AND auth.uid()::text = user_id)
    OR (user_id LIKE 'temp_%')
  );

-- RLS Policies for daily_activity
drop policy if exists "Users can view own daily activity" on public.daily_activity;
create policy "Users can view own daily activity"
  on public.daily_activity for select
  using (
    (auth.uid() IS NOT NULL AND auth.uid()::text = user_id)
    OR (user_id LIKE 'temp_%')
  );

drop policy if exists "Users can insert own daily activity" on public.daily_activity;
create policy "Users can insert own daily activity"
  on public.daily_activity for insert
  with check (
    (auth.uid() IS NOT NULL AND auth.uid()::text = user_id)
    OR (user_id LIKE 'temp_%')
  );

drop policy if exists "Users can update own daily activity" on public.daily_activity;
create policy "Users can update own daily activity"
  on public.daily_activity for update
  using (
    (auth.uid() IS NOT NULL AND auth.uid()::text = user_id)
    OR (user_id LIKE 'temp_%')
  );

-- Function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
create trigger update_user_streaks_updated_at
  before update on public.user_streaks
  for each row
  execute function update_updated_at_column();

create trigger update_daily_activity_updated_at
  before update on public.daily_activity
  for each row
  execute function update_updated_at_column();
