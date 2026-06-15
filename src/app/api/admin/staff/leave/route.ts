import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function POST(req: NextRequest) {
  const { schoolId, profile_id, leave_type_id, leave_type_name, start_date, end_date, days_requested, reason } = await req.json();

  const { data, error } = await getAdmin().from("staff_leave_requests").insert({
    school_id: schoolId,
    profile_id,
    leave_type_id: leave_type_id || null,
    leave_type_name,
    start_date,
    end_date,
    days_requested,
    reason: reason || null,
    status: "pending",
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest) {
  const { id, status, reviewer_note, reviewed_by } = await req.json();

  const { data, error } = await getAdmin().from("staff_leave_requests").update({
    status,
    reviewer_note: reviewer_note || null,
    reviewed_by: reviewed_by || null,
    reviewed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", id).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
