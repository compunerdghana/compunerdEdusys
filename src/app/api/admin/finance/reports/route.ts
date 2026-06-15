/**
 * GET /api/admin/finance/reports?schoolId=X&type=X&from=X&to=X
 * Types: income_statement | expense_report | cashflow | budget_summary
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

  const sp = req.nextUrl.searchParams;
  const schoolId = sp.get("schoolId");
  const type = sp.get("type");
  const from = sp.get("from");
  const to = sp.get("to");

  if (!schoolId || !type) return NextResponse.json({ error: "schoolId and type required" }, { status: 400 });

  try {
    if (type === "income_statement") {
      const [incomeRes, feeRes] = await Promise.all([
        admin.from("income_records").select("type,amount,income_date")
          .eq("school_id", schoolId)
          .gte("income_date", from ?? "2000-01-01")
          .lte("income_date", to ?? "2099-12-31"),
        admin.from("payment_receipts").select("amount,payment_date")
          .eq("school_id", schoolId)
          .gte("payment_date", from ?? "2000-01-01")
          .lte("payment_date", to ?? "2099-12-31"),
      ]);

      if (isTableMissing(incomeRes.error)) return NextResponse.json({ tableNotReady: true });

      const incomeByType: Record<string, number> = {};
      for (const r of incomeRes.data ?? []) {
        incomeByType[r.type] = (incomeByType[r.type] ?? 0) + Number(r.amount);
      }
      const feeTotal = (feeRes.data ?? []).reduce((s: number, r: { amount: number }) => s + Number(r.amount), 0);
      const incomeTotal = Object.values(incomeByType).reduce((a, b) => a + b, 0);

      return NextResponse.json({ type, incomeByType, feeTotal, incomeTotal, total: incomeTotal + feeTotal });
    }

    if (type === "expense_report") {
      const { data: expenses, error } = await admin
        .from("expenses")
        .select("amount,expense_date,status,category:expense_categories(name)")
        .eq("school_id", schoolId)
        .eq("status", "approved")
        .gte("expense_date", from ?? "2000-01-01")
        .lte("expense_date", to ?? "2099-12-31");

      if (isTableMissing(error)) return NextResponse.json({ tableNotReady: true });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      const byCategory: Record<string, number> = {};
      for (const e of expenses ?? []) {
        const cat = (e.category as { name?: string } | null)?.name ?? "Uncategorized";
        byCategory[cat] = (byCategory[cat] ?? 0) + Number(e.amount);
      }
      const total = (expenses ?? []).reduce((s: number, e: { amount: number }) => s + Number(e.amount), 0);

      return NextResponse.json({ type, byCategory, total, expenses });
    }

    if (type === "cashflow") {
      const { data: transactions, error } = await admin
        .from("school_wallet_transactions")
        .select("type,amount,category,created_at")
        .eq("school_id", schoolId)
        .gte("created_at", from ? `${from}T00:00:00Z` : "2000-01-01T00:00:00Z")
        .lte("created_at", to ? `${to}T23:59:59Z` : "2099-12-31T23:59:59Z")
        .order("created_at", { ascending: true });

      if (isTableMissing(error)) return NextResponse.json({ tableNotReady: true });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      const totalIn = (transactions ?? [])
        .filter((t: { type: string }) => t.type === "credit")
        .reduce((s: number, t: { amount: number }) => s + Number(t.amount), 0);
      const totalOut = (transactions ?? [])
        .filter((t: { type: string }) => t.type === "debit")
        .reduce((s: number, t: { amount: number }) => s + Number(t.amount), 0);

      return NextResponse.json({ type, totalIn, totalOut, net: totalIn - totalOut, transactions });
    }

    if (type === "budget_summary") {
      const { data: budgets, error } = await admin
        .from("budgets")
        .select("*,category:expense_categories(name)")
        .eq("school_id", schoolId);

      if (isTableMissing(error)) return NextResponse.json({ tableNotReady: true });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      const enriched = await Promise.all(
        (budgets ?? []).map(async (b: Record<string, unknown>) => {
          const { data: expenses } = await admin
            .from("expenses")
            .select("amount")
            .eq("school_id", schoolId)
            .eq("category_id", b.category_id as string)
            .eq("status", "approved")
            .gte("expense_date", b.period_start as string)
            .lte("expense_date", b.period_end as string);

          const used = (expenses ?? []).reduce((s: number, e: { amount: number }) => s + Number(e.amount), 0);
          return { ...b, used, remaining: Number(b.allocated_amount) - used };
        })
      );

      return NextResponse.json({ type, budgets: enriched });
    }

    return NextResponse.json({ error: "Unknown report type" }, { status: 400 });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (isTableMissing(e)) return NextResponse.json({ tableNotReady: true });
    return NextResponse.json({ error: e.message ?? "Unknown" }, { status: 500 });
  }
}
