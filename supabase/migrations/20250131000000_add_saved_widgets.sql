-- Migration to support multiple saved widgets per user
-- Remove unique constraint on user_id in widget_settings and add name field

-- First, drop the unique constraint on user_id if it exists
ALTER TABLE public.widget_settings 
DROP CONSTRAINT IF EXISTS widget_settings_user_id_key;

-- Add name and description fields for saved widgets
ALTER TABLE public.widget_settings
ADD COLUMN IF NOT EXISTS widget_name TEXT,
ADD COLUMN IF NOT EXISTS widget_description TEXT,
ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;

-- Create an index for faster queries
CREATE INDEX IF NOT EXISTS idx_widget_settings_user_id ON public.widget_settings(user_id);

-- Ensure each user has at most one default widget
-- This will be enforced at the application level for now

