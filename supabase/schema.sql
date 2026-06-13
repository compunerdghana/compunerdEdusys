-- ============================================================
-- CompunerdEduSys — Supabase PostgreSQL Schema
-- Run this in the Supabase SQL editor to set up the database.
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ============================================================
-- SCHOOLS
-- ============================================================
create table if not exists schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique not null,
  logo_url text,
  motto text,
  address text,
  city text,
  region text,
  phone text,
  email text,
  level text[] default '{}',
  admission_prefix text not null default 'ADM',
  current_academic_year_id uuid,
  is_active boolean not null default true,
  subscription_status text not null default 'trial' check (subscription_status in ('trial','active','suspended','expired')),
  subscription_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  school_id uuid references schools(id) on delete set null,
  role text not null default 'teacher' check (role in ('super_admin','school_owner','headmaster','accountant','teacher','parent')),
  full_name text not null,
  username text unique,          -- used for login; set by admin
  email text,                    -- internal email used by Supabase Auth (not shown to user)
  phone text,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create profile on sign-up
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, full_name, email, username, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    split_part(new.email, '@', 1),   -- username = part before @edusys.internal
    coalesce(new.raw_user_meta_data->>'role', 'teacher')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- ACADEMIC YEARS
-- ============================================================
create table if not exists academic_years (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  name text not null,
  start_date date not null,
  end_date date not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- TERMS
-- ============================================================
create table if not exists terms (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  academic_year_id uuid not null references academic_years(id) on delete cascade,
  term text not null check (term in ('term1','term2','term3')),
  name text not null,
  start_date date not null,
  end_date date not null,
  reopening_date date,
  is_current boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- CLASSROOMS
-- ============================================================
create table if not exists classrooms (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  name text not null,
  level text not null check (level in ('daycare','nursery','kg','primary','jhs')),
  arm text,
  class_teacher_id uuid references profiles(id) on delete set null,
  capacity int,
  created_at timestamptz not null default now()
);

-- ============================================================
-- SUBJECTS
-- ============================================================
create table if not exists subjects (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  name text not null,
  code text,
  level text[] default '{}',
  created_at timestamptz not null default now()
);

-- ============================================================
-- STUDENTS
-- ============================================================
create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  admission_number text not null,
  first_name text not null,
  middle_name text,
  last_name text not null,
  date_of_birth date,
  gender text not null check (gender in ('male','female')),
  photo_url text,
  class_id uuid references classrooms(id) on delete set null,
  status text not null default 'active' check (status in ('active','inactive','graduated','transferred','withdrawn')),
  admission_date date not null default current_date,
  previous_school text,
  medical_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, admission_number)
);

