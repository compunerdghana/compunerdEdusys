-- ============================================================
-- Platform SaaS Management Schema
-- CompunerdEduSys – Super Admin module
-- ============================================================

-- --------------------------------------------------------
-- 1. Extend schools table with platform columns
-- --------------------------------------------------------
ALTER TABLE schools ADD COLUMN IF NOT EXISTS school_code     text;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS school_type     text CHECK (school_type IN ('private','public','international','mission'));
ALTER TABLE schools ADD COLUMN IF NOT EXISTS region          text;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS district        text;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS address         text;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS gps_address     text;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS phone           text;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS website         text;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS motto           text;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS proprietor_name text;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active','trial','suspended','expired','archived'));
ALTER TABLE schools ADD COLUMN IF NOT EXISTS student_count   int  NOT NULL DEFAULT 0;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS staff_count     int  NOT NULL DEFAULT 0;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS onboarding_complete bool NOT NULL DEFAULT false;

-- --------------------------------------------------------
-- 2. platform_users
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_users (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        text NOT NULL,
  full_name    text NOT NULL,
  role         text NOT NULL CHECK (role IN ('super_admin','manager','support','sales','finance','implementation')),
  phone        text,
  avatar_url   text,
  is_active    bool NOT NULL DEFAULT true,
  last_login   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- --------------------------------------------------------
-- 3. subscription_plans
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscription_plans (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL CHECK (name IN ('starter','standard','premium','enterprise')),
  display_name     text NOT NULL,
  description      text,
  price_monthly    numeric(10,2) NOT NULL DEFAULT 0,
  price_annual     numeric(10,2) NOT NULL DEFAULT 0,
  max_students     int,
  max_staff        int,
  storage_gb       numeric(5,1),
  sms_credits      int,
  whatsapp_credits int,
  features         jsonb NOT NULL DEFAULT '[]',
  is_active        bool NOT NULL DEFAULT true,
  sort_order       int  NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- --------------------------------------------------------
-- 4. school_subscriptions
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS school_subscriptions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  plan_id       uuid NOT NULL REFERENCES subscription_plans(id),
  status        text NOT NULL DEFAULT 'trial' CHECK (status IN ('trial','active','expired','suspended','cancelled')),
  started_at    timestamptz,
  expires_at    timestamptz,
  trial_ends_at timestamptz,
  amount        numeric(10,2),
  billing_cycle text NOT NULL DEFAULT 'annual' CHECK (billing_cycle IN ('monthly','annual','once')),
  auto_renew    bool NOT NULL DEFAULT true,
  notes         text,
  created_by    uuid REFERENCES platform_users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- --------------------------------------------------------
-- 5. feature_toggles
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS feature_toggles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id  uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  feature    text NOT NULL,
  is_enabled bool NOT NULL DEFAULT true,
  updated_by uuid REFERENCES platform_users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, feature)
);

