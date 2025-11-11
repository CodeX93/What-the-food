-- Create platform_plans table to store pricing plans for the main app (non-widget)
CREATE TABLE IF NOT EXISTS public.platform_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 0,
  interval TEXT NOT NULL DEFAULT 'month', -- 'month' | 'year' | 'one_time' | 'free'
  description TEXT,
  features JSONB DEFAULT '[]'::jsonb,
  stripe_price_id TEXT, -- null for free plan
  billing_cycle TEXT NOT NULL DEFAULT 'monthly', -- 'monthly' | 'yearly' | 'free'
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_popular BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.platform_plans ENABLE ROW LEVEL SECURITY;

-- RLS: public readable, only admins (service role) can write
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='platform_plans' AND policyname='Public can read platform plans'
  ) THEN
    CREATE POLICY "Public can read platform plans" ON public.platform_plans
      FOR SELECT USING (true);
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_platform_plans_active ON public.platform_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_platform_plans_billing_cycle ON public.platform_plans(billing_cycle);

-- Seed default plans if table empty
INSERT INTO public.platform_plans (name, price_cents, interval, description, features, stripe_price_id, billing_cycle, is_active, is_popular)
SELECT * FROM (
  VALUES
    ('Free', 0, 'free', 'Perfect for trying out our service',
      '["10 scans per day","Basic nutritional information","Scan history","Email support"]'::jsonb,
      NULL, 'free', TRUE, FALSE),
    ('Premium', 699, 'month', 'Unlimited access to all features',
      '["Unlimited scans","Advanced nutritional analysis","Macro tracking","Meal planning","Export reports","Priority support"]'::jsonb,
      NULL, 'monthly', TRUE, TRUE),
    ('Premium', 6999, 'year', 'Best value - Save with yearly billing',
      '["Unlimited scans","Advanced nutritional analysis","Macro tracking","Meal planning","Export reports","Priority support"]'::jsonb,
      NULL, 'yearly', TRUE, FALSE)
) AS seed(name, price_cents, interval, description, features, stripe_price_id, billing_cycle, is_active, is_popular)
WHERE NOT EXISTS (SELECT 1 FROM public.platform_plans);


