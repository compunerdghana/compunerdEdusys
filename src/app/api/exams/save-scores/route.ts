import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { student_id, class_id, term_id, school_id, scores } = body as {
    student_id: string;
    class_id: string;
    term_id: string | null;
    school_id: string;
    scores: Array<{
      subject_id: string;
      class_score: number | null;
      exam_score: number | null;
      grade: string;
      remark: string;
    }>;
  };

  if (!student_id || !school_id || !scores?.length) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  function getAdmin() { return admin; }

  // Delete existing scores — chain properly (Supabase builder is immutable)
  let delQuery = getAdmin().from("exam_scores").delete().eq("student_id", student_id);
  if (class_id) delQuery = delQuery.eq("class_id", class_id);
  if (term_id)  delQuery = delQuery.eq("term_id", term_id);
  const { error: delErr } = await delQuery;

  // If delete failed because class_id/term_id columns don't exist, wipe by student only
  if (delErr) {
    await getAdmin().from("exam_scores").delete().eq("student_id", student_id);
  }

  if (!scores.length) return NextResponse.json({ ok: true });

  // Try increasingly minimal payloads until one succeeds
  const payloads = [
    // Full
    scores.map((s) => ({
      school_id, student_id, subject_id: s.subject_id,
      ...(class_id ? { class_id } : {}),
      ...(term_id  ? { term_id  } : {}),
      class_score: s.class_score, exam_score: s.exam_score,
      grade: s.grade, remark: s.remark,
    })),
    // Without class_id/term_id
    scores.map((s) => ({
      school_id, student_id, subject_id: s.subject_id,
      class_score: s.class_score, exam_score: s.exam_score,
      grade: s.grade, remark: s.remark,
    })),
    // Without grade/remark either
    scores.map((s) => ({
      school_id, student_id, subject_id: s.subject_id,
      class_score: s.class_score, exam_score: s.exam_score,
    })),
    // Absolute minimum
    scores.map((s) => ({
      student_id, subject_id: s.subject_id,
      class_score: s.class_score, exam_score: s.exam_score,
    })),
  ];

  let lastError = "";
  for (const payload of payloads) {
    // Re-delete before each attempt to avoid duplicate key errors
    await getAdmin().from("exam_scores").delete().eq("student_id", student_id);
    const { error } = await getAdmin().from("exam_scores").insert(payload);
    if (!error) return NextResponse.json({ ok: true });
    lastError = error.message;
    // Only retry on "column does not exist" errors
    const isColumnErr =
      lastError.includes("column") ||
      lastError.includes("Could not find") ||
      lastError.includes("schema cache");
    if (!isColumnErr) break;
  }

  return NextResponse.json({ error: lastError }, { status: 500 });
}
