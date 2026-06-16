-- ============================================================
-- COMPUNERDEDUSYS — School-Level RBAC & Feature Inheritance System
-- Run in Supabase SQL Editor
-- ============================================================

-- Add user_id to students table to connect student profiles
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create school_features table with columns matching the toggles in SchoolProfileClient
CREATE TABLE IF NOT EXISTS public.school_features (
  school_id UUID PRIMARY KEY REFERENCES public.schools(id) ON DELETE CASCADE,
  students BOOLEAN DEFAULT true,
  admissions BOOLEAN DEFAULT true,
  finance BOOLEAN DEFAULT true,
  attendance BOOLEAN DEFAULT true,
  academics BOOLEAN DEFAULT true,
  exams BOOLEAN DEFAULT true,
  report_cards BOOLEAN DEFAULT true,
  communications BOOLEAN DEFAULT true,
  payroll BOOLEAN DEFAULT true,
  inventory BOOLEAN DEFAULT false,
  transport BOOLEAN DEFAULT false,
  hostel BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1. Create school_permissions
CREATE TABLE IF NOT EXISTS public.school_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  feature_code TEXT REFERENCES public.platform_features(code) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create school_role_templates
CREATE TABLE IF NOT EXISTS public.school_role_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL, -- e.g. 'school_admin', 'teacher', 'accountant'
  display_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create school_role_template_permissions (many-to-many template to permission)
CREATE TABLE IF NOT EXISTS public.school_role_template_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.school_role_templates(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES public.school_permissions(id) ON DELETE CASCADE,
  UNIQUE(template_id, permission_id)
);

-- 4. Create school_roles
CREATE TABLE IF NOT EXISTS public.school_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.school_role_templates(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  sync_policy TEXT DEFAULT 'auto_sync' CHECK (sync_policy IN ('auto_sync', 'review', 'ignored')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(school_id, name)
);

-- 5. Create school_role_permissions (many-to-many role to permission)
CREATE TABLE IF NOT EXISTS public.school_role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID REFERENCES public.school_roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES public.school_permissions(id) ON DELETE CASCADE,
  UNIQUE(role_id, permission_id)
);

-- 6. Create user_roles (maps profile users to multiple school roles)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_id UUID REFERENCES public.school_roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role_id)
);

-- 7. Create school_audit_logs
CREATE TABLE IF NOT EXISTS public.school_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_name TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  device TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Create security_events
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  description TEXT,
  ip_address TEXT,
  device TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexing for high-performance retrieval and isolation
CREATE INDEX IF NOT EXISTS idx_school_roles_school ON public.school_roles(school_id);
CREATE INDEX IF NOT EXISTS idx_school_role_perms_role ON public.school_role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_school_audit_logs_school ON public.school_audit_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_security_events_school ON public.security_events(school_id);

