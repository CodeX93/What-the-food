-- ============================================
-- Debug query to check what's actually in the database for this user
-- User ID: ae4e6432-1dc4-4a19-81f8-429c355b5d5a
-- ============================================

-- 1. Check the actual record in free_scan_sessions (this is what the API reads)
SELECT 
  id,
  user_id,
  session_id,
  total_remaining,      -- Should be NULL for registered users
  total_limit,          -- Should be NULL for registered users
  daily_remaining,      -- Should be 3 (or less) for registered users
  daily_limit,          -- Should be 3 for registered users
  last_reset_at,
  created_at,
  updated_at,
  -- Calculate what the API would return
  CASE 
    WHEN daily_remaining IS NOT NULL THEN daily_remaining
    ELSE 3  -- Default fallback
  END AS api_would_return_daily,
  CASE 
    WHEN total_remaining IS NOT NULL THEN total_remaining
    ELSE 10  -- Default fallback for unregistered
  END AS api_would_return_total
FROM free_scan_sessions
WHERE user_id = 'ae4e6432-1dc4-4a19-81f8-429c355b5d5a';

-- 2. Check subscription status (premium users get unlimited)
SELECT 
  subscription_type,
  is_active,
  billing_cycle,
  CASE 
    WHEN subscription_type = 'premium' AND is_active = true THEN 'UNLIMITED (-1)'
    ELSE 'LIMITED (daily_remaining)'
  END AS scan_status
FROM platform_subscriptions
WHERE user_id = 'ae4e6432-1dc4-4a19-81f8-429c355b5d5a';

-- 3. Comprehensive view matching the API logic
SELECT 
  p.id AS user_id,
  p.email,
  ps.subscription_type,
  ps.is_active AS subscription_active,
  CASE 
    WHEN ps.subscription_type = 'premium' AND ps.is_active = true THEN -1
    WHEN fss.daily_remaining IS NOT NULL THEN fss.daily_remaining
    ELSE 3
  END AS expected_api_response,
  fss.daily_remaining AS db_daily_remaining,
  fss.total_remaining AS db_total_remaining,
  fss.daily_limit,
  fss.last_reset_at,
  CASE 
    WHEN fss.last_reset_at IS NULL THEN 'No record or no reset date'
    WHEN DATE(fss.last_reset_at) < CURRENT_DATE THEN 'Needs daily reset (old date)'
    ELSE 'Reset today'
  END AS reset_status
FROM profiles p
LEFT JOIN platform_subscriptions ps ON p.id = ps.user_id
LEFT JOIN free_scan_sessions fss ON p.id = fss.user_id
WHERE p.id = 'ae4e6432-1dc4-4a19-81f8-429c355b5d5a';

-- 4. Check if there's incorrectly created data (both user_id and session_id, or wrong fields populated)
SELECT 
  id,
  user_id,
  session_id,
  total_remaining,
  daily_remaining,
  CASE 
    WHEN user_id IS NOT NULL AND session_id IS NOT NULL THEN 'ERROR: Has both user_id and session_id'
    WHEN user_id IS NOT NULL AND total_remaining IS NOT NULL AND daily_remaining IS NULL THEN 'ERROR: Registered user but has total_remaining instead of daily_remaining'
    WHEN session_id IS NOT NULL AND daily_remaining IS NOT NULL AND total_remaining IS NULL THEN 'ERROR: Unregistered user but has daily_remaining instead of total_remaining'
    ELSE 'OK'
  END AS data_quality_check
FROM free_scan_sessions
WHERE user_id = 'ae4e6432-1dc4-4a19-81f8-429c355b5d5a';

-- 5. FIX QUERY: If the record has incorrect data, run this to fix it
-- WARNING: Only run this if query #4 shows an error!
-- This will fix registered users that have total_remaining set instead of daily_remaining
/*
UPDATE free_scan_sessions
SET 
  daily_remaining = COALESCE(daily_remaining, 3),
  daily_limit = COALESCE(daily_limit, 3),
  total_remaining = NULL,
  total_limit = NULL,
  session_id = NULL,
  last_reset_at = COALESCE(last_reset_at, NOW())
WHERE user_id = 'ae4e6432-1dc4-4a19-81f8-429c355b5d5a'
  AND user_id IS NOT NULL
  AND (total_remaining IS NOT NULL OR daily_remaining IS NULL);
*/

