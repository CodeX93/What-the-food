-- Ensure widget subscription site limits are enforced at the database level
-- Plans:
--   free      -> 1 site
--   plan1     -> 1 site
--   plan2     -> 3 sites
--   plan3     -> unlimited (NULL limit)

BEGIN;

-- Allow NULL site_limit so we can represent unlimited plans cleanly
ALTER TABLE public.widget_subscriptions
  ALTER COLUMN site_limit DROP NOT NULL;

-- Helper function to translate subscription type into the enforced site limit
CREATE OR REPLACE FUNCTION public.widget_plan_site_limit(plan public.widget_subscription_type)
RETURNS INTEGER
LANGUAGE sql
AS $$
  SELECT CASE plan
    WHEN 'plan3' THEN NULL       -- unlimited
    WHEN 'plan2' THEN 3
    ELSE 1                       -- free and plan1
  END;
$$;

COMMENT ON FUNCTION public.widget_plan_site_limit IS 'Maps widget subscription plan to enforced site limit (NULL means unlimited).';

-- Trigger to automatically align site_limit with the subscription type
CREATE OR REPLACE FUNCTION public.sync_widget_subscription_site_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.site_limit := public.widget_plan_site_limit(NEW.subscription_type);
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.sync_widget_subscription_site_limit IS 'Ensures widget_subscriptions.site_limit always matches subscription_type.';

DROP TRIGGER IF EXISTS trg_sync_widget_subscription_site_limit ON public.widget_subscriptions;

CREATE TRIGGER trg_sync_widget_subscription_site_limit
BEFORE INSERT OR UPDATE ON public.widget_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.sync_widget_subscription_site_limit();

-- Backfill existing records to the correct limits
UPDATE public.widget_subscriptions
SET site_limit = public.widget_plan_site_limit(subscription_type);

-- Enforce site limit before inserting new widget sites
CREATE OR REPLACE FUNCTION public.enforce_widget_site_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  effective_limit INTEGER;
  current_count INTEGER;
BEGIN
  -- Determine the active subscription limit for this user
  SELECT ws.site_limit
  INTO effective_limit
  FROM public.widget_subscriptions ws
  WHERE ws.user_id = NEW.user_id
    AND ws.is_active IS TRUE
  ORDER BY ws.updated_at DESC
  LIMIT 1;

  -- If no active subscription, treat as free plan
  IF NOT FOUND THEN
    effective_limit := 1;
  END IF;

  -- NULL means unlimited sites are allowed
  IF effective_limit IS NULL THEN
    RETURN NEW;
  END IF;

  -- Count how many sites already exist for this user
  SELECT COUNT(*)
  INTO current_count
  FROM public.widget_sites
  WHERE user_id = NEW.user_id;

  IF current_count >= effective_limit THEN
    RAISE EXCEPTION 'Widget site limit reached for your plan. Please upgrade to add more sites.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_widget_site_limit IS 'Prevents users from exceeding their widget site allowance.';

DROP TRIGGER IF EXISTS trg_enforce_widget_site_limit ON public.widget_sites;

CREATE TRIGGER trg_enforce_widget_site_limit
BEFORE INSERT ON public.widget_sites
FOR EACH ROW
EXECUTE FUNCTION public.enforce_widget_site_limit();

COMMIT;

