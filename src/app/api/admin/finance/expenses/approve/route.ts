/**
 * POST /api/admin/finance/expenses/approve
 * Approve, reject, or request changes on an expense.
 * Only users with role "owner" or "headmaster" may approve.
 */
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { isTableMissing, mutateSchoolWallet } from "@/lib/finance/wallet-helper";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function getUser() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Role check
  const { data: profile, error: pErr } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (pErr || !profile) return NextResponse.json({ error: "Profile not found" }, { status: 403 });
  if (!["owner", "headmaster"].includes(profile.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const { expense_id, action, reason } = await req.json();
  if (!expense_id || !action) {
    return NextResponse.json({ error: "expense_id and action required" }, { status: 400 });
  }

  const { data: expense, error: eErr } = await admin
    .from("expenses")
    .select("*")
    .eq("id", expense_id)
    .single();

  if (isTableMissing(eErr)) return NextResponse.json({ tableNotReady: true });
  if (eErr || !expense) return NextResponse.json({ error: "Expense not found" }, { status: 404 });

  if (action === "approve") {
    // Idempotency: only debit if currently pending
    if (expense.status !== "pending") {
      return NextResponse.json({ error: `Expense is already ${expense.status}` }, { status: 409 });
    }

    try {
      const { transactionId } = await mutateSchoolWallet({
        schoolId: expense.school_id,
        amount: Number(expense.amount),
        type: "debit",
        category: "expense",
        description: expense.title,
        referenceType: "expense",
        referenceId: expense.id,
        userId: user.id,
      });

      const { error: upErr } = await admin.from("expenses").update({
        status: "approved",
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        wallet_transaction_id: transactionId,
        updated_at: new Date().toISOString(),
      }).eq("id", expense_id);

      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

      // Audit log
      await admin.from("finance_audit_log").insert({
        school_id: expense.school_id,
        user_id: user.id,
        action: "expense_approved",
        entity_type: "expense",
        entity_id: expense_id,
        amount: Number(expense.amount),
        metadata: { title: expense.title, wallet_transaction_id: transactionId },
      });

      return NextResponse.json({ ok: true, action: "approved" });
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (isTableMissing(e)) return NextResponse.json({ tableNotReady: true });
      return NextResponse.json({ error: e.message ?? "Unknown" }, { status: 500 });
    }
  }

  if (action === "reject") {
    const { error: upErr } = await admin.from("expenses").update({
      status: "rejected",
      rejection_reason: reason ?? null,
      updated_at: new Date().toISOString(),
    }).eq("id", expense_id);

    if (isTableMissing(upErr)) return NextResponse.json({ tableNotReady: true });
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    await admin.from("finance_audit_log").insert({
      school_id: expense.school_id,
      user_id: user.id,
      action: "expense_rejected",
      entity_type: "expense",
      entity_id: expense_id,
      amount: Number(expense.amount),
      metadata: { reason },
    });

    return NextResponse.json({ ok: true, action: "rejected" });
  }

  if (action === "request_changes") {
    const { error: upErr } = await admin.from("expenses").update({
      status: "changes_requested",
      rejection_reason: reason ?? null,
      updated_at: new Date().toISOString(),
    }).eq("id", expense_id);

    if (isTableMissing(upErr)) return NextResponse.json({ tableNotReady: true });
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, action: "changes_requested" });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
