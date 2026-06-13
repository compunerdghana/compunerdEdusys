import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { username, full_name, role, school_id, password, phone, gender, date_of_birth, address, qualification, date_joined, bank_name, bank_account_number, bank_account_name, bank_branch, momo_number } = body;

  if (!username || !full_name || !role || !school_id || !password) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const email = `${username.trim().toLowerCase()}@edusys.internal`;

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

  // Wait briefly for Supabase trigger to create the profile row
  await new Promise((r) => setTimeout(r, 800));

  // Upsert guarantees the row exists even if trigger hasn't fired yet
  const { error: profileError } = await adminClient
    .from("profiles")
    .upsert({
      id: authUser.user.id,
      username: username.trim().toLowerCase(),
      full_name,
      role,
      school_id,
      is_active: true,
      phone: phone || null,
    }, { onConflict: "id" });

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // Store extended staff details (if table exists)
  const extendedData = {
    profile_id: authUser.user.id,
    school_id,
    gender: gender || null,
    date_of_birth: date_of_birth || null,
    address: address || null,
    qualification: qualification || null,
    date_joined: date_joined || null,
    bank_name: bank_name || null,
    bank_account_number: bank_account_number || null,
    bank_account_name: bank_account_name || null,
    bank_branch: bank_branch || null,
    momo_number: momo_number || null,
  };

  // Try to upsert extended data — silently ignore if table doesn't exist yet
  await adminClient.from("staff_details").upsert(extendedData, { onConflict: "profile_id" }).then(() => {});

  return NextResponse.json({ ok: true, id: authUser.user.id });
}
