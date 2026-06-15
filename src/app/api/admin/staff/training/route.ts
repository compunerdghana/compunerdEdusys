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
  const body = await req.json();
  const { schoolId, profile_id, training_type, title, organizer, start_date, end_date, location, notes, created_by } = body;

  const { data, error } = await getAdmin().from("staff_training_records").insert({
    school_id: schoolId, profile_id, training_type, title,
    organizer: organizer || null, start_date, end_date: end_date || null,
    location: location || null, notes: notes || null, created_by: created_by || null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const schoolId = searchParams.get("schoolId");
  const profileId = searchParams.get("profileId");
  if (!schoolId) return NextResponse.json({ error: "Missing schoolId" }, { status: 400 });

  let q = getAdmin().from("staff_training_records").select("*").eq("school_id", schoolId).order("start_date", { ascending: false });
  if (profileId) q = q.eq("profile_id", profileId);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
