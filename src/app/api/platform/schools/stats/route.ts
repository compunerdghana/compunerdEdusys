import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

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

export async function GET() {
  try {
    const admin = getAdmin();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const ago30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ago7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const ago1 = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // ── School status counts ──────────────────────────────────────────────────
    let totalSchools = 0;
    let activeSchools = 0;
    let trialSchools = 0;
    let expiredSchools = 0;
    let suspendedSchools = 0;
    let archivedSchools = 0;

    const { data: schoolRows, error: schoolErr } = await admin
      .from("schools")
      .select("id, status, last_active_at");

    if (!isMissing(schoolErr) && schoolRows) {
      totalSchools = schoolRows.length;
      activeSchools = schoolRows.filter((r) => r.status === "active").length;
      trialSchools = schoolRows.filter((r) => r.status === "trial").length;
      expiredSchools = schoolRows.filter((r) => r.status === "expired").length;
      suspendedSchools = schoolRows.filter((r) => r.status === "suspended").length;
      archivedSchools = schoolRows.filter((r) => r.status === "archived").length;
    }

    // ── People counts ─────────────────────────────────────────────────────────
    let totalStudents = 0;
    const { count: studentsCount, error: studentsErr } = await admin
      .from("students")
      .select("id", { count: "exact", head: true });
    if (!isMissing(studentsErr)) totalStudents = studentsCount ?? 0;

    let totalStaff = 0;
    const { count: staffCount, error: staffErr } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .not("role", "in", '("student","parent")');
    if (!isMissing(staffErr)) totalStaff = staffCount ?? 0;

    let totalParents = 0;
    const { count: parentsCount, error: parentsErr } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "parent");
    if (!isMissing(parentsErr)) totalParents = parentsCount ?? 0;

    // ── Revenue ───────────────────────────────────────────────────────────────
    let monthlyRevenue = 0;
    let annualRevenue = 0;

    const { data: txRows, error: txErr } = await admin
      .from("platform_transactions")
      .select("amount, type, created_at")
      .eq("type", "income");

    if (!isMissing(txErr) && txRows) {
      monthlyRevenue = txRows
        .filter((r) => new Date(r.created_at) >= startOfMonth)
        .reduce((s, r) => s + Number(r.amount), 0);
      annualRevenue = txRows
        .filter((r) => new Date(r.created_at) >= startOfYear)
        .reduce((s, r) => s + Number(r.amount), 0);
    }

    // ── Outstanding renewals (active subs expiring within 30 days) ─────────
    let outstandingRenewals = 0;
    const { count: renewalCount, error: renewalErr } = await admin
      .from("school_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .lte("expires_at", in30.toISOString())
      .gte("expires_at", now.toISOString());
    if (!isMissing(renewalErr)) outstandingRenewals = renewalCount ?? 0;

    // ── Activity-based counts ─────────────────────────────────────────────────
    let activeToday = 0;
    let activeThisWeek = 0;

    const { data: activityRows, error: activityErr } = await admin
      .from("school_activity_logs")
      .select("school_id, created_at")
      .gte("created_at", ago7.toISOString());

    if (!isMissing(activityErr) && activityRows) {
      const todaySchools = new Set(
        activityRows
          .filter((r) => new Date(r.created_at) >= ago1)
          .map((r) => r.school_id),
      );
      const weekSchools = new Set(activityRows.map((r) => r.school_id));
      activeToday = todaySchools.size;
      activeThisWeek = weekSchools.size;
    }

    // ── Inactive schools (no activity in 30 days) ────────────────────────────
    let inactiveSchools = 0;
    if (!isMissing(schoolErr) && schoolRows) {
      inactiveSchools = schoolRows.filter((r) => {
        if (!r.last_active_at) return true;
        return new Date(r.last_active_at) < ago30;
      }).length;
    }

    return NextResponse.json({
      totalSchools,
      activeSchools,
      trialSchools,
      expiredSchools,
      suspendedSchools,
      archivedSchools,
      totalStudents,
      totalStaff,
      totalParents,
      monthlyRevenue,
      annualRevenue,
      outstandingRenewals,
      activeToday,
      activeThisWeek,
      inactiveSchools,
    });
  } catch (err) {
    console.error("GET platform/schools/stats error", err);
    return NextResponse.json({ error: "Failed to load school stats" }, { status: 500 });
  }
}
