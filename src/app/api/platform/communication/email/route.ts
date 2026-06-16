import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { sendPlatformEmail } from "@/lib/communication/email";
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

  const { data, count } = await admin
    .from("platform_messages")
    .select("*", { count: "exact" })
    .eq("channel", "email")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  return NextResponse.json({ messages: data ?? [], total: count ?? 0, page, limit });
}

export async function POST(req: NextRequest) {
  try {
    const admin = getAdmin();
    const body = await req.json();
    const {
      target_audience = "selected",
      selected_school_ids = [],
      recipient_email,
      recipient_name,
      school_id,
      school_name,
      subject,
      message,
      is_html = false,
      template_id,
      campaign_id,
      sent_by,
    } = body;

    if (!message || !subject) {
      return NextResponse.json({ error: "subject and message are required" }, { status: 400 });
    }

    // Get email settings
    const { data: settings } = await admin
      .from("platform_comm_settings")
      .select("*")
      .eq("channel", "email")
      .single();

    const provider = settings?.provider ?? "smtp";
    const config = {
      ...(settings?.extra_config as Record<string, string> ?? {}),
      api_key: settings?.api_key ?? process.env.EMAIL_API_KEY ?? "",
      user: settings?.sender_id ?? process.env.EMAIL_USER ?? "",
      password: settings?.api_secret ?? process.env.EMAIL_PASSWORD ?? "",
    };

    // Resolve recipients
    let recipients: { name: string; email: string; school_id?: string; school_name?: string }[] = [];

    if (recipient_email) {
      recipients = [{ name: recipient_name ?? "Recipient", email: recipient_email, school_id, school_name }];
    } else {
      const schools = await resolveTargetSchools(
        target_audience,
        target_audience === "selected" ? selected_school_ids : undefined,
      );
      for (const s of schools) {
        const email = s.owner_email ?? s.email;
        if (email) {
          recipients.push({ name: s.owner_name ?? s.name, email, school_id: s.id, school_name: s.name });
        }
      }
    }

    if (recipients.length === 0) {
      return NextResponse.json({ error: "No recipients with email addresses found" }, { status: 400 });
    }

    const results = [];
    for (const r of recipients) {
      const finalMessage = interpolateTemplate(message, {
        school_name: r.school_name ?? r.name,
        recipient_name: r.name,
      });
      const finalSubject = interpolateTemplate(subject, {
        school_name: r.school_name ?? r.name,
      });

      let status = "sent";
      let provider_msg_id: string | undefined;
      let error_message: string | undefined;

      if (config.api_key || config.user) {
        const result = await sendPlatformEmail(provider, config, {
          to: r.email,
          to_name: r.name,
          subject: finalSubject,
          body: finalMessage,
          is_html,
        });
        status = result.success ? "sent" : "failed";
        provider_msg_id = result.message_id;
        error_message = result.error;
      } else {
        status = "pending";
        error_message = "Email credentials not configured in Settings";
      }

      const { data: msgData } = await admin.from("platform_messages").insert({
        campaign_id: campaign_id ?? null,
        template_id: template_id ?? null,
        channel: "email",
        recipient_type: "school_owner",
        school_id: r.school_id ?? null,
        school_name: r.school_name ?? null,
        recipient_name: r.name,
        recipient_email: r.email,
        subject: finalSubject,
        body: finalMessage,
        status,
        provider,
        provider_msg_id: provider_msg_id ?? null,
        error_message: error_message ?? null,
        sent_by: sent_by ?? null,
        sent_at: status === "sent" ? new Date().toISOString() : null,
      }).select().single();

      await admin.from("platform_comm_logs").insert({
        message_id: msgData?.id ?? null,
        campaign_id: campaign_id ?? null,
        channel: "email",
        sender_id: sent_by ?? null,
        school_id: r.school_id ?? null,
        school_name: r.school_name ?? null,
        recipient: r.email,
        message_preview: finalSubject + " — " + finalMessage.slice(0, 120),
        status,
      });

      results.push({ email: r.email, school: r.school_name, status, error: error_message });
    }

    const sent = results.filter((r) => r.status === "sent").length;
    const failed = results.filter((r) => r.status === "failed").length;

    return NextResponse.json({ results, sent, failed, total: results.length });
  } catch (err) {
    console.error("email send error", err);
    return NextResponse.json({ error: "Failed to send emails" }, { status: 500 });
  }
}
