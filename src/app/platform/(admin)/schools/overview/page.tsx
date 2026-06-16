import { createClient as createAdmin } from "@supabase/supabase-js";
import { SchoolsOverviewClient } from "./SchoolsOverviewClient";

export default async function SchoolsOverviewPage() {
  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const [
    { count: total },
    { count: active },
    { count: trial },
    { count: expired },
    { count: suspended },
    { count: archived },
    { count: students },
    { count: staff },
    { data: subscriptions },
  ] = await Promise.all([
    admin.from("schools").select("id", { count: "exact", head: true }),
    admin.from("schools").select("id", { count: "exact", head: true }).eq("status", "active"),
    admin.from("schools").select("id", { count: "exact", head: true }).eq("status", "trial"),
    admin.from("schools").select("id", { count: "exact", head: true }).eq("status", "expired"),
    admin.from("schools").select("id", { count: "exact", head: true }).eq("status", "suspended"),
    admin.from("schools").select("id", { count: "exact", head: true }).eq("status", "archived"),
    admin.from("students").select("id", { count: "exact", head: true }),
    admin.from("staff").select("id", { count: "exact", head: true }),
    admin.from("school_subscriptions").select("amount, expires_at, status").eq("status", "active"),
  ]);

  const now = new Date();
  const thirtyDaysAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const outstandingRenewals = (subscriptions ?? []).filter((s) => {
    if (!s.expires_at) return false;
    const exp = new Date(s.expires_at);
    return exp <= thirtyDaysAhead;
  }).length;

  const monthlyRevenue = (subscriptions ?? []).reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

  // Active today / this week — use audit_logs as proxy
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [{ count: activeToday }, { count: activeThisWeek }] = await Promise.all([
    admin.from("audit_logs").select("school_id", { count: "exact", head: true }).gte("created_at", todayStart.toISOString()),
    admin.from("audit_logs").select("school_id", { count: "exact", head: true }).gte("created_at", weekStart.toISOString()),
  ]);

  const stats = {
    total: total ?? 0,
    active: active ?? 0,
    trial: trial ?? 0,
    expired: expired ?? 0,
    suspended: suspended ?? 0,
    archived: archived ?? 0,
    students: students ?? 0,
    staff: staff ?? 0,
    parents: 0,
    monthlyRevenue,
    annualRevenue: monthlyRevenue * 12,
    outstandingRenewals,
    activeToday: activeToday ?? 0,
    activeThisWeek: activeThisWeek ?? 0,
    inactiveSchools: (expired ?? 0) + (suspended ?? 0) + (archived ?? 0),
  };

  return <SchoolsOverviewClient stats={stats} />;
}
