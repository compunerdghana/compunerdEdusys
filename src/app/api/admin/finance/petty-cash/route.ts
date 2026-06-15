/**
 * GET  /api/admin/finance/petty-cash?schoolId=X
 * POST /api/admin/finance/petty-cash — create account
 * PUT  /api/admin/finance/petty-cash — update balance (replenishment or expenditure)
 */
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { isTableMissing } from "@/lib/finance/wallet-helper";

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

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const schoolId = req.nextUrl.searchParams.get("schoolId");
  if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 });

  const { data, error } = await admin
    .from("petty_cash_accounts")
    .select("*")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });

  if (isTableMissing(error)) return NextResponse.json({ tableNotReady: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ accounts: data ?? [] });
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { school_id, name, opening_amount, allocated_to, allocation_date } = await req.json();
  if (!school_id || !name) {
    return NextResponse.json({ error: "school_id and name required" }, { status: 400 });
  }

  const amt = Number(opening_amount ?? 0);

  const { data, error } = await admin.from("petty_cash_accounts").insert({
    school_id,
    name,
    opening_amount: amt,
    current_balance: amt,
    allocated_to: allocated_to ?? null,
    allocation_date: allocation_date ?? null,
    created_by: user.id,
  }).select("*").single();

  if (isTableMissing(error)) return NextResponse.json({ tableNotReady: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, account: data });
}

export async function PUT(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, current_balance, name, allocated_to, allocation_date } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (current_balance !== undefined) updates.current_balance = Number(current_balance);
  if (name !== undefined) updates.name = name;
  if (allocated_to !== undefined) updates.allocated_to = allocated_to;
  if (allocation_date !== undefined) updates.allocation_date = allocation_date;

  const { data, error } = await admin.from("petty_cash_accounts").update(updates).eq("id", id).select("*").single();

  if (isTableMissing(error)) return NextResponse.json({ tableNotReady: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, account: data });
}
