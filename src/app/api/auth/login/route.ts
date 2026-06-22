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

  const trimmed = username.trim().toLowerCase();

  // Block email inputs to enforce login by username only
  if (trimmed.includes("@")) {
    return NextResponse.json({ error: "Please use your username instead of an email address." }, { status: 400 });
  }

  const { data: profiles, error } = await adminClient
    .from("profiles")
    .select("id, email")
    .eq("username", trimmed)
    .eq("is_active", true);

  if (error || !profiles || profiles.length === 0) {
    // Return same message as a bad password — don't reveal which part is wrong
    return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
  }

  let resolvedEmail = null;
  for (const prof of profiles) {
    if (prof.email) {
      resolvedEmail = prof.email;
      break;
    }
    const { data: authUser, error: authErr } = await adminClient.auth.admin.getUserById(prof.id);
    if (!authErr && authUser?.user?.email) {
      resolvedEmail = authUser.user.email;
      // Dynamically update profiles table to cache it
      await adminClient.from("profiles").update({ email: resolvedEmail }).eq("id", prof.id);
      break;
    }
  }

  if (!resolvedEmail) {
    return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
  }

  return NextResponse.json({ email: resolvedEmail });
}

