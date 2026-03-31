-- Add plan and access_limit to schools
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  ADD COLUMN IF NOT EXISTS access_limit timestamptz;

-- Set default access_limit for existing schools (7 days from creation)
UPDATE public.schools
SET access_limit = created_at + interval '7 days'
WHERE access_limit IS NULL;

-- Subscription tracking table
CREATE TABLE IF NOT EXISTS public.school_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  mp_subscription_id text UNIQUE NOT NULL,
  mp_preapproval_plan_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  payer_email text,
  next_payment_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.school_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view own subscriptions"
  ON public.school_subscriptions FOR SELECT
  USING (school_id = my_school_id());
