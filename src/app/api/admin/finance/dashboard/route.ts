/**
 * GET /api/admin/finance/dashboard?schoolId=X
 * Returns all KPIs for the finance dashboard.
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

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const monthEnd = now.toISOString().slice(0, 10);

  try {
    const [
      walletRes,
      monthlyIncomeRes,
      monthlyFeesRes,
      monthlyExpensesRes,
      pendingApprovalsRes,
      studentWalletsRes,
    ] = await Promise.all([
      admin.from("school_wallets").select("current_balance,total_income,total_expenses").eq("school_id", schoolId).maybeSingle(),
      admin.from("income_records").select("amount").eq("school_id", schoolId).gte("income_date", monthStart).lte("income_date", monthEnd),
      admin.from("payment_receipts").select("amount").eq("school_id", schoolId).gte("payment_date", monthStart).lte("payment_date", monthEnd),
      admin.from("expenses").select("amount").eq("school_id", schoolId).eq("status", "approved").gte("expense_date", monthStart).lte("expense_date", monthEnd),
      admin.from("expenses").select("id", { count: "exact", head: true }).eq("school_id", schoolId).eq("status", "pending"),
      admin.from("student_wallets").select("total_billed,total_paid,current_balance").eq("school_id", schoolId),
    ]);

    if (isTableMissing(walletRes.error)) return NextResponse.json({ tableNotReady: true });

    const wallet = walletRes.data;
    const currentBalance = Number(wallet?.current_balance ?? 0);

    const monthlyIncome = (monthlyIncomeRes.data ?? []).reduce((s: number, r: { amount: number }) => s + Number(r.amount), 0);
    const monthlyFees = (monthlyFeesRes.data ?? []).reduce((s: number, r: { amount: number }) => s + Number(r.amount), 0);
    const totalMonthlyIncome = monthlyIncome + monthlyFees;

    const monthlyExpenses = (monthlyExpensesRes.data ?? []).reduce((s: number, e: { amount: number }) => s + Number(e.amount), 0);
    const netPosition = totalMonthlyIncome - monthlyExpenses;

    const pendingApprovals = pendingApprovalsRes.count ?? 0;

    const wallets = studentWalletsRes.data ?? [];
    const totalBilled = wallets.reduce((s: number, w: { total_billed: number }) => s + Number(w.total_billed ?? 0), 0);
    const totalCollected = wallets.reduce((s: number, w: { total_paid: number }) => s + Number(w.total_paid ?? 0), 0);
    const outstanding = Math.max(0, totalBilled - totalCollected);
    const collectionRate = totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0;

    // Financial health score (0–100)
    // collection_rate * 0.4 + cash_ratio * 0.3 + expense_ratio * 0.3
    const cashRatio = totalMonthlyIncome > 0 ? Math.min(1, currentBalance / totalMonthlyIncome) : 0;
    const expenseRatio = totalMonthlyIncome > 0 ? Math.max(0, 1 - monthlyExpenses / totalMonthlyIncome) : 1;
    const healthScore = Math.round(
      (collectionRate / 100) * 40 + cashRatio * 30 + expenseRatio * 30
    );

    return NextResponse.json({
      current_balance: currentBalance,
      monthly_income: totalMonthlyIncome,
      monthly_fees: monthlyFees,
      monthly_other_income: monthlyIncome,
      monthly_expenses: monthlyExpenses,
      net_position: netPosition,
      total_billed: totalBilled,
      total_collected: totalCollected,
      outstanding,
      collection_rate: Math.round(collectionRate * 100) / 100,
      financial_health_score: healthScore,
      pending_approvals: pendingApprovals,
    });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (isTableMissing(e)) return NextResponse.json({ tableNotReady: true });
    return NextResponse.json({ error: e.message ?? "Unknown" }, { status: 500 });
  }
}
