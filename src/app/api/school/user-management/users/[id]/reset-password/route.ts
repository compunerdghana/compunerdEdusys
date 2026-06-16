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

    const isAuthorized = ["admin", "owner", "school_owner", "headmaster"].includes(currentProfile.role);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }

    const admin = getAdmin();

    // Verify Target User is in same school
    const { data: targetUser } = await admin
      .from("profiles")
      .select("school_id, full_name")
      .eq("id", id)
      .single();

    if (!targetUser || targetUser.school_id !== schoolId) {
      return NextResponse.json({ error: "Unauthorized access to tenant record" }, { status: 403 });
    }

    // Reset password in auth.users
    const { error: authErr } = await admin.auth.admin.updateUserById(id, {
      password
    });

    if (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: 400 });
    }

    // Log Audit Event
    await logAuditEvent(
      schoolId,
      currentProfile.id,
      currentProfile.full_name,
      "user.password_reset",
      "user",
      id,
      { target_name: targetUser.full_name }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
