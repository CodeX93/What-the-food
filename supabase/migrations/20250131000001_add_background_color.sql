-- Migration to add background_color field to widget_settings table
-- This allows users to customize the background color of their widgets

ALTER TABLE public.widget_settings
ADD COLUMN IF NOT EXISTS background_color TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.widget_settings.background_color IS 'Background color for the widget (hex color code, e.g., #ffffff or transparent)';
