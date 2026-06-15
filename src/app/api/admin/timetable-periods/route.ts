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

  const schoolId = req.nextUrl.searchParams.get("schoolId");
  if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 });

  const { data, error } = await getAdmin()
    .from("timetable_periods")
    .select("*")
    .eq("school_id", schoolId)
    .order("sort_order")
    .order("start_time");

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
  const { school_id, name, start_time, end_time, sort_order, is_break } = body as {
    school_id: string;
    name: string;
    start_time: string;
    end_time: string;
    sort_order?: number;
    is_break?: boolean;
  };

  const { data, error } = await getAdmin()
    .from("timetable_periods")
    .insert({ school_id, name, start_time, end_time, sort_order: sort_order ?? 0, is_break: is_break ?? false })
    .select()
    .single();

  if (error) {
    if (isTableMissing(error)) return NextResponse.json({ tableNotReady: true });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const body = await req.json();
  const { data, error } = await getAdmin()
    .from("timetable_periods")
    .update(body)
    .eq("id", id)
    .select()
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

  const { error } = await getAdmin().from("timetable_periods").delete().eq("id", id);

  if (error) {
    if (isTableMissing(error)) return NextResponse.json({ tableNotReady: true });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
