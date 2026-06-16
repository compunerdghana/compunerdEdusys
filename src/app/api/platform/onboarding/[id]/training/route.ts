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
      return NextResponse.json({ sessions: [] });
    }

    const { data, error } = await admin
      .from("onboarding_training_sessions")
      .select("*")
      .eq("school_id", schoolId)
      .order("scheduled_date", { ascending: true });

    if (isMissing(error)) {
      return NextResponse.json({ sessions: [] });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ sessions: data ?? [] });
  } catch (err) {
    console.error("GET platform/onboarding/[id]/training error", err);
    return NextResponse.json({ error: "Failed to load training sessions" }, { status: 500 });
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
    const { training_type, trainer_name, trainer_id, scheduled_date, duration_hours, location, mode, notes } = body;

    if (!training_type) {
      return NextResponse.json({ error: "training_type is required" }, { status: 400 });
    }

    const schoolId = await getSchoolId(admin, id);
    if (!schoolId) {
      return NextResponse.json({ error: "Onboarding not found" }, { status: 404 });
    }

    const { data, error } = await admin
      .from("onboarding_training_sessions")
      .insert({
        school_id: schoolId,
        training_type,
        trainer_name: trainer_name ?? null,
        trainer_id: trainer_id ?? null,
        scheduled_date: scheduled_date ?? null,
        duration_hours: duration_hours ?? null,
        location: location ?? null,
        mode: mode ?? "onsite",
        notes: notes ?? null,
        status: "scheduled",
      })
      .select()
      .single();

    if (isMissing(error)) {
      return NextResponse.json({ error: "Training sessions table not found" }, { status: 500 });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log activity
    await admin.from("onboarding_activity_logs").insert({
      school_id: schoolId,
      action: "training_session_created",
      description: `Training session scheduled: ${training_type} on ${scheduled_date ?? "TBD"}`,
      metadata: { session_id: data.id, training_type, scheduled_date },
    });

    return NextResponse.json({ session: data }, { status: 201 });
  } catch (err) {
    console.error("POST platform/onboarding/[id]/training error", err);
    return NextResponse.json({ error: "Failed to create training session" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId query param is required" }, { status: 400 });
    }

    const admin = getAdmin();
    const body = await request.json();

    const allowedFields = [
      "training_type", "trainer_name", "trainer_id", "scheduled_date", "duration_hours",
      "location", "mode", "status", "attendance_count", "notes",
    ];
    const updates: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    if (body.status === "completed" && !updates.completed_at) {
      updates.completed_at = new Date().toISOString();
    }

    const schoolId = await getSchoolId(admin, id);

    const { data, error } = await admin
      .from("onboarding_training_sessions")
      .update(updates)
      .eq("id", sessionId)
      .eq("school_id", schoolId ?? "")
      .select()
      .single();

    if (isMissing(error)) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ session: data });
  } catch (err) {
    console.error("PATCH platform/onboarding/[id]/training error", err);
    return NextResponse.json({ error: "Failed to update training session" }, { status: 500 });
  }
}
