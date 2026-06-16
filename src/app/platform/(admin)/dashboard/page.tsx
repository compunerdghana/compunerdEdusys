import { createClient } from "@supabase/supabase-js";
import { DashboardClient, type DashboardStats } from "./DashboardClient";

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

async function getPlatformStats(): Promise<DashboardStats> {
  const admin = getAdmin();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const in15 = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // ── Schools ───────────────────────────────────────────────────────────────
  type SchoolRow = {
    id: string;
    name: string;
    status: string;
    created_at: string;
    subscription_status?: string;
    expires_at?: string;
  };

  let schoolRows: SchoolRow[] = [];
  const { data: schoolData, error: schoolErr } = await admin
    .from("schools")
    .select("id, name, status, created_at, subscription_status, expires_at");

  if (!isMissing(schoolErr) && schoolData) {
    schoolRows = schoolData as SchoolRow[];
  }

  const totalSchools = schoolRows.length;
  const activeSchools = schoolRows.filter((r) => r.status === "active").length;
  const trialSchools = schoolRows.filter((r) => r.status === "trial").length;
  const expiredSchools = schoolRows.filter((r) => r.status === "expired").length;
  const suspendedSchools = schoolRows.filter((r) => r.status === "suspended").length;
  const archivedSchools = schoolRows.filter((r) => r.status === "archived").length;

  const schoolsThisMonth = schoolRows.filter(
    (r) => new Date(r.created_at) >= startOfMonth,
  ).length;
  const schoolsLastMonth = schoolRows.filter((r) => {
    const d = new Date(r.created_at);
    return d >= startOfLastMonth && d < startOfMonth;
  }).length;

  const schoolsWithExpiry = schoolRows.filter((r) => r.expires_at);

  const expiringIn7 = schoolsWithExpiry
    .filter((r) => { const ex = new Date(r.expires_at!); return ex > now && ex <= in7; })
    .map(({ id, name, expires_at }) => ({ id, name, expires_at }));

  const expiringIn15 = schoolsWithExpiry
    .filter((r) => { const ex = new Date(r.expires_at!); return ex > in7 && ex <= in15; })
    .map(({ id, name, expires_at }) => ({ id, name, expires_at }));

  const expiringIn30 = schoolsWithExpiry
    .filter((r) => { const ex = new Date(r.expires_at!); return ex > in15 && ex <= in30; })
    .map(({ id, name, expires_at }) => ({ id, name, expires_at }));

  const suspendedSchools_list = schoolRows
    .filter((r) => r.status === "suspended")
    .map(({ id, name }) => ({ id, name }));

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

  // ── People ────────────────────────────────────────────────────────────────
  let totalStudents = 0;
  const { count: studentsCount, error: studentsErr } = await admin
    .from("students")
    .select("id", { count: "exact", head: true });
  if (!isMissing(studentsErr)) totalStudents = studentsCount ?? 0;

  let totalStaff = 0;
  const { count: staffCount, error: staffErr } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .not("role", "in", '("parent","student")');
  if (!isMissing(staffErr)) totalStaff = staffCount ?? 0;

  let totalParents = 0;
  const { count: parentsCount, error: parentsErr } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "parent");
  if (!isMissing(parentsErr)) totalParents = parentsCount ?? 0;

  // ── Transactions ──────────────────────────────────────────────────────────
  type TxRow = {
    id: string;
    amount: string | number;
    type: string;
    category?: string;
    school_id?: string;
    school_name?: string;
    created_at: string;
  };

  let txRows: TxRow[] = [];
  const { data: txData, error: txErr } = await admin
    .from("platform_transactions")
    .select("id, amount, type, category, school_id, school_name, created_at")
    .order("created_at", { ascending: false });

  if (!isMissing(txErr) && txData) {
    txRows = txData as TxRow[];
  }

  const incomeRows = txRows.filter((r) => r.type === "income");
  const expenseRows = txRows.filter((r) => r.type === "expense");

  const totalRevenue = incomeRows.reduce((s, r) => s + Number(r.amount), 0);
  const totalExpenses = expenseRows.reduce((s, r) => s + Number(r.amount), 0);
  const profit = totalRevenue - totalExpenses;

  const revenueToday = incomeRows
    .filter((r) => new Date(r.created_at) >= startOfToday)
    .reduce((s, r) => s + Number(r.amount), 0);

  const revenueThisMonth = incomeRows
    .filter((r) => new Date(r.created_at) >= startOfMonth)
    .reduce((s, r) => s + Number(r.amount), 0);

  const revenueLastMonth = incomeRows
    .filter((r) => { const d = new Date(r.created_at); return d >= startOfLastMonth && d < startOfMonth; })
    .reduce((s, r) => s + Number(r.amount), 0);

  const revenueThisYear = incomeRows
    .filter((r) => new Date(r.created_at) >= startOfYear)
    .reduce((s, r) => s + Number(r.amount), 0);

  const recentPayments = txRows.slice(0, 10).map((r) => ({
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
  const topPayingSchools = Object.values(schoolTotals)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // ── Pending renewals ──────────────────────────────────────────────────────
  let pendingRenewals = expiringIn7.length + expiringIn15.length + expiringIn30.length;
  const { count: renewalCount, error: renewalErr } = await admin
    .from("school_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
    .lte("expires_at", in30.toISOString())
    .gte("expires_at", now.toISOString());
  if (!isMissing(renewalErr) && renewalCount !== null) {
    pendingRenewals = renewalCount;
  }

  // ── Tickets ───────────────────────────────────────────────────────────────
  type TicketRow = {
    id: string;
    ticket_number: string;
    subject: string;
    status: string;
    priority: string;
    category?: string;
    created_at: string;
  };

  let ticketRows: TicketRow[] = [];
  const { data: ticketData, error: ticketsErr } = await admin
    .from("support_tickets")
    .select("id, ticket_number, subject, status, priority, category, created_at")
    .order("created_at", { ascending: false });

  if (!isMissing(ticketsErr) && ticketData) {
    ticketRows = ticketData as TicketRow[];
  }

  const openStatuses = ["open", "assigned", "in_progress"];
  const openTickets = ticketRows.filter((t) => openStatuses.includes(t.status)).length;
  const highPriorityTickets = ticketRows.filter(
    (t) => openStatuses.includes(t.status) && (t.priority === "high" || t.priority === "urgent"),
  ).length;
  const bugReports = ticketRows.filter((t) => t.category === "bug").length;
  const featureRequests = ticketRows.filter((t) => t.category === "feature_request").length;

  const recentTickets = ticketRows.slice(0, 10).map((t) => ({
    id: t.id,
    ticket_number: t.ticket_number,
    subject: t.subject,
    priority: t.priority,
    status: t.status,
    created_at: t.created_at,
  }));

  // ── Audit logs ────────────────────────────────────────────────────────────
  let recentActivities: DashboardStats["recentActivities"] = [];
  const { data: auditData, error: auditErr } = await admin
    .from("platform_audit_logs")
    .select("id, actor_name, action, target_name, created_at")
    .order("created_at", { ascending: false })
    .limit(15);
  if (!isMissing(auditErr) && auditData) {
    recentActivities = auditData as DashboardStats["recentActivities"];
  }

  // ── Growth arrays ─────────────────────────────────────────────────────────
  const schoolGrowth: DashboardStats["schoolGrowth"] = [];
  const revenueGrowth: DashboardStats["revenueGrowth"] = [];
  const studentGrowth: DashboardStats["studentGrowth"] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const month = d.toLocaleString("default", { month: "short" });

    const schoolCount = schoolRows.filter((r) => {
      const rd = new Date(r.created_at);
      return rd >= d && rd < next;
    }).length;
    schoolGrowth.push({ month, count: schoolCount });

    const monthRevenue = incomeRows
      .filter((r) => { const rd = new Date(r.created_at); return rd >= d && rd < next; })
      .reduce((s, r) => s + Number(r.amount), 0);
    revenueGrowth.push({ month, amount: monthRevenue });

    studentGrowth.push({ month, count: 0 });
  }

  // ── System health ─────────────────────────────────────────────────────────
  const systemHealth: DashboardStats["systemHealth"] = {
    database: "healthy",
    storage: { used: 2.4, total: 10, unit: "GB" },
    api: "healthy",
    sync: "healthy",
    sms: "healthy",
    whatsapp: "healthy",
    backup: "healthy",
  };

  return {
    totalSchools,
    activeSchools,
    trialSchools,
    expiredSchools,
    suspendedSchools,
    archivedSchools,
    schoolsThisMonth,
    schoolsLastMonth,
    totalStudents,
    totalStaff,
    totalParents,
    revenueToday,
    revenueThisMonth,
    revenueThisYear,
    revenueLastMonth,
    totalRevenue,
    totalExpenses,
    profit,
    pendingRenewals,
    openTickets,
    highPriorityTickets,
    bugReports,
    featureRequests,
    schoolGrowth,
    revenueGrowth,
    studentGrowth,
    expiringIn7,
    expiringIn15,
    expiringIn30,
    suspendedSchools_list,
    topPayingSchools,
    recentPayments,
    recentActivities,
    recentSchools,
    recentTickets,
    systemHealth,
  };
}

export default async function PlatformDashboardPage() {
  let stats: DashboardStats;
  try {
    stats = await getPlatformStats();
  } catch (err) {
    console.error("PlatformDashboardPage stats error", err);
    // Return a safe empty state so the page always renders
    stats = {
      totalSchools: 0,
      activeSchools: 0,
      trialSchools: 0,
      expiredSchools: 0,
      suspendedSchools: 0,
      archivedSchools: 0,
      schoolsThisMonth: 0,
      schoolsLastMonth: 0,
      totalStudents: 0,
      totalStaff: 0,
      totalParents: 0,
      revenueToday: 0,
      revenueThisMonth: 0,
      revenueThisYear: 0,
      revenueLastMonth: 0,
      totalRevenue: 0,
      totalExpenses: 0,
      profit: 0,
      pendingRenewals: 0,
      openTickets: 0,
      highPriorityTickets: 0,
      bugReports: 0,
      featureRequests: 0,
      schoolGrowth: [],
      revenueGrowth: [],
      studentGrowth: [],
      expiringIn7: [],
      expiringIn15: [],
      expiringIn30: [],
      suspendedSchools_list: [],
      topPayingSchools: [],
      recentPayments: [],
      recentActivities: [],
      recentSchools: [],
      recentTickets: [],
      systemHealth: {
        database: "healthy",
        storage: { used: 0, total: 10, unit: "GB" },
        api: "healthy",
        sync: "healthy",
        sms: "healthy",
        whatsapp: "healthy",
        backup: "healthy",
      },
    };
  }

  return <DashboardClient stats={stats} />;
}
