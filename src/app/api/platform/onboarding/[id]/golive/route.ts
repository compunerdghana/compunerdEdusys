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

async function getSchoolId(admin: ReturnType<typeof getAdmin>, onboardingId: string) {
  const { data, error } = await admin
    .from("school_onboarding")
    .select("school_id")
    .eq("id", onboardingId)
    .single();
  if (error || !data) return null;
  return data.school_id as string;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const admin = getAdmin();
    const schoolId = await getSchoolId(admin, id);

    if (!schoolId) {
      return NextResponse.json({ goLive: null });
    }

    const { data, error } = await admin
      .from("onboarding_go_live_checklists")
      .select("*")
      .eq("school_id", schoolId)
      .maybeSingle();

    if (isMissing(error)) {
      return NextResponse.json({ goLive: null });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ goLive: data });
  } catch (err) {
    console.error("GET platform/onboarding/[id]/golive error", err);
    return NextResponse.json({ error: "Failed to load go-live checklist" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const admin = getAdmin();
    const body = await request.json();

    const schoolId = await getSchoolId(admin, id);
    if (!schoolId) {
      return NextResponse.json({ error: "Onboarding not found" }, { status: 404 });
    }

    const allowedFields = [
      "verification_approved", "school_account_active", "portal_configured",
      "branding_completed", "data_migration_done", "user_accounts_created",
      "training_completed", "testing_completed", "subscription_activated",
      "impl_officer_approved", "platform_manager_approved", "go_live_date",
    ];
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    const { data, error } = await admin
      .from("onboarding_go_live_checklists")
      .upsert({ school_id: schoolId, ...updates }, { onConflict: "school_id" })
      .select()
      .single();

    if (isMissing(error)) {
      return NextResponse.json({ error: "Go-live checklist table not found" }, { status: 500 });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ goLive: data });
  } catch (err) {
    console.error("PATCH platform/onboarding/[id]/golive error", err);
    return NextResponse.json({ error: "Failed to update go-live checklist" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const admin = getAdmin();
    const body = await request.json();
    const { action, go_live_date, user_id, user_name } = body;

    if (action !== "approve") {
      return NextResponse.json({ error: "action must be: approve" }, { status: 400 });
    }

    const schoolId = await getSchoolId(admin, id);
    if (!schoolId) {
      return NextResponse.json({ error: "Onboarding not found" }, { status: 404 });
    }

    const now = new Date().toISOString();
    const today = now.split("T")[0];

    // Update go-live checklist
    await admin
      .from("onboarding_go_live_checklists")
      .upsert(
        {
          school_id: schoolId,
          platform_manager_approved: true,
          go_live_date: go_live_date ?? today,
          updated_at: now,
        },
        { onConflict: "school_id" },
      );

    // Advance onboarding to active
    const { data: onboarding, error: stageError } = await admin
      .from("school_onboarding")
      .update({
        stage: "active",
        progress_pct: 100,
        actual_go_live: go_live_date ?? today,
        updated_at: now,
      })
      .eq("id", id)
      .select()
      .single();

    if (stageError) {
      return NextResponse.json({ error: stageError.message }, { status: 500 });
    }

    // Log stage history
    await admin.from("onboarding_stage_history").insert({
      onboarding_id: id,
      from_stage: "go_live_ready",
      to_stage: "active",
      changed_by: user_id ?? null,
      notes: `Go-live approved. Go-live date: ${go_live_date ?? today}`,
    });

    // Log activity
    await admin.from("onboarding_activity_logs").insert({
      school_id: schoolId,
      user_id: user_id ?? null,
      user_name: user_name ?? null,
      action: "go_live_approved",
      description: `School approved for go-live on ${go_live_date ?? today}`,
      metadata: { onboarding_id: id, go_live_date: go_live_date ?? today },
    });

    return NextResponse.json({ onboarding, go_live_date: go_live_date ?? today });
  } catch (err) {
    console.error("POST platform/onboarding/[id]/golive error", err);
    return NextResponse.json({ error: "Failed to approve go-live" }, { status: 500 });
  }
}
