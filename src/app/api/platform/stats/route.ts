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

    // --- School counts by status ---
    let totalSchools = 0;
    let activeSchools = 0;
    let trialSchools = 0;
    let expiredSchools = 0;
    let suspendedSchools = 0;
    let schoolsThisMonth = 0;

    const { data: schoolRows, error: schoolErr } = await admin
      .from("schools")
      .select("id, status, created_at");

    if (isMissing(schoolErr)) {
      // table doesn't exist – leave zeros
    } else if (schoolErr) {
      console.error("schools error", schoolErr);
    } else {
      const rows = schoolRows ?? [];
      totalSchools = rows.length;
      activeSchools = rows.filter((r) => r.status === "active").length;
      trialSchools = rows.filter((r) => r.status === "trial").length;
      expiredSchools = rows.filter((r) => r.status === "expired").length;
      suspendedSchools = rows.filter((r) => r.status === "suspended").length;

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      schoolsThisMonth = rows.filter(
        (r) => new Date(r.created_at) >= startOfMonth,
      ).length;
    }

    // --- Monthly growth (last 6 months) ---
    const monthlyGrowth: { month: string; count: number }[] = [];
    if (totalSchools > 0) {
      const { data: allSchools } = await admin
        .from("schools")
        .select("created_at");
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleString("default", {
          month: "short",
          year: "2-digit",
        });
        const count = (allSchools ?? []).filter((r) => {
          const rd = new Date(r.created_at);
          return (
            rd.getFullYear() === d.getFullYear() &&
            rd.getMonth() === d.getMonth()
          );
        }).length;
        monthlyGrowth.push({ month: label, count });
      }
    }

    // --- Students count ---
    let totalStudents = 0;
    const { count: studentsCount, error: studentsErr } = await admin
      .from("students")
      .select("id", { count: "exact", head: true });
    if (!isMissing(studentsErr)) {
      totalStudents = studentsCount ?? 0;
    }

    // --- Staff count ---
    let totalStaff = 0;
    const { count: staffCount, error: staffErr } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .not("role", "in", '("parent","student")');
    if (!isMissing(staffErr)) {
      totalStaff = staffCount ?? 0;
    }

    // --- Revenue ---
    let totalRevenue = 0;
    let monthlyRevenue = 0;
    const { data: txRows, error: txErr } = await admin
      .from("platform_transactions")
      .select("amount, created_at")
      .eq("type", "income");
    if (!isMissing(txErr) && txRows) {
      totalRevenue = txRows.reduce((s, r) => s + Number(r.amount), 0);
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      monthlyRevenue = txRows
        .filter((r) => new Date(r.created_at) >= startOfMonth)
        .reduce((s, r) => s + Number(r.amount), 0);
    }

    // --- Open tickets ---
    let openTickets = 0;
    const { count: ticketsCount, error: ticketsErr } = await admin
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "assigned", "in_progress"]);
    if (!isMissing(ticketsErr)) {
      openTickets = ticketsCount ?? 0;
    }

    // --- Recent schools ---
    let recentSchools: unknown[] = [];
    const { data: recentSchoolRows, error: recentSchoolErr } = await admin
      .from("schools")
      .select("id, name, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5);
    if (!isMissing(recentSchoolErr)) {
      recentSchools = recentSchoolRows ?? [];
    }

    // --- Recent tickets ---
    let recentTickets: unknown[] = [];
    const { data: recentTicketRows, error: recentTicketErr } = await admin
      .from("support_tickets")
      .select("id, ticket_number, subject, status, priority, created_at")
      .order("created_at", { ascending: false })
      .limit(5);
    if (!isMissing(recentTicketErr)) {
      recentTickets = recentTicketRows ?? [];
    }

    return NextResponse.json({
      totalSchools,
      activeSchools,
      trialSchools,
      expiredSchools,
      suspendedSchools,
      totalStudents,
      totalStaff,
      totalRevenue,
      monthlyRevenue,
      openTickets,
      schoolsThisMonth,
      monthlyGrowth,
      recentSchools,
      recentTickets,
    });
  } catch (err) {
    console.error("platform/stats error", err);
    return NextResponse.json(
      { error: "Failed to load stats" },
      { status: 500 },
    );
  }
}
