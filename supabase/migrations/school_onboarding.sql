-- School Onboarding Management System
-- Migration: school_onboarding

-- Core onboarding record per school
CREATE TABLE IF NOT EXISTS school_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  stage TEXT DEFAULT 'registered' CHECK (stage IN ('lead','registered','verification_pending','verified','contract_signed','payment_confirmed','setup_in_progress','data_migration','training_ongoing','user_testing','go_live_ready','active')),
  progress_pct INT DEFAULT 0,
  assigned_officer_id UUID REFERENCES platform_users(id) ON DELETE SET NULL,
  expected_go_live DATE,
  actual_go_live DATE,
  notes TEXT,
  is_delayed BOOL DEFAULT false,
  delay_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Extended school profiles for onboarding
CREATE TABLE IF NOT EXISTS school_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE UNIQUE,
  contact_name TEXT,
  contact_position TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  student_population INT DEFAULT 0,
  staff_population INT DEFAULT 0,
  school_motto TEXT,
  school_colors TEXT,
  social_links JSONB DEFAULT '{}',
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','rejected')),
  verified_at TIMESTAMPTZ,
  verified_by UUID,
  verification_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- School branding assets
CREATE TABLE IF NOT EXISTS school_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE UNIQUE,
  logo_url TEXT,
  banner_url TEXT,
  primary_color TEXT DEFAULT '#262262',
  secondary_color TEXT DEFAULT '#92278F',
  logo_uploaded_at TIMESTAMPTZ,
  logo_uploaded_by UUID,
  banner_uploaded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- School portal configuration
CREATE TABLE IF NOT EXISTS school_portals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE UNIQUE,
  portal_url TEXT,
  portal_slug TEXT UNIQUE,
  portal_status TEXT DEFAULT 'pending' CHECK (portal_status IN ('pending','active','suspended')),
  ssl_status TEXT DEFAULT 'pending',
  domain_status TEXT DEFAULT 'pending',
  activation_status TEXT DEFAULT 'pending',
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Onboarding stages history
CREATE TABLE IF NOT EXISTS onboarding_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_id UUID REFERENCES school_onboarding(id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT,
  changed_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Implementation officer assignments
CREATE TABLE IF NOT EXISTS implementation_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  officer_id UUID REFERENCES platform_users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  assigned_by UUID,
  is_active BOOL DEFAULT true,
  notes TEXT
);

-- Training sessions
CREATE TABLE IF NOT EXISTS onboarding_training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  training_type TEXT NOT NULL CHECK (training_type IN ('administrator','teacher','finance','student_portal','parent_portal','general')),
  trainer_name TEXT,
  trainer_id UUID,
  scheduled_date DATE,
  duration_hours DECIMAL(4,1),
  location TEXT,
  mode TEXT DEFAULT 'onsite' CHECK (mode IN ('onsite','remote','hybrid')),
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','cancelled','rescheduled')),
  attendance_count INT DEFAULT 0,
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Training attendees
CREATE TABLE IF NOT EXISTS onboarding_training_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES onboarding_training_sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  email TEXT,
  attended BOOL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Data migration tracking
CREATE TABLE IF NOT EXISTS onboarding_data_migrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  module TEXT NOT NULL CHECK (module IN ('students','staff','classes','subjects','results','fee_records','attendance')),
  total_records INT DEFAULT 0,
  imported_records INT DEFAULT 0,
  failed_records INT DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','failed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_log TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Verification checklist
CREATE TABLE IF NOT EXISTS onboarding_verification_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE UNIQUE,
  school_info_verified BOOL DEFAULT false,
  contact_verified BOOL DEFAULT false,
  subscription_confirmed BOOL DEFAULT false,
  payment_confirmed BOOL DEFAULT false,
  logo_uploaded BOOL DEFAULT false,
  admin_account_created BOOL DEFAULT false,
  portal_created BOOL DEFAULT false,
  setup_completed BOOL DEFAULT false,
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  approval_notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected','approved')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Go-live checklist
CREATE TABLE IF NOT EXISTS onboarding_go_live_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE UNIQUE,
  verification_approved BOOL DEFAULT false,
  school_account_active BOOL DEFAULT false,
  portal_configured BOOL DEFAULT false,
  branding_completed BOOL DEFAULT false,
  data_migration_done BOOL DEFAULT false,
  user_accounts_created BOOL DEFAULT false,
  training_completed BOOL DEFAULT false,
  testing_completed BOOL DEFAULT false,
  subscription_activated BOOL DEFAULT false,
  impl_officer_approved BOOL DEFAULT false,
  platform_manager_approved BOOL DEFAULT false,
  go_live_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Onboarding tasks
CREATE TABLE IF NOT EXISTS onboarding_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  onboarding_id UUID REFERENCES school_onboarding(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  assigned_to UUID,
  assigned_to_name TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  due_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','delayed','cancelled')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Onboarding activity logs
CREATE TABLE IF NOT EXISTS onboarding_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  user_id UUID,
  user_name TEXT,
  action TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

SELECT 'School Onboarding schema created' AS status;
