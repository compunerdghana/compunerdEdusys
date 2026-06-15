import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const schoolId = searchParams.get("schoolId");
  const date = searchParams.get("date");
  if (!schoolId || !date) return NextResponse.json({ error: "Missing params" }, { status: 400 });

  const { data, error } = await admin
    .from("staff_attendance_records")
    .select("id, profile_id, status, check_in, check_out, note")
    .eq("school_id", schoolId)
    .eq("date", date);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const { schoolId, date, records, marked_by } = await req.json();
  if (!schoolId || !date || !records) return NextResponse.json({ error: "Missing params" }, { status: 400 });

  const rows = records.map((r: { profile_id: string; status: string; check_in?: string; check_out?: string; note?: string }) => ({
    school_id: schoolId,
    profile_id: r.profile_id,
    date,
    status: r.status,
    check_in: r.check_in ?? null,
    check_out: r.check_out ?? null,
    note: r.note ?? null,
    marked_by: marked_by ?? null,
  }));

  const { error } = await admin
    .from("staff_attendance_records")
    .upsert(rows, { onConflict: "school_id,profile_id,date" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
