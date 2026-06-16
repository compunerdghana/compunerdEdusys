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

export async function GET(request: NextRequest) {
  try {
    const admin = getAdmin();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (type === "events") {
      const { data, error } = await admin
        .from("platform_security_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (isMissing(error)) {
        return NextResponse.json({ events: [] });
      }
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ events: data ?? [] });
    }

    // Security summary
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
    const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      failedTodayRes,
      failedWeekRes,
      lockedAccountsRes,
      suspendedAccountsRes,
      unresolvedEventsRes,
      criticalEventsRes,
    ] = await Promise.all([
      admin
        .from("platform_login_history")
        .select("id", { count: "exact", head: true })
        .eq("status", "failed")
        .gte("created_at", todayStart),
      admin
        .from("platform_login_history")
        .select("id", { count: "exact", head: true })
        .eq("status", "failed")
        .gte("created_at", weekStart),
      admin
        .from("platform_users")
        .select("id", { count: "exact", head: true })
        .eq("status", "locked"),
      admin
        .from("platform_users")
        .select("id", { count: "exact", head: true })
        .eq("status", "suspended"),
      admin
        .from("platform_security_events")
        .select("id", { count: "exact", head: true })
        .eq("resolved", false),
      admin
        .from("platform_security_events")
        .select("id", { count: "exact", head: true })
        .eq("severity", "critical")
        .eq("resolved", false),
    ]);

    const summary = {
      failedLoginsToday: isMissing(failedTodayRes.error) ? 0 : (failedTodayRes.count ?? 0),
      failedLoginsThisWeek: isMissing(failedWeekRes.error) ? 0 : (failedWeekRes.count ?? 0),
      lockedAccounts: isMissing(lockedAccountsRes.error) ? 0 : (lockedAccountsRes.count ?? 0),
      suspendedAccounts: isMissing(suspendedAccountsRes.error) ? 0 : (suspendedAccountsRes.count ?? 0),
      unresolvedSecurityEvents: isMissing(unresolvedEventsRes.error) ? 0 : (unresolvedEventsRes.count ?? 0),
      criticalEvents: isMissing(criticalEventsRes.error) ? 0 : (criticalEventsRes.count ?? 0),
    };

    return NextResponse.json({ summary });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
