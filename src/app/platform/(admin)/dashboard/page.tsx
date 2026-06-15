import { createClient as createAdmin } from "@supabase/supabase-js";
import { DashboardClient } from "./DashboardClient";

async function getPlatformStats() {
  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const [
    { data: schools },
    { data: recentSchools },
    { data: tickets },
    { data: recentTickets },
    { data: students },
    { data: staff },
    { data: subscriptions },
  ] = await Promise.all([
    admin.from("schools").select("id, status"),
    admin.from("schools").select("id, name, status, created_at").order("created_at", { ascending: false }).limit(5),
    admin.from("support_tickets").select("id, status"),
    admin.from("support_tickets").select("id, ticket_number, subject, priority, status, created_at").order("created_at", { ascending: false }).limit(5),
    admin.from("students").select("id", { count: "exact", head: true }),
    admin.from("staff").select("id", { count: "exact", head: true }),
    admin.from("school_subscriptions").select("amount, created_at").eq("status", "active"),
  ]);

  const schoolList = schools ?? [];
  const totalSchools = schoolList.length;
  const activeSchools = schoolList.filter(s => s.status === "active").length;
  const trialSchools = schoolList.filter(s => s.status === "trial").length;
  const suspendedSchools = schoolList.filter(s => s.status === "suspended").length;
  const expiredSchools = schoolList.filter(s => s.status === "expired").length;
  const openTickets = (tickets ?? []).filter(t => t.status === "open").length;

  const monthlyRevenue = (subscriptions ?? []).reduce((sum, s) => sum + (s.amount ?? 0), 0);

  // Build last 6 months growth
  const now = new Date();
  const months: { label: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleString("default", { month: "short" });
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const count = (recentSchools ?? []).filter(s => {
      const c = new Date(s.created_at);
      return c >= d && c < next;
    }).length;
    months.push({ label, count });
  }

  return {
    totalSchools,
    activeSchools,
    trialSchools,
    suspendedSchools,
    expiredSchools,
    totalStudents: (students as unknown as { count: number } | null)?.count ?? 0,
    totalStaff: (staff as unknown as { count: number } | null)?.count ?? 0,
    monthlyRevenue,
    openTickets,
    recentSchools: recentSchools ?? [],
    recentTickets: recentTickets ?? [],
    monthlyGrowth: months,
  };
}

export default async function PlatformDashboardPage() {
  const stats = await getPlatformStats();
  return <DashboardClient stats={stats} />;
}
