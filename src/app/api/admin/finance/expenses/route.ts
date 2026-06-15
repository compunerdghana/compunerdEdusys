/**
 * GET  /api/admin/finance/expenses?schoolId=X[&status=X][&categoryId=X]
 * POST /api/admin/finance/expenses — create expense (pending, no wallet debit)
 */
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { isTableMissing } from "@/lib/finance/wallet-helper";

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

  const sp = req.nextUrl.searchParams;
  const schoolId = sp.get("schoolId");
  if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 });

  const admin = getAdmin();
  let query = admin
    .from("expenses")
    .select(`*, category:expense_categories(id,name), creator:profiles!expenses_created_by_fkey(id,full_name)`)
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });

  const status = sp.get("status");
  if (status) query = query.eq("status", status);

  const categoryId = sp.get("categoryId");
  if (categoryId) query = query.eq("category_id", categoryId);

  const { data, error } = await query;
  if (isTableMissing(error)) return NextResponse.json({ tableNotReady: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ expenses: data ?? [] });
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    school_id, expense_date, category_id, title, description,
    amount, supplier, payment_method, reference_number, department, branch,
  } = body;

  if (!school_id || !expense_date || !title || !amount) {
    return NextResponse.json({ error: "school_id, expense_date, title, amount required" }, { status: 400 });
  }

  const { data, error } = await getAdmin().from("expenses").insert({
    school_id,
    expense_date,
    category_id: category_id ?? null,
    title,
    description: description ?? null,
    amount: Number(amount),
    supplier: supplier ?? null,
    payment_method: payment_method ?? null,
    reference_number: reference_number ?? null,
    department: department ?? null,
    branch: branch ?? null,
    status: "pending",
    created_by: user.id,
  }).select("*").single();

  if (isTableMissing(error)) return NextResponse.json({ tableNotReady: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, expense: data });
}
