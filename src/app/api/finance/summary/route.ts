/**
 * GET /api/finance/summary?school_id=xxx
 * Returns comprehensive finance dashboard data from the new ERP tables.
 */
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("school_id");
  if (!schoolId) return NextResponse.json({ error: "school_id required" }, { status: 400 });

  const [walletsRes, invoicesRes, waiversRes, discountsRes, activityRes] = await Promise.all([
    admin.from("student_wallets").select("total_billed,total_paid,total_waived,total_discounts,outstanding_balance").eq("school_id", schoolId),
    admin.from("student_invoices").select("total_amount,amount_paid,amount_waived,balance,status").eq("school_id", schoolId),
    admin.from("fee_waivers").select("amount").eq("school_id", schoolId),
    admin.from("fee_discounts").select("amount").eq("school_id", schoolId),
    admin.from("activity_feed").select("*").eq("school_id", schoolId).order("created_at", { ascending: false }).limit(20),
  ]);

  const wallets = walletsRes.data ?? [];
  const invoices = invoicesRes.data ?? [];

  const totalBilled      = wallets.reduce((s, w) => s + Number(w.total_billed ?? 0), 0);
  const totalCollected   = wallets.reduce((s, w) => s + Number(w.total_paid ?? 0), 0);
  const totalOutstanding = wallets.reduce((s, w) => s + Number(w.outstanding_balance ?? 0), 0);
  const totalWaived      = waiversRes.data?.reduce((s, w) => s + Number(w.amount ?? 0), 0) ?? 0;
  const totalDiscounts   = discountsRes.data?.reduce((s, d) => s + Number(d.amount ?? 0), 0) ?? 0;
  const collectionRate   = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;

  const activeWallets = wallets.length;
  const avgPerStudent = activeWallets > 0 ? Math.round(totalCollected / activeWallets) : 0;

  const paidCount    = invoices.filter(i => i.status === "paid").length;
  const partialCount = invoices.filter(i => i.status === "partial").length;
  const unpaidCount  = invoices.filter(i => i.status === "unpaid").length;

  return NextResponse.json({
    totalBilled,
    totalCollected,
    totalOutstanding,
    totalWaived,
    totalDiscounts,
    collectionRate,
    avgPerStudent,
    invoiceCount: { paid: paidCount, partial: partialCount, unpaid: unpaidCount, total: invoices.length },
    recentActivity: activityRes.data ?? [],
  });
}
