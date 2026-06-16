import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

const isMissing = (e: unknown) =>
  (e as { code?: string; message?: string })?.code === "42P01" ||
  (e as { message?: string })?.message?.includes("does not exist");

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = getAdmin();
    const { id } = await params;

    const { data, error } = await admin
      .from("platform_user_group_members")
      .select("id, added_at, platform_users(id, email, first_name, last_name, avatar_url, role, status)")
      .eq("group_id", id)
      .order("added_at", { ascending: false });

    if (isMissing(error)) {
      return NextResponse.json({ members: [] });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ members: data ?? [] });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = getAdmin();
    const { id } = await params;
    const body = await request.json();
    const { user_id } = body;

    if (!user_id) {
      return NextResponse.json({ error: "user_id is required" }, { status: 400 });
    }

    const { data, error } = await admin
      .from("platform_user_group_members")
      .insert({ group_id: id, user_id })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ member: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = getAdmin();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const { error } = await admin
      .from("platform_user_group_members")
      .delete()
      .eq("group_id", id)
      .eq("user_id", userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
