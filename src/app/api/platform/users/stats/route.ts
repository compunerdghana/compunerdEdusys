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

    const [
      usersRes,
      activeSessionsRes,
      failedLoginsRes,
      rolesRes,
      recentUsersRes,
    ] = await Promise.all([
      admin.from("platform_users").select("id, status, created_at, email, first_name, last_name, role, avatar_url"),
      admin.from("platform_active_sessions").select("id", { count: "exact", head: true }),
      admin.from("platform_login_history").select("id", { count: "exact", head: true })
        .eq("status", "failed")
        .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
      admin.from("platform_roles").select("id", { count: "exact", head: true }),
      admin.from("platform_users")
        .select("id, email, first_name, last_name, role, avatar_url, status, created_at")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    if (isMissing(usersRes.error)) {
      return NextResponse.json({
        totalUsers: 0,
        activeUsers: 0,
        inactiveUsers: 0,
        lockedUsers: 0,
        activeSessions: 0,
        failedLoginsToday: 0,
        rolesCount: 0,
        recentUsers: [],
      });
    }

    if (usersRes.error) {
      return NextResponse.json({ error: usersRes.error.message }, { status: 500 });
    }

    const users = usersRes.data ?? [];
    const totalUsers = users.length;
    const activeUsers = users.filter((u) => u.status === "active").length;
    const inactiveUsers = users.filter((u) => u.status === "inactive").length;
    const lockedUsers = users.filter((u) => u.status === "locked" || u.status === "suspended").length;

    const activeSessions = isMissing(activeSessionsRes.error) ? 0 : (activeSessionsRes.count ?? 0);
    const failedLoginsToday = isMissing(failedLoginsRes.error) ? 0 : (failedLoginsRes.count ?? 0);
    const rolesCount = isMissing(rolesRes.error) ? 0 : (rolesRes.count ?? 0);
    const recentUsers = isMissing(recentUsersRes.error) ? [] : (recentUsersRes.data ?? []);

    return NextResponse.json({
      totalUsers,
      activeUsers,
      inactiveUsers,
      lockedUsers,
      activeSessions,
      failedLoginsToday,
      rolesCount,
      recentUsers,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
