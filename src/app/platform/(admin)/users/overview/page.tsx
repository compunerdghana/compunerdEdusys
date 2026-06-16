import { createClient as createAdmin } from "@supabase/supabase-js";
import { UsersOverviewClient } from "./UsersOverviewClient";

export default async function UsersOverviewPage() {
  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const [
    { count: total },
    { count: active },
    { count: inactive },
    { count: locked },
    { data: recentUsers },
  ] = await Promise.all([
    admin.from("platform_users").select("id", { count: "exact", head: true }),
    admin.from("platform_users").select("id", { count: "exact", head: true }).eq("status", "active"),
    admin.from("platform_users").select("id", { count: "exact", head: true }).eq("status", "inactive"),
    admin.from("platform_users").select("id", { count: "exact", head: true }).eq("status", "locked"),
    admin.from("platform_users").select("id, full_name, email, role, status, last_sign_in_at").order("created_at", { ascending: false }).limit(10),
  ]);

  const stats = {
    total: total ?? 0,
    active: active ?? 0,
    inactive: inactive ?? 0,
    locked: locked ?? 0,
    activeSessions: 0,
    failedLoginsToday: 0,
    rolesCreated: 0,
    permissions: 0,
  };

  return <UsersOverviewClient stats={stats} recentUsers={recentUsers ?? []} />;
}
