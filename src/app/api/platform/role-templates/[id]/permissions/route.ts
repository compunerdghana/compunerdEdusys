import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = getAdmin();
    const { id } = await params;

    const [allPermsRes, rolePermsRes] = await Promise.all([
      admin.from("school_permissions").select("*").order("name"),
      admin
        .from("school_role_template_permissions")
        .select("permission_id")
        .eq("template_id", id),
    ]);

    if (allPermsRes.error) throw allPermsRes.error;

    const grantedIds = new Set(
      (rolePermsRes.data ?? []).map((rp) => rp.permission_id)
    );

    const permissions = (allPermsRes.data ?? []).map((p) => ({
      ...p,
      granted: grantedIds.has(p.id),
    }));

    return NextResponse.json({ permissions });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = getAdmin();
    const { id } = await params;
    const body = await request.json();
    const { permission_ids }: { permission_ids: string[] } = body;

    if (!Array.isArray(permission_ids)) {
      return NextResponse.json({ error: "permission_ids must be an array" }, { status: 400 });
    }

    // Replace all permissions for role template (trigger will auto-propagate to school roles)
    await admin.from("school_role_template_permissions").delete().eq("template_id", id);

    if (permission_ids.length > 0) {
      const inserts = permission_ids.map((permission_id) => ({
        template_id: id,
        permission_id,
      }));
      const { error } = await admin.from("school_role_template_permissions").insert(inserts);
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
