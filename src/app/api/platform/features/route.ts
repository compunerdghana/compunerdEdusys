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

const DEFAULT_FEATURES = [
  "students",
  "admissions",
  "finance",
  "attendance",
  "academics",
  "exams",
  "reports",
  "communications",
  "payroll",
  "inventory",
  "transport",
  "hostel",
];

export async function GET(request: NextRequest) {
  try {
    const admin = getAdmin();
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get("schoolId");

    if (!schoolId) {
      return NextResponse.json({ error: "schoolId is required" }, { status: 400 });
    }

    const { data, error } = await admin
      .from("feature_toggles")
      .select("feature, is_enabled, updated_at")
      .eq("school_id", schoolId);

    if (isMissing(error)) {
      // Return defaults
      return NextResponse.json({
        features: DEFAULT_FEATURES.map((f) => ({ feature: f, is_enabled: true })),
      });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const stored = data ?? [];
    const storedMap = Object.fromEntries(stored.map((r) => [r.feature, r.is_enabled]));

    // Merge with defaults
    const features = DEFAULT_FEATURES.map((f) => ({
      feature: f,
      is_enabled: storedMap[f] !== undefined ? storedMap[f] : true,
    }));

    // Include any extra features stored beyond the default list
    for (const row of stored) {
      if (!DEFAULT_FEATURES.includes(row.feature)) {
        features.push({ feature: row.feature, is_enabled: row.is_enabled });
      }
    }

    return NextResponse.json({ features });
  } catch (err) {
    console.error("GET platform/features error", err);
    return NextResponse.json({ error: "Failed to load features" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = getAdmin();
    const body = await request.json();
    const { school_id, feature, is_enabled, updated_by } = body;

    if (!school_id || !feature) {
      return NextResponse.json(
        { error: "school_id and feature are required" },
        { status: 400 },
      );
    }

    const { data, error } = await admin
      .from("feature_toggles")
      .upsert(
        {
          school_id,
          feature,
          is_enabled: is_enabled !== undefined ? is_enabled : true,
          updated_by: updated_by ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "school_id,feature" },
      )
      .select()
      .single();

    if (isMissing(error)) {
      return NextResponse.json({ error: "feature_toggles table not found" }, { status: 500 });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ toggle: data });
  } catch (err) {
    console.error("POST platform/features error", err);
    return NextResponse.json({ error: "Failed to set feature toggle" }, { status: 500 });
  }
}
