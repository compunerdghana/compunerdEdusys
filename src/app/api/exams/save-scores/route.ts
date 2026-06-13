import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Uses service role key — bypasses RLS so teachers can always save scores
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

  // Delete existing scores for this student+class+term
  const del = admin.from("exam_scores").delete().eq("student_id", student_id);
  if (class_id) del.eq("class_id", class_id);
  if (term_id) del.eq("term_id", term_id);
  await del;

  // Build records — try full columns, strip unknowns on error
  const records = scores.map((s) => ({
    school_id,
    student_id,
    subject_id: s.subject_id,
    ...(class_id ? { class_id } : {}),
    ...(term_id ? { term_id } : {}),
    class_score: s.class_score,
    exam_score: s.exam_score,
    grade: s.grade,
    remark: s.remark,
  }));

  let { error } = await admin.from("exam_scores").insert(records);

  // If class_id or term_id columns don't exist, retry without them
  if (error && (error.message.includes("class_id") || error.message.includes("term_id"))) {
    const fallback = scores.map((s) => ({
      school_id,
      student_id,
      subject_id: s.subject_id,
      class_score: s.class_score,
      exam_score: s.exam_score,
      grade: s.grade,
      remark: s.remark,
    }));
    // Clear and retry
    await admin.from("exam_scores").delete().eq("student_id", student_id);
    const res2 = await admin.from("exam_scores").insert(fallback);
    error = res2.error;
  }

  // If grade/remark columns don't exist, retry with just scores
  if (error && (error.message.includes("grade") || error.message.includes("remark"))) {
    const minimal = scores.map((s) => ({
      school_id,
      student_id,
      subject_id: s.subject_id,
      class_score: s.class_score,
      exam_score: s.exam_score,
    }));
    await admin.from("exam_scores").delete().eq("student_id", student_id);
    const res3 = await admin.from("exam_scores").insert(minimal);
    error = res3.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
