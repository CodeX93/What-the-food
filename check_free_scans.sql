-- ============================================
-- Query to check free scan status for a user
-- User ID: ae4e6432-1dc4-4a19-81f8-429c355b5d5a
-- 
-- NOTE: If UI shows 10 but SQL returns 3, check:
-- 1. Run debug_user_scans.sql to see the actual database record
-- 2. Check browser console for API response
-- 3. The API should return daily_remaining (3) for registered users, not total_remaining (10)
-- ============================================

-- RECOMMENDED: Comprehensive query showing everything
SELECT 
  p.id AS user_id,
  p.email,
  ps.subscription_type,
  ps.is_active AS subscription_active,
  ps.billing_cycle,
  CASE 
    WHEN ps.subscription_type = 'premium' AND ps.is_active = true THEN 'UNLIMITED (Premium User)'
    WHEN fss.daily_remaining IS NOT NULL THEN fss.daily_remaining::text
    ELSE '3 (Default - no record exists yet)'
  END AS remaining_scans,
  CASE 
    WHEN ps.subscription_type = 'premium' AND ps.is_active = true THEN NULL
    ELSE COALESCE(fss.daily_limit, 3)
  END AS daily_limit,
  fss.last_reset_at,
  CASE 
    WHEN fss.last_reset_at IS NULL THEN 'No record exists'
    WHEN DATE(fss.last_reset_at) < CURRENT_DATE THEN 'Needs daily reset'
    ELSE 'Reset today'
  END AS reset_status,
  fss.created_at AS scan_record_created_at,
  fss.updated_at AS scan_record_updated_at
FROM profiles p
LEFT JOIN platform_subscriptions ps ON p.id = ps.user_id
LEFT JOIN free_scan_sessions fss ON p.id = fss.user_id
WHERE p.id = 'ae4e6432-1dc4-4a19-81f8-429c355b5d5a';

-- ============================================
-- SIMPLE: Just get the remaining scans count
-- ============================================
SELECT 
  CASE 
    WHEN ps.subscription_type = 'premium' AND ps.is_active = true THEN -1 -- -1 = Unlimited (premium users)
    WHEN fss.daily_remaining IS NOT NULL THEN fss.daily_remaining
    ELSE 3 -- Default for registered users (3 scans per day)
  END AS remaining_scans,
  CASE 
    WHEN ps.subscription_type = 'premium' AND ps.is_active = true THEN 'UNLIMITED'
    WHEN fss.daily_remaining IS NOT NULL THEN 'LIMITED'
    ELSE 'DEFAULT (No record yet)'
  END AS scan_status
FROM profiles p
LEFT JOIN platform_subscriptions ps ON p.id = ps.user_id
LEFT JOIN free_scan_sessions fss ON p.id = fss.user_id
WHERE p.id = 'ae4e6432-1dc4-4a19-81f8-429c355b5d5a';

-- ============================================
-- DETAILED: View all free_scan_sessions data
-- ============================================
SELECT 
  fss.id,
  fss.user_id,
  fss.daily_remaining,
  fss.daily_limit,
  fss.total_remaining,
  fss.total_limit,
  fss.last_reset_at,
  fss.created_at,
  fss.updated_at,
  ps.subscription_type,
  ps.is_active AS is_premium_active,
  ps.billing_cycle,
  CASE 
    WHEN ps.subscription_type = 'premium' AND ps.is_active = true THEN true
    ELSE false
  END AS has_unlimited_scans
FROM free_scan_sessions fss
LEFT JOIN platform_subscriptions ps ON fss.user_id = ps.user_id
WHERE fss.user_id = 'ae4e6432-1dc4-4a19-81f8-429c355b5d5a';

