import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  return new Response(SQL, { headers: { "Content-Type": "text/plain" } });
}

export async function POST() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { error } = await admin.from("student_medical").select("id").limit(1);
  const missing = error?.message?.includes("relation") || error?.message?.includes("does not exist");
  return NextResponse.json({ ok: !missing, sql: missing ? SQL : null });
}

const SQL = `
-- ══════════════════════════════════════════════════════════════════
--  CompunerdEduSys — Student Lifecycle Management Schema
--  Run once in Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════════

-- ── Extend students table ────────────────────────────────────────
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS student_id_manual   text,
  ADD COLUMN IF NOT EXISTS nationality         text DEFAULT 'Ghanaian',
  ADD COLUMN IF NOT EXISTS place_of_birth      text,
  ADD COLUMN IF NOT EXISTS religion            text,
  ADD COLUMN IF NOT EXISTS blood_group         text,
  ADD COLUMN IF NOT EXISTS admission_type      text DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS previous_class      text,
  ADD COLUMN IF NOT EXISTS admission_year      text,
  ADD COLUMN IF NOT EXISTS admission_status    text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS photo_url           text;

-- ── student_medical ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.student_medical (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id          uuid UNIQUE REFERENCES public.students(id) ON DELETE CASCADE,
  school_id           uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  blood_group         text,
  allergies           text,
  medical_conditions  text,
  special_needs       text,
  hospital_name       text,
  doctor_name         text,
  insurance_provider  text,
  insurance_number    text,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);
ALTER TABLE public.student_medical ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "student_medical_school" ON public.student_medical;
CREATE POLICY "student_medical_school" ON public.student_medical
  USING (school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()));

-- ── student_documents ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.student_documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    uuid REFERENCES public.students(id) ON DELETE CASCADE,
  school_id     uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  file_name     text,
  file_url      text NOT NULL,
  uploaded_at   timestamptz DEFAULT now()
);
ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "student_docs_school" ON public.student_documents;
CREATE POLICY "student_docs_school" ON public.student_documents
  USING (school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()));

-- ── student_discipline ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.student_discipline (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id              uuid REFERENCES public.students(id) ON DELETE CASCADE,
  school_id               uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  incident_date           date NOT NULL,
  incident_type           text NOT NULL,
  description             text,
  action_taken            text,
  parent_notified         boolean DEFAULT false,
  recorded_by             uuid REFERENCES public.profiles(id),
  created_at              timestamptz DEFAULT now()
);
ALTER TABLE public.student_discipline ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "student_discipline_school" ON public.student_discipline;
CREATE POLICY "student_discipline_school" ON public.student_discipline
  USING (school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()));

-- ── student_awards ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.student_awards (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   uuid REFERENCES public.students(id) ON DELETE CASCADE,
  school_id    uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  award_type   text NOT NULL,
  title        text NOT NULL,
  description  text,
  awarded_date date,
  awarded_by   text,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE public.student_awards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "student_awards_school" ON public.student_awards;
CREATE POLICY "student_awards_school" ON public.student_awards
  USING (school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()));

-- ── student_promotions ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.student_promotions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id     uuid REFERENCES public.students(id) ON DELETE CASCADE,
  school_id      uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year  text NOT NULL,
  class_name     text NOT NULL,
  class_id       uuid REFERENCES public.classrooms(id),
  promoted_by    uuid REFERENCES public.profiles(id),
  notes          text,
  created_at     timestamptz DEFAULT now()
);
ALTER TABLE public.student_promotions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "student_promotions_school" ON public.student_promotions;
CREATE POLICY "student_promotions_school" ON public.student_promotions
  USING (school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()));

-- ── student_timeline ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.student_timeline (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   uuid REFERENCES public.students(id) ON DELETE CASCADE,
  school_id    uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  event_type   text NOT NULL,
  title        text NOT NULL,
  description  text,
  event_date   date NOT NULL,
  icon         text,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE public.student_timeline ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "student_timeline_school" ON public.student_timeline;
CREATE POLICY "student_timeline_school" ON public.student_timeline
  USING (school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()));

-- ── Extend parents table ─────────────────────────────────────────
ALTER TABLE public.parents
  ADD COLUMN IF NOT EXISTS employer         text,
  ADD COLUMN IF NOT EXISTS digital_address  text;

SELECT 'Student lifecycle schema created' AS status;
`.trim();
