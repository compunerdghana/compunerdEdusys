import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppText } from "@/lib/communication/whatsapp";
import { resolveTargetSchools, interpolateTemplate } from "@/lib/communication/targeting";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function GET(req: NextRequest) {
  const admin = getAdmin();
  const url = new URL(req.url);
  const page = Number(url.searchParams.get("page") ?? 1);
  const limit = Number(url.searchParams.get("limit") ?? 20);
  const offset = (page - 1) * limit;

  const { data, error, count } = await admin
    .from("platform_messages")
    .select("*", { count: "exact" })
    .eq("channel", "whatsapp")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ messages: data ?? [], total: count ?? 0, page, limit });
}

export async function POST(req: NextRequest) {
  try {
    const admin = getAdmin();
    const body = await req.json();
    const {
      recipient_type = "school_owner",
      target_audience = "selected",
      selected_school_ids = [],
      school_id,
      school_name,
      recipient_name,
      recipient_phone,
      message,
      template_id,
      campaign_id,
      sent_by,
    } = body;

    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    // Get WhatsApp settings
    const { data: settings } = await admin
      .from("platform_comm_settings")
      .select("*")
      .eq("channel", "whatsapp")
      .single();

    const phone_id = settings?.sender_id ?? process.env.WHATSAPP_PHONE_ID ?? "";
    const token = settings?.api_key ?? process.env.WHATSAPP_TOKEN ?? "";

    // Resolve recipients
    let recipients: { name: string; phone: string; school_id?: string; school_name?: string }[] = [];

    if (recipient_phone) {
      // Direct single recipient
      recipients = [{ name: recipient_name ?? "Recipient", phone: recipient_phone, school_id, school_name }];
    } else {
      // Bulk — resolve from schools
      const schools = await resolveTargetSchools(
        target_audience,
        target_audience === "selected" ? selected_school_ids : undefined,
      );
      for (const s of schools) {
        const phone = recipient_type === "school_owner"
          ? (s.owner_phone ?? s.phone)
          : s.phone;
        if (phone) {
          recipients.push({
            name: s.owner_name ?? s.name,
            phone,
            school_id: s.id,
            school_name: s.name,
          });
        }
      }
    }

    if (recipients.length === 0) {
      return NextResponse.json({ error: "No recipients with phone numbers found" }, { status: 400 });
    }

    const results = [];
    for (const r of recipients) {
      const finalMessage = interpolateTemplate(message, {
        school_name: r.school_name ?? r.name,
        recipient_name: r.name,
      });

      let status: string = "sent";
      let provider_msg_id: string | undefined;
      let error_message: string | undefined;

      if (phone_id && token) {
        const result = await sendWhatsAppText({ phone_id, token, to: r.phone, message: finalMessage });
        status = result.success ? "sent" : "failed";
        provider_msg_id = result.message_id;
        error_message = result.error;
      } else {
        // No credentials configured — log as pending
        status = "pending";
        error_message = "WhatsApp credentials not configured in Settings";
      }

      // Insert message record
      const { data: msgData } = await admin.from("platform_messages").insert({
        campaign_id: campaign_id ?? null,
        template_id: template_id ?? null,
        channel: "whatsapp",
        recipient_type,
        school_id: r.school_id ?? null,
        school_name: r.school_name ?? null,
        recipient_name: r.name,
        recipient_phone: r.phone,
        body: finalMessage,
        status,
        provider: "meta",
        provider_msg_id: provider_msg_id ?? null,
        error_message: error_message ?? null,
        sent_by: sent_by ?? null,
        sent_at: status === "sent" ? new Date().toISOString() : null,
      }).select().single();

      // Insert communication log
      await admin.from("platform_comm_logs").insert({
        message_id: msgData?.id ?? null,
        campaign_id: campaign_id ?? null,
        channel: "whatsapp",
        sender_id: sent_by ?? null,
        school_id: r.school_id ?? null,
        school_name: r.school_name ?? null,
        recipient: r.phone,
        message_preview: finalMessage.slice(0, 160),
        status,
      });

      results.push({ phone: r.phone, school: r.school_name, status, error: error_message });
    }

    const sent = results.filter((r) => r.status === "sent").length;
    const failed = results.filter((r) => r.status === "failed").length;

    return NextResponse.json({ results, sent, failed, total: results.length });
  } catch (err) {
    console.error("whatsapp send error", err);
    return NextResponse.json({ error: "Failed to send WhatsApp messages" }, { status: 500 });
  }
}
