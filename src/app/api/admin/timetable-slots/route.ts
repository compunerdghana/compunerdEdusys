import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function getUser() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

function isTableMissing(err: { code?: string; message?: string } | null) {
  if (!err) return false;
  return (
    err.code === "42P01" ||
    (typeof err.message === "string" && err.message.includes("does not exist"))
  );
}

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const schoolId = searchParams.get("schoolId");
  const classId = searchParams.get("classId");
  const termId = searchParams.get("termId");

  if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 });

  let query = admin
    .from("timetable_slots")
    .select("*, timetable_periods(*), subjects(id, name), profiles(id, full_name)")
    .eq("school_id", schoolId);

  if (classId) query = query.eq("classroom_id", classId);
  if (termId) query = query.eq("term_id", termId);

  const { data, error } = await query;

  if (error) {
    if (isTableMissing(error)) return NextResponse.json({ tableNotReady: true });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { school_id, classroom_id, period_id, day_of_week, subject_id, teacher_id, term_id } = body as {
    school_id: string;
    classroom_id: string;
    period_id: string;
    day_of_week: number;
    subject_id?: string | null;
    teacher_id?: string | null;
    term_id?: string | null;
  };

  // NULL term_id breaks ON CONFLICT matching, so we DELETE the existing slot then INSERT
  const deleteQuery = admin
    .from("timetable_slots")
    .delete()
    .eq("classroom_id", classroom_id)
    .eq("period_id", period_id)
    .eq("day_of_week", day_of_week);

  if (term_id) {
    await deleteQuery.eq("term_id", term_id);
  } else {
    await deleteQuery.is("term_id", null);
  }

  const { data, error } = await getAdmin()
    .from("timetable_slots")
    .insert({ school_id, classroom_id, period_id, day_of_week, subject_id: subject_id ?? null, teacher_id: teacher_id ?? null, term_id: term_id ?? null })
    .select("*, subjects(id, name), profiles(id, full_name)")
    .single();

  if (error) {
    if (isTableMissing(error)) return NextResponse.json({ tableNotReady: true });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data });
}

export async function DELETE(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await getAdmin().from("timetable_slots").delete().eq("id", id);

  if (error) {
    if (isTableMissing(error)) return NextResponse.json({ tableNotReady: true });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
