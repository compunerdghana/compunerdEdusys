/**
 * GET    /api/admin/finance/bank-accounts?schoolId=X
 * POST   /api/admin/finance/bank-accounts — create
 * PUT    /api/admin/finance/bank-accounts — update balance
 * DELETE /api/admin/finance/bank-accounts — deactivate (never hard-delete)
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
    .from("school_bank_accounts")
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

  const { school_id, account_name, account_number, bank, branch, balance, account_type } = await req.json();
  if (!school_id || !account_name || !bank) {
    return NextResponse.json({ error: "school_id, account_name, bank required" }, { status: 400 });
  }

  const { data, error } = await admin.from("school_bank_accounts").insert({
    school_id,
    account_name,
    account_number: account_number ?? null,
    bank,
    branch: branch ?? null,
    balance: Number(balance ?? 0),
    account_type: account_type ?? "savings",
    is_active: true,
  }).select("*").single();

  if (isTableMissing(error)) return NextResponse.json({ tableNotReady: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, account: data });
}

export async function PUT(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, balance, account_name, account_number, bank, branch, account_type } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (balance !== undefined) updates.balance = Number(balance);
  if (account_name !== undefined) updates.account_name = account_name;
  if (account_number !== undefined) updates.account_number = account_number;
  if (bank !== undefined) updates.bank = bank;
  if (branch !== undefined) updates.branch = branch;
  if (account_type !== undefined) updates.account_type = account_type;

  const { data, error } = await admin.from("school_bank_accounts").update(updates).eq("id", id).select("*").single();

  if (isTableMissing(error)) return NextResponse.json({ tableNotReady: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, account: data });
}

export async function DELETE(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { data, error } = await admin
    .from("school_bank_accounts")
    .update({ is_active: false })
    .eq("id", id)
    .select("id")
    .single();

  if (isTableMissing(error)) return NextResponse.json({ tableNotReady: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, deactivated: data?.id });
}
