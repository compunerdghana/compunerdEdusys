-- Feature categories
CREATE TABLE IF NOT EXISTS feature_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT DEFAULT 'Layout',
  color TEXT DEFAULT '#6b7280',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Feature groups (suites)
CREATE TABLE IF NOT EXISTS feature_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES feature_categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Master features table
CREATE TABLE IF NOT EXISTS platform_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  category_id UUID REFERENCES feature_categories(id) ON DELETE SET NULL,
  group_id UUID REFERENCES feature_groups(id) ON DELETE SET NULL,
  route_path TEXT,
  icon TEXT DEFAULT 'Star',
  version TEXT DEFAULT '1.0.0',
  display_order INT DEFAULT 0,
  access_level TEXT DEFAULT 'subscription' CHECK (access_level IN ('public','subscription','premium','enterprise','beta')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','draft','archived','beta')),
  is_core BOOL DEFAULT false,
  release_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Feature dependencies (feature X requires feature Y)
CREATE TABLE IF NOT EXISTS feature_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id UUID REFERENCES platform_features(id) ON DELETE CASCADE,
  requires_feature_id UUID REFERENCES platform_features(id) ON DELETE CASCADE,
  UNIQUE(feature_id, requires_feature_id)
);

-- Subscription plan to feature mapping
CREATE TABLE IF NOT EXISTS subscription_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES subscription_plans(id) ON DELETE CASCADE,
  feature_id UUID REFERENCES platform_features(id) ON DELETE CASCADE,
  enabled BOOL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(plan_id, feature_id)
);

-- Per-school feature overrides
CREATE TABLE IF NOT EXISTS school_feature_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  feature_id UUID REFERENCES platform_features(id) ON DELETE CASCADE,
  enabled BOOL NOT NULL,
  access_type TEXT DEFAULT 'permanent' CHECK (access_type IN ('permanent','temporary','trial')),
  expires_at TIMESTAMPTZ,
  granted_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(school_id, feature_id)
);

-- Feature flags (per school or global)
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id UUID REFERENCES platform_features(id) ON DELETE CASCADE,
  scope TEXT DEFAULT 'global' CHECK (scope IN ('global','school','user')),
  scope_id UUID,
  enabled BOOL DEFAULT false,
  scheduled_enable_at TIMESTAMPTZ,
  scheduled_disable_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Feature rollouts
CREATE TABLE IF NOT EXISTS feature_rollouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id UUID REFERENCES platform_features(id) ON DELETE CASCADE,
  rollout_type TEXT DEFAULT 'global' CHECK (rollout_type IN ('global','regional','school','pilot')),
  name TEXT,
  description TEXT,
  target_regions TEXT[],
  target_school_ids UUID[],
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned','active','paused','completed','cancelled')),
  adoption_rate DECIMAL(5,2) DEFAULT 0,
  start_date DATE,
  end_date DATE,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Beta feature programs
CREATE TABLE IF NOT EXISTS beta_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id UUID REFERENCES platform_features(id) ON DELETE CASCADE UNIQUE,
  beta_school_ids UUID[] DEFAULT '{}',
  feedback_count INT DEFAULT 0,
  adoption_rate DECIMAL(5,2) DEFAULT 0,
  promoted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Platform releases
CREATE TABLE IF NOT EXISTS feature_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL UNIQUE,
  name TEXT,
  description TEXT,
  feature_ids UUID[] DEFAULT '{}',
  bug_fixes TEXT[],
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned','testing','released','retired')),
  release_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Feature requests
