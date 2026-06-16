import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

const isMissing = (e: unknown) =>
  (e as { code?: string; message?: string })?.code === "42P01" ||
  (e as { message?: string })?.message?.includes("does not exist");

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = getAdmin();
    const { id } = await params;
    const now = new Date();

    // Build last-6-month date buckets
    const months: { label: string; start: Date; end: Date }[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const label = start.toLocaleString("default", { month: "short", year: "2-digit" });
      months.push({ label, start, end });
    }

    // ── Usage metrics (school_usage_metrics) ──────────────────────────────────
    const { data: metricsRows, error: metricsErr } = await admin
      .from("school_usage_metrics")
      .select("month, student_count, staff_count")
      .eq("school_id", id)
      .order("month", { ascending: true });

    const studentGrowth: { month: string; count: number }[] = [];
    const staffGrowth: { month: string; count: number }[] = [];

    for (const bucket of months) {
      let studentCount = 0;
      let staffCount = 0;

      if (!isMissing(metricsErr) && metricsRows) {
        const row = metricsRows.find((r) => {
          const d = new Date(r.month);
          return d >= bucket.start && d < bucket.end;
        });
        studentCount = row?.student_count ?? 0;
        staffCount = row?.staff_count ?? 0;
      }

      studentGrowth.push({ month: bucket.label, count: studentCount });
      staffGrowth.push({ month: bucket.label, count: staffCount });
    }

    // ── Revenue history (platform_transactions) ───────────────────────────────
    const { data: txRows, error: txErr } = await admin
      .from("platform_transactions")
      .select("amount, created_at, type")
      .eq("school_id", id)
      .eq("type", "income")
      .gte("created_at", months[0].start.toISOString());

    const revenueHistory: { month: string; amount: number }[] = [];

    for (const bucket of months) {
      let amount = 0;
      if (!isMissing(txErr) && txRows) {
        amount = txRows
          .filter((r) => {
            const d = new Date(r.created_at);
            return d >= bucket.start && d < bucket.end;
          })
          .reduce((s, r) => s + Number(r.amount), 0);
      }
      revenueHistory.push({ month: bucket.label, amount });
    }

    // ── Recent activity logs ──────────────────────────────────────────────────
    let recentActivity: unknown[] = [];
    const { data: activityRows, error: activityErr } = await admin
      .from("school_activity_logs")
      .select("*")
      .eq("school_id", id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!isMissing(activityErr) && activityRows) {
      recentActivity = activityRows;
    }

    return NextResponse.json({
      studentGrowth,
      staffGrowth,
      revenueHistory,
      recentActivity,
    });
  } catch (err) {
    console.error("GET platform/schools/[id]/analytics error", err);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
