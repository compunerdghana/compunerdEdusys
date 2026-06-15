import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

export async function POST(req: NextRequest) {
  const { schoolId, profile_id, transfer_type, previous_department, new_department, previous_branch, new_branch, effective_date, reason, approved_by } = await req.json();

  const { data, error } = await admin.from("staff_transfer_records").insert({
    school_id: schoolId, profile_id, transfer_type,
    previous_department: previous_department || null,
    new_department,
    previous_branch: previous_branch || null,
    new_branch: new_branch || null,
    effective_date,
    reason: reason || null,
    approved_by: approved_by || null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update department in staff_details
  await admin.from("staff_details").update({ department: new_department }).eq("profile_id", profile_id).eq("school_id", schoolId);

  // Log timeline
  await admin.from("staff_timeline_events").insert({
    school_id: schoolId, profile_id,
    event_type: "transferred",
    title: `Transferred to ${new_department}`,
    description: previous_department ? `From: ${previous_department}` : undefined,
    event_date: effective_date,
    created_by: approved_by || null,
  });

  return NextResponse.json({ data });
}
