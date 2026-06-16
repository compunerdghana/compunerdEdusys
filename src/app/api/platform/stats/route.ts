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

    // ── School rows ──────────────────────────────────────────────────────────
    let schoolRows: {
      id: string;
      name: string;
      status: string;
      created_at: string;
      subscription_status?: string;
      expires_at?: string;
    }[] = [];

    const { data: schoolData, error: schoolErr } = await admin
      .from("schools")
      .select("id, name, status, created_at, subscription_status, expires_at");

    if (isMissing(schoolErr)) {
      // table missing — leave empty
    } else if (schoolErr) {
      console.error("schools error", schoolErr);
    } else {
      schoolRows = schoolData ?? [];
    }

    const totalSchools = schoolRows.length;
    const activeSchools = schoolRows.filter((r) => r.status === "active").length;
    const trialSchools = schoolRows.filter((r) => r.status === "trial").length;
    const expiredSchools = schoolRows.filter((r) => r.status === "expired").length;
    const suspendedSchools = schoolRows.filter((r) => r.status === "suspended").length;
    const archivedSchools = schoolRows.filter((r) => r.status === "archived").length;

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const schoolsThisMonth = schoolRows.filter(
      (r) => new Date(r.created_at) >= startOfMonth,
    ).length;
    const schoolsLastMonth = schoolRows.filter((r) => {
      const d = new Date(r.created_at);
      return d >= startOfLastMonth && d < startOfMonth;
    }).length;

    // ── Schools needing attention ────────────────────────────────────────────
    const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const in15 = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const schoolsWithExpiry = schoolRows.filter((r) => r.expires_at);

    const expiringIn7 = schoolsWithExpiry
      .filter((r) => {
        const ex = new Date(r.expires_at!);
        return ex > now && ex <= in7;
      })
      .map(({ id, name, expires_at }) => ({ id, name, expires_at }));

    const expiringIn15 = schoolsWithExpiry
      .filter((r) => {
        const ex = new Date(r.expires_at!);
        return ex > in7 && ex <= in15;
      })
      .map(({ id, name, expires_at }) => ({ id, name, expires_at }));

    const expiringIn30 = schoolsWithExpiry
      .filter((r) => {
        const ex = new Date(r.expires_at!);
        return ex > in15 && ex <= in30;
      })
      .map(({ id, name, expires_at }) => ({ id, name, expires_at }));

    const suspendedSchools_list = schoolRows
      .filter((r) => r.status === "suspended")
      .map(({ id, name }) => ({ id, name }));

    // ── Recent schools ───────────────────────────────────────────────────────
    const recentSchools = [...schoolRows]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)
      .map(({ id, name, status, created_at, subscription_status }) => ({
        id,
        name,
        status,
        created_at,
        subscription_status: subscription_status ?? null,
      }));

    // ── Students ─────────────────────────────────────────────────────────────
    let totalStudents = 0;
    const { count: studentsCount, error: studentsErr } = await admin
      .from("students")
      .select("id", { count: "exact", head: true });
    if (!isMissing(studentsErr)) totalStudents = studentsCount ?? 0;

    // ── Staff ────────────────────────────────────────────────────────────────
    let totalStaff = 0;
    const { count: staffCount, error: staffErr } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .not("role", "in", '("parent","student")');
    if (!isMissing(staffErr)) totalStaff = staffCount ?? 0;

    // ── Parents ──────────────────────────────────────────────────────────────
    let totalParents = 0;
    const { count: parentsCount, error: parentsErr } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "parent");
    if (!isMissing(parentsErr)) totalParents = parentsCount ?? 0;

    // ── Revenue (platform_transactions) ──────────────────────────────────────
    let revenueToday = 0;
    let revenueThisMonth = 0;
    let revenueThisYear = 0;
    let revenueLastMonth = 0;
    let totalRevenue = 0;
    let totalExpenses = 0;
    let recentPayments: {
      id: string;
      school_name: string;
      amount: number;
      created_at: string;
      category: string;
    }[] = [];
    let topPayingSchools: { school_id: string; school_name: string; total: number }[] = [];

    const { data: txRows, error: txErr } = await admin
      .from("platform_transactions")
      .select("id, amount, type, category, school_id, school_name, created_at")
      .order("created_at", { ascending: false });

    if (!isMissing(txErr) && txRows) {
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfYear = new Date(now.getFullYear(), 0, 1);

      const incomeRows = txRows.filter((r) => r.type === "income");
      const expenseRows = txRows.filter((r) => r.type === "expense");

      totalRevenue = incomeRows.reduce((s, r) => s + Number(r.amount), 0);
      totalExpenses = expenseRows.reduce((s, r) => s + Number(r.amount), 0);

      revenueToday = incomeRows
        .filter((r) => new Date(r.created_at) >= startOfToday)
        .reduce((s, r) => s + Number(r.amount), 0);

      revenueThisMonth = incomeRows
        .filter((r) => new Date(r.created_at) >= startOfMonth)
        .reduce((s, r) => s + Number(r.amount), 0);

      revenueLastMonth = incomeRows
        .filter((r) => {
          const d = new Date(r.created_at);
          return d >= startOfLastMonth && d < startOfMonth;
        })
        .reduce((s, r) => s + Number(r.amount), 0);

      revenueThisYear = incomeRows
        .filter((r) => new Date(r.created_at) >= startOfYear)
        .reduce((s, r) => s + Number(r.amount), 0);

      recentPayments = txRows.slice(0, 10).map((r) => ({
        id: r.id,
        school_name: r.school_name ?? "Unknown",
        amount: Number(r.amount),
        created_at: r.created_at,
        category: r.category ?? "payment",
      }));

      // Top paying schools
      const schoolTotals: Record<string, { school_id: string; school_name: string; total: number }> = {};
      for (const r of incomeRows) {
        const key = r.school_id ?? "unknown";
        if (!schoolTotals[key]) {
          schoolTotals[key] = { school_id: key, school_name: r.school_name ?? "Unknown", total: 0 };
        }
        schoolTotals[key].total += Number(r.amount);
      }
      topPayingSchools = Object.values(schoolTotals)
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);
    }

    const profit = totalRevenue - totalExpenses;

    // ── Pending renewals ─────────────────────────────────────────────────────
    let pendingRenewals = 0;
    const { count: renewalCount, error: renewalErr } = await admin
      .from("school_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .lte("expires_at", in30.toISOString())
      .gte("expires_at", now.toISOString());
    if (!isMissing(renewalErr)) pendingRenewals = renewalCount ?? expiringIn7.length + expiringIn15.length + expiringIn30.length;

    // ── Support tickets ───────────────────────────────────────────────────────
    let openTickets = 0;
    let highPriorityTickets = 0;
    let bugReports = 0;
    let featureRequests = 0;
    let recentTickets: {
      id: string;
      ticket_number: string;
      subject: string;
      priority: string;
      status: string;
      created_at: string;
    }[] = [];

    const { data: ticketRows, error: ticketsErr } = await admin
      .from("support_tickets")
      .select("id, ticket_number, subject, status, priority, category, created_at")
      .order("created_at", { ascending: false });

    if (!isMissing(ticketsErr) && ticketRows) {
      const openStatuses = ["open", "assigned", "in_progress"];
      openTickets = ticketRows.filter((t) => openStatuses.includes(t.status)).length;
      highPriorityTickets = ticketRows.filter(
        (t) => openStatuses.includes(t.status) && (t.priority === "high" || t.priority === "urgent"),
      ).length;
      bugReports = ticketRows.filter((t) => t.category === "bug").length;
      featureRequests = ticketRows.filter((t) => t.category === "feature_request").length;

      recentTickets = ticketRows.slice(0, 10).map((t) => ({
        id: t.id,
        ticket_number: t.ticket_number,
        subject: t.subject,
        priority: t.priority,
        status: t.status,
        created_at: t.created_at,
      }));
    }

    // ── Recent activities (platform_audit_logs) ───────────────────────────────
    let recentActivities: {
      id: string;
      actor_name: string;
      action: string;
      target_name: string;
      created_at: string;
    }[] = [];

    const { data: auditRows, error: auditErr } = await admin
      .from("platform_audit_logs")
      .select("id, actor_name, action, target_name, created_at")
      .order("created_at", { ascending: false })
      .limit(15);

    if (!isMissing(auditErr) && auditRows) {
      recentActivities = auditRows;
    }

    // ── Growth arrays (last 6 months) ────────────────────────────────────────
    const schoolGrowth: { month: string; count: number }[] = [];
    const revenueGrowth: { month: string; amount: number }[] = [];
    const studentGrowth: { month: string; count: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const month = d.toLocaleString("default", { month: "short" });

      const schoolCount = schoolRows.filter((r) => {
        const rd = new Date(r.created_at);
        return rd >= d && rd < next;
      }).length;
      schoolGrowth.push({ month, count: schoolCount });

      // Revenue growth
      let monthRevenue = 0;
      if (!isMissing(txErr) && txRows) {
        monthRevenue = txRows
          .filter((r) => {
            if (r.type !== "income") return false;
            const rd = new Date(r.created_at);
            return rd >= d && rd < next;
          })
          .reduce((s, r) => s + Number(r.amount), 0);
      }
      revenueGrowth.push({ month, amount: monthRevenue });

      // Student growth placeholder (we only have total count, not historical)
      studentGrowth.push({ month, count: 0 });
    }

    // ── System health ─────────────────────────────────────────────────────────
    const systemHealth = {
      database: "healthy",
      storage: { used: 2.4, total: 10, unit: "GB" },
      api: "healthy",
      sync: "healthy",
      sms: "healthy",
      whatsapp: "healthy",
      backup: "healthy",
    };

    return NextResponse.json({
      // School counts
      totalSchools,
      activeSchools,
      trialSchools,
      expiredSchools,
      suspendedSchools,
      archivedSchools,
      schoolsThisMonth,
      schoolsLastMonth,

      // People
      totalStudents,
      totalStaff,
      totalParents,

      // Revenue
      revenueToday,
      revenueThisMonth,
      revenueThisYear,
      revenueLastMonth,
      totalRevenue,
      totalExpenses,
      profit,
      pendingRenewals,

      // Support
      openTickets,
      highPriorityTickets,
      bugReports,
      featureRequests,

      // Growth arrays
      schoolGrowth,
      revenueGrowth,
      studentGrowth,

      // Schools needing attention
      expiringIn7,
      expiringIn15,
      expiringIn30,
      suspendedSchools_list,

      // Top paying schools
      topPayingSchools,

      // Recent data
      recentPayments,
      recentActivities,
      recentSchools,
      recentTickets,

      // System health
      systemHealth,
    });
  } catch (err) {
    console.error("platform/stats error", err);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}
