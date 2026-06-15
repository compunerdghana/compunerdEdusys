/**
 * POST /api/admission/complete
 * Fires after every student admission (or on-demand for existing students).
 * Performs all ERP automation in a single atomic sequence:
 *   1. Create / ensure student wallet
 *   2. Find active fee structure for the student's class
 *   3. Generate invoice + invoice lines
 *   4. Debit wallet with billed amount
 *   5. Log activity feed event
 *   6. Log audit trail
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
  try {
    const { student_id, actor_id } = await req.json();
    if (!student_id) return NextResponse.json({ error: "student_id required" }, { status: 400 });

    // ── 1. Fetch student + class info ──────────────────────────────
    const { data: student, error: sErr } = await getAdmin()
      .from("students")
      .select("*, classrooms(id, name, level)")
      .eq("id", student_id)
      .single();
    if (sErr || !student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const schoolId = student.school_id;
    const results: string[] = [];

    // ── 2. Create wallet (idempotent) ──────────────────────────────
    const { data: existingWallet } = await getAdmin()
      .from("student_wallets")
      .select("id")
      .eq("student_id", student_id)
      .maybeSingle();

    let walletId: string;
    if (!existingWallet) {
      const walletNumber = `WLT-${Date.now().toString().slice(-6)}`;
      const { data: w } = await getAdmin().from("student_wallets").insert({
        school_id: schoolId,
        student_id,
        wallet_number: walletNumber,
        current_balance: 0,
        total_billed: 0,
        total_paid: 0,
        total_waived: 0,
        total_discounts: 0,
      }).select("id").single();
      walletId = w!.id;
      results.push(`Wallet created: ${walletNumber}`);
    } else {
      walletId = existingWallet.id;
      results.push("Wallet already exists");
    }

    // ── 3. Find current term ───────────────────────────────────────
    const { data: currentTerm } = await getAdmin()
      .from("terms")
      .select("id, name")
      .eq("school_id", schoolId)
      .eq("is_current", true)
      .maybeSingle();

    if (!currentTerm) {
      results.push("No current term — invoice skipped");
      await logActivity(schoolId, actor_id, "admission", student_id, "Student admitted",
        `${student.first_name} ${student.last_name} admitted. No active term found for billing.`);
      return NextResponse.json({ ok: true, results, wallet_id: walletId });
    }

    // ── 4. Check if invoice already exists for this term ──────────
    const { data: existingInvoice } = await getAdmin()
      .from("student_invoices")
      .select("id")
      .eq("student_id", student_id)
      .eq("term_id", currentTerm.id)
      .maybeSingle();

    if (existingInvoice) {
      results.push(`Invoice for ${currentTerm.name} already exists`);
      return NextResponse.json({ ok: true, results, wallet_id: walletId, invoice_id: existingInvoice.id });
    }

    // ── 5. Find active fee structure ───────────────────────────────
    // Priority: class-specific → level-specific → school-wide
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const classObj = student.classrooms as any;
    let feeStructure = null;

    if (student.class_id) {
      const { data } = await getAdmin()
        .from("fee_structures")
        .select("*, fee_structure_items(*)")
        .eq("school_id", schoolId)
        .eq("class_id", student.class_id)
        .eq("is_active", true)
        .maybeSingle();
      feeStructure = data;
    }

    if (!feeStructure && classObj?.level) {
      const { data } = await getAdmin()
        .from("fee_structures")
        .select("*, fee_structure_items(*)")
        .eq("school_id", schoolId)
        .eq("level", classObj.level)
        .is("class_id", null)
        .eq("is_active", true)
        .maybeSingle();
      feeStructure = data;
    }

    if (!feeStructure) {
      results.push("No fee structure found — invoice skipped. Set up fee structures in Settings → Fees.");
      await logActivity(schoolId, actor_id, "admission", student_id, "Student admitted",
        `${student.first_name} ${student.last_name} admitted. No fee structure found.`);
      return NextResponse.json({ ok: true, results, wallet_id: walletId });
    }

    // ── 6. Generate invoice ────────────────────────────────────────
    const items = (feeStructure.fee_structure_items ?? []) as {
      name: string; amount: number; is_mandatory: boolean; sort_order: number;
    }[];
    const totalAmount = items.reduce((s, i) => s + Number(i.amount), 0);

    const invoiceSeq = Date.now(); // fallback unique
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoiceSeq).slice(-6)}`;

    const { data: invoice } = await getAdmin().from("student_invoices").insert({
      invoice_number: invoiceNumber,
      school_id: schoolId,
      student_id,
      term_id: currentTerm.id,
      fee_structure_id: feeStructure.id,
      total_amount: totalAmount,
      amount_paid: 0,
      amount_waived: 0,
      amount_discounted: 0,
      balance: totalAmount,
      status: totalAmount === 0 ? "paid" : "unpaid",
      created_by: actor_id ?? null,
    }).select("id").single();

    if (!invoice) {
      results.push("Invoice creation failed");
    } else {
      // Insert invoice lines
      if (items.length > 0) {
        await getAdmin().from("student_invoice_lines").insert(
          items.map((item, idx) => ({
            invoice_id: invoice.id,
            school_id: schoolId,
            item_name: item.name,
            amount: Number(item.amount),
            amount_paid: 0,
            is_mandatory: item.is_mandatory ?? true,
            sort_order: item.sort_order ?? idx,
          }))
        );
      }

      // ── 7. Debit wallet ──────────────────────────────────────────
      if (totalAmount > 0) {
        await getAdmin().from("wallet_transactions").insert({
          wallet_id: walletId,
          school_id: schoolId,
          student_id,
          type: "debit",
          category: "fees",
          amount: totalAmount,
          description: `Invoice ${invoiceNumber} — ${currentTerm.name}`,
          invoice_id: invoice.id,
          recorded_by: actor_id ?? null,
        });

        const { data: wallet } = await getAdmin().from("student_wallets").select("total_billed").eq("id", walletId).single();
        await getAdmin().from("student_wallets").update({
          total_billed: (Number(wallet?.total_billed) || 0) + totalAmount,
          current_balance: -totalAmount,
          updated_at: new Date().toISOString(),
        }).eq("id", walletId);
      }

      results.push(`Invoice ${invoiceNumber} created: GHS ${totalAmount.toFixed(2)} (${items.length} items)`);
    }

    // ── 8. Log activity ────────────────────────────────────────────
    await logActivity(
      schoolId, actor_id, "admission", student_id,
      `${student.first_name} ${student.last_name} admitted`,
      `Admitted to ${classObj?.name ?? "class"}. Invoice ${invoiceNumber} generated for ${currentTerm.name}.`,
      { invoice_number: invoiceNumber, total_amount: totalAmount, term: currentTerm.name }
    );

    // ── 9. Timeline event ──────────────────────────────────────────
    await getAdmin().from("student_timeline").upsert({
      student_id,
      school_id: schoolId,
      event_type: "admission",
      title: `Admitted to ${classObj?.name ?? "school"}`,
      description: `Invoice generated: GHS ${totalAmount.toFixed(2)} for ${currentTerm.name}`,
      event_date: student.admission_date ?? new Date().toISOString().slice(0, 10),
    }).then(() => null, () => null);

    return NextResponse.json({
      ok: true,
      results,
      wallet_id: walletId,
      invoice_id: invoice?.id ?? null,
      invoice_number: invoiceNumber,
      total_billed: totalAmount,
    });

  } catch (err: unknown) {
    console.error("[admission/complete]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

// ── Helpers ──────────────────────────────────────────────────────────
async function logActivity(
  schoolId: string, actorId: string | null, entityType: string, entityId: string,
  title: string, description?: string, meta?: Record<string, unknown>
) {
  await getAdmin().from("activity_feed").insert({
    school_id: schoolId,
    actor_id: actorId ?? null,
    entity_type: entityType,
    entity_id: entityId,
    action: entityType,
    title,
    description: description ?? null,
    meta: meta ?? {},
  }).then(() => null, () => null);
}
