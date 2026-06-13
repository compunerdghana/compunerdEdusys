import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Temporary one-time route — delete after first use
export async function GET() {
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Look up the user ID from profiles directly
  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("id, email")
    .eq("username", "admin")
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found: " + profileError?.message }, { status: 404 });
  }

  // Update password using the Admin API with the known user ID
  const { error } = await adminClient.auth.admin.updateUserById(profile.id, {
    password: "Admin1234!",
    email_confirm: true,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    message: "Password set. Log in with username: admin, password: Admin1234!",
  });
}
