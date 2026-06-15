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

export async function GET(request: NextRequest) {
  try {
    const admin = getAdmin();

    // Extract Bearer token from Authorization header
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return NextResponse.json({ is_platform_user: false, user: null }, { status: 401 });
    }

    // Verify the JWT and get the user
    const {
      data: { user },
      error: userErr,
    } = await admin.auth.getUser(token);

    if (userErr || !user) {
      return NextResponse.json({ is_platform_user: false, user: null }, { status: 401 });
    }

    // Check if user is in platform_users
    const { data: platformUser, error: puErr } = await admin
      .from("platform_users")
      .select("*")
      .eq("id", user.id)
      .eq("is_active", true)
      .single();

    if (isMissing(puErr)) {
      return NextResponse.json({ is_platform_user: false, user: null });
    }

    if (puErr || !platformUser) {
      return NextResponse.json({ is_platform_user: false, user: null });
    }

    // Update last_login
    await admin
      .from("platform_users")
      .update({ last_login: new Date().toISOString() })
      .eq("id", user.id);

    return NextResponse.json({ is_platform_user: true, user: platformUser });
  } catch (err) {
    console.error("GET platform/auth/check error", err);
    return NextResponse.json(
      { error: "Auth check failed" },
      { status: 500 },
    );
  }
}
