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
  const { schoolId, profile_id, previous_designation, new_designation, previous_salary, new_salary, effective_date, reason, approved_by } = await req.json();

  const { data, error } = await getAdmin().from("staff_promotion_history").insert({
    school_id: schoolId, profile_id,
    previous_designation: previous_designation || null,
    new_designation,
    previous_salary: previous_salary ?? null,
    new_salary: new_salary ?? null,
    effective_date,
    reason: reason || null,
    approved_by: approved_by || null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Also update staff_details designation
  await getAdmin().from("staff_details").update({ designation: new_designation }).eq("profile_id", profile_id).eq("school_id", schoolId);

  // Log timeline event
  await getAdmin().from("staff_timeline_events").insert({
    school_id: schoolId, profile_id,
    event_type: "promoted",
    title: `Promoted to ${new_designation}`,
    description: previous_designation ? `Previous: ${previous_designation}` : undefined,
    event_date: effective_date,
    created_by: approved_by || null,
  }).select();

  return NextResponse.json({ data });
}