-- ============================================================
-- Seed Fine-Grained Permissions
-- ============================================================
INSERT INTO public.school_permissions (name, display_name, description, feature_code) VALUES
  ('dashboard.view', 'View Dashboard', 'Access to school dashboard overview metrics', 'core_dashboard'),
  ('school.settings.manage', 'Manage School Settings', 'Modify school logo, motto, address, and config', 'core_school_settings'),
  ('students.view', 'View Students', 'Browse student directories and look up basic details', 'students_list'),
  ('students.create', 'Register Student', 'Enroll new students and add details', 'students_add'),
  ('students.edit', 'Edit Student Profile', 'Update academic status, photo, and bio notes', 'students_profile'),
  ('students.delete', 'Delete Student', 'Remove student records completely', 'students_profile'),
  ('staff.view', 'View Staff', 'Look up staff lifecycle directories', 'hr_staff_list'),
  ('staff.create', 'Add Staff Member', 'Register new administrative/teaching staff', 'hr_add_staff'),
  ('staff.edit', 'Edit Staff Profile', 'Manage exit, promotions, timeline, and reviews', 'hr_staff_profile'),
  ('staff.delete', 'Delete Staff Member', 'Remove staff profile from dashboard records', 'hr_staff_profile'),
  ('staff.attendance.record', 'Record Staff Attendance', 'Mark sign-ins and check-out times', 'hr_staff_attendance'),
  ('staff.leave.manage', 'Manage Leave', 'Approve/reject staff leave requests', 'hr_leave'),
  ('staff.training.manage', 'Manage Staff Training', 'Define workshops and training credentials', 'hr_training'),
  ('staff.performance.manage', 'Manage Staff Reviews', 'Review scores and submissions metrics', 'hr_performance'),
  ('academics.manage', 'Academics Administration', 'Configure class arms, subjects, and setup calendar', 'academic_overview'),
  ('attendance.record', 'Record Attendance', 'Mark daily student attendance lists', 'academic_attendance'),
  ('attendance.approve', 'Approve Attendance', 'Verify and sign attendance records', 'academic_attendance'),
  ('timetable.manage', 'Manage Timetable', 'Create, update slots and period assignments', 'academic_timetable'),
  ('exams.enter', 'Enter Exam Scores', 'Input exam/CA scores for subjects', 'academic_exams'),
  ('exams.approve', 'Approve Exam Scores', 'Lock scores and allow grading calculations', 'academic_exams'),
  ('reports.generate', 'Generate Reports', 'Review statistics and print spreadsheets', 'reports_dashboard'),
  ('finance.view', 'View Finances', 'Look up budget lists, payrolls and wallets', 'finance_overview'),
  ('finance.manage', 'Manage Finance Settings', 'Setup fee items and manage categories/bank settings', 'finance_setup'),
  ('finance.expenses.manage', 'Manage Expenses', 'Record cash spent and petty cash requests', 'finance_expenses'),
  ('finance.payroll.manage', 'Manage Payroll', 'Calculate salary disbursements and payslips', 'finance_payroll'),
  ('finance.record_payment', 'Record Payments', 'Record momo/cash fee deposits', 'finance_record_payment'),
  ('communication.send', 'Send Messages', 'Compose and send WhatsApp/SMS/In-App broadcasts', 'comms_compose'),
  ('communication.whatsapp.manage', 'Manage WhatsApp Settings', 'Configure Meta Business Account keys', 'comms_whatsapp'),
  ('communication.sms.manage', 'Manage SMS Credits', 'Configure Hubtel/Arkesel settings', 'comms_sms'),
  ('communication.settings.manage', 'Manage Comm Channels', 'Enable/disable automated template workflows', 'comms_settings'),
  ('users.manage', 'Manage User Access', 'Add or modify administrative logins', 'core_school_settings'),
  ('roles.manage', 'Manage Roles & Permissions', 'Create custom roles and set permissions', 'core_school_settings'),
  ('audit.view', 'View Audit Logs', 'Browse security actions and timestamps', 'core_school_settings')
ON CONFLICT (name) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  feature_code = EXCLUDED.feature_code;

-- ============================================================
-- Seed Default Role Templates
-- ============================================================
INSERT INTO public.school_role_templates (name, display_name, description) VALUES
  ('school_admin', 'School Administrator', 'Full administrative control over all school features and configurations'),
  ('headmaster', 'Headmaster / Principal', 'Manages students, staff lifecycles, calendars, and school-wide communications'),
  ('accountant', 'Accountant / Bursar', 'Manages billing, fee collection, payroll, budgets, and expenses'),
  ('teacher', 'Teacher / Instructor', 'Manages student attendance, score inputting, and communication with parents'),
  ('librarian', 'Librarian', 'Manages library catalog, issues books, and tracks library usage'),
  ('parent', 'Parent / Guardian', 'Restricted access to own ward profile, attendance, fee balances, and report cards'),
  ('student', 'Student', 'Restricted access to own calendar, attendance, scores, and timetables')
ON CONFLICT (name) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description;

-- ============================================================
-- Map Permissions to Role Templates
-- ============================================================
TRUNCATE TABLE public.school_role_template_permissions CASCADE;

DO $$
DECLARE
  v_admin_id UUID;
  v_headmaster_id UUID;
  v_accountant_id UUID;
  v_teacher_id UUID;
  v_parent_id UUID;
  v_student_id UUID;
  v_perm RECORD;
