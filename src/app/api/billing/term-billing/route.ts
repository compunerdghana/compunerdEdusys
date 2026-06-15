/**
 * POST /api/billing/term-billing
 * Bulk-generates invoices for all active students in the current term.
 * Called manually by admin or auto-triggered when a new term starts.
 */
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function POST(req: NextRequest) {
  const { school_id, term_id, actor_id } = await req.json();
  if (!school_id) return NextResponse.json({ error: "school_id required" }, { status: 400 });

  // Find the term
  let termId = term_id;
  let termName = "";
  if (!termId) {
    const { data: t } = await getAdmin().from("terms").select("id, name").eq("school_id", school_id).eq("is_current", true).maybeSingle();
    if (!t) return NextResponse.json({ error: "No active term found" }, { status: 400 });
    termId = t.id;
    termName = t.name;
  } else {
    const { data: t } = await getAdmin().from("terms").select("name").eq("id", termId).single();
    termName = t?.name ?? "";
  }

  // Get all active students
  const { data: students } = await getAdmin().from("students")
    .select("id, first_name, last_name, class_id, classrooms(id, name, level)")
    .eq("school_id", school_id)
    .eq("status", "active");

  if (!students?.length) return NextResponse.json({ ok: true, processed: 0, message: "No active students" });

  let processed = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const student of students) {
    try {
      // Skip if already billed this term
      const { data: existing } = await getAdmin().from("student_invoices")
        .select("id")
        .eq("student_id", student.id)
        .eq("term_id", termId)
        .maybeSingle();
      if (existing) { skipped++; continue; }

      // Call admission/complete logic inline
      const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/admission/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: student.id, actor_id }),
      });
      if (res.ok) processed++;
      else errors.push(`${student.first_name} ${student.last_name}: ${(await res.json()).error}`);
    } catch (e) {
      errors.push(`${student.first_name} ${student.last_name}: ${e}`);
    }
  }

  // Activity log
  await getAdmin().from("activity_feed").insert({
    school_id,
    actor_id: actor_id ?? null,
    entity_type: "billing",
    entity_id: null,
    action: "term_billing",
    title: `Term billing run — ${termName}`,
    description: `${processed} invoices generated, ${skipped} already billed, ${errors.length} errors.`,
    meta: { term_id: termId, processed, skipped, errors: errors.slice(0, 5) },
  }).then(() => null, () => null);

  return NextResponse.json({ ok: true, processed, skipped, errors: errors.slice(0, 10), term: termName });
}
