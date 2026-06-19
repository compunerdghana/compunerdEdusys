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

const isMissing = (e: unknown) =>
  (e as { code?: string; message?: string })?.code === "42P01" ||
  (e as { message?: string })?.message?.includes("does not exist");

// Helper to check if caller is an active platform user
async function authorizePlatformUser(request: NextRequest, admin: ReturnType<typeof getAdmin>) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  let user;

  if (token) {
    const { data, error } = await admin.auth.getUser(token);
    if (!error && data.user) user = data.user;
  } else {
    const supabase = await createServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) user = data.user;
  }

  if (!user) return null;

  const { data: platformUser } = await admin
    .from("platform_users")
    .select("id, is_active")
    .eq("id", user.id)
    .single();

  if (!platformUser || !platformUser.is_active) return null;
  return user.id;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = getAdmin();
    const callerId = await authorizePlatformUser(request, admin);
    if (!callerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const { data: admins, error } = await admin
      .from("profiles")
      .select("*")
      .eq("school_id", id)
      .in("role", ["admin", "owner", "school_admin", "headmaster"])
      .order("created_at", { ascending: false });

    if (error && !isMissing(error)) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ admins: admins ?? [] });
  } catch (err) {
    console.error("GET platform/schools/[id]/admins error", err);
    return NextResponse.json({ error: "Failed to load admins" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = getAdmin();
    const callerId = await authorizePlatformUser(request, admin);
    if (!callerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { admin_id, full_name, email, username, role, is_active } = body;

    if (!admin_id) {
      return NextResponse.json({ error: "admin_id is required" }, { status: 400 });
    }

    // Verify admin belongs to the target school
    const { data: targetProfile, error: getErr } = await admin
      .from("profiles")
      .select("id, school_id")
      .eq("id", admin_id)
      .single();

    if (getErr || !targetProfile || targetProfile.school_id !== id) {
      return NextResponse.json({ error: "Admin user not found in this school" }, { status: 404 });
    }

    // Update profiles table
    const updates: Record<string, any> = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (email !== undefined) updates.email = email;
    if (username !== undefined) updates.username = username;
    if (role !== undefined) updates.role = role;
    if (is_active !== undefined) updates.is_active = is_active;
    updates.updated_at = new Date().toISOString();

    const { data: updatedProfile, error: updateErr } = await admin
      .from("profiles")
      .update(updates)
      .eq("id", admin_id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Update Supabase Auth user
    const authUpdates: Record<string, any> = {};
    if (email) authUpdates.email = email;
    
    // Set ban duration based on is_active status
    if (is_active !== undefined) {
      authUpdates.ban_duration = is_active ? "none" : "87600h"; // ban for 10 years if deactivated
    }

    // Prepare user metadata updates
    const userMetadata: Record<string, any> = {};
    if (full_name) userMetadata.full_name = full_name;
    if (role) userMetadata.role = role;
    if (Object.keys(userMetadata).length > 0) {
      authUpdates.user_metadata = userMetadata;
    }

    if (Object.keys(authUpdates).length > 0) {
      const { error: authErr } = await admin.auth.admin.updateUserById(admin_id, authUpdates);
      if (authErr) {
        console.error("Auth update error:", authErr.message);
        // We do not roll back the profile table update to keep it simple, but log the error
      }
    }

    return NextResponse.json({ success: true, admin: updatedProfile });
  } catch (err) {
    console.error("PATCH platform/schools/[id]/admins error", err);
    return NextResponse.json({ error: "Failed to update admin profile" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = getAdmin();
    const callerId = await authorizePlatformUser(request, admin);
    if (!callerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { admin_id, action, password } = body;

    if (!admin_id || action !== "reset-password") {
      return NextResponse.json({ error: "Invalid action or parameters" }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    // Verify admin belongs to the target school
    const { data: targetProfile, error: getErr } = await admin
      .from("profiles")
      .select("id, school_id")
      .eq("id", admin_id)
      .single();

    if (getErr || !targetProfile || targetProfile.school_id !== id) {
      return NextResponse.json({ error: "Admin user not found in this school" }, { status: 404 });
    }

    // Reset password in Supabase Auth
    const { error: authErr } = await admin.auth.admin.updateUserById(admin_id, { password });
    if (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST platform/schools/[id]/admins error", err);
    return NextResponse.json({ error: "Failed to perform action" }, { status: 500 });
  }
}
