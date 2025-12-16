-- Add nutrition_summary column to saved_recipes table
alter table if exists public.saved_recipes 
add column if not exists nutrition_summary jsonb;
