import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// This route only resolves username → email.
// The actual sign-in happens client-side so Supabase SSR can manage cookies correctly.
export async function POST(request: Request) {
  const { username } = await request.json();

  if (!username) {
    return NextResponse.json({ error: "Username is required." }, { status: 400 });
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: profile, error } = await adminClient
    .from("profiles")
    .select("email")
    .eq("username", username.trim().toLowerCase())
    .eq("is_active", true)
    .single();

  if (error || !profile?.email) {
    // Return same message as a bad password — don't reveal which part is wrong
    return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
  }

  return NextResponse.json({ email: profile.email });
}
