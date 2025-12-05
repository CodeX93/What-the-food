-- Allow public read access to widget_settings by widget_id
-- This is necessary for embedded widgets to load on third-party websites
-- where users are not authenticated

-- Add a policy that allows anyone to read widget settings by widget_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'widget_settings' 
    AND policyname = 'Allow public read of widget settings by widget_id'
  ) THEN
    CREATE POLICY "Allow public read of widget settings by widget_id" ON public.widget_settings
      FOR SELECT 
      USING (true);
  END IF;
END $$;

-- Note: This allows public read access to all widget settings
-- This is safe because widget settings only contain:
-- - widget_id (already in URL)
-- - primary_color, border_radius, custom_text (public styling)
-- - widget_name, widget_description (public info)
-- - branding_visible (public setting)
-- No sensitive user data is exposed

