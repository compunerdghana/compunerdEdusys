import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getAdmin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("school_id, role")
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
    const { action, user_ids, role_id, password } = body;

    if (!action || !user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return NextResponse.json({ error: "Action and user_ids list are required" }, { status: 400 });
    }

    // Tenant Check: verify all target users belong to this school
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, school_id")
      .in("id", user_ids);

    const validUserIds = (profiles ?? [])
      .filter(p => p.school_id === schoolId)
      .map(p => p.id);

    if (validUserIds.length === 0) {
      return NextResponse.json({ error: "No valid user IDs found for this tenant" }, { status: 400 });
    }

    let updatedCount = 0;

    if (action === "suspend") {
      // Deactivate profiles
      await admin
        .from("profiles")
        .update({ is_active: false })
        .in("id", validUserIds);

      // Ban auth users
      for (const uId of validUserIds) {
        await admin.auth.admin.updateUserById(uId, { ban_duration: "87600h" });
      }
      updatedCount = validUserIds.length;
    } else if (action === "activate") {
      // Activate profiles
      await admin
        .from("profiles")
        .update({ is_active: true })
        .in("id", validUserIds);

      // Unban auth users
      for (const uId of validUserIds) {
        await admin.auth.admin.updateUserById(uId, { ban_duration: "none" });
      }
      updatedCount = validUserIds.length;
    } else if (action === "reset-password") {
      if (!password || password.length < 6) {
        return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
      }
      // Reset passwords for all valid users
      for (const uId of validUserIds) {
        await admin.auth.admin.updateUserById(uId, { password });
      }
      updatedCount = validUserIds.length;
    } else if (action === "assign-role") {
      if (!role_id) return NextResponse.json({ error: "Role ID is required" }, { status: 400 });
      
      // Update role assignments
      for (const uId of validUserIds) {
        await admin.from("user_roles").delete().eq("user_id", uId);
        await admin.from("user_roles").insert({ user_id: uId, role_id });
      }
      updatedCount = validUserIds.length;
    } else {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    return NextResponse.json({ success: true, action, updatedCount });
  } catch (err) {
    console.error("Bulk operations error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
