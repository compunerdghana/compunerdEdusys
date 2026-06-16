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

export async function GET() {
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

    const admin = getAdmin();

    const { data: roles, error } = await admin
      .from("school_roles")
      .select(`
        *,
        school_role_permissions (
          permission:school_permissions ( id, name, display_name, feature_code )
        )
      `)
      .eq("school_id", schoolId);

    if (error) throw error;

    return NextResponse.json({ roles: roles ?? [] });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    const admin = getAdmin();
    const body = await request.json();
    const { display_name, name, description, source_role_id } = body;

    if (!display_name) {
      return NextResponse.json({ error: "Display name is required" }, { status: 400 });
    }

    const roleName = name || display_name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

    // 1. Insert school role
    const { data: newRole, error: roleErr } = await admin
      .from("school_roles")
      .insert({
        school_id: schoolId,
        name: roleName,
        display_name,
        description,
        is_system: false,
        sync_policy: "ignored" // Custom roles don't auto sync with templates
      })
      .select()
      .single();

    if (roleErr) {
      return NextResponse.json({ error: roleErr.message }, { status: 400 });
    }

    // 2. Duplicate permissions from source_role_id if provided
    if (source_role_id) {
      const { data: srcPerms } = await admin
        .from("school_role_permissions")
        .select("permission_id")
        .eq("role_id", source_role_id);
      
      if (srcPerms && srcPerms.length > 0) {
        const inserts = srcPerms.map(p => ({
          role_id: newRole.id,
          permission_id: p.permission_id
        }));
        await admin.from("school_role_permissions").insert(inserts);
      }
    }

    // 3. Log audit event
    await logAuditEvent(
      schoolId,
      currentProfile.id,
      currentProfile.full_name,
      "role.create",
      "role",
      newRole.id,
      { display_name, roleName }
    );

    return NextResponse.json(newRole, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Role ID is required" }, { status: 400 });
    }

    const admin = getAdmin();

    // Verify role belongs to school and is not a system role
    const { data: role } = await admin
      .from("school_roles")
      .select("school_id, is_system, display_name")
      .eq("id", id)
      .single();

    if (!role || role.school_id !== schoolId) {
      return NextResponse.json({ error: "Unauthorized access to tenant record" }, { status: 403 });
    }

    if (role.is_system) {
      return NextResponse.json({ error: "Cannot delete built-in system roles" }, { status: 400 });
    }

    const { error: deleteErr } = await admin.from("school_roles").delete().eq("id", id);
    if (deleteErr) throw deleteErr;

    // Log Audit Event
    await logAuditEvent(
      schoolId,
      currentProfile.id,
      currentProfile.full_name,
      "role.delete",
      "role",
      id,
      { display_name: role.display_name }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
