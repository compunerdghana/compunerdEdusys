import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { resolveTargetSchools, interpolateTemplate } from "@/lib/communication/targeting";
import { sendWhatsAppText } from "@/lib/communication/whatsapp";
import { sendSMS } from "@/lib/communication/sms";
import { sendPlatformEmail } from "@/lib/communication/email";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = getAdmin();
  const { id } = await params;

  const { data, error } = await admin
    .from("communication_campaigns")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  // Get delivery stats
  const { data: msgs } = await admin
    .from("platform_messages")
    .select("status, channel")
    .eq("campaign_id", id);

  return NextResponse.json({ campaign: data, messages: msgs ?? [] });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = getAdmin();
  const { id } = await params;
  const body = await req.json();

  const allowed = ["name", "description", "type", "channels", "target_audience",
    "target_school_ids", "template_id", "subject", "message_body", "status", "scheduled_at"];
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of allowed) {
    if (k in body) update[k] = body[k];
  }

  const { data, error } = await admin
    .from("communication_campaigns")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ campaign: data });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = getAdmin();
  const { id } = await params;
  const { error } = await admin.from("communication_campaigns").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// POST to /campaigns/[id]/launch is handled by a separate route.
// This file also handles the launch via action param:
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = getAdmin();
    const { id } = await params;
    const body = await req.json();
    const { action, sent_by } = body;

    if (action !== "launch") {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    // Fetch campaign
    const { data: campaign, error: campErr } = await admin
      .from("communication_campaigns")
      .select("*")
      .eq("id", id)
      .single();

    if (campErr || !campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (!["draft", "paused"].includes(campaign.status)) {
      return NextResponse.json({ error: "Campaign is not in a launchable state" }, { status: 400 });
    }

    // Mark as active
    await admin.from("communication_campaigns").update({ status: "active", started_at: new Date().toISOString() }).eq("id", id);

    // Get provider settings
    const { data: allSettings } = await admin.from("communication_settings").select("*");
    const settingsByChannel = Object.fromEntries((allSettings ?? []).map((s: Record<string, unknown>) => [s.channel, s]));

    // Resolve recipients
    const schools = await resolveTargetSchools(campaign.target_audience, campaign.target_school_ids);
    let sent = 0, failed = 0;

    for (const school of schools) {
      for (const channel of campaign.channels as string[]) {
        const msgVars = { school_name: school.name };
        const finalBody = interpolateTemplate(campaign.message_body, msgVars);
        const finalSubject = campaign.subject ? interpolateTemplate(campaign.subject, msgVars) : "";

        let status = "sent";
        let error_message: string | undefined;

        try {
          if (channel === "whatsapp") {
            const cfg = settingsByChannel["whatsapp"];
            const phone = school.owner_phone ?? school.phone;
            if (phone && cfg?.api_key && cfg?.sender_id) {
              const r = await sendWhatsAppText({ phone_id: cfg.sender_id as string, token: cfg.api_key as string, to: phone, message: finalBody });
              status = r.success ? "sent" : "failed";
              error_message = r.error;
            } else { status = "pending"; error_message = "No phone or credentials"; }
          } else if (channel === "sms") {
            const cfg = settingsByChannel["sms"];
            const phone = school.owner_phone ?? school.phone;
            if (phone && cfg?.api_key && cfg?.sender_id) {
              const r = await sendSMS(cfg.provider as string, cfg.api_key as string, cfg.sender_id as string, phone, finalBody);
              status = r.success ? "sent" : "failed";
              error_message = r.error;
            } else { status = "pending"; error_message = "No phone or credentials"; }
          } else if (channel === "email") {
            const cfg = settingsByChannel["email"];
            const email = school.owner_email ?? school.email;
            if (email && (cfg?.api_key || cfg?.sender_id)) {
              const r = await sendPlatformEmail(cfg.provider as string, cfg.extra_config as Record<string, string> ?? {}, {
                to: email, to_name: school.owner_name ?? school.name, subject: finalSubject, body: finalBody,
              });
              status = r.success ? "sent" : "failed";
              error_message = r.error;
            } else { status = "pending"; error_message = "No email or credentials"; }
          }
        } catch { status = "failed"; }

        status === "sent" ? sent++ : failed++;

        await admin.from("platform_messages").insert({
          campaign_id: id,
          channel,
          school_id: school.id,
          school_name: school.name,
          body: finalBody,
          subject: finalSubject || null,
          status,
          error_message: error_message ?? null,
          sent_by: sent_by ?? null,
          sent_at: status === "sent" ? new Date().toISOString() : null,
        });
      }
    }

    // Update campaign stats
    await admin.from("communication_campaigns").update({
      status: "completed",
      completed_at: new Date().toISOString(),
      total_recipients: schools.length,
      sent_count: sent,
      failed_count: failed,
    }).eq("id", id);

    return NextResponse.json({ success: true, sent, failed, total: schools.length });
  } catch (err) {
    console.error("campaign launch error", err);
    return NextResponse.json({ error: "Failed to launch campaign" }, { status: 500 });
  }
}
