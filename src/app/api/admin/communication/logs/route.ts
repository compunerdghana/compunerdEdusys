import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const schoolId = searchParams.get("schoolId");
  const channel = searchParams.get("channel");
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const offset = parseInt(searchParams.get("offset") ?? "0");

  if (!schoolId) return NextResponse.json({ error: "Missing schoolId" }, { status: 400 });

  const admin = getAdmin();
  let q = admin.from("communication_logs")
    .select("id, channel, recipient_type, recipient_ref, subject, body, status, provider, sent_by, recipient_count, error_message, sent_at, metadata")
    .eq("school_id", schoolId)
    .order("sent_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (channel) q = q.eq("channel", channel);
  if (status) q = q.eq("status", status);

  const { data, error } = await q;
  if (error?.code === "42P01") return NextResponse.json({ data: [], tableNotReady: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { school_id, channel, recipient_type, recipient_id, recipient_ref, template_id, subject, message, status = "sent", provider, provider_ref, sent_by, recipient_count = 1, error_message, metadata } = body;

  if (!school_id || !channel || !message) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const admin = getAdmin();
  const { data, error } = await admin.from("communication_logs").insert({
    school_id, channel, recipient_type: recipient_type || "individual",
    recipient_id: recipient_id || null,
    recipient_ref: recipient_ref || null,
    template_id: template_id || null,
    subject: subject || null,
    body: message,
    status, provider: provider || null,
    provider_ref: provider_ref || null,
    sent_by: sent_by || null,
    recipient_count,
    error_message: error_message || null,
    metadata: metadata || {},
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
