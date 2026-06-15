import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function POST(req: NextRequest) {
  const { email, full_name, role, school_id, username } = await req.json();

  if (!email || !full_name || !role || !school_id) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Create auth user with a random password they can reset
  const tempPassword = `Compunerd@${Math.floor(100000 + Math.random() * 900000)}`;
  const { data: authData, error: authError } = await getAdmin().auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name, role, school_id, username },
  });

  if (authError) {
    // If user already exists by email, try to find their profile
    if (authError.message?.includes("already")) {
      const { data: existing } = await getAdmin()
        .from("profiles")
        .select("id")
        .eq("email_address", email)
        .single();
      if (existing) return NextResponse.json({ profile_id: existing.id });
    }
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  const userId = authData.user.id;

  // Upsert profile row
  const { error: profileError } = await getAdmin().from("profiles").upsert({
    id: userId,
    full_name,
    role,
    school_id,
    username,
    is_active: true,
  });

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ profile_id: userId, temp_password: tempPassword });
}
