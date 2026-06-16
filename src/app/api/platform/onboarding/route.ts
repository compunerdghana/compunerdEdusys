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

const DEFAULT_TASKS = [
  { title: "Collect and verify school registration documents", category: "verification", priority: "high" },
  { title: "Create school administrator account", category: "setup", priority: "high" },
  { title: "Configure school portal and slug", category: "setup", priority: "high" },
  { title: "Upload school logo and branding assets", category: "branding", priority: "medium" },
  { title: "Complete school profile information", category: "profile", priority: "medium" },
  { title: "Set up school subscription and billing", category: "billing", priority: "high" },
  { title: "Import student and staff data", category: "data_migration", priority: "medium" },
  { title: "Conduct administrator training session", category: "training", priority: "high" },
  { title: "Conduct teacher training session", category: "training", priority: "medium" },
  { title: "Perform user acceptance testing", category: "testing", priority: "high" },
];

export async function GET(request: NextRequest) {
  try {
    const admin = getAdmin();
    const { searchParams } = new URL(request.url);
    const stage = searchParams.get("stage");
    const q = searchParams.get("q");

    let query = admin
      .from("school_onboarding")
      .select(
        `*, schools(id, name, logo_url, school_code, region), platform_users(id, full_name)`,
      )
      .order("created_at", { ascending: false });

    if (stage) {
      query = query.eq("stage", stage);
    }
    if (q) {
      query = query.ilike("schools.name", `%${q}%`);
    }

    const { data, error } = await query;

    if (isMissing(error)) {
      return NextResponse.json({ onboardings: [] });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ onboardings: data ?? [] });
  } catch (err) {
    console.error("GET platform/onboarding error", err);
    return NextResponse.json({ error: "Failed to load onboardings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = getAdmin();
    const body = await request.json();
    const { school_id, expected_go_live, assigned_officer_id, notes } = body;

    if (!school_id) {
      return NextResponse.json({ error: "school_id is required" }, { status: 400 });
    }

    // Create core onboarding record
    const { data: onboarding, error: onboardingError } = await admin
      .from("school_onboarding")
      .insert({
        school_id,
        stage: "registered",
        progress_pct: 15,
        expected_go_live: expected_go_live ?? null,
        assigned_officer_id: assigned_officer_id ?? null,
        notes: notes ?? null,
      })
      .select()
      .single();

    if (isMissing(onboardingError)) {
      return NextResponse.json({ error: "Onboarding table not found" }, { status: 500 });
    }
    if (onboardingError) {
      return NextResponse.json({ error: onboardingError.message }, { status: 500 });
    }

    // Auto-create related records in parallel (best-effort)
    await Promise.allSettled([
      admin.from("school_profiles").upsert({ school_id }, { onConflict: "school_id" }),
      admin.from("school_branding").upsert({ school_id }, { onConflict: "school_id" }),
      admin.from("school_portals").upsert({ school_id }, { onConflict: "school_id" }),
      admin
        .from("onboarding_verification_records")
        .upsert({ school_id }, { onConflict: "school_id" }),
      admin
        .from("onboarding_go_live_checklists")
        .upsert({ school_id }, { onConflict: "school_id" }),
    ]);

    // Auto-create default tasks
    const tasks = DEFAULT_TASKS.map((t) => ({
      ...t,
      school_id,
      onboarding_id: onboarding.id,
      status: "pending" as const,
    }));

    await admin.from("onboarding_tasks").insert(tasks);

    // Log activity
    await admin.from("onboarding_activity_logs").insert({
      school_id,
      action: "onboarding_created",
      description: "School onboarding record created and default tasks assigned",
      metadata: { onboarding_id: onboarding.id, stage: "registered" },
    });

    return NextResponse.json({ onboarding }, { status: 201 });
  } catch (err) {
    console.error("POST platform/onboarding error", err);
    return NextResponse.json({ error: "Failed to create onboarding" }, { status: 500 });
  }
}
