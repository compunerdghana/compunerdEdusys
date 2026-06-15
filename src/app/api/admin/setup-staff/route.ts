import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  return new Response(SQL, { headers: { "Content-Type": "text/plain" } });
}

export async function POST() {
  // Probe for staff_details table existence
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { error } = await getAdmin().from("staff_details").select("id").limit(1);
  const missing = error?.message?.includes("relation") || error?.message?.includes("does not exist");
  return NextResponse.json({ ok: !missing, sql: missing ? SQL : null });
}

const SQL = `
-- ══════════════════════════════════════════════════════════════════
--  CompunerdEduSys — Comprehensive Staff Management Schema
--  Run once in Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════════

-- ── staff_details ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.staff_details (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id                    uuid UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  school_id                     uuid REFERENCES public.schools(id) ON DELETE CASCADE,

  -- Personal
  staff_id_manual               text,
  employee_number               text,
  first_name                    text,
  middle_name                   text,
  last_name                     text,
  gender                        text,
  date_of_birth                 date,
  nationality                   text DEFAULT 'Ghanaian',
  national_id_type              text,
  national_id_number            text,
  marital_status                text,
  religion                      text,

  -- Contact
  mobile_number                 text,
  alternative_number            text,
  email                         text,
  residential_address           text,
  digital_address               text,
  region                        text,
  district                      text,
  emergency_contact_name        text,
  emergency_contact_relationship text,
  emergency_contact_phone       text,

  -- Employment
  employment_type               text DEFAULT 'full_time',
  date_employed                 date,
  date_confirmed                date,
  department                    text,
  designation                   text,
  staff_category                text DEFAULT 'teaching',
  branch                        text,
  reporting_to                  uuid REFERENCES public.profiles(id),
  employment_status             text DEFAULT 'active',

  -- Professional Qualifications
  highest_qualification         text,
  institution_attended          text,
  year_completed                text,
  teaching_license_number       text,
  ntc_registration_number       text,
  professional_certifications   text,
  specialization                text,

  -- Payroll
  basic_salary                  numeric(12,2),
  allowances                    numeric(12,2),
  ssnit_number                  text,
  gra_tin_number                text,
  bank_name                     text,
  bank_branch                   text,
  account_number                text,
  momo_number                   text,
  momo_network                  text,

  -- Academic
  form_master                   boolean DEFAULT false,
  house_master                  boolean DEFAULT false,

  -- Exit Management
  resignation_date              date,
  exit_reason                   text,
  handover_notes                text,
  clearance_status              text,

  created_at                    timestamptz DEFAULT now(),
  updated_at                    timestamptz DEFAULT now()
);

ALTER TABLE public.staff_details ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS "staff_details_all" ON public.staff_details;
END $$;
CREATE POLICY "staff_details_all" ON public.staff_details
  USING (school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()));

-- ── staff_documents ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.staff_documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  school_id     uuid REFERENCES public.schools(id)  ON DELETE CASCADE,
  document_type text NOT NULL,
  file_name     text,
  file_url      text NOT NULL,
  uploaded_at   timestamptz DEFAULT now()
);
ALTER TABLE public.staff_documents ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN DROP POLICY IF EXISTS "staff_docs_all" ON public.staff_documents; END $$;
CREATE POLICY "staff_docs_all" ON public.staff_documents
  USING (school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()));

-- ── staff_assigned_classes ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.staff_assigned_classes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id)   ON DELETE CASCADE,
  class_id   uuid REFERENCES public.classrooms(id) ON DELETE CASCADE,
  school_id  uuid REFERENCES public.schools(id)    ON DELETE CASCADE,
  UNIQUE(profile_id, class_id)
);
ALTER TABLE public.staff_assigned_classes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN DROP POLICY IF EXISTS "sac_all" ON public.staff_assigned_classes; END $$;
CREATE POLICY "sac_all" ON public.staff_assigned_classes USING (true) WITH CHECK (true);

-- ── staff_assigned_subjects ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.staff_assigned_subjects (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id)  ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id)  ON DELETE CASCADE,
  school_id  uuid REFERENCES public.schools(id)   ON DELETE CASCADE,
  UNIQUE(profile_id, subject_id)
);
ALTER TABLE public.staff_assigned_subjects ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN DROP POLICY IF EXISTS "sas_all" ON public.staff_assigned_subjects; END $$;
CREATE POLICY "sas_all" ON public.staff_assigned_subjects USING (true) WITH CHECK (true);

-- Also patch profiles with extra cols
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS bio       text;

SELECT 'Staff schema created' AS status;
`.trim();
