import { createClient as createAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CommunicationsDashboardClient } from "./CommunicationsDashboardClient";

export default async function CommunicationsDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("school_id, role, full_name").eq("id", user.id).single();
  if (!profile?.school_id) redirect("/dashboard");
  const schoolId = profile.school_id as string;

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const today = new Date().toISOString().split("T")[0];

  const [logsRes, unreadRes, settingsRes, templatesRes] = await Promise.all([
    admin.from("communication_logs")
      .select("id, channel, status, recipient_count, sent_at")
      .eq("school_id", schoolId)
      .gte("sent_at", today + "T00:00:00Z"),
    admin.from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId)
      .eq("is_read", false),
    admin.from("communication_settings")
      .select("whatsapp_enabled, sms_enabled, email_enabled, sms_credits, whatsapp_credits")
      .eq("school_id", schoolId)
      .maybeSingle(),
    admin.from("communication_templates")
      .select("id", { count: "exact", head: true })
      .or(`school_id.eq.${schoolId},is_system.eq.true`)
      .eq("is_active", true),
  ]);

  const isMissing = (e: { code?: string; message?: string } | null) =>
    e?.code === "42P01" || e?.message?.includes("does not exist");

  const tableNotReady = isMissing(logsRes.error) || isMissing(unreadRes.error);

  const logs = logsRes.data ?? [];
  const todaySent = logs.reduce((s, l) => s + (l.recipient_count ?? 1), 0);
  const delivered = logs.filter((l) => l.status === "delivered" || l.status === "read").length;
  const failed = logs.filter((l) => l.status === "failed").length;
  const deliveryRate = logs.length ? Math.round((delivered / logs.length) * 100) : 0;

  const byChannel = logs.reduce<Record<string, number>>((acc, l) => {
    acc[l.channel] = (acc[l.channel] ?? 0) + (l.recipient_count ?? 1);
    return acc;
  }, {});

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
    />
  );
}
