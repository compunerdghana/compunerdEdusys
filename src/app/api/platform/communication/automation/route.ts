import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function GET() {
  const admin = getAdmin();
  const { data } = await admin.from("automation_rules").select("*").order("created_at", { ascending: false });
  return NextResponse.json({ rules: data ?? [] });
}

export async function POST(req: NextRequest) {
  try {
    const admin = getAdmin();
    const body = await req.json();
    const { name, description, trigger_event, channels, template_id, message_body, target_role, created_by } = body;

    if (!name || !trigger_event) {
      return NextResponse.json({ error: "name and trigger_event are required" }, { status: 400 });
    }

    const { data, error } = await admin.from("automation_rules").insert({
      name,
      description: description ?? null,
      trigger_event,
      channels: channels ?? [],
      template_id: template_id ?? null,
      message_body: message_body ?? null,
      target_role: target_role ?? "school_owner",
      is_active: false,
      created_by: created_by ?? null,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ rule: data });
  } catch (err) {
    console.error("automation POST error", err);
    return NextResponse.json({ error: "Failed to create automation rule" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = getAdmin();
    const body = await req.json();
    const { id, is_active, ...rest } = body;
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const { error } = await admin.from("automation_rules").update({
      is_active,
      ...rest,
      updated_at: new Date().toISOString(),
    }).eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to update rule" }, { status: 500 });
  }
}
