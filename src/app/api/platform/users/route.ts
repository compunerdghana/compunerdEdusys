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

export async function GET() {
  try {
    const admin = getAdmin();

    const { data, error } = await admin
      .from("platform_users")
      .select("*")
      .order("created_at", { ascending: false });

    if (isMissing(error)) {
      return NextResponse.json({ users: [] });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ users: data ?? [] });
  } catch (err) {
    console.error("GET platform/users error", err);
    return NextResponse.json({ error: "Failed to load platform users" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = getAdmin();
    const body = await request.json();

    const { email, full_name, role, phone, password } = body;

    if (!email || !full_name || !role) {
      return NextResponse.json(
        { error: "email, full_name and role are required" },
        { status: 400 },
      );
    }

    const generatedPassword =
      password ||
      Math.random().toString(36).slice(2, 10) +
        Math.random().toString(36).slice(2, 4).toUpperCase() +
        "!";

    // Create Supabase auth user
    const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
      email,
      password: generatedPassword,
      email_confirm: true,
      user_metadata: { full_name, role },
    });

    if (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: 500 });
    }

    // Insert into platform_users
    const { data, error } = await admin
      .from("platform_users")
      .insert({
        id: authUser.user.id,
        email,
        full_name,
        role,
        phone: phone ?? null,
      })
      .select()
      .single();

    if (error) {
      // Rollback auth user
      await admin.auth.admin.deleteUser(authUser.user.id);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      user: data,
      credentials: { email, password: generatedPassword },
    });
  } catch (err) {
    console.error("POST platform/users error", err);
    return NextResponse.json({ error: "Failed to create platform user" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = getAdmin();
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const { data, error } = await admin
      .from("platform_users")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ user: data });
  } catch (err) {
    console.error("PATCH platform/users error", err);
    return NextResponse.json({ error: "Failed to update platform user" }, { status: 500 });
  }
}
