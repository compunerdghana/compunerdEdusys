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
  const schoolId = new URL(req.url).searchParams.get("schoolId");
  if (!schoolId) return NextResponse.json({ error: "Missing schoolId" }, { status: 400 });

  const admin = getAdmin();
  const { data, error } = await admin.from("automation_rules")
    .select("*, communication_templates(name, channel)")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });

  if (error?.code === "42P01") return NextResponse.json({ data: [], tableNotReady: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { school_id, name, description, trigger_event, trigger_filter, channel, template_id, custom_message, recipient_type, delay_minutes, created_by } = body;

  if (!school_id || !name || !trigger_event || !channel) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const admin = getAdmin();
  const { data, error } = await admin.from("automation_rules").insert({
    school_id, name, description: description || null,
    trigger_event, trigger_filter: trigger_filter || {},
    channel, template_id: template_id || null,
    custom_message: custom_message || null,
    recipient_type: recipient_type || "parent",
    delay_minutes: delay_minutes || 0,
    is_active: true,
    created_by: created_by || null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest) {
  const { id, is_active, ...rest } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const admin = getAdmin();
  const { data, error } = await admin.from("automation_rules")
    .update({ ...(is_active !== undefined ? { is_active } : {}), ...rest })
    .eq("id", id).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  const admin = getAdmin();
  const { error } = await admin.from("automation_rules").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
