-- ============================================================
-- COMPUNERDEDUSYS — Enterprise User, Role, Permission & Access Management
-- Run in Supabase SQL Editor
-- ============================================================

-- ─── 1. EXTEND PROFILES TABLE ─────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS middle_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'other'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS religion TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nationality TEXT DEFAULT 'Ghanaian';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS residential_address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS digital_address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ghana_card TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_contact JSONB DEFAULT '{}'::jsonb;

-- ─── 2. EXTEND STUDENTS TABLE ─────────────────────────────
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS student_id TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS stream TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS house TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS academic_year TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS nationality TEXT DEFAULT 'Ghanaian';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS religion TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS ghana_card TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS emergency_contact JSONB DEFAULT '{}'::jsonb;

-- ─── 3. EXTEND PARENTS TABLE ──────────────────────────────
ALTER TABLE public.parents ADD COLUMN IF NOT EXISTS parent_id TEXT;
ALTER TABLE public.parents ADD COLUMN IF NOT EXISTS employer TEXT;
ALTER TABLE public.parents ADD COLUMN IF NOT EXISTS emergency_contact JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.parents ALTER COLUMN student_id DROP NOT NULL;

-- ─── 4. MANY-TO-MANY PARENT STUDENT LINKS ──────────────────
CREATE TABLE IF NOT EXISTS public.parent_student_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL, -- e.g. Mother, Father, Guardian, sponsor, relative, etc.
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(parent_id, student_id)
);

-- ─── 5. TEACHERS SPECIFIC TABLE ───────────────────────────
CREATE TABLE IF NOT EXISTS public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  teacher_id TEXT NOT NULL, -- Configurable format auto-ID code
  employment_date DATE,
  department TEXT,
  qualification TEXT,
  specialization TEXT,
  subjects_assigned TEXT[] DEFAULT '{}',
  classes_assigned TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'withdrawn')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(school_id, teacher_id)
);

-- ─── 6. STAFF SPECIFIC TABLE ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  staff_id TEXT NOT NULL, -- Configurable format auto-ID code
  department TEXT,
  position TEXT,
  employment_type TEXT NOT NULL DEFAULT 'full-time' CHECK (employment_type IN ('full-time', 'part-time', 'contract', 'temporary')),
  employment_date DATE,
  supervisor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'withdrawn')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(school_id, staff_id)
);

-- ─── 7. DIRECT USER PERMISSION OVERRIDES ──────────────────
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.school_permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, permission_id)
);

-- ─── 8. LOGIN HISTORY ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  ip_address TEXT,
  browser TEXT,
  device TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 9. USER GROUPS & MEMBERSHIP ─────────────────────────
CREATE TABLE IF NOT EXISTS public.user_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(school_id, name)
);

CREATE TABLE IF NOT EXISTS public.user_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.user_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- ─── 10. USER DOCUMENTS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  document_type TEXT NOT NULL CHECK (document_type IN ('appointment_letter', 'certificate', 'license', 'contract', 'id_card', 'student_document', 'parent_document', 'other')),
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 11. SCHOOL ID CONFIG & SEQUENCES ─────────────────────
CREATE TABLE IF NOT EXISTS public.school_id_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  role_type TEXT NOT NULL CHECK (role_type IN ('student', 'teacher', 'staff', 'parent', 'admin', 'accountant', 'receptionist')),
  academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE CASCADE,
  last_value INTEGER NOT NULL DEFAULT 0,
  UNIQUE(school_id, role_type, academic_year_id)
);

-- Add configurable ID template columns to schools
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS id_format_student TEXT DEFAULT 'CPN/{school_code}/{year}/STU{seq}';
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS id_format_teacher TEXT DEFAULT 'CPN/{school_code}/{year}/TCH{seq}';
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS id_format_staff TEXT DEFAULT 'CPN/{school_code}/{year}/STF{seq}';
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS id_format_parent TEXT DEFAULT 'CPN/{school_code}/{year}/PAR{seq}';
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS id_format_admin TEXT DEFAULT 'CPN/{school_code}/{year}/ADM{seq}';

-- ─── 12. RLS & INDICES ────────────────────────────────────
ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_id_sequences ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_parent_student_links_parent ON public.parent_student_links(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_student_links_student ON public.parent_student_links(student_id);
CREATE INDEX IF NOT EXISTS idx_teachers_school ON public.teachers(school_id);
CREATE INDEX IF NOT EXISTS idx_teachers_user ON public.teachers(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_school ON public.staff(school_id);
CREATE INDEX IF NOT EXISTS idx_staff_user ON public.staff(user_id);
CREATE INDEX IF NOT EXISTS idx_user_perms_user ON public.user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_school ON public.login_history(school_id);
CREATE INDEX IF NOT EXISTS idx_login_history_user ON public.login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_groups_school ON public.user_groups(school_id);
CREATE INDEX IF NOT EXISTS idx_user_docs_user ON public.user_documents(user_id);

-- RLS policies
DO $$ BEGIN
  CREATE POLICY tenant_policy ON public.parent_student_links FOR ALL
    USING (parent_id IN (SELECT id FROM public.parents WHERE school_id = my_school_id()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY tenant_policy ON public.teachers FOR ALL
    USING (school_id = my_school_id()) WITH CHECK (school_id = my_school_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY tenant_policy ON public.staff FOR ALL
    USING (school_id = my_school_id()) WITH CHECK (school_id = my_school_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY tenant_policy ON public.user_permissions FOR ALL
    USING (user_id IN (SELECT id FROM public.profiles WHERE school_id = my_school_id()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY tenant_policy ON public.login_history FOR ALL
    USING (school_id = my_school_id()) WITH CHECK (school_id = my_school_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY tenant_policy ON public.user_groups FOR ALL
    USING (school_id = my_school_id()) WITH CHECK (school_id = my_school_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY tenant_policy ON public.user_group_members FOR ALL
    USING (group_id IN (SELECT id FROM public.user_groups WHERE school_id = my_school_id()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY tenant_policy ON public.user_documents FOR ALL
    USING (school_id = my_school_id()) WITH CHECK (school_id = my_school_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY tenant_policy ON public.school_id_sequences FOR ALL
    USING (school_id = my_school_id()) WITH CHECK (school_id = my_school_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── 13. TRIGGERS & PROCEDURES ─────────────────────────────
-- Populate parent_student_links for historical parents data
INSERT INTO public.parent_student_links (parent_id, student_id, relationship, is_primary)
SELECT id, student_id, relationship, is_primary FROM public.parents
ON CONFLICT DO NOTHING;
