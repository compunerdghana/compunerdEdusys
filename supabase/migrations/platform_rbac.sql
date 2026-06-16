-- Platform roles
CREATE TABLE IF NOT EXISTS platform_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6b7280',
  is_system BOOL DEFAULT false,
  hierarchy_level INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Platform permissions
CREATE TABLE IF NOT EXISTS platform_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  display_name TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(module, action)
);

-- Role permissions (many-to-many)
CREATE TABLE IF NOT EXISTS platform_role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID REFERENCES platform_roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES platform_permissions(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

-- User groups
CREATE TABLE IF NOT EXISTS platform_user_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6b7280',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User group members
CREATE TABLE IF NOT EXISTS platform_user_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES platform_user_groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES platform_users(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Extend platform_users with extra fields
ALTER TABLE platform_users ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE platform_users ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE platform_users ADD COLUMN IF NOT EXISTS other_name TEXT;
ALTER TABLE platform_users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE platform_users ADD COLUMN IF NOT EXISTS position TEXT;
ALTER TABLE platform_users ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE platform_users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE platform_users ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE platform_users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','suspended','locked'));
ALTER TABLE platform_users ADD COLUMN IF NOT EXISTS failed_login_count INT DEFAULT 0;
ALTER TABLE platform_users ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;
ALTER TABLE platform_users ADD COLUMN IF NOT EXISTS must_change_password BOOL DEFAULT false;
ALTER TABLE platform_users ADD COLUMN IF NOT EXISTS mfa_enabled BOOL DEFAULT false;

-- Login history
CREATE TABLE IF NOT EXISTS platform_login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES platform_users(id) ON DELETE CASCADE,
  user_email TEXT,
  status TEXT DEFAULT 'success' CHECK (status IN ('success','failed','locked')),
  ip_address TEXT,
  device TEXT,
  browser TEXT,
  location TEXT,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Active sessions
CREATE TABLE IF NOT EXISTS platform_active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES platform_users(id) ON DELETE CASCADE,
  session_token TEXT,
  ip_address TEXT,
  device TEXT,
  browser TEXT,
  location TEXT,
  last_activity TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Security events
CREATE TABLE IF NOT EXISTS platform_security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  user_email TEXT,
  event_type TEXT NOT NULL,
  severity TEXT DEFAULT 'low' CHECK (severity IN ('low','medium','high','critical')),
  description TEXT,
  ip_address TEXT,
  metadata JSONB DEFAULT '{}',
  resolved BOOL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default roles
INSERT INTO platform_roles (name, display_name, description, color, is_system, hierarchy_level)
SELECT * FROM (VALUES
  ('super_admin', 'Super Admin', 'Full access to entire platform', '#7c3aed', true, 100),
  ('platform_manager', 'Platform Manager', 'Manage platform operations', '#2563eb', true, 80),
  ('finance_officer', 'Finance Officer', 'Manage revenue, billing, payments', '#059669', true, 60),
  ('support_officer', 'Support Officer', 'Manage tickets and school support', '#0891b2', true, 50),
  ('sales_officer', 'Sales Officer', 'Manage school leads and creation', '#d97706', true, 40),
  ('implementation_officer', 'Implementation Officer', 'Manage school setup and training', '#7c3aed', true, 30),
  ('read_only_auditor', 'Read Only Auditor', 'View access only, no editing', '#6b7280', true, 10)
) AS v(name, display_name, description, color, is_system, hierarchy_level)
WHERE NOT EXISTS (SELECT 1 FROM platform_roles LIMIT 1);

-- Seed permissions (modules x actions)
INSERT INTO platform_permissions (module, action, display_name)
SELECT * FROM (VALUES
  ('dashboard', 'view', 'View Dashboard'),
  ('schools', 'view', 'View Schools'), ('schools', 'create', 'Create Schools'), ('schools', 'edit', 'Edit Schools'), ('schools', 'delete', 'Delete Schools'), ('schools', 'suspend', 'Suspend Schools'), ('schools', 'impersonate', 'Login As School'),
  ('subscriptions', 'view', 'View Subscriptions'), ('subscriptions', 'create', 'Create Subscriptions'), ('subscriptions', 'edit', 'Edit Subscriptions'), ('subscriptions', 'approve', 'Approve Subscriptions'),
  ('revenue', 'view', 'View Revenue'), ('revenue', 'manage', 'Manage Revenue'), ('revenue', 'export', 'Export Revenue'),
  ('wallet', 'view', 'View Platform Wallet'), ('wallet', 'manage', 'Manage Wallet'),
  ('users', 'view', 'View Platform Users'), ('users', 'create', 'Create Users'), ('users', 'edit', 'Edit Users'), ('users', 'delete', 'Delete Users'), ('users', 'manage_roles', 'Manage User Roles'),
  ('support', 'view', 'View Support Tickets'), ('support', 'manage', 'Manage Tickets'), ('support', 'resolve', 'Resolve Tickets'),
  ('communication', 'view', 'View Communications'), ('communication', 'send', 'Send Announcements'),
  ('analytics', 'view', 'View Analytics'), ('analytics', 'export', 'Export Analytics'),
  ('audit_logs', 'view', 'View Audit Logs'), ('audit_logs', 'export', 'Export Audit Logs'),
  ('settings', 'view', 'View Settings'), ('settings', 'manage', 'Manage Settings')
) AS v(module, action, display_name)
WHERE NOT EXISTS (SELECT 1 FROM platform_permissions LIMIT 1);

SELECT 'Platform RBAC schema created' AS status;