CREATE TABLE IF NOT EXISTS feature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  requested_by TEXT,
  source TEXT DEFAULT 'school' CHECK (source IN ('school','teacher','student','parent','internal')),
  school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  votes INT DEFAULT 0,
  status TEXT DEFAULT 'new' CHECK (status IN ('new','under_review','approved','in_development','released','rejected')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Feature usage logs
CREATE TABLE IF NOT EXISTS feature_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id UUID REFERENCES platform_features(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  user_id UUID,
  action TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Feature activity logs
CREATE TABLE IF NOT EXISTS feature_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id UUID,
  actor_id UUID,
  actor_name TEXT,
  action TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed categories
INSERT INTO feature_categories (name, description, icon, color, sort_order)
SELECT * FROM (VALUES
  ('Core', 'Core platform features', 'LayoutDashboard', '#4f46e5', 1),
  ('Student Management', 'Student records and profiles', 'Users', '#0891b2', 2),
  ('HR & Personnel', 'Staff management and HR', 'UserCheck', '#7c3aed', 3),
  ('Academic', 'Academic management and records', 'GraduationCap', '#059669', 4),
  ('Finance', 'Financial management and billing', 'DollarSign', '#d97706', 5),
  ('Communications', 'Messaging and notifications', 'MessageSquare', '#0284c7', 6),
  ('Reports & Analytics', 'Reports and analytics', 'BarChart2', '#dc2626', 7),
  ('Settings', 'System configuration', 'Settings', '#6b7280', 8)
) AS v(name, description, icon, color, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM feature_categories LIMIT 1);

-- Seed all 54 platform features
INSERT INTO platform_features (code, name, description, route_path, category_id, access_level, is_core, status)
SELECT
  v.code,
  v.name,
  v.description,
  v.route_path,
  fc.id,
  v.access_level::TEXT,
  v.is_core,
  v.status::TEXT
FROM (VALUES
  -- Core
  ('core_dashboard',        'Dashboard',               'Main school dashboard overview',              '/dashboard',                         'Core',                'public',       true,  'active'),
  ('core_school_settings',  'School Settings',         'School configuration and branding',           '/school-settings',                   'Core',                'subscription', true,  'active'),
  -- Student Management
  ('students_list',         'All Students',            'View and manage all students',                '/students',                          'Student Management',  'subscription', false, 'active'),
  ('students_add',          'Add Student',             'Register new students',                       '/students/new',                      'Student Management',  'subscription', false, 'active'),
  ('students_profile',      'Student Profile',         'View individual student profiles',            '/students/[id]',                     'Student Management',  'subscription', false, 'active'),
  -- HR & Personnel
  ('hr_dashboard',          'Staff Dashboard',         'HR overview and staff stats',                 '/staff/dashboard',                   'HR & Personnel',      'subscription', false, 'active'),
  ('hr_staff_list',         'All Staff',               'View and manage all staff',                   '/staff',                             'HR & Personnel',      'subscription', false, 'active'),
  ('hr_add_staff',          'Add Staff',               'Register new staff members',                  '/staff/new',                         'HR & Personnel',      'subscription', false, 'active'),
  ('hr_staff_profile',      'Staff Profile',           'Individual staff profile view',               '/staff/[id]',                        'HR & Personnel',      'subscription', false, 'active'),
  ('hr_staff_attendance',   'Staff Attendance',        'Track staff attendance',                      '/staff/attendance',                  'HR & Personnel',      'premium',      false, 'active'),
  ('hr_leave',              'Leave Management',        'Manage staff leave requests',                 '/staff/leave',                       'HR & Personnel',      'premium',      false, 'active'),
  ('hr_training',           'Staff Training',          'Staff training programs',                     '/staff/training',                    'HR & Personnel',      'premium',      false, 'active'),
  ('hr_promotions',         'Promotions',              'Staff promotions management',                 '/staff/promotions',                  'HR & Personnel',      'enterprise',   false, 'active'),
  ('hr_transfers',          'Transfers',               'Staff transfer management',                   '/staff/transfers',                   'HR & Personnel',      'enterprise',   false, 'active'),
  ('hr_exits',              'Staff Exits',             'Staff exit processing',                       '/staff/exits',                       'HR & Personnel',      'enterprise',   false, 'active'),
  ('hr_performance',        'Performance Reviews',     'Staff performance management',                '/staff/performance',                 'HR & Personnel',      'premium',      false, 'active'),
  -- Academic
  ('academic_overview',     'Academics Overview',      'Academic management dashboard',               '/academics',                         'Academic',            'subscription', false, 'active'),
  ('academic_attendance',   'Student Attendance',      'Track student daily attendance',              '/attendance',                        'Academic',            'subscription', false, 'active'),
  ('academic_timetable',    'Timetable',               'Class timetable management',                  '/timetable',                         'Academic',            'subscription', false, 'active'),
  ('academic_exams',        'Exam Scores',             'Enter and manage exam scores',                '/exams',                             'Academic',            'subscription', false, 'active'),
  ('academic_report_cards', 'Report Cards',            'Generate student report cards',               '/exams/report-card',                 'Academic',            'subscription', false, 'active'),
  ('academic_calendar',     'Academic Calendar',       'Academic calendar management',                '/academic-calendar',                 'Academic',            'subscription', false, 'active'),
  -- Finance
  ('finance_overview',      'Finance Overview',        'Financial dashboard overview',                '/finance',                           'Finance',             'subscription', false, 'active'),
  ('finance_expenses',      'Expenses',                'Track and manage school expenses',            '/finance/expenses',                  'Finance',             'subscription', false, 'active'),
  ('finance_income',        'Income Tracking',         'Track school income sources',                 '/finance/income',                    'Finance',             'subscription', false, 'active'),
  ('finance_budget',        'Budget Planning',         'School budget management',                    '/finance/budget',                    'Finance',             'premium',      false, 'active'),
  ('finance_petty_cash',    'Petty Cash',              'Petty cash management',                       '/finance/petty-cash',                'Finance',             'subscription', false, 'active'),
  ('finance_payroll',       'Payroll',                 'Staff payroll processing',                    '/finance/payroll',                   'Finance',             'premium',      false, 'active'),
  ('finance_bank_accounts', 'Bank Accounts',           'Manage school bank accounts',                 '/finance/bank-accounts',             'Finance',             'premium',      false, 'active'),
  ('finance_wallet',        'Wallet',                  'School digital wallet',                       '/finance/wallet',                    'Finance',             'premium',      false, 'active'),
  ('finance_setup',         'Finance Setup',           'Configure fee structures',                    '/finance/setup',                     'Finance',             'subscription', false, 'active'),
  ('finance_record_payment','Record Payment',          'Record student fee payments',                 '/finance/record-payment',            'Finance',             'subscription', false, 'active'),
  -- Communications
  ('comms_dashboard',       'Comms Dashboard',         'Communications overview',                     '/communications/dashboard',          'Communications',      'subscription', false, 'active'),
  ('comms_compose',         'Compose Message',         'Send messages to parents/staff',              '/communications',                    'Communications',      'subscription', false, 'active'),
  ('comms_whatsapp',        'WhatsApp Integration',    'WhatsApp messaging channel',                  '/communications/whatsapp',           'Communications',      'premium',      false, 'active'),
  ('comms_sms',             'SMS Center',              'SMS messaging to stakeholders',               '/communications/sms',                'Communications',      'subscription', false, 'active'),
  ('comms_notifications',   'Notifications',           'Push and in-app notifications',               '/communications/notifications',      'Communications',      'subscription', false, 'active'),
  ('comms_templates',       'Message Templates',       'Reusable message templates',                  '/communications/templates',          'Communications',      'subscription', false, 'active'),
  ('comms_automation',      'Automation Rules',        'Automated messaging rules',                   '/communications/automation',         'Communications',      'enterprise',   false, 'active'),
  ('comms_logs',            'Communication Logs',      'Message history and logs',                    '/communications/logs',               'Communications',      'subscription', false, 'active'),
  ('comms_settings',        'Comms Settings',          'Communication configuration',                 '/communications/settings',           'Communications',      'subscription', false, 'active'),
  -- Reports & Analytics
  ('reports_dashboard',     'Reports Dashboard',       'All reports overview',                        '/reports',                           'Reports & Analytics', 'subscription', false, 'active'),
  ('reports_students',      'Student Reports',         'Student data reports',                        '/reports?tab=students',              'Reports & Analytics', 'subscription', false, 'active'),
  ('reports_attendance',    'Attendance Reports',      'Attendance analytics',                        '/reports?tab=attendance',            'Reports & Analytics', 'subscription', false, 'active'),
  ('reports_finance',       'Finance Reports',         'Fee collection reports',                      '/reports?tab=finance',               'Reports & Analytics', 'subscription', false, 'active'),
  ('reports_outstanding',   'Outstanding Fees',        'Outstanding fee reports',                     '/reports?tab=outstanding',           'Reports & Analytics', 'subscription', false, 'active'),
  ('reports_staff',         'Staff Reports',           'Staff analytics',                             '/reports?tab=staff',                 'Reports & Analytics', 'subscription', false, 'active'),
  ('reports_payroll',       'Payroll Reports',         'Payroll analytics',                           '/reports?tab=payroll',               'Reports & Analytics', 'premium',      false, 'active'),
  ('reports_exams',         'Exam Reports',            'Exam results analytics',                      '/reports?tab=exams',                 'Reports & Analytics', 'subscription', false, 'active'),
  ('reports_analytics',     'Advanced Analytics',      'Deep analytics dashboard',                    '/reports?tab=analytics',             'Reports & Analytics', 'premium',      false, 'active'),
  ('reports_comms',         'Comms Reports',           'Communication reports',                       '/reports?tab=comms',                 'Reports & Analytics', 'subscription', false, 'active'),
  ('reports_report_cards',  'Report Cards Archive',    'Archived report cards',                       '/reports?tab=reportcards',           'Reports & Analytics', 'subscription', false, 'active'),
  -- Settings
  ('settings_account',      'Account Settings',        'User account settings',                       '/settings',                          'Settings',            'public',       true,  'active'),
  ('settings_school',       'School Setup',            'School profile settings',                     '/settings/school',                   'Settings',            'subscription', false, 'active'),
  ('settings_academic_year','Academic Year',           'Academic year configuration',                 '/settings/academic-year',            'Settings',            'subscription', false, 'active'),
  ('settings_calendar',     'Academic Calendar Setup', 'Calendar configuration',                      '/settings/academic-calendar',        'Settings',            'subscription', false, 'active'),
  ('settings_classes',      'Class Management',        'Manage classes/grades',                       '/settings/classes',                  'Settings',            'subscription', false, 'active'),
  ('settings_subjects',     'Subject Management',      'Manage school subjects',                      '/settings/subjects',                 'Settings',            'subscription', false, 'active'),
  ('settings_fees',         'Fee Configuration',       'Configure school fees',                       '/settings/fees',                     'Settings',            'subscription', false, 'active')
) AS v(code, name, description, route_path, cat_name, access_level, is_core, status)
JOIN feature_categories fc ON fc.name = v.cat_name
WHERE NOT EXISTS (SELECT 1 FROM platform_features LIMIT 1);

SELECT 'Feature Management schema created' AS status;
