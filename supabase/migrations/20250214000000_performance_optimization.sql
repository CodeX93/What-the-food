-- Performance Optimization Migration
-- Adds composite indexes and optimizes queries for faster load times

-- 1. Add composite index on widget_settings for (user_id, created_at)
--    This speeds up queries that filter by user_id AND order by created_at
CREATE INDEX IF NOT EXISTS idx_widget_settings_user_created 
  ON public.widget_settings(user_id, created_at DESC);

-- 2. Add composite index on widget_api_calls for (user_id, created_at)
--    This speeds up date-filtered count queries
CREATE INDEX IF NOT EXISTS idx_widget_api_calls_user_created 
  ON public.widget_api_calls(user_id, created_at DESC);

-- 3. Add composite index on widget_api_calls for (user_id, status)
--    This speeds up success count queries
CREATE INDEX IF NOT EXISTS idx_widget_api_calls_user_status 
  ON public.widget_api_calls(user_id, status);

-- 4. Add composite index on widget_api_calls for (user_id, created_at, status)
--    This is a covering index for all common queries
CREATE INDEX IF NOT EXISTS idx_widget_api_calls_user_created_status 
  ON public.widget_api_calls(user_id, created_at DESC, status);

-- 5. Add index on food_scans for (user_id, created_at)
--    This speeds up food analytics queries
CREATE INDEX IF NOT EXISTS idx_food_scans_user_created 
  ON public.food_scans(user_id, created_at DESC);

-- 6. Analyze tables to update statistics for query planner
ANALYZE public.widget_settings;
ANALYZE public.widget_api_calls;
ANALYZE public.food_scans;

-- Optional: Add a materialized view for API stats (uncomment if needed)
-- CREATE MATERIALIZED VIEW IF NOT EXISTS public.widget_api_stats_daily AS
-- SELECT 
--   user_id,
--   DATE(created_at) as stat_date,
--   COUNT(*) as total_calls,
--   COUNT(*) FILTER (WHERE status = 'success') as successful_calls
-- FROM public.widget_api_calls
-- GROUP BY user_id, DATE(created_at);
-- 
-- CREATE INDEX IF NOT EXISTS idx_widget_api_stats_daily_user_date 
--   ON public.widget_api_stats_daily(user_id, stat_date DESC);