BEGIN
  -- Get template IDs
  SELECT id INTO v_admin_id FROM public.school_role_templates WHERE name = 'school_admin';
  SELECT id INTO v_headmaster_id FROM public.school_role_templates WHERE name = 'headmaster';
  SELECT id INTO v_accountant_id FROM public.school_role_templates WHERE name = 'accountant';
  SELECT id INTO v_teacher_id FROM public.school_role_templates WHERE name = 'teacher';
  SELECT id INTO v_parent_id FROM public.school_role_templates WHERE name = 'parent';
  SELECT id INTO v_student_id FROM public.school_role_templates WHERE name = 'student';

  -- 1. Admin gets ALL permissions
  FOR v_perm IN SELECT id FROM public.school_permissions LOOP
    INSERT INTO public.school_role_template_permissions (template_id, permission_id)
    VALUES (v_admin_id, v_perm.id);
  END LOOP;

  -- 2. Headmaster permissions
  FOR v_perm IN 
    SELECT id FROM public.school_permissions 
    WHERE name IN (
      'dashboard.view', 'students.view', 'students.create', 'students.edit',
      'staff.view', 'staff.create', 'staff.edit', 'staff.attendance.record', 'staff.leave.manage', 'staff.training.manage', 'staff.performance.manage',
      'academics.manage', 'attendance.record', 'attendance.approve', 'timetable.manage', 'exams.enter', 'exams.approve',
      'reports.generate', 'communication.send', 'audit.view'
    )
  LOOP
    INSERT INTO public.school_role_template_permissions (template_id, permission_id)
    VALUES (v_headmaster_id, v_perm.id);
  END LOOP;

  -- 3. Accountant permissions
  FOR v_perm IN 
    SELECT id FROM public.school_permissions 
    WHERE name IN (
      'dashboard.view', 'students.view', 'staff.view', 'reports.generate',
      'finance.view', 'finance.manage', 'finance.expenses.manage', 'finance.payroll.manage', 'finance.record_payment'
    )
  LOOP
    INSERT INTO public.school_role_template_permissions (template_id, permission_id)
    VALUES (v_accountant_id, v_perm.id);
  END LOOP;

  -- 4. Teacher permissions
  FOR v_perm IN 
    SELECT id FROM public.school_permissions 
    WHERE name IN (
      'dashboard.view', 'students.view', 'attendance.record', 'timetable.manage', 'exams.enter', 'communication.send'
    )
  LOOP
    INSERT INTO public.school_role_template_permissions (template_id, permission_id)
    VALUES (v_teacher_id, v_perm.id);
  END LOOP;

  -- 5. Parent permissions
  FOR v_perm IN 
    SELECT id FROM public.school_permissions 
    WHERE name IN ('dashboard.view', 'students.view')
  LOOP
    INSERT INTO public.school_role_template_permissions (template_id, permission_id)
    VALUES (v_parent_id, v_perm.id);
  END LOOP;

  -- 6. Student permissions
  FOR v_perm IN 
    SELECT id FROM public.school_permissions 
    WHERE name IN ('dashboard.view', 'students.view')
  LOOP
    INSERT INTO public.school_role_template_permissions (template_id, permission_id)
    VALUES (v_student_id, v_perm.id);
  END LOOP;
END $$;

-- ============================================================
-- Automatically Initialize RBAC & Features on New School Insertion
-- ============================================================
CREATE OR REPLACE FUNCTION public.initialize_school_rbac()
RETURNS TRIGGER AS $$
DECLARE
  v_role RECORD;
  v_template_perm RECORD;
  v_new_role_id UUID;
BEGIN
  -- Insert default row in school_features table
  INSERT INTO public.school_features (school_id) VALUES (NEW.id);

  -- For each template in school_role_templates, insert corresponding school_role
  FOR v_role IN SELECT * FROM public.school_role_templates LOOP
    -- Insert school role
    INSERT INTO public.school_roles (school_id, template_id, name, display_name, description, is_system, sync_policy)
    VALUES (
      NEW.id,
      v_role.id,
      v_role.name,
      v_role.display_name,
      v_role.description,
      TRUE,
      'auto_sync'
    )
    RETURNING id INTO v_new_role_id;

    -- Copy template permissions
    FOR v_template_perm IN 
      SELECT permission_id FROM public.school_role_template_permissions 
      WHERE template_id = v_role.id
    LOOP
      INSERT INTO public.school_role_permissions (role_id, permission_id)
      VALUES (v_new_role_id, v_template_perm.permission_id);
    END LOOP;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger school insertion
DROP TRIGGER IF EXISTS trg_initialize_school_rbac ON public.schools;
CREATE TRIGGER trg_initialize_school_rbac
  AFTER INSERT ON public.schools
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_school_rbac();

-- ============================================================
-- Sync Template Updates to School Roles
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_role_template_permissions()
RETURNS TRIGGER AS $$
DECLARE
  v_role RECORD;
  v_perm RECORD;
