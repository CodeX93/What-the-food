-- Migration to add iframe_width and iframe_height fields to widget_settings table
-- This allows users to customize the iframe dimensions in the embed code

ALTER TABLE public.widget_settings
ADD COLUMN IF NOT EXISTS iframe_width TEXT DEFAULT '100%',
ADD COLUMN IF NOT EXISTS iframe_height TEXT DEFAULT '600';

-- Add comments for documentation
COMMENT ON COLUMN public.widget_settings.iframe_width IS 'Width of the iframe in embed code (e.g., "100%", "500px")';
COMMENT ON COLUMN public.widget_settings.iframe_height IS 'Height of the iframe in embed code (e.g., "600", "600px")';
