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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = getAdmin();
    const { id } = await params;

    const [allPermsRes, rolePermsRes] = await Promise.all([
      admin.from("platform_permissions").select("*").order("module").order("action"),
      admin
        .from("platform_role_permissions")
        .select("permission_id")
        .eq("role_id", id),
    ]);

    if (isMissing(allPermsRes.error)) {
      return NextResponse.json({ permissions: [], matrix: {} });
    }
    if (allPermsRes.error) {
      return NextResponse.json({ error: allPermsRes.error.message }, { status: 500 });
    }

    const grantedIds = new Set(
      (rolePermsRes.data ?? []).map((rp) => rp.permission_id),
    );

    const allPerms = allPermsRes.data ?? [];

    // Build permission matrix grouped by module
    const matrix: Record<string, Record<string, { id: string; granted: boolean; display_name: string | null }>> = {};
    for (const perm of allPerms) {
      if (!matrix[perm.module]) matrix[perm.module] = {};
      matrix[perm.module][perm.action] = {
        id: perm.id,
        granted: grantedIds.has(perm.id),
        display_name: perm.display_name,
      };
    }

    const permissions = allPerms.map((p) => ({
      ...p,
      granted: grantedIds.has(p.id),
    }));

    return NextResponse.json({ permissions, matrix });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = getAdmin();
    const { id } = await params;
    const body = await request.json();
    const { permission_ids }: { permission_ids: string[] } = body;

    if (!Array.isArray(permission_ids)) {
      return NextResponse.json({ error: "permission_ids must be an array" }, { status: 400 });
    }

    // Replace all permissions for role
    await admin.from("platform_role_permissions").delete().eq("role_id", id);

    if (permission_ids.length > 0) {
      const inserts = permission_ids.map((permission_id) => ({
        role_id: id,
        permission_id,
      }));
      const { error } = await admin.from("platform_role_permissions").insert(inserts);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    // Return updated matrix
    const [allPermsRes, rolePermsRes] = await Promise.all([
      admin.from("platform_permissions").select("*").order("module").order("action"),
      admin.from("platform_role_permissions").select("permission_id").eq("role_id", id),
    ]);

    const grantedIds = new Set((rolePermsRes.data ?? []).map((rp) => rp.permission_id));
    const allPerms = allPermsRes.data ?? [];

    const matrix: Record<string, Record<string, { id: string; granted: boolean; display_name: string | null }>> = {};
    for (const perm of allPerms) {
      if (!matrix[perm.module]) matrix[perm.module] = {};
      matrix[perm.module][perm.action] = {
        id: perm.id,
        granted: grantedIds.has(perm.id),
        display_name: perm.display_name,
      };
    }

    return NextResponse.json({ success: true, matrix });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
