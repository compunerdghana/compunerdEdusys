/**
 * GET  /api/admin/finance/income?schoolId=X — list income records
 * POST /api/admin/finance/income             — create income + credit wallet immediately
 */
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { isTableMissing, mutateSchoolWallet } from "@/lib/finance/wallet-helper";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function getUser() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const schoolId = req.nextUrl.searchParams.get("schoolId");
  if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 });

  const { data, error } = await getAdmin()
    .from("income_records")
    .select("*")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });

  if (isTableMissing(error)) return NextResponse.json({ tableNotReady: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ income: data ?? [] });
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    school_id, income_date, type, title, description,
    amount, source, payment_method, reference_number,
  } = body;

  if (!school_id || !income_date || !type || !title || !amount) {
    return NextResponse.json({ error: "school_id, income_date, type, title, amount required" }, { status: 400 });
  }

  try {
    // Credit wallet immediately
    const { transactionId } = await mutateSchoolWallet({
      schoolId: school_id,
      amount: Number(amount),
      type: "credit",
      category: type,
      description: title,
      referenceType: "income_record",
      userId: user.id,
    });

    // Insert income record
    const { data, error } = await getAdmin().from("income_records").insert({
      school_id,
      income_date,
      type,
      title,
      description: description ?? null,
      amount: Number(amount),
      source: source ?? null,
      payment_method: payment_method ?? null,
      reference_number: reference_number ?? null,
      wallet_transaction_id: transactionId,
      created_by: user.id,
    }).select("*").single();

    if (isTableMissing(error)) return NextResponse.json({ tableNotReady: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, income: data });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (isTableMissing(e)) return NextResponse.json({ tableNotReady: true });
    return NextResponse.json({ error: e.message ?? "Unknown" }, { status: 500 });
  }
}
