/**
 * GET  /api/admin/finance/wallet?schoolId=X  — wallet + recent transactions
 * POST /api/admin/finance/wallet              — record a wallet transaction
 */
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { ensureSchoolWallet, isTableMissing, mutateSchoolWallet } from "@/lib/finance/wallet-helper";

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

  const { data: wallet, error: wErr } = await admin
    .from("school_wallets")
    .select("*")
    .eq("school_id", schoolId)
    .maybeSingle();

  if (isTableMissing(wErr)) return NextResponse.json({ tableNotReady: true });
  if (wErr) return NextResponse.json({ error: wErr.message }, { status: 500 });

  const { data: transactions, error: tErr } = await admin
    .from("school_wallet_transactions")
    .select("*")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (isTableMissing(tErr)) return NextResponse.json({ tableNotReady: true });

  return NextResponse.json({ wallet, transactions: transactions ?? [] });
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { schoolId, amount, type, category, description, referenceType, referenceId, action } = body;

  // Special action: sync student payments to school wallet
  if (action === "sync_payments") {
    if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 });
    try {
      const wallet = await ensureSchoolWallet(schoolId);

      // Find payment_receipts not yet synced
      const { data: receipts, error: rErr } = await admin
        .from("payment_receipts")
        .select("id, amount, created_at")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: true });

      if (isTableMissing(rErr)) return NextResponse.json({ tableNotReady: true });

      // Find already-synced receipt ids
      const { data: synced } = await admin
        .from("school_wallet_transactions")
        .select("reference_id")
        .eq("school_id", schoolId)
        .eq("reference_type", "payment_receipt");

      const syncedIds = new Set((synced ?? []).map((r: { reference_id: string }) => r.reference_id));
      const toSync = (receipts ?? []).filter((r: { id: string }) => !syncedIds.has(r.id));

      let count = 0;
      for (const r of toSync) {
        await mutateSchoolWallet({
          schoolId,
          amount: Number(r.amount),
          type: "credit",
          category: "student_payment",
          description: `Student fee payment sync`,
          referenceType: "payment_receipt",
          referenceId: r.id,
          userId: user.id,
        });
        count++;
      }
      return NextResponse.json({ ok: true, synced: count });
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
    }
  }

  if (!schoolId || !amount || !type || !category) {
    return NextResponse.json({ error: "schoolId, amount, type, category required" }, { status: 400 });
  }

  try {
    const result = await mutateSchoolWallet({
      schoolId,
      amount: Number(amount),
      type,
      category,
      description,
      referenceType,
      referenceId,
      userId: user.id,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (isTableMissing(e)) return NextResponse.json({ tableNotReady: true });
    return NextResponse.json({ error: e.message ?? "Unknown" }, { status: 500 });
  }
}