-- --------------------------------------------------------
-- 6. platform_wallet
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_wallet (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  balance        numeric(12,2) NOT NULL DEFAULT 0,
  total_income   numeric(12,2) NOT NULL DEFAULT 0,
  total_expenses numeric(12,2) NOT NULL DEFAULT 0,
  currency       text NOT NULL DEFAULT 'GHS',
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- --------------------------------------------------------
-- 7. platform_transactions
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_transactions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type            text NOT NULL CHECK (type IN ('income','expense')),
  category        text NOT NULL,
  amount          numeric(12,2) NOT NULL,
  school_id       uuid REFERENCES schools(id),
  subscription_id uuid REFERENCES school_subscriptions(id),
  description     text,
  reference       text,
  recorded_by     uuid REFERENCES platform_users(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- --------------------------------------------------------
-- 8. platform_announcements
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_announcements (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title             text NOT NULL,
  body              text NOT NULL,
  type              text NOT NULL DEFAULT 'announcement' CHECK (type IN ('announcement','maintenance','update','warning')),
  target            text NOT NULL DEFAULT 'all' CHECK (target IN ('all','active','trial','expired','specific')),
  target_school_ids uuid[] NOT NULL DEFAULT '{}',
  priority          text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  sent_by           uuid REFERENCES platform_users(id),
  sent_at           timestamptz NOT NULL DEFAULT now(),
  expires_at        timestamptz
);

-- --------------------------------------------------------
-- 9. support_tickets
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS support_tickets (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number         text UNIQUE NOT NULL,
  school_id             uuid REFERENCES schools(id),
  submitted_by_name     text,
  submitted_by_email    text,
  submitted_by_profile  uuid REFERENCES profiles(id),
  subject               text NOT NULL,
  description           text NOT NULL,
  type                  text NOT NULL DEFAULT 'support' CHECK (type IN ('support','bug','feature_request','complaint')),
  priority              text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status                text NOT NULL DEFAULT 'open' CHECK (status IN ('open','assigned','in_progress','resolved','closed')),
  assigned_to           uuid REFERENCES platform_users(id),
  resolution            text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  resolved_at           timestamptz
);

-- --------------------------------------------------------
-- 10. platform_audit_logs
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid,
  actor_name  text,
  actor_role  text,
  action      text NOT NULL,
  target_type text,
  target_id   uuid,
  target_name text,
  details     jsonb NOT NULL DEFAULT '{}',
  ip_address  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- --------------------------------------------------------
-- 11. school_onboarding
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS school_onboarding (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id            uuid UNIQUE NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  step_school_info     bool NOT NULL DEFAULT false,
  step_academic_year   bool NOT NULL DEFAULT false,
  step_classes         bool NOT NULL DEFAULT false,
  step_fee_structure   bool NOT NULL DEFAULT false,
  step_staff           bool NOT NULL DEFAULT false,
  step_students        bool NOT NULL DEFAULT false,
  step_parents         bool NOT NULL DEFAULT false,
  step_communication   bool NOT NULL DEFAULT false,
  step_go_live         bool NOT NULL DEFAULT false,
  completed_at         timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- --------------------------------------------------------
-- 12. impersonation_sessions
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS impersonation_sessions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_user_id uuid NOT NULL REFERENCES platform_users(id),
  school_id        uuid NOT NULL REFERENCES schools(id),
  reason           text,
  started_at       timestamptz NOT NULL DEFAULT now(),
  ended_at         timestamptz
);

-- --------------------------------------------------------
-- 13. Helper function: is_platform_user()
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION is_platform_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM platform_users
    WHERE id = auth.uid()
      AND is_active = true
  );
$$;

-- --------------------------------------------------------
-- 14. Row-Level Security for platform tables
-- --------------------------------------------------------

-- platform_users
ALTER TABLE platform_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS platform_users_policy ON platform_users;
CREATE POLICY platform_users_policy ON platform_users
  USING (is_platform_user());

-- subscription_plans (readable by platform users)
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS subscription_plans_policy ON subscription_plans;
CREATE POLICY subscription_plans_policy ON subscription_plans
  USING (is_platform_user());

-- school_subscriptions
ALTER TABLE school_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_subscriptions_policy ON school_subscriptions;
CREATE POLICY school_subscriptions_policy ON school_subscriptions
  USING (is_platform_user());

-- feature_toggles
ALTER TABLE feature_toggles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS feature_toggles_policy ON feature_toggles;
CREATE POLICY feature_toggles_policy ON feature_toggles
  USING (is_platform_user());

-- platform_wallet
ALTER TABLE platform_wallet ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS platform_wallet_policy ON platform_wallet;
CREATE POLICY platform_wallet_policy ON platform_wallet
  USING (is_platform_user());

-- platform_transactions
ALTER TABLE platform_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS platform_transactions_policy ON platform_transactions;
CREATE POLICY platform_transactions_policy ON platform_transactions
  USING (is_platform_user());

-- platform_announcements
ALTER TABLE platform_announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS platform_announcements_policy ON platform_announcements;
CREATE POLICY platform_announcements_policy ON platform_announcements
  USING (is_platform_user());

-- support_tickets
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS support_tickets_policy ON support_tickets;
CREATE POLICY support_tickets_policy ON support_tickets
  USING (is_platform_user());

-- platform_audit_logs
ALTER TABLE platform_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS platform_audit_logs_policy ON platform_audit_logs;
CREATE POLICY platform_audit_logs_policy ON platform_audit_logs
  USING (is_platform_user());

-- school_onboarding
ALTER TABLE school_onboarding ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_onboarding_policy ON school_onboarding;
CREATE POLICY school_onboarding_policy ON school_onboarding
  USING (is_platform_user());

-- impersonation_sessions
ALTER TABLE impersonation_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS impersonation_sessions_policy ON impersonation_sessions;
CREATE POLICY impersonation_sessions_policy ON impersonation_sessions
  USING (is_platform_user());

-- --------------------------------------------------------
-- 15. Seed subscription_plans
-- --------------------------------------------------------
INSERT INTO subscription_plans (name, display_name, description, price_monthly, price_annual, max_students, max_staff, storage_gb, sms_credits, whatsapp_credits, features, sort_order)
VALUES
  (
    'starter',
    'Starter',
    'Perfect for small schools getting started with digital management.',
    500.00, 5000.00, 200, 20, 5.0, 500, 200,
    '["students","admissions","finance","attendance","reports"]',
    1
  ),
  (
    'standard',
    'Standard',
    'Ideal for growing schools needing comprehensive management tools.',
    800.00, 8000.00, 500, 60, 15.0, 1500, 600,
    '["students","admissions","finance","attendance","academics","exams","reports","communications"]',
    2
  ),
  (
    'premium',
    'Premium',
    'Full-featured plan for established schools with advanced needs.',
    1200.00, 12000.00, 1500, 150, 40.0, 5000, 2000,
    '["students","admissions","finance","attendance","academics","exams","reports","communications","payroll","inventory","transport"]',
    3
  ),
  (
    'enterprise',
    'Enterprise',
    'Unlimited capacity and all features for large or multi-campus schools.',
    2000.00, 20000.00, NULL, NULL, 100.0, 20000, 10000,
    '["students","admissions","finance","attendance","academics","exams","reports","communications","payroll","inventory","transport","hostel"]',
    4
  )
ON CONFLICT (name) DO NOTHING;

-- Seed a single wallet row if it does not exist
INSERT INTO platform_wallet (balance, total_income, total_expenses, currency)
SELECT 0, 0, 0, 'GHS'
WHERE NOT EXISTS (SELECT 1 FROM platform_wallet);

SELECT 'Platform SaaS schema created' AS status;
