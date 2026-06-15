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

  if (!schoolId) return NextResponse.json({ error: "Missing schoolId" }, { status: 400 });

  let q = getAdmin().from("communication_templates")
    .select("id, name, channel, category, subject, body, variables, is_system, is_active, created_at")
    .or(`school_id.eq.${schoolId},is_system.eq.true`)
    .eq("is_active", true)
    .order("is_system", { ascending: false })
    .order("name");

  if (channel) q = q.eq("channel", channel);

  const { data, error } = await q;
  if (error?.code === "42P01") return NextResponse.json({ data: [], tableNotReady: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { school_id, channel, category, name, subject, message, variables, created_by } = body;

  if (!school_id || !channel || !name || !message) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data, error } = await getAdmin().from("communication_templates").insert({
    school_id, channel, category: category || "general", name,
    subject: subject || null,
    body: message,
    variables: variables || [],
    is_system: false,
    created_by: created_by || null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { body: bodyText, ...rest } = updates;
  const { data, error } = await getAdmin().from("communication_templates")
    .update({ ...rest, ...(bodyText ? { body: bodyText } : {}) })
    .eq("id", id)
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  const { error } = await getAdmin().from("communication_templates")
    .update({ is_active: false }).eq("id", id).eq("is_system", false);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
