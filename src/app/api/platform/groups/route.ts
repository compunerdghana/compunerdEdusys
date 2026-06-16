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

export async function GET() {
  try {
    const admin = getAdmin();

    const { data, error } = await admin
      .from("platform_user_groups")
      .select("*, platform_user_group_members(id)")
      .order("created_at", { ascending: false });

    if (isMissing(error)) {
      return NextResponse.json({ groups: [] });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const groups = (data ?? []).map((g) => ({
      ...g,
      member_count: Array.isArray(g.platform_user_group_members)
        ? g.platform_user_group_members.length
        : 0,
      platform_user_group_members: undefined,
    }));

    return NextResponse.json({ groups });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = getAdmin();
    const body = await request.json();
    const { name, description, color } = body;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const { data, error } = await admin
      .from("platform_user_groups")
      .insert({ name, description, color: color ?? "#6b7280" })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ group: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = getAdmin();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const { error } = await admin.from("platform_user_groups").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
