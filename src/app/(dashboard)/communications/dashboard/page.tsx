import { createClient as createAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CommunicationsDashboardClient } from "./CommunicationsDashboardClient";

function getAdmin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export default async function CommunicationsDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("school_id, role, full_name").eq("id", user.id).single();
  if (!profile?.school_id) redirect("/dashboard");
  const schoolId = profile.school_id as string;

  const admin = getAdmin();

  const today = new Date().toISOString().split("T")[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [logsRes, unreadRes, settingsRes, templatesRes, recentLogsRes, automationRes, recentNotifsRes, weekLogsRes] = await Promise.all([
    // Today summary
    admin.from("communication_logs")
      .select("id, channel, status, recipient_count, sent_at")
      .eq("school_id", schoolId)
      .gte("sent_at", today + "T00:00:00Z"),
    // Unread count
    admin.from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId)
      .eq("is_read", false),
    // Settings
    admin.from("communication_settings")
      .select("whatsapp_enabled, sms_enabled, email_enabled, sms_credits, whatsapp_credits")
      .eq("school_id", schoolId)
      .maybeSingle(),
    // Template count
    admin.from("communication_templates")
      .select("id", { count: "exact", head: true })
      .or(`school_id.eq.${schoolId},is_system.eq.true`)
      .eq("is_active", true),
    // Recent 8 logs for activity feed
    admin.from("communication_logs")
      .select("id, channel, message_preview, status, recipient_count, sent_at, recipient_type")
      .eq("school_id", schoolId)
      .order("sent_at", { ascending: false })
      .limit(8),
    // Active automation rules
    admin.from("automation_rules")
      .select("id, name, trigger_event, channel, is_active")
      .eq("school_id", schoolId)
      .eq("is_active", true)
      .limit(5),
    // Recent 5 unread notifications
    admin.from("notifications")
      .select("id, title, message, type, created_at")
      .eq("school_id", schoolId)
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(5),
    // Past 7 days logs for trend chart
    admin.from("communication_logs")
      .select("sent_at, recipient_count, channel")
      .eq("school_id", schoolId)
      .gte("sent_at", sevenDaysAgo + "T00:00:00Z")
      .order("sent_at"),
  ]);

  const isMissing = (e: { code?: string; message?: string } | null) =>
    e?.code === "42P01" || e?.message?.includes("does not exist");

  const tableNotReady = !!(isMissing(logsRes.error) || isMissing(unreadRes.error));

  const logs = logsRes.data ?? [];
  const todaySent = logs.reduce((s, l) => s + (l.recipient_count ?? 1), 0);
  const delivered = logs.filter((l) => l.status === "delivered" || l.status === "read").length;
  const failed = logs.filter((l) => l.status === "failed").length;
  const deliveryRate = logs.length ? Math.round((delivered / logs.length) * 100) : 0;

  const byChannel = logs.reduce<Record<string, number>>((acc, l) => {
    acc[l.channel] = (acc[l.channel] ?? 0) + (l.recipient_count ?? 1);
    return acc;
  }, {});

  // Build 7-day trend: { date: "Mon", count: N }
  const weekLogs = weekLogsRes.data ?? [];
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const trendMap: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    trendMap[d.toISOString().split("T")[0]] = 0;
  }
  for (const l of weekLogs) {
    const day = l.sent_at?.split("T")[0];
    if (day && day in trendMap) trendMap[day] += l.recipient_count ?? 1;
  }
  const weekTrend = Object.entries(trendMap).map(([date, count]) => ({
    day: DAY_NAMES[new Date(date).getDay()],
    count,
  }));

  return (
    <CommunicationsDashboardClient
      schoolId={schoolId}
      tableNotReady={tableNotReady}
      stats={{
        todaySent,
        deliveryRate,
        failed,
        unreadNotifications: unreadRes.count ?? 0,
        templateCount: templatesRes.count ?? 0,
        smsCredits: settingsRes.data?.sms_credits ?? 0,
        whatsappEnabled: settingsRes.data?.whatsapp_enabled ?? false,
        smsEnabled: settingsRes.data?.sms_enabled ?? false,
      }}
      byChannel={byChannel}
      recentLogs={recentLogsRes.data ?? []}
      activeRules={automationRes.data ?? []}
      recentNotifs={recentNotifsRes.data ?? []}
      weekTrend={weekTrend}
    />
  );
}
