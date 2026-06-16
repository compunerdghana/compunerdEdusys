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
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);

    const { data, error } = await admin
      .from("feature_activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (isMissing(error)) {
      return NextResponse.json({ activity: [] });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ activity: data ?? [] });
  } catch (err) {
    console.error("GET platform/features/activity error", err);
    return NextResponse.json({ error: "Failed to load activity logs" }, { status: 500 });
  }
}
