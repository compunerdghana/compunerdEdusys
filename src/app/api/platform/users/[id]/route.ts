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

    const [userRes, groupsRes, activityRes] = await Promise.all([
      admin
        .from("platform_users")
        .select("*")
        .eq("id", id)
        .single(),
      admin
        .from("platform_user_group_members")
        .select("group_id, platform_user_groups(id, name, color)")
        .eq("user_id", id),
      admin
        .from("platform_audit_logs")
        .select("id, action, resource_type, description, created_at, ip_address")
        .eq("actor_id", id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    if (isMissing(userRes.error)) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (userRes.error) {
      return NextResponse.json({ error: userRes.error.message }, { status: 500 });
    }

    const groups = isMissing(groupsRes.error) ? [] : (groupsRes.data ?? []);
    const recentActivity = isMissing(activityRes.error) ? [] : (activityRes.data ?? []);

    return NextResponse.json({
      user: userRes.data,
      groups,
      recentActivity,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = getAdmin();
    const { id } = await params;
    const body = await request.json();

    // Strip non-updatable fields
    const {
      id: _id,
      created_at: _c,
      failed_login_count: _flc,
      locked_at: _la,
      ...updates
    } = body;
    void _id; void _c; void _flc; void _la;

    const { data, error } = await admin
      .from("platform_users")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ user: data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
