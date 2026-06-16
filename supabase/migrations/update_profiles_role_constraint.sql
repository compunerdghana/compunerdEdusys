-- ══════════════════════════════════════════════════════════════════
--  CompunerdEduSys — Update Profiles Role Check Constraint
--  Run in Supabase SQL Editor to update roles constraint.
-- ══════════════════════════════════════════════════════════════════

-- Drop existing check constraint if it exists
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add updated check constraint with support for all staff roles (e.g. secretary, librarian, admin, owner, etc.)
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('super_admin', 'school_owner', 'owner', 'headmaster', 'accountant', 'teacher', 'parent', 'secretary', 'librarian', 'counselor', 'nurse', 'janitor', 'security', 'driver', 'cook', 'admin'));