BEGIN
  -- Handle Insert
  IF (TG_OP = 'INSERT') THEN
    FOR v_role IN 
      SELECT id FROM public.school_roles 
      WHERE template_id = NEW.template_id AND sync_policy = 'auto_sync'
    LOOP
      INSERT INTO public.school_role_permissions (role_id, permission_id)
      VALUES (v_role.id, NEW.permission_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  
  -- Handle Delete
  ELSIF (TG_OP = 'DELETE') THEN
    FOR v_role IN 
      SELECT id FROM public.school_roles 
      WHERE template_id = OLD.template_id AND sync_policy = 'auto_sync'
    LOOP
      DELETE FROM public.school_role_permissions
      WHERE role_id = v_role.id AND permission_id = OLD.permission_id;
    END LOOP;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger template permission sync
DROP TRIGGER IF EXISTS trg_sync_role_template_permissions ON public.school_role_template_permissions;
CREATE TRIGGER trg_sync_role_template_permissions
  AFTER INSERT OR DELETE ON public.school_role_template_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_role_template_permissions();

-- ============================================================
-- Trigger to Automatically Map Profile owner/admins to user_roles
-- ============================================================
CREATE OR REPLACE FUNCTION public.map_profile_to_user_roles()
RETURNS TRIGGER AS $$
DECLARE
  v_role_id UUID;
  v_role_name TEXT;
BEGIN
  v_role_name := NEW.role;
  IF v_role_name = 'owner' OR v_role_name = 'school_owner' OR v_role_name = 'admin' THEN
    v_role_name := 'school_admin';
  END IF;

  IF NEW.school_id IS NOT NULL THEN
    SELECT id INTO v_role_id FROM public.school_roles 
    WHERE school_id = NEW.school_id AND name = v_role_name;

    IF v_role_id IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role_id)
      VALUES (NEW.id, v_role_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on profiles creation
DROP TRIGGER IF EXISTS trg_map_profile_to_user_roles ON public.profiles;
CREATE TRIGGER trg_map_profile_to_user_roles
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.map_profile_to_user_roles();

-- Seed existing schools with RBAC & features
DO $$
DECLARE
  v_school RECORD;
  v_role RECORD;
  v_template_perm RECORD;
  v_new_role_id UUID;
  v_profile RECORD;
  v_mapped_role_id UUID;
  v_role_name TEXT;
BEGIN
  -- Seed school_features row for existing schools
  FOR v_school IN 
    SELECT id FROM public.schools s
    WHERE NOT EXISTS (SELECT 1 FROM public.school_features WHERE school_id = s.id)
  LOOP
    INSERT INTO public.school_features (school_id) VALUES (v_school.id);
  END LOOP;

  -- Loop through all existing schools that do not have school_roles seeded
  FOR v_school IN 
    SELECT id FROM public.schools s
    WHERE NOT EXISTS (SELECT 1 FROM public.school_roles WHERE school_id = s.id)
  LOOP
    FOR v_role IN SELECT * FROM public.school_role_templates LOOP
      INSERT INTO public.school_roles (school_id, template_id, name, display_name, description, is_system, sync_policy)
      VALUES (
        v_school.id,
        v_role.id,
        v_role.name,
        v_role.display_name,
        v_role.description,
        TRUE,
        'auto_sync'
      )
      RETURNING id INTO v_new_role_id;

      FOR v_template_perm IN 
        SELECT permission_id FROM public.school_role_template_permissions 
        WHERE template_id = v_role.id
      LOOP
        INSERT INTO public.school_role_permissions (role_id, permission_id)
        VALUES (v_new_role_id, v_template_perm.permission_id);
      END LOOP;
    END LOOP;
  END LOOP;

  -- Map existing profiles to user_roles
  FOR v_profile IN 
    SELECT id, school_id, role FROM public.profiles p
    WHERE school_id IS NOT NULL 
      AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p.id)
  LOOP
    v_role_name := v_profile.role;
    IF v_role_name = 'owner' OR v_role_name = 'school_owner' OR v_role_name = 'admin' THEN
      v_role_name := 'school_admin';
    END IF;

    SELECT id INTO v_mapped_role_id FROM public.school_roles 
    WHERE school_id = v_profile.school_id AND name = v_role_name;

    IF v_mapped_role_id IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role_id)
      VALUES (v_profile.id, v_mapped_role_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

END $$;

SELECT 'Hierarchical RBAC and Inheritance schema initialized successfully' AS status;
