import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

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
      .from("platform_permissions")
      .select("*")
      .order("module")
      .order("action");

    if (isMissing(error)) {
      return NextResponse.json({ permissions: {}, flat: [] });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const flat = data ?? [];

    // Group by module
    const grouped: Record<string, { id: string; action: string; display_name: string | null; description: string | null }[]> = {};
    for (const perm of flat) {
      if (!grouped[perm.module]) grouped[perm.module] = [];
      grouped[perm.module].push({
        id: perm.id,
        action: perm.action,
        display_name: perm.display_name,
        description: perm.description,
      });
    }

    return NextResponse.json({ permissions: grouped, flat });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
