import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

const isMissing = (e: unknown) =>
  (e as { code?: string; message?: string })?.code === "42P01" ||
  (e as { message?: string })?.message?.includes("does not exist");

export async function GET(request: NextRequest) {
  try {
    const admin = getAdmin();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") || "50"), 200);
    const offset = Number(searchParams.get("offset") || "0");
    const schoolId = searchParams.get("schoolId");

    let query = admin
      .from("platform_audit_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (schoolId) {
      query = query.eq("target_id", schoolId);
    }

    const { data, error, count } = await query;

    if (isMissing(error)) {
      return NextResponse.json({ logs: [], total: 0 });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ logs: data ?? [], total: count ?? 0 });
  } catch (err) {
    console.error("GET platform/audit error", err);
    return NextResponse.json({ error: "Failed to load audit logs" }, { status: 500 });
  }
}
