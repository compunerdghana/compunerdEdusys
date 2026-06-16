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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = getAdmin();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    const { data, error, count } = await admin
      .from("school_activity_logs")
      .select("*", { count: "exact" })
      .eq("school_id", id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (isMissing(error)) {
      return NextResponse.json({ logs: [], total: 0 });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ logs: data ?? [], total: count ?? 0 });
  } catch (err) {
    console.error("GET platform/schools/[id]/activity error", err);
    return NextResponse.json({ error: "Failed to load activity logs" }, { status: 500 });
  }
}
