import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function GET() {
  try {
    const admin = getAdmin();

    // Channel breakdown
    const channels = ["whatsapp", "sms", "email", "notification"];
    const channelStats: Record<string, { sent: number; delivered: number; read: number; failed: number; rate: number }> = {};

    for (const ch of channels) {
      const { data } = await admin.from("platform_messages").select("status").eq("channel", ch);
      const msgs = data ?? [];
      const total = msgs.length;
      const delivered = msgs.filter((m) => m.status === "delivered" || m.status === "read").length;
      const read = msgs.filter((m) => m.status === "read").length;
      const failed = msgs.filter((m) => m.status === "failed").length;
      channelStats[ch] = {
        sent: total,
        delivered,
        read,
        failed,
        rate: total > 0 ? Math.round((delivered / total) * 100) : 0,
      };
    }

    // Campaign performance (top 10)
    const { data: campaigns } = await admin
      .from("platform_campaigns")
      .select("id, name, type, status, total_recipients, sent_count, delivered_count, read_count, failed_count, completed_at")
      .in("status", ["completed", "active"])
      .order("completed_at", { ascending: false })
      .limit(10);

    // Monthly trend (last 6 months)
    const now = new Date();
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const month = d.toLocaleString("en-GH", { month: "short", year: "numeric" });

      const { data: monthMsgs } = await admin
        .from("platform_messages")
        .select("status, channel")
        .gte("created_at", d.toISOString())
        .lt("created_at", next.toISOString());

      const msgs = monthMsgs ?? [];
      const total = msgs.length;
      const delivered = msgs.filter((m) => m.status === "delivered" || m.status === "read").length;

      monthlyTrend.push({
        month,
        total,
        delivered,
        rate: total > 0 ? Math.round((delivered / total) * 100) : 0,
        whatsapp: msgs.filter((m) => m.channel === "whatsapp").length,
        sms: msgs.filter((m) => m.channel === "sms").length,
        email: msgs.filter((m) => m.channel === "email").length,
      });
    }

    return NextResponse.json({
      channelStats,
      campaigns: campaigns ?? [],
      monthlyTrend,
    });
  } catch (err) {
    console.error("reports error", err);
    return NextResponse.json({ channelStats: {}, campaigns: [], monthlyTrend: [] });
  }
}
