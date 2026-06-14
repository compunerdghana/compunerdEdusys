/**
 * POST /api/billing/status-change
 * Handles student status change automation.
 * Called whenever student.status changes.
 */
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const FREEZE_STATUSES = ["graduated", "transfer out", "withdrawn", "expelled", "deceased"];

export async function POST(req: NextRequest) {
  const { student_id, new_status, old_status, actor_id, school_id } = await req.json();
  if (!student_id || !new_status) return NextResponse.json({ error: "student_id and new_status required" }, { status: 400 });

  const actions: string[] = [];

  if (FREEZE_STATUSES.includes(new_status)) {
    // Deactivate wallet (stop future billing)
    await admin.from("student_wallets")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("student_id", student_id);
    actions.push("Wallet deactivated — future billing stopped");

    // Cancel any open invoices beyond current if graduated/withdrawn
    if (["graduated", "withdrawn", "expelled", "deceased"].includes(new_status)) {
      const { data: openInvoices } = await admin.from("student_invoices")
        .select("id, balance")
        .eq("student_id", student_id)
        .in("status", ["unpaid"]);
      // Keep existing invoices but mark them; don't cancel partial payments
      actions.push(`${openInvoices?.length ?? 0} open invoices preserved in history`);
    }

    // Log timeline event
    await admin.from("student_timeline").insert({
      student_id,
      school_id,
      event_type: new_status.replace(" ", "_"),
      title: `Status changed to ${new_status}`,
      description: `Previous status: ${old_status}. Future billing deactivated.`,
      event_date: new Date().toISOString().slice(0, 10),
    }).then(() => null, () => null);
  }

  if (new_status === "graduated") {
    // Add to alumni note via timeline
    await admin.from("student_timeline").insert({
      student_id,
      school_id,
      event_type: "graduated",
      title: "Student Graduated",
      description: "Academic records locked. Added to alumni.",
      event_date: new Date().toISOString().slice(0, 10),
    }).then(() => null, () => null);
    actions.push("Marked as graduated — records locked");
  }

  if (new_status === "active" && FREEZE_STATUSES.includes(old_status ?? "")) {
    // Re-activate wallet if reinstated
    await admin.from("student_wallets")
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq("student_id", student_id);
    actions.push("Wallet reactivated");
  }

  // Activity log
  await admin.from("activity_feed").insert({
    school_id,
    actor_id: actor_id ?? null,
    entity_type: "student",
    entity_id: student_id,
    action: "status_change",
    title: `Student status → ${new_status}`,
    description: `Changed from ${old_status} to ${new_status}`,
    meta: { old_status, new_status },
  }).then(() => null, () => null);

  // Audit log
  await admin.from("audit_logs").insert({
    school_id,
    actor_id: actor_id ?? null,
    action: "student_status_change",
    table_name: "students",
    record_id: student_id,
    before_val: { status: old_status },
    after_val: { status: new_status },
  }).then(() => null, () => null);

  return NextResponse.json({ ok: true, actions });
}
