import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

const isMissing = (e: { code?: string; message?: string } | null) =>
  e?.code === "42P01" || e?.message?.includes("does not exist");

// GET — list runs + records for a specific run
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const schoolId = searchParams.get("schoolId");
  const runId = searchParams.get("runId");

  if (!schoolId) return NextResponse.json({ error: "Missing schoolId" }, { status: 400 });

  const admin = getAdmin();

  if (runId) {
    // Fetch records for a specific run with staff names
    const { data, error } = await admin.from("payroll_records")
      .select("*, profiles(full_name, role, staff_details(department, designation))")
      .eq("payroll_run_id", runId)
      .eq("school_id", schoolId)
      .order("created_at");

    if (isMissing(error)) return NextResponse.json({ data: [], tableNotReady: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: data ?? [] });
  }

  // List all runs
  const { data, error } = await admin.from("payroll_runs")
    .select("*")
    .eq("school_id", schoolId)
    .order("year", { ascending: false })
    .order("month", { ascending: false });

  if (isMissing(error)) return NextResponse.json({ data: [], tableNotReady: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

// POST — create a new payroll run and auto-populate from staff_details salaries
export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { school_id, month, year, pay_date, notes } = await req.json();
  if (!school_id || !month || !year) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const admin = getAdmin();

  // Create the run
  const { data: run, error: runErr } = await admin.from("payroll_runs").insert({
    school_id, month, year,
    pay_date: pay_date || null,
    notes: notes || null,
    created_by: user.id,
  }).select().single();

  if (isMissing(runErr)) return NextResponse.json({ tableNotReady: true });
  if (runErr) return NextResponse.json({ error: runErr.message }, { status: 500 });

  // Auto-populate records from active staff with salary info
  const { data: staffList } = await admin.from("profiles")
    .select("id, staff_details(basic_salary, allowances, ssnit_employee, income_tax, other_deductions, payment_method, account_number, bank_name)")
    .eq("school_id", school_id)
    .neq("role", "parent")
    .eq("is_active", true);

  if (staffList && staffList.length > 0) {
    const records = staffList.map((s) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d = (s.staff_details as any) ?? {};
      const basic = Number(d.basic_salary ?? 0);
      const allow = Number(d.allowances ?? 0);
      const ssnit = Number(d.ssnit_employee ?? (basic * 0.055).toFixed(2));
      const tax   = Number(d.income_tax ?? 0);
      const other = Number(d.other_deductions ?? 0);
      return {
        payroll_run_id: run.id,
        school_id,
        profile_id: s.id,
        basic_salary: basic,
        allowances: allow,
        ssnit_employee: ssnit,
        ssnit_employer: Number((basic * 0.13).toFixed(2)),
        income_tax: tax,
        other_deductions: other,
        payment_method: d.payment_method || "bank_transfer",
        account_number: d.account_number || null,
        bank_name: d.bank_name || null,
      };
    });

    await admin.from("payroll_records").insert(records);

    // Update run totals
    const totalGross = records.reduce((s, r) => s + r.basic_salary + r.allowances, 0);
    const totalDeductions = records.reduce((s, r) => s + r.ssnit_employee + r.income_tax + r.other_deductions, 0);
    await admin.from("payroll_runs").update({
      total_gross: totalGross,
      total_deductions: totalDeductions,
      total_net: totalGross - totalDeductions,
    }).eq("id", run.id);
  }

  return NextResponse.json({ data: run });
}

// PATCH — update run status OR update individual record
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const admin = getAdmin();

  if (body.record_id) {
    // Update a single payroll record
    const { record_id, ...updates } = body;
    const { data, error } = await admin.from("payroll_records")
      .update({ ...updates, ...(updates.status === "paid" ? { paid_at: new Date().toISOString() } : {}) })
      .eq("id", record_id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Recalculate run totals
    if (body.payroll_run_id) {
      const { data: records } = await admin.from("payroll_records")
        .select("gross_salary, total_deductions, net_salary").eq("payroll_run_id", body.payroll_run_id);
      if (records) {
        const tg = records.reduce((s, r) => s + Number(r.gross_salary), 0);
        const td = records.reduce((s, r) => s + Number(r.total_deductions), 0);
        await admin.from("payroll_runs").update({ total_gross: tg, total_deductions: td, total_net: tg - td }).eq("id", body.payroll_run_id);
      }
    }
    return NextResponse.json({ data });
  }

  // Update run status
  const { run_id, status, pay_date } = body;
  if (!run_id) return NextResponse.json({ error: "Missing run_id" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (status) updates.status = status;
  if (pay_date) updates.pay_date = pay_date;

  if (status === "paid") {
    // Mark all pending records as paid
    await admin.from("payroll_records").update({ status: "paid", paid_at: new Date().toISOString() }).eq("payroll_run_id", run_id).eq("status", "pending");
  }

  const { data, error } = await admin.from("payroll_runs").update(updates).eq("id", run_id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(req: NextRequest) {
  const { run_id } = await req.json();
  if (!run_id) return NextResponse.json({ error: "Missing run_id" }, { status: 400 });
  const admin = getAdmin();
  const { error } = await admin.from("payroll_runs").delete().eq("id", run_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
