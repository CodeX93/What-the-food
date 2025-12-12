-- Fix billing_cycle normalization
-- Update any records that have 'month' or 'year' to 'monthly' or 'yearly'

-- Fix platform_subscriptions
UPDATE platform_subscriptions
SET billing_cycle = 'monthly'
WHERE billing_cycle = 'month';

UPDATE platform_subscriptions
SET billing_cycle = 'yearly'
WHERE billing_cycle IN ('year', 'annual');

-- Fix widget_subscriptions (if they have billing_cycle)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'widget_subscriptions' 
    AND column_name = 'billing_cycle'
  ) THEN
    UPDATE widget_subscriptions
    SET billing_cycle = 'monthly'
    WHERE billing_cycle = 'month';

    UPDATE widget_subscriptions
    SET billing_cycle = 'yearly'
    WHERE billing_cycle IN ('year', 'annual');
  END IF;
END$$;

-- Log the changes
DO $$
DECLARE
  platform_count INTEGER;
  widget_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO platform_count
  FROM platform_subscriptions
  WHERE billing_cycle IN ('month', 'year', 'annual');
  
  SELECT COUNT(*) INTO widget_count
  FROM widget_subscriptions
  WHERE billing_cycle IN ('month', 'year', 'annual');
  
  RAISE NOTICE 'Fixed billing_cycle normalization: % platform records, % widget records', 
    platform_count, widget_count;
END$$;
