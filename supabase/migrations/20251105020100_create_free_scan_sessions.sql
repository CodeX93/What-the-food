create table if not exists public.free_scan_sessions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid unique,
  user_id uuid unique,
  total_remaining integer,
  total_limit integer,
  daily_remaining integer,
  daily_limit integer,
  last_reset_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.handle_free_scan_sessions_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_free_scan_sessions_updated_at on public.free_scan_sessions;

create trigger set_free_scan_sessions_updated_at
before update on public.free_scan_sessions
for each row execute procedure public.handle_free_scan_sessions_updated_at();
