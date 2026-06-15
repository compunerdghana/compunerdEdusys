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
  const { schoolId, profile_id, exit_type, exit_date, notice_date, last_working_day, reason, clearance_status, handover_notes, processed_by } = await req.json();

  const { data, error } = await getAdmin().from("staff_exit_records").insert({
    school_id: schoolId, profile_id, exit_type, exit_date,
    notice_date: notice_date || null,
    last_working_day: last_working_day || null,
    reason: reason || null,
    clearance_status: clearance_status ?? "pending",
    handover_notes: handover_notes || null,
    processed_by: processed_by || null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Deactivate the staff account
  await getAdmin().from("profiles").update({ is_active: false }).eq("id", profile_id);

  // Update employment_status in staff_details
  const statusMap: Record<string, string> = {
    resignation: "resigned", retirement: "retired",
    termination: "terminated", death: "deceased",
    contract_end: "contract_ended", transfer_out: "transferred",
  };
  await getAdmin().from("staff_details").update({ employment_status: statusMap[exit_type] ?? "inactive" }).eq("profile_id", profile_id);

  // Log timeline
  await getAdmin().from("staff_timeline_events").insert({
    school_id: schoolId, profile_id,
    event_type: "exit",
    title: `Exit: ${exit_type.replace("_", " ")}`,
    description: reason || undefined,
    event_date: exit_date,
    created_by: processed_by || null,
  });

  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest) {
  const { id, clearance_status } = await req.json();
  const { data, error } = await getAdmin().from("staff_exit_records").update({ clearance_status }).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
