import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getUserPermissions, getSchoolEnabledFeatures } from "@/lib/security/rbac";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ permissions: [], features: [] });

    const { data: profile } = await supabase
      .from("profiles")
      .select("school_id, role")
      .eq("id", user.id)
      .single();

    if (!profile) return NextResponse.json({ permissions: [], features: [] });

    const [permissions, features] = await Promise.all([
      getUserPermissions(user.id),
      profile.school_id ? getSchoolEnabledFeatures(profile.school_id) : Promise.resolve([])
    ]);

    return NextResponse.json({ permissions, features, role: profile.role });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
