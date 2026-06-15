import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const schoolId = searchParams.get("schoolId");
  const recipientId = searchParams.get("recipientId");
  const unreadOnly = searchParams.get("unreadOnly") === "true";
  const limit = parseInt(searchParams.get("limit") ?? "50");

  if (!schoolId) return NextResponse.json({ error: "Missing schoolId" }, { status: 400 });

  let q = admin.from("notifications")
    .select("id, title, body, type, category, link, is_read, read_at, created_at, recipient_id")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (recipientId) q = q.eq("recipient_id", recipientId);
  if (unreadOnly) q = q.eq("is_read", false);

  const { data, error } = await q;
  if (error?.code === "42P01") return NextResponse.json({ data: [], tableNotReady: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const unreadCount = (data ?? []).filter((n) => !n.is_read).length;
  return NextResponse.json({ data: data ?? [], unreadCount });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { school_id, recipient_id, title, message, type = "info", category = "general", link, created_by } = body;

  if (!school_id || !recipient_id || !title) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data, error } = await admin.from("notifications").insert({
    school_id, recipient_id, title,
    body: message || null,
    type, category,
    link: link || null,
    created_by: created_by || null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest) {
  const { ids, action, schoolId } = await req.json();

  if (action === "mark_read") {
    const q = admin.from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() });
    const updated = ids?.length ? await q.in("id", ids) : await q.eq("school_id", schoolId).eq("is_read", false);
    if (updated.error) return NextResponse.json({ error: updated.error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const { ids } = await req.json();
  if (!ids?.length) return NextResponse.json({ error: "No ids provided" }, { status: 400 });
  const { error } = await admin.from("notifications").delete().in("id", ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
