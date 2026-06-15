import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { profile_id, status, note } = await req.json();
  if (!profile_id || !status) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  // Update employment_status in staff_details
  const { error } = await admin
    .from("staff_details")
    .update({ employment_status: status })
    .eq("profile_id", profile_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log status change if staff_status_logs table exists
  if (note) {
    await admin.from("staff_status_logs").insert({
      profile_id,
      status,
      note,
      changed_by: user.id,
    }).then(() => {});
  }

  return NextResponse.json({ ok: true });
}
