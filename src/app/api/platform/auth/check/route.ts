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

export async function GET(request: NextRequest) {
  try {
    const admin = getAdmin();

    // Try Bearer token first, fall back to session cookie
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    let user;
    if (token) {
      const { data, error } = await admin.auth.getUser(token);
      if (error || !data.user) return NextResponse.json({ isPlatformUser: false }, { status: 401 });
      user = data.user;
    } else {
      // Use session cookie (works for client-side fetch without auth header)
      const supabase = await createServerClient();
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) return NextResponse.json({ isPlatformUser: false }, { status: 401 });
      user = data.user;
    }

    // Check if user is in platform_users
    const { data: platformUser, error: puErr } = await admin
      .from("platform_users")
      .select("*")
      .eq("id", user.id)
      .eq("is_active", true)
      .single();

    if (isMissing(puErr) || puErr || !platformUser) {
      return NextResponse.json({ isPlatformUser: false });
    }

    // Update last_login
    await admin.from("platform_users").update({ last_login: new Date().toISOString() }).eq("id", user.id);

    return NextResponse.json({ isPlatformUser: true, user: platformUser });
  } catch (err) {
    console.error("GET platform/auth/check error", err);
    return NextResponse.json(
      { error: "Auth check failed" },
      { status: 500 },
    );
  }
}
