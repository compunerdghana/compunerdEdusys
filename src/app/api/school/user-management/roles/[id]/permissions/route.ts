import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { logAuditEvent } from "@/lib/security/rbac";

function getAdmin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("school_id")
      .eq("id", user.id)
      .single();

    const schoolId = profile?.school_id;
    if (!schoolId) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { id } = await params;
    const admin = getAdmin();

    // Verify role belongs to school
    const { data: role } = await admin
      .from("school_roles")
      .select("school_id, name")
      .eq("id", id)
      .single();

    if (!role || role.school_id !== schoolId) {
      return NextResponse.json({ error: "Unauthorized access to tenant record" }, { status: 403 });
    }

    const [allPermsRes, rolePermsRes] = await Promise.all([
      admin.from("school_permissions").select("*").order("name"),
      admin.from("school_role_permissions").select("permission_id").eq("role_id", id)
    ]);

    if (allPermsRes.error) throw allPermsRes.error;

    const grantedIds = new Set((rolePermsRes.data ?? []).map(rp => rp.permission_id));

    const permissions = (allPermsRes.data ?? []).map(p => ({
      ...p,
      granted: grantedIds.has(p.id)
    }));

    return NextResponse.json({ permissions });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("id, school_id, full_name, role")
      .eq("id", currentUser.id)
      .single();

    const schoolId = currentProfile?.school_id;
    if (!schoolId) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const isAuthorized = ["admin", "owner", "school_owner"].includes(currentProfile.role);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { id } = await params;
    const admin = getAdmin();

    // Verify target role belongs to same school
    const { data: role } = await admin
      .from("school_roles")
      .select("school_id, display_name, sync_policy")
      .eq("id", id)
      .single();

    if (!role || role.school_id !== schoolId) {
      return NextResponse.json({ error: "Unauthorized access to tenant record" }, { status: 403 });
    }

    const body = await request.json();
    const { permission_ids }: { permission_ids: string[] } = body;

    if (!Array.isArray(permission_ids)) {
      return NextResponse.json({ error: "permission_ids must be an array" }, { status: 400 });
    }

    // Replace permissions
    await admin.from("school_role_permissions").delete().eq("role_id", id);

    if (permission_ids.length > 0) {
      const inserts = permission_ids.map(permission_id => ({
        role_id: id,
        permission_id
      }));
      const { error } = await admin.from("school_role_permissions").insert(inserts);
      if (error) throw error;
    }

    // If a system default role is modified by a School Admin, change its sync_policy to 'ignored'
    if (role.sync_policy === "auto_sync") {
      await admin
        .from("school_roles")
        .update({ sync_policy: "ignored", updated_at: new Date().toISOString() })
        .eq("id", id);
    }

    // Log Audit Event
    await logAuditEvent(
      schoolId,
      currentProfile.id,
      currentProfile.full_name,
      "role.permissions_update",
      "role",
      id,
      { display_name: role.display_name, permissions_count: permission_ids.length }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
