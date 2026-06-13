import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Admin-only route to create school staff accounts
// Called by school owners / headmasters from the staff management UI
export async function POST(request: Request) {
  const { username, full_name, role, school_id, password } = await request.json();

  if (!username || !full_name || !role || !school_id || !password) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const email = `${username.trim().toLowerCase()}@edusys.internal`;

  // Create auth user via admin API — proper password hashing
  const { data: authUser, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role },
  });

  if (createError) {
    if (createError.message.includes("already been registered")) {
      return NextResponse.json({ error: "Username already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  // Update profile with username, role, school
  const { error: profileError } = await adminClient
    .from("profiles")
    .update({ username: username.trim().toLowerCase(), full_name, role, school_id, is_active: true })
    .eq("id", authUser.user.id);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: authUser.user.id });
}
