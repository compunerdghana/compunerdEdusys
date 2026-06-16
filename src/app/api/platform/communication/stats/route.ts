import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

const safe = (e: unknown) =>
  (e as { code?: string })?.code === "42P01" ||
  (e as { message?: string })?.message?.includes("does not exist");

export async function GET() {
  try {
    const admin = getAdmin();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Messages sent today per channel
    const { data: todayMsgs } = await admin
      .from("platform_messages")
      .select("channel, status")
      .gte("created_at", today.toISOString());

    const byChannel = (ch: string) => (todayMsgs ?? []).filter((m) => m.channel === ch);
    const whatsappToday = byChannel("whatsapp").length;
    const smsToday = byChannel("sms").length;
    const emailToday = byChannel("email").length;
    const notificationsToday = byChannel("notification").length;

    // Active campaigns
    const { count: activeCampaigns } = await admin
      .from("communication_campaigns")
      .select("id", { count: "exact", head: true })
      .eq("status", "active");

    // Overall delivery rate (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const { data: recentMsgs } = await admin
      .from("platform_messages")
      .select("status")
      .gte("created_at", thirtyDaysAgo.toISOString());

    const total30 = (recentMsgs ?? []).length;
    const delivered30 = (recentMsgs ?? []).filter(
      (m) => m.status === "delivered" || m.status === "read",
    ).length;
    const deliveryRate = total30 > 0 ? Math.round((delivered30 / total30) * 100) : 0;

    // 7-day trend for charts
    const trend: { date: string; whatsapp: number; sms: number; email: number; notification: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);

      const { data: dayMsgs } = await admin
        .from("platform_messages")
        .select("channel")
        .gte("created_at", d.toISOString())
        .lt("created_at", next.toISOString());

      const day = dayMsgs ?? [];
      trend.push({
        date: d.toLocaleDateString("en-GH", { weekday: "short", day: "numeric", month: "short" }),
        whatsapp: day.filter((m) => m.channel === "whatsapp").length,
        sms: day.filter((m) => m.channel === "sms").length,
        email: day.filter((m) => m.channel === "email").length,
        notification: day.filter((m) => m.channel === "notification").length,
      });
    }

    // Recent logs
    const { data: recentLogs } = await admin
      .from("communication_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    return NextResponse.json({
      whatsappToday,
      smsToday,
      emailToday,
      notificationsToday,
      activeCampaigns: activeCampaigns ?? 0,
      deliveryRate,
      trend,
      recentLogs: recentLogs ?? [],
    });
  } catch (err) {
    console.error("communication/stats error", err);
    return NextResponse.json({
      whatsappToday: 0,
      smsToday: 0,
      emailToday: 0,
      notificationsToday: 0,
      activeCampaigns: 0,
      deliveryRate: 0,
      trend: [],
      recentLogs: [],
    });
  }
}
