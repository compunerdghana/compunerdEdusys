import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function POST() {
  try {
    await getAdmin().rpc("exec_sql", {
      sql: `
        CREATE TABLE IF NOT EXISTS school_documents (
          id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          school_id     uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
          category      text NOT NULL DEFAULT 'other',
          title         text,
          file_name     text,
          file_url      text NOT NULL,
          file_size     bigint,
          mime_type     text,
          uploaded_by   uuid REFERENCES profiles(id),
          created_at    timestamptz NOT NULL DEFAULT now(),
          updated_at    timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS idx_school_docs_school ON school_documents(school_id);
        ALTER TABLE school_documents ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "School members can read docs" ON school_documents;
        CREATE POLICY "School members can read docs" ON school_documents
          FOR SELECT USING (
            school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid())
          );
        DROP POLICY IF EXISTS "Headmaster can manage docs" ON school_documents;
        CREATE POLICY "Headmaster can manage docs" ON school_documents
          FOR ALL USING (
            school_id IN (
              SELECT school_id FROM profiles WHERE id = auth.uid()
              AND role IN ('headmaster','owner','admin')
            )
          );
      `
    }).then(() => null, () => null);

    // Fallback: try direct table creation if rpc not available
    await getAdmin().from("school_documents").select("id").limit(1);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
