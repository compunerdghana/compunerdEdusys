/**
 * POST /api/billing/waive
 * Applies a waiver to a student invoice.
 * Roles: headmaster, owner, accountant only.
 */
import { createClient as serverClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

export async function POST(req: NextRequest) {
  const supabase = await serverClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role, school_id").eq("id", user.id).single();
  if (!["headmaster","owner","accountant","admin"].includes(profile?.role ?? "")) {
    return NextResponse.json({ error: "Not authorised to apply waivers" }, { status: 403 });
  }

  const { invoice_id, waiver_type, amount, percentage, reason } = await req.json();
  if (!invoice_id || !waiver_type || !reason) {
    return NextResponse.json({ error: "invoice_id, waiver_type and reason are required" }, { status: 400 });
  }

  const { data: inv } = await admin.from("student_invoices").select("*").eq("id", invoice_id).single();
  if (!inv) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  // Calculate waiver amount
  let waiveAmt = Number(amount ?? 0);
  if (percentage) {
    waiveAmt = (Number(percentage) / 100) * Number(inv.total_amount);
  }
  waiveAmt = Math.min(waiveAmt, Number(inv.balance));

  // Record waiver
  await admin.from("fee_waivers").insert({
    school_id: inv.school_id,
    student_id: inv.student_id,
    invoice_id,
    waiver_type,
    amount: waiveAmt,
    percentage: percentage ?? null,
    reason,
    approved_by: user.id,
    created_by: user.id,
    status: "approved",
  });

  // Update invoice
  const newWaived = Number(inv.amount_waived) + waiveAmt;
  const newBalance = Math.max(0, Number(inv.total_amount) - Number(inv.amount_paid) - newWaived - Number(inv.amount_discounted));
  const newStatus = newBalance <= 0 ? "paid" : Number(inv.amount_paid) > 0 ? "partial" : "unpaid";
  await admin.from("student_invoices").update({
    amount_waived: newWaived,
    balance: newBalance,
    status: newStatus,
    updated_at: new Date().toISOString(),
  }).eq("id", invoice_id);

  // Update wallet
  const { data: wallet } = await admin.from("student_wallets").select("*").eq("student_id", inv.student_id).maybeSingle();
  if (wallet) {
    const newTotalWaived = Number(wallet.total_waived) + waiveAmt;
    await admin.from("student_wallets").update({
      total_waived: newTotalWaived,
      updated_at: new Date().toISOString(),
    }).eq("id", wallet.id);

    await admin.from("wallet_transactions").insert({
      wallet_id: wallet.id,
      school_id: inv.school_id,
      student_id: inv.student_id,
      type: "credit",
      category: "waiver",
      amount: waiveAmt,
      description: `Waiver: ${waiver_type} — ${reason}`,
      invoice_id,
      recorded_by: user.id,
    });
  }

  // Activity log
  await admin.from("activity_feed").insert({
    school_id: inv.school_id,
    actor_id: user.id,
    entity_type: "waiver",
    entity_id: inv.student_id,
    action: "waiver",
    title: `Waiver applied: GHS ${waiveAmt.toFixed(2)}`,
    description: `${waiver_type} — ${reason}`,
    meta: { waiver_type, amount: waiveAmt, invoice_id },
  }).then(() => null, () => null);

  // Audit log
  await admin.from("audit_logs").insert({
    school_id: inv.school_id,
    actor_id: user.id,
    action: "waiver_applied",
    table_name: "student_invoices",
    record_id: invoice_id,
    before_val: { balance: inv.balance, amount_waived: inv.amount_waived },
    after_val: { balance: newBalance, amount_waived: newWaived },
    reason,
  }).then(() => null, () => null);

  return NextResponse.json({ ok: true, waived_amount: waiveAmt, new_balance: newBalance });
}
