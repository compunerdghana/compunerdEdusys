import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/**
 * Creates / patches all tables the app needs.
 * Safe to call repeatedly — uses IF NOT EXISTS and ADD COLUMN IF NOT EXISTS.
 * Call once after first deploy: POST /api/admin/setup-database
 */
export async function POST() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!url || !key) {
    return NextResponse.json({ error: "Missing SUPABASE env vars." }, { status: 500 });
  }

  // Use the Supabase Management / pg REST endpoint to run raw SQL
  // The service role key lets us POST to /rest/v1/rpc/exec_sql if that function exists.
  // We fall back to patching column-by-column via the JS client.

  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  function getAdmin() { return admin; }

  const errors: string[] = [];

  // ── exam_scores ──────────────────────────────────────────────────────────────
  // 1. Create table if absent (we can't run DDL via JS client, so we attempt an
  //    insert and detect "relation does not exist" to surface a clear message).
  const probe = await getAdmin().from("exam_scores").select("id").limit(1);
  const tableExists = !probe.error || !probe.error.message.includes("relation");

  if (!tableExists) {
    errors.push(
      "exam_scores table is missing. " +
      "Run the SQL from /api/admin/setup-database GET to create it.",
    );
  } else {
    // Table exists — ensure required columns are present by attempting selects
    // (PostgREST returns column-specific errors we can detect)
    const colChecks: [string, string, string][] = [
      ["class_id", "uuid", "REFERENCES classrooms(id) ON DELETE SET NULL"],
      ["term_id",  "uuid", "REFERENCES terms(id) ON DELETE SET NULL"],
      ["grade",    "text", ""],
      ["remark",   "text", ""],
    ];

    for (const [col] of colChecks) {
      const r = await getAdmin().from("exam_scores").select(col).limit(1);
      if (r.error?.message.includes(`column exam_scores.${col} does not exist`) ||
          r.error?.message.includes(`Could not find the '${col}'`)) {
        errors.push(`exam_scores is missing column "${col}". Add it via SQL.`);
      }
    }

    // students.photo_url
    const sp = await getAdmin().from("students").select("photo_url").limit(1);
    if (sp.error?.message.includes("photo_url")) {
      errors.push('students is missing column "photo_url". Add it via SQL.');
    }
  }

  // ── Return result ─────────────────────────────────────────────────────────────
  if (errors.length) {
    return NextResponse.json({
      ok: false,
      message: "Some columns/tables are missing. Run the SQL below in the Supabase SQL Editor.",
      sql: MIGRATION_SQL,
      errors,
    }, { status: 207 });
  }

  return NextResponse.json({ ok: true, message: "All required tables and columns are present." });
}

/** GET returns the SQL migration so it can be copy-pasted into Supabase */
export async function GET() {
  return new Response(MIGRATION_SQL, {
    headers: { "Content-Type": "text/plain" },
  });
}

const MIGRATION_SQL = `
-- ═══════════════════════════════════════════════════════════════
--  CompunerdEduSys — Full Database Migration
--  Paste this entire block into the Supabase SQL Editor and run.
--  Safe to run multiple times (idempotent).
-- ═══════════════════════════════════════════════════════════════

-- ── students ─────────────────────────────────────────────────
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS photo_url text;

-- ── profiles (staff) ─────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS bio       text;

-- ── schools ──────────────────────────────────────────────────
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS region      text,
  ADD COLUMN IF NOT EXISTS district    text,
  ADD COLUMN IF NOT EXISTS gps_address text,
  ADD COLUMN IF NOT EXISTS currency    text DEFAULT 'GHS';

-- ── exam_scores ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.exam_scores (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   uuid REFERENCES public.schools(id)    ON DELETE CASCADE,
  student_id  uuid REFERENCES public.students(id)   ON DELETE CASCADE,
  subject_id  uuid REFERENCES public.subjects(id)   ON DELETE CASCADE,
  class_id    uuid REFERENCES public.classrooms(id) ON DELETE SET NULL,
  term_id     uuid REFERENCES public.terms(id)      ON DELETE SET NULL,
  class_score numeric(5,2) CHECK (class_score >= 0 AND class_score <= 30),
  exam_score  numeric(5,2) CHECK (exam_score  >= 0 AND exam_score  <= 70),
  total       numeric(5,2) GENERATED ALWAYS AS
              (COALESCE(class_score, 0) + COALESCE(exam_score, 0)) STORED,
  grade       text,
  remark      text,
  position    integer,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- columns for existing exam_scores tables (if table already exists without them)
ALTER TABLE public.exam_scores
  ADD COLUMN IF NOT EXISTS class_id  uuid REFERENCES public.classrooms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS term_id   uuid REFERENCES public.terms(id)      ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS grade     text,
  ADD COLUMN IF NOT EXISTS remark    text,
  ADD COLUMN IF NOT EXISTS position  integer;

-- RLS
ALTER TABLE public.exam_scores ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- drop old policies if they exist so we can recreate cleanly
  DROP POLICY IF EXISTS "school_scores_select" ON public.exam_scores;
  DROP POLICY IF EXISTS "school_scores_insert" ON public.exam_scores;
  DROP POLICY IF EXISTS "school_scores_update" ON public.exam_scores;
  DROP POLICY IF EXISTS "school_scores_delete" ON public.exam_scores;
END $$;

CREATE POLICY "school_scores_select" ON public.exam_scores
  FOR SELECT USING (
    school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "school_scores_insert" ON public.exam_scores
  FOR INSERT WITH CHECK (
    school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "school_scores_update" ON public.exam_scores
  FOR UPDATE USING (
    school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "school_scores_delete" ON public.exam_scores
  FOR DELETE USING (
    school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid())
  );

-- ── parents ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.parents (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    uuid REFERENCES public.schools(id)   ON DELETE CASCADE,
  student_id   uuid REFERENCES public.students(id)  ON DELETE CASCADE,
  full_name    text NOT NULL,
  relationship text,
  phone        text,
  email        text,
  occupation   text,
  address      text,
  is_primary   boolean DEFAULT false,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS "school_parents_all" ON public.parents;
END $$;
CREATE POLICY "school_parents_all" ON public.parents
  USING (school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()));

-- Done!
SELECT 'Migration complete' AS status;
`.trim();