-- ============================================================
-- PARENTS
-- ============================================================
create table if not exists parents (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  relationship text not null,
  full_name text not null,
  phone text not null,
  email text,
  occupation text,
  address text,
  is_primary boolean not null default false,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- FEE TYPES
-- ============================================================
create table if not exists fee_types (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  name text not null,
  amount numeric(12,2) not null,
  term_id uuid references terms(id) on delete set null,
  level text[],
  is_mandatory boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- FEE PAYMENTS
-- ============================================================
create table if not exists fee_payments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  fee_type_id uuid not null references fee_types(id) on delete restrict,
  term_id uuid references terms(id) on delete set null,
  amount_due numeric(12,2) not null,
  amount_paid numeric(12,2) not null default 0,
  balance numeric(12,2) generated always as (amount_due - amount_paid) stored,
  payment_status text not null default 'unpaid' check (payment_status in ('paid','partial','unpaid')),
  paid_at timestamptz,
  receipt_number text,
  payment_method text check (payment_method in ('cash','momo','bank','other')),
  recorded_by uuid references profiles(id) on delete set null,
  notes text,
  offline_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- ATTENDANCE RECORDS
-- ============================================================
create table if not exists attendance_records (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  class_id uuid not null references classrooms(id) on delete cascade,
  date date not null,
  term_id uuid references terms(id) on delete set null,
  status text not null default 'present' check (status in ('present','absent','late','excused')),
  recorded_by uuid not null references profiles(id) on delete restrict,
  notes text,
  offline_id text,
  created_at timestamptz not null default now(),
  unique (student_id, date, class_id)
);

-- ============================================================
-- EXAM SCORES
-- ============================================================
create table if not exists exam_scores (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  class_id uuid not null references classrooms(id) on delete cascade,
  term_id uuid not null references terms(id) on delete cascade,
  class_score numeric(5,2) check (class_score between 0 and 30),
  exam_score numeric(5,2) check (exam_score between 0 and 70),
  total numeric(6,2) generated always as (coalesce(class_score,0) + coalesce(exam_score,0)) stored,
  grade text,
  position int,
  remark text,
  offline_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, subject_id, term_id)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table schools enable row level security;
alter table profiles enable row level security;
alter table academic_years enable row level security;
alter table terms enable row level security;
alter table classrooms enable row level security;
alter table subjects enable row level security;
alter table students enable row level security;
alter table parents enable row level security;
alter table fee_types enable row level security;
alter table fee_payments enable row level security;
alter table attendance_records enable row level security;
alter table exam_scores enable row level security;

-- Helper: get current user's school_id
create or replace function my_school_id()
returns uuid language sql stable security definer as $$
  select school_id from profiles where id = auth.uid()
$$;

-- Helper: get current user's role
create or replace function my_role()
returns text language sql stable security definer as $$
  select role from profiles where id = auth.uid()
$$;

-- Profiles: users can read their own; school staff can read school profiles
create policy "profiles: own read" on profiles for select using (id = auth.uid());
create policy "profiles: school read" on profiles for select
  using (school_id = my_school_id() and my_role() != 'parent');

-- Schools: school staff can read their school
create policy "schools: read own" on schools for select
  using (id = my_school_id());

-- Super admin bypass (add as needed per table)
-- Tenant-scoped policies for all other tables
create policy "academic_years: tenant" on academic_years for all
  using (school_id = my_school_id()) with check (school_id = my_school_id());

create policy "terms: tenant" on terms for all
  using (school_id = my_school_id()) with check (school_id = my_school_id());

create policy "classrooms: tenant" on classrooms for all
  using (school_id = my_school_id()) with check (school_id = my_school_id());

create policy "subjects: tenant" on subjects for all
  using (school_id = my_school_id()) with check (school_id = my_school_id());

create policy "students: tenant" on students for all
  using (school_id = my_school_id()) with check (school_id = my_school_id());

create policy "parents: tenant" on parents for all
  using (school_id = my_school_id()) with check (school_id = my_school_id());

create policy "fee_types: tenant" on fee_types for all
  using (school_id = my_school_id()) with check (school_id = my_school_id());

create policy "fee_payments: tenant" on fee_payments for all
  using (school_id = my_school_id()) with check (school_id = my_school_id());

create policy "attendance_records: tenant" on attendance_records for all
  using (school_id = my_school_id()) with check (school_id = my_school_id());

create policy "exam_scores: tenant" on exam_scores for all
  using (school_id = my_school_id()) with check (school_id = my_school_id());

-- ============================================================
-- USER MANAGEMENT HELPERS
-- ============================================================

-- create_school_user: called by admins to provision a new staff/parent account.
-- Usage: select create_school_user('ama.mensah', 'Ama Mensah', 'teacher', <school_id>, 'Secret123!');
create or replace function create_school_user(
  p_username   text,
  p_full_name  text,
  p_role       text,
  p_school_id  uuid,
  p_password   text
)
returns uuid language plpgsql security definer as $$
declare
  v_email   text;
  v_user_id uuid;
begin
  -- Construct a deterministic internal email — never shown to the user
  v_email := lower(p_username) || '@edusys.internal';

  -- Create the auth user
  v_user_id := (
    select id from auth.users where email = v_email
  );

  if v_user_id is null then
    v_user_id := extensions.uuid_generate_v4();
    insert into auth.users (
      id, email, encrypted_password, email_confirmed_at,
      raw_user_meta_data, created_at, updated_at, role
    ) values (
      v_user_id,
      v_email,
      crypt(p_password, gen_salt('bf')),
      now(),
      jsonb_build_object('full_name', p_full_name, 'role', p_role),
      now(), now(),
      'authenticated'
    );
  end if;

  -- Update (or create via trigger) the profile row
  update profiles set
    username   = lower(p_username),
    full_name  = p_full_name,
    email      = v_email,
    role       = p_role,
    school_id  = p_school_id,
    is_active  = true,
    updated_at = now()
  where id = v_user_id;

  return v_user_id;
end;
$$;

-- reset_user_password: admin resets a staff member's password by username
create or replace function reset_user_password(p_username text, p_new_password text)
returns void language plpgsql security definer as $$
declare
  v_email text;
begin
  select email into v_email from profiles where username = lower(p_username);
  if v_email is null then
    raise exception 'User % not found', p_username;
  end if;
  update auth.users
  set encrypted_password = crypt(p_new_password, gen_salt('bf')), updated_at = now()
  where email = v_email;
end;
$$;

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_profiles_username on profiles(username);
create index if not exists idx_students_school on students(school_id);
create index if not exists idx_students_class on students(class_id);
create index if not exists idx_attendance_date on attendance_records(school_id, date);
create index if not exists idx_attendance_class_date on attendance_records(class_id, date);
create index if not exists idx_fee_payments_student on fee_payments(student_id);
create index if not exists idx_exam_scores_term on exam_scores(term_id, class_id);
