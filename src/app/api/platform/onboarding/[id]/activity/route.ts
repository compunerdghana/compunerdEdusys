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
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);

    const admin = getAdmin();

    // Get school_id from onboarding
    const { data: onboarding, error: fetchError } = await admin
      .from("school_onboarding")
      .select("school_id")
      .eq("id", id)
      .single();

    if (isMissing(fetchError) || fetchError || !onboarding) {
      return NextResponse.json({ activities: [] });
    }

    const { data, error } = await admin
      .from("onboarding_activity_logs")
      .select("*")
      .eq("school_id", onboarding.school_id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (isMissing(error)) {
      return NextResponse.json({ activities: [] });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ activities: data ?? [] });
  } catch (err) {
    console.error("GET platform/onboarding/[id]/activity error", err);
    return NextResponse.json({ error: "Failed to load activity logs" }, { status: 500 });
  }
}
