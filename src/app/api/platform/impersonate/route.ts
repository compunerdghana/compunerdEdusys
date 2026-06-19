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

export async function POST(request: NextRequest) {
  try {
    const admin = getAdmin();
    const body = await request.json();

    const school_id = body.school_id || body.schoolId;
    const reason = body.reason;
    let platform_user_id = body.platform_user_id;

    if (!platform_user_id) {
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
      if (user) {
        platform_user_id = user.id;
      }
    }

    if (!school_id || !platform_user_id) {
      return NextResponse.json(
        { error: "school_id and platform_user_id are required" },
        { status: 400 },
      );
    }


    // Verify platform user exists
    const { data: platformUser, error: puErr } = await admin
      .from("platform_users")
      .select("id, full_name, role, is_active")
      .eq("id", platform_user_id)
      .single();

    if (isMissing(puErr) || puErr || !platformUser) {
      return NextResponse.json(
        { error: "Platform user not found or table missing" },
        { status: 403 },
      );
    }

    if (!platformUser.is_active) {
      return NextResponse.json(
        { error: "Platform user is inactive" },
        { status: 403 },
      );
    }

    // Get school owner (admin profile for this school)
    const { data: ownerProfile, error: profileErr } = await admin
      .from("profiles")
      .select("id, full_name")
      .eq("school_id", school_id)
      .eq("role", "admin")
      .eq("is_active", true)
      .limit(1)
      .single();

    if (profileErr || !ownerProfile) {
      return NextResponse.json(
        { error: "No active admin found for this school" },
        { status: 404 },
      );
    }

    // Get auth user email
    const { data: authUser, error: authErr } =
      await admin.auth.admin.getUserById(ownerProfile.id);

    if (authErr || !authUser?.user?.email) {
      return NextResponse.json(
        { error: "Could not retrieve school admin auth record" },
        { status: 500 },
      );
    }

    // Generate magic link for the school owner
    const { data: linkData, error: linkErr } =
      await admin.auth.admin.generateLink({
        type: "magiclink",
        email: authUser.user.email,
      });

    if (linkErr || !linkData) {
      return NextResponse.json(
        { error: linkErr?.message ?? "Failed to generate magic link" },
        { status: 500 },
      );
    }

    // Log impersonation session
    const { data: session, error: sessionErr } = await admin
      .from("impersonation_sessions")
      .insert({
        platform_user_id,
        school_id,
        reason: reason ?? null,
      })
      .select()
      .single();

    if (!isMissing(sessionErr) && sessionErr) {
      console.error("impersonation_sessions insert error", sessionErr);
    }

    // Audit log
    const { data: school } = await admin
      .from("schools")
      .select("name")
      .eq("id", school_id)
      .single();

    await admin.from("platform_audit_logs").insert({
      actor_id: platform_user_id,
      actor_name: platformUser.full_name,
      actor_role: platformUser.role,
      action: "school.impersonated",
      target_type: "school",
      target_id: school_id,
      target_name: school?.name ?? null,
      details: {
        reason,
        school_admin_email: authUser.user.email,
        session_id: session?.id ?? null,
      },
    });

    return NextResponse.json({
      magic_link: linkData.properties?.action_link ?? null,
      url: linkData.properties?.action_link ?? null,
      session_id: session?.id ?? null,
      school_admin: {
        email: authUser.user.email,
        name: ownerProfile.full_name,
      },
    });
  } catch (err) {
    console.error("POST platform/impersonate error", err);
    return NextResponse.json(
      { error: "Failed to start impersonation session" },
      { status: 500 },
    );
  }
}
