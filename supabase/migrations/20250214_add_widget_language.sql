-- Add language column to widget_settings
ALTER TABLE widget_settings 
ADD COLUMN IF NOT EXISTS language text DEFAULT 'en';

-- Add comment
COMMENT ON COLUMN widget_settings.language IS 'Language code for the widget (e.g., en, es, fr)';
