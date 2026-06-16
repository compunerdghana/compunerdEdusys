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

    const { data: roles, error } = await admin
      .from("platform_roles")
      .select("*, platform_role_permissions(id)")
      .order("hierarchy_level", { ascending: false });

    if (isMissing(error)) {
      return NextResponse.json({ roles: [] });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rolesWithCount = (roles ?? []).map((r) => ({
      ...r,
      permission_count: Array.isArray(r.platform_role_permissions)
        ? r.platform_role_permissions.length
        : 0,
      platform_role_permissions: undefined,
    }));

    return NextResponse.json({ roles: rolesWithCount });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = getAdmin();
    const body = await request.json();
    const { name, display_name, description, color } = body;

    if (!name || !display_name) {
      return NextResponse.json({ error: "name and display_name are required" }, { status: 400 });
    }

    const { data, error } = await admin
      .from("platform_roles")
      .insert({ name, display_name, description, color: color ?? "#6b7280", is_system: false })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ role: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
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

    // Prevent modifying system-protected fields
    delete updates.is_system;
    delete updates.hierarchy_level;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await admin
      .from("platform_roles")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ role: data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = getAdmin();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    // Check if system role
    const { data: role, error: fetchError } = await admin
      .from("platform_roles")
      .select("is_system")
      .eq("id", id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (role?.is_system) {
      return NextResponse.json({ error: "Cannot delete a system role" }, { status: 403 });
    }

    const { error } = await admin.from("platform_roles").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
