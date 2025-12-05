-- Migration to allow public reading of API call counts for widget limit checking
-- This is necessary because widgets are embedded on external sites without authentication

-- Create a function that returns the API call count for a widget's user
-- This function uses SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION public.get_widget_user_api_count(p_widget_id TEXT)
RETURNS TABLE(
  user_id UUID,
  subscription_type TEXT,
  api_call_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_subscription_type TEXT;
  v_api_count BIGINT;
BEGIN
  -- Get widget user_id and platform subscription type (not widget subscription)
  -- We check platform subscription because API call limits are based on platform plan (free/premium)
  -- Widget subscriptions (plan1/plan2/plan3) are separate and don't affect API call limits
  -- Fallback to profiles.platform_subscription_type if platform_subscriptions row doesn't exist
  SELECT
    ws.user_id,
    COALESCE(ps.subscription_type::TEXT, p.platform_subscription_type::TEXT, 'free')
  INTO
    v_user_id,
    v_subscription_type
  FROM widget_settings ws
  LEFT JOIN profiles p ON p.id = ws.user_id
  LEFT JOIN platform_subscriptions ps ON ps.user_id = ws.user_id AND ps.is_active = TRUE
  WHERE ws.widget_id = p_widget_id
  LIMIT 1;

  -- If widget not found, return empty
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Get API call count for this user
  -- Use explicit table alias to avoid ambiguous column reference
  SELECT COUNT(*)::BIGINT
  INTO v_api_count
  FROM widget_api_calls wac
  WHERE wac.user_id = v_user_id;

  -- Return the result
  -- Use explicit column aliases to avoid ambiguity with RETURNS TABLE columns
  RETURN QUERY
  SELECT 
    v_user_id AS user_id,
    COALESCE(v_subscription_type, 'free') AS subscription_type,
    COALESCE(v_api_count, 0) AS api_call_count;
END;
$$;

-- Grant execute permission to anonymous users
GRANT EXECUTE ON FUNCTION public.get_widget_user_api_count(TEXT) TO anon, authenticated;

-- Add a public policy to allow reading widget_settings by widget_id (needed for public embeds)
-- This allows the widget to load its settings without authentication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'widget_settings' 
    AND policyname = 'Public can view widget settings by widget_id'
  ) THEN
    CREATE POLICY "Public can view widget settings by widget_id" ON public.widget_settings
      FOR SELECT USING (true);
  END IF;
END $$;
