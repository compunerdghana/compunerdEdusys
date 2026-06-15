import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const profileId = searchParams.get("profileId");
  const schoolId = searchParams.get("schoolId");
  if (!profileId || !schoolId) return NextResponse.json({ error: "Missing params" }, { status: 400 });

  const { data, error } = await admin
    .from("staff_timeline_events")
    .select("id, event_type, title, description, event_date, created_at")
    .eq("school_id", schoolId)
    .eq("profile_id", profileId)
    .order("event_date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const { schoolId, profile_id, event_type, title, description, event_date, created_by } = await req.json();

  const { data, error } = await admin.from("staff_timeline_events").insert({
    school_id: schoolId, profile_id, event_type, title,
    description: description || null,
    event_date: event_date ?? new Date().toISOString().split("T")[0],
    created_by: created_by || null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
