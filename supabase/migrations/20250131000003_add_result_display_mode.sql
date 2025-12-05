-- Migration to add result_display_mode field to widget_settings table
-- This allows users to customize how results are displayed:
-- 'same_page' - Display results on the same page (default)
-- 'new_tab' - Open results in a new tab
-- 'modal' - Show results in a modal popup

ALTER TABLE public.widget_settings
ADD COLUMN IF NOT EXISTS result_display_mode TEXT DEFAULT 'same_page' CHECK (result_display_mode IN ('same_page', 'new_tab', 'modal'));

-- Add comment for documentation
COMMENT ON COLUMN public.widget_settings.result_display_mode IS 'How to display scan results: same_page (default), new_tab, or modal';
