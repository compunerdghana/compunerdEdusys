import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

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

const ALL_STAGES = [
  "lead",
  "registered",
  "verification_pending",
  "verified",
  "contract_signed",
  "payment_confirmed",
  "setup_in_progress",
  "data_migration",
  "training_ongoing",
  "user_testing",
  "go_live_ready",
  "active",
];

export async function GET() {
  try {
    const admin = getAdmin();

    const { data, error } = await admin
      .from("school_onboarding")
      .select(
        `id, stage, progress_pct, is_delayed, expected_go_live, created_at,
         schools(id, name, logo_url, school_code, region)`,
      )
      .order("created_at", { ascending: false });

    if (isMissing(error)) {
      return NextResponse.json({ pipeline: ALL_STAGES.map((stage) => ({ stage, count: 0, schools: [] })) });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Group by stage
    const stageMap = new Map<string, { count: number; schools: unknown[] }>();

    for (const stage of ALL_STAGES) {
      stageMap.set(stage, { count: 0, schools: [] });
    }

    for (const record of data ?? []) {
      const stageKey = record.stage as string;
      if (!stageMap.has(stageKey)) {
        stageMap.set(stageKey, { count: 0, schools: [] });
      }
      const entry = stageMap.get(stageKey)!;
      entry.count += 1;
      entry.schools.push(record);
    }

    const pipeline = ALL_STAGES.map((stage) => ({
      stage,
      ...stageMap.get(stage),
    }));

    const totalActive = (data ?? []).filter(
      (r) => !["active", "lead"].includes(r.stage as string),
    ).length;

    const totalDelayed = (data ?? []).filter((r) => r.is_delayed).length;

    return NextResponse.json({
      pipeline,
      summary: {
        total: (data ?? []).length,
        totalActive,
        totalDelayed,
        totalCompleted: stageMap.get("active")?.count ?? 0,
      },
    });
  } catch (err) {
    console.error("GET platform/onboarding/pipeline error", err);
    return NextResponse.json({ error: "Failed to load pipeline" }, { status: 500 });
  }
}
