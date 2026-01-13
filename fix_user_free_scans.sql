-- ============================================
-- Fix script for user: ae4e6432-1dc4-4a19-81f8-429c355b5d5a
-- This will create/initialize the free_scan_sessions record properly
-- ============================================

-- Option 1: INSERT a new record (if it doesn't exist)
-- This will create the record with correct values for registered users
INSERT INTO free_scan_sessions (
  user_id,
  daily_remaining,
  daily_limit,
  last_reset_at,
  total_remaining,
  total_limit,
  session_id
)
VALUES (
  'ae4e6432-1dc4-4a19-81f8-429c355b5d5a',
  3,      -- 3 scans per day for registered users
  3,      -- daily limit
  NOW(),  -- last_reset_at
  NULL,   -- total_remaining should be NULL for registered users
  NULL,   -- total_limit should be NULL for registered users
  NULL    -- session_id should be NULL for registered users
)
ON CONFLICT (user_id) 
DO UPDATE SET
  daily_remaining = 3,
  daily_limit = 3,
  last_reset_at = COALESCE(free_scan_sessions.last_reset_at, NOW()),
  total_remaining = NULL,  -- Clear any incorrect data
  total_limit = NULL,      -- Clear any incorrect data
  session_id = NULL,       -- Clear any incorrect data
  updated_at = NOW();

-- Option 2: UPSERT (alternative approach)
-- This does the same as above but with upsert syntax
/*
INSERT INTO free_scan_sessions (
  user_id,
  daily_remaining,
  daily_limit,
  last_reset_at,
  total_remaining,
  total_limit,
  session_id
)
VALUES (
  'ae4e6432-1dc4-4a19-81f8-429c355b5d5a',
  3,
  3,
  NOW(),
  NULL,
  NULL,
  NULL
)
ON CONFLICT (user_id) 
DO UPDATE SET
  daily_remaining = 3,
  daily_limit = 3,
  last_reset_at = COALESCE(free_scan_sessions.last_reset_at, NOW()),
  total_remaining = NULL,
  total_limit = NULL,
  session_id = NULL,
  updated_at = NOW();
*/

-- Verify the record was created/updated correctly
SELECT 
  user_id,
  daily_remaining,
  daily_limit,
  total_remaining,
  total_limit,
  session_id,
  last_reset_at,
  created_at,
  updated_at
FROM free_scan_sessions
WHERE user_id = 'ae4e6432-1dc4-4a19-81f8-429c355b5d5a';

