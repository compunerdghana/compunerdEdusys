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
      .select("school_id, role")
      .eq("id", user.id)
      .single();

    const schoolId = profile?.school_id;
    if (!schoolId) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const admin = getAdmin();
    // Retrieve users profiles with roles association
    const { data: users, error } = await admin
      .from("profiles")
      .select(`
        *,
        user_roles (
          role:school_roles ( id, name, display_name )
        )
      `)
      .eq("school_id", schoolId)
      .neq("role", "super_admin");

    if (error) throw error;

    return NextResponse.json({ users: users ?? [] });
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

    // Permissions check: must be admin, school_owner, headmaster or have roles.manage/users.manage
    const isAuthorized = ["admin", "owner", "school_owner", "headmaster"].includes(currentProfile.role);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const admin = getAdmin();
    const body = await request.json();
    const { email, full_name, username, password, role, phone, role_id } = body;

    if (!email || !full_name || !password || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Create auth user
    const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role, school_id: schoolId }
    });

    if (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: 400 });
    }

    // 2. Profile table entry (trigger might do it but upsert to ensure details match)
    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .upsert({
        id: authUser.user.id,
        school_id: schoolId,
        role,
        full_name,
        username: username || email.split("@")[0],
        phone: phone || null,
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (profileErr) {
      // rollback
      await admin.auth.admin.deleteUser(authUser.user.id);
      return NextResponse.json({ error: profileErr.message }, { status: 500 });
    }

    // 3. Assign role to user_roles
    if (role_id) {
      await admin.from("user_roles").insert({
        user_id: profile.id,
        role_id: role_id
      });
    }

    // 4. If parent or student role, we can also link to the respective tables if student_id is provided
    if (role === "parent" && body.student_id) {
      await admin.from("parents").insert({
        school_id: schoolId,
        student_id: body.student_id,
        relationship: body.relationship || "Father/Mother",
        full_name: full_name,
        phone: phone || "0000000000",
        email: email,
        user_id: authUser.user.id
      });
    } else if (role === "student" && body.student_id) {
      // Update student table to link user_id
      await admin
        .from("students")
        .update({ user_id: authUser.user.id })
        .eq("id", body.student_id);
    }

    // 5. Log audit trail
    await logAuditEvent(
      schoolId,
      currentProfile.id,
      currentProfile.full_name,
      "user.create",
      "user",
      profile.id,
      { email, role, full_name }
    );

    return NextResponse.json({ user: profile }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
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

    const isAuthorized = ["admin", "owner", "school_owner", "headmaster"].includes(currentProfile.role);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const admin = getAdmin();
    const body = await request.json();
    const { id, full_name, phone, role, is_active, role_id } = body;

    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Tenant Check: user being edited must belong to the same school
    const { data: targetUser } = await admin
      .from("profiles")
      .select("school_id")
      .eq("id", id)
      .single();

    if (!targetUser || targetUser.school_id !== schoolId) {
      return NextResponse.json({ error: "Unauthorized access to tenant record" }, { status: 403 });
    }

    const updates: Record<string, any> = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (phone !== undefined) updates.phone = phone;
    if (role !== undefined) updates.role = role;
    if (is_active !== undefined) updates.is_active = is_active;

    const { data: updatedProfile, error: profileErr } = await admin
      .from("profiles")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (profileErr) throw profileErr;

    // Sync Auth Status
    if (is_active !== undefined) {
      await admin.auth.admin.updateUserById(id, {
        ban_duration: is_active ? "none" : "87600h" // 10 years ban if suspended
      });
    }

    // Role assignment sync
    if (role_id) {
      await admin.from("user_roles").delete().eq("user_id", id);
      await admin.from("user_roles").insert({ user_id: id, role_id });
    }

    // Audit logs
    await logAuditEvent(
      schoolId,
      currentProfile.id,
      currentProfile.full_name,
      is_active === false ? "user.suspend" : "user.update",
      "user",
      id,
      updates
    );

    return NextResponse.json({ user: updatedProfile });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
