-- Migration to add iframe padding/margin and upload area background color fields to widget_settings table
-- This allows users to customize spacing around the iframe and the upload area background

ALTER TABLE public.widget_settings
ADD COLUMN IF NOT EXISTS iframe_padding_top TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS iframe_padding_bottom TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS iframe_padding_left TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS iframe_padding_right TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS iframe_margin_top TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS iframe_margin_bottom TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS iframe_margin_left TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS iframe_margin_right TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS upload_area_background_color TEXT DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.widget_settings.iframe_padding_top IS 'Top padding for the iframe (e.g., "10px", "1rem")';
COMMENT ON COLUMN public.widget_settings.iframe_padding_bottom IS 'Bottom padding for the iframe (e.g., "10px", "1rem")';
COMMENT ON COLUMN public.widget_settings.iframe_padding_left IS 'Left padding for the iframe (e.g., "10px", "1rem")';
COMMENT ON COLUMN public.widget_settings.iframe_padding_right IS 'Right padding for the iframe (e.g., "10px", "1rem")';
COMMENT ON COLUMN public.widget_settings.iframe_margin_top IS 'Top margin for the iframe (e.g., "10px", "1rem")';
COMMENT ON COLUMN public.widget_settings.iframe_margin_bottom IS 'Bottom margin for the iframe (e.g., "10px", "1rem")';
COMMENT ON COLUMN public.widget_settings.iframe_margin_left IS 'Left margin for the iframe (e.g., "10px", "1rem")';
COMMENT ON COLUMN public.widget_settings.iframe_margin_right IS 'Right margin for the iframe (e.g., "10px", "1rem")';
COMMENT ON COLUMN public.widget_settings.upload_area_background_color IS 'Background color for the upload area container (hex color code, e.g., #ffffff)';
