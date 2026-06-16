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

const STAGE_PROGRESS: Record<string, number> = {
  lead: 5,
  registered: 15,
  verification_pending: 20,
  verified: 30,
  contract_signed: 35,
  payment_confirmed: 40,
  setup_in_progress: 50,
  data_migration: 60,
  training_ongoing: 70,
  user_testing: 80,
  go_live_ready: 90,
  active: 100,
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const admin = getAdmin();
    const body = await request.json();
    const { stage, notes, changed_by, user_name } = body;

    if (!stage) {
      return NextResponse.json({ error: "stage is required" }, { status: 400 });
    }

    if (!(stage in STAGE_PROGRESS)) {
      return NextResponse.json({ error: `Invalid stage: ${stage}` }, { status: 400 });
    }

    // Get current onboarding record
    const { data: current, error: fetchError } = await admin
      .from("school_onboarding")
      .select("id, stage, school_id")
      .eq("id", id)
      .single();

    if (isMissing(fetchError)) {
      return NextResponse.json({ error: "Onboarding not found" }, { status: 404 });
    }
    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const progress_pct = STAGE_PROGRESS[stage];
    const fromStage = current.stage;

    // Update onboarding stage
    const { data: updated, error: updateError } = await admin
      .from("school_onboarding")
      .update({
        stage,
        progress_pct,
        updated_at: new Date().toISOString(),
        ...(stage === "active" ? { actual_go_live: new Date().toISOString().split("T")[0] } : {}),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Log stage history
    await admin.from("onboarding_stage_history").insert({
      onboarding_id: id,
      from_stage: fromStage,
      to_stage: stage,
      changed_by: changed_by ?? null,
      notes: notes ?? null,
    });

    // Log activity
    await admin.from("onboarding_activity_logs").insert({
      school_id: current.school_id,
      user_id: changed_by ?? null,
      user_name: user_name ?? null,
      action: "stage_changed",
      description: `Stage advanced from "${fromStage}" to "${stage}"`,
      metadata: { from_stage: fromStage, to_stage: stage, progress_pct, onboarding_id: id },
    });

    return NextResponse.json({ onboarding: updated, progress_pct });
  } catch (err) {
    console.error("POST platform/onboarding/[id]/stage error", err);
    return NextResponse.json({ error: "Failed to update stage" }, { status: 500 });
  }
}
