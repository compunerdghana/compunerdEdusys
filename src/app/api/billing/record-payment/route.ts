/**
 * POST /api/billing/record-payment
 * Records a fee payment and updates wallet, invoice, and audit trail.
 */
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

export async function POST(req: NextRequest) {
  try {
    const {
      student_id, invoice_id, amount, payment_method,
      payment_date, reference, notes, recorded_by, school_id,
    } = await req.json();

    if (!student_id || !amount || !school_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const payAmt = Number(amount);

    // ── 1. Get or find invoice ─────────────────────────────────────
    let inv = null;
    if (invoice_id) {
      const { data } = await admin.from("student_invoices").select("*").eq("id", invoice_id).single();
      inv = data;
    } else {
      // Find latest unpaid invoice for student
      const { data } = await admin.from("student_invoices")
        .select("*")
        .eq("student_id", student_id)
        .in("status", ["unpaid", "partial"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      inv = data;
    }

    // ── 2. Generate receipt number ─────────────────────────────────
    const receiptNumber = `RCP-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

    // ── 3. Create receipt ──────────────────────────────────────────
    const { data: receipt } = await admin.from("payment_receipts").insert({
      receipt_number: receiptNumber,
      school_id,
      student_id,
      invoice_id: inv?.id ?? null,
      amount: payAmt,
      payment_method: payment_method ?? "cash",
      payment_date: payment_date ?? new Date().toISOString().slice(0, 10),
      reference: reference ?? null,
      notes: notes ?? null,
      recorded_by: recorded_by ?? null,
    }).select("id").single();

    // ── 4. Update invoice ──────────────────────────────────────────
    if (inv) {
      const newPaid = Number(inv.amount_paid) + payAmt;
      const newBalance = Math.max(0, Number(inv.total_amount) - Number(inv.amount_waived) - Number(inv.amount_discounted) - newPaid);
      const newStatus = newBalance <= 0 ? "paid" : newPaid > 0 ? "partial" : "unpaid";
      await admin.from("student_invoices").update({
        amount_paid: newPaid,
        balance: newBalance,
        status: newStatus,
        updated_at: new Date().toISOString(),
      }).eq("id", inv.id);
    }

    // ── 5. Update wallet ───────────────────────────────────────────
    const { data: wallet } = await admin.from("student_wallets")
      .select("*")
      .eq("student_id", student_id)
      .maybeSingle();

    if (wallet) {
      const newTotalPaid = Number(wallet.total_paid) + payAmt;
      const newBalance = Number(wallet.total_billed) - newTotalPaid - Number(wallet.total_waived) - Number(wallet.total_discounts);
      await admin.from("student_wallets").update({
        total_paid: newTotalPaid,
        current_balance: -newBalance,
        updated_at: new Date().toISOString(),
      }).eq("id", wallet.id);

      // Wallet transaction
      await admin.from("wallet_transactions").insert({
        wallet_id: wallet.id,
        school_id,
        student_id,
        type: "credit",
        category: "payment",
        amount: payAmt,
        balance_after: -newBalance,
        reference: receiptNumber,
        description: `Payment received — ${receiptNumber}`,
        invoice_id: inv?.id ?? null,
        recorded_by: recorded_by ?? null,
      });
    }

    // ── 6. Also update legacy fee_payments table for backwards compat ──
    if (inv) {
      const { data: fp } = await admin.from("fee_payments")
        .select("*")
        .eq("student_id", student_id)
        .limit(1)
        .maybeSingle();
      if (fp) {
        const newPaid = Number(fp.amount_paid) + payAmt;
        const newBalance = Math.max(0, Number(fp.amount_due) - newPaid);
        await admin.from("fee_payments").update({
          amount_paid: newPaid,
          balance: newBalance,
          payment_status: newBalance <= 0 ? "paid" : newPaid > 0 ? "partial" : "unpaid",
          payment_method: payment_method ?? "cash",
          paid_at: new Date().toISOString(),
          receipt_number: receiptNumber,
          recorded_by: recorded_by ?? null,
          updated_at: new Date().toISOString(),
        }).eq("id", fp.id);
      }
    }

    // ── 7. Activity log ────────────────────────────────────────────
    await admin.from("activity_feed").insert({
      school_id,
      actor_id: recorded_by ?? null,
      entity_type: "payment",
      entity_id: student_id,
      action: "payment",
      title: `Payment recorded — GHS ${payAmt.toFixed(2)}`,
      description: `Receipt ${receiptNumber} via ${payment_method ?? "cash"}`,
      meta: { receipt_number: receiptNumber, amount: payAmt, invoice_id: inv?.id },
    }).then(() => null, () => null);

    // ── 8. Timeline event ──────────────────────────────────────────
    await admin.from("student_timeline").insert({
      student_id,
      school_id,
      event_type: "payment",
      title: `Fee payment: GHS ${payAmt.toFixed(2)}`,
      description: `Receipt ${receiptNumber}`,
      event_date: payment_date ?? new Date().toISOString().slice(0, 10),
    }).then(() => null, () => null);

    return NextResponse.json({
      ok: true,
      receipt_number: receiptNumber,
      receipt_id: receipt?.id,
    });

  } catch (err) {
    console.error("[billing/record-payment]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}
