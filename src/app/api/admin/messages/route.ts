import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function getUser() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

function isTableMissing(err: { code?: string; message?: string } | null) {
  if (!err) return false;
  return (
    err.code === "42P01" ||
    (typeof err.message === "string" && err.message.includes("does not exist"))
  );
}

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const schoolId = searchParams.get("schoolId");
  if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 });

  const type = searchParams.get("type");
  const targetType = searchParams.get("targetType");

  const admin = getAdmin();
  let query = admin
    .from("messages")
    .select("*, sender:profiles!sender_id(full_name)")
    .eq("school_id", schoolId)
    .order("sent_at", { ascending: false })
    .limit(50);

  if (type) query = query.eq("type", type);
  if (targetType) query = query.eq("target_type", targetType);

  const { data, error } = await query;

  if (error) {
    if (isTableMissing(error)) return NextResponse.json({ tableNotReady: true });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    school_id: string;
    sender_id?: string;
    title: string;
    body: string;
    type?: string;
    target_type?: string;
    target_id?: string | null;
  };

  const { school_id, sender_id, title, body: msgBody, type, target_type, target_id } = body;

  const { data, error } = await getAdmin()
    .from("messages")
    .insert({
      school_id,
      sender_id: sender_id ?? user.id,
      title,
      body: msgBody,
      type: type ?? "announcement",
      target_type: target_type ?? "all",
      target_id: target_id ?? null,
    })
    .select("*, sender:profiles!sender_id(full_name)")
    .single();

  if (error) {
    if (isTableMissing(error)) return NextResponse.json({ tableNotReady: true });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data });
}

export async function DELETE(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await getAdmin().from("messages").delete().eq("id", id);

  if (error) {
    if (isTableMissing(error)) return NextResponse.json({ tableNotReady: true });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
