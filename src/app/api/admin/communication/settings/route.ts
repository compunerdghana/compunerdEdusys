import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function GET(req: NextRequest) {
  const schoolId = new URL(req.url).searchParams.get("schoolId");
  if (!schoolId) return NextResponse.json({ error: "Missing schoolId" }, { status: 400 });

  const admin = getAdmin();
  const { data, error } = await admin.from("communication_settings")
    .select("*").eq("school_id", schoolId).maybeSingle();

  if (error?.code === "42P01") return NextResponse.json({ data: null, tableNotReady: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { school_id, ...settings } = body;
  if (!school_id) return NextResponse.json({ error: "Missing school_id" }, { status: 400 });

  const admin = getAdmin();
  const { data, error } = await admin.from("communication_settings")
    .upsert({ school_id, ...settings, updated_at: new Date().toISOString() }, { onConflict: "school_id" })
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
