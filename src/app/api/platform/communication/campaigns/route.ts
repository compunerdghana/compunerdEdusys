import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

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
  const status = url.searchParams.get("status");
  const page = Number(url.searchParams.get("page") ?? 1);
  const limit = Number(url.searchParams.get("limit") ?? 20);
  const offset = (page - 1) * limit;

  let q = admin
    .from("communication_campaigns")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) q = q.eq("status", status);

  const { data, count, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ campaigns: data ?? [], total: count ?? 0 });
}

export async function POST(req: NextRequest) {
  try {
    const admin = getAdmin();
    const body = await req.json();
    const {
      name,
      description,
      type = "custom",
      channels = [],
      target_audience = "all",
      target_school_ids = [],
      template_id,
      subject,
      message_body,
      scheduled_at,
      created_by,
    } = body;

    if (!name || !message_body) {
      return NextResponse.json({ error: "name and message_body are required" }, { status: 400 });
    }

    const { data, error } = await admin
      .from("communication_campaigns")
      .insert({
        name,
        description: description ?? null,
        type,
        channels,
        target_audience,
        target_school_ids,
        template_id: template_id ?? null,
        subject: subject ?? null,
        message_body,
        status: "draft",
        scheduled_at: scheduled_at ?? null,
        created_by: created_by ?? null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ campaign: data });
  } catch (err) {
    console.error("campaigns POST error", err);
    return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 });
  }
}
