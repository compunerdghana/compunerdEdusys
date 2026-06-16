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

export async function GET() {
  try {
    const admin = getAdmin();

    const { data: assignments, error } = await admin
      .from("implementation_assignments")
      .select(
        `*, schools(id, name, school_code, region), platform_users(id, full_name)`,
      )
      .eq("is_active", true)
      .order("assigned_at", { ascending: false });

    if (isMissing(error)) {
      return NextResponse.json({ assignments: [] });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Compute school count per officer
    const officerCounts = new Map<string, number>();
    for (const a of assignments ?? []) {
      const officerId = a.officer_id as string;
      officerCounts.set(officerId, (officerCounts.get(officerId) ?? 0) + 1);
    }

    const enriched = (assignments ?? []).map((a) => ({
      ...a,
      officer_school_count: officerCounts.get(a.officer_id as string) ?? 0,
    }));

    return NextResponse.json({ assignments: enriched });
  } catch (err) {
    console.error("GET platform/onboarding/assignments error", err);
    return NextResponse.json({ error: "Failed to load assignments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = getAdmin();
    const body = await request.json();
    const { school_id, officer_id, notes, assigned_by } = body;

    if (!school_id || !officer_id) {
      return NextResponse.json({ error: "school_id and officer_id are required" }, { status: 400 });
    }

    // Deactivate any existing active assignment for this school
    await admin
      .from("implementation_assignments")
      .update({ is_active: false })
      .eq("school_id", school_id)
      .eq("is_active", true);

    const { data, error } = await admin
      .from("implementation_assignments")
      .insert({
        school_id,
        officer_id,
        assigned_by: assigned_by ?? null,
        notes: notes ?? null,
        is_active: true,
      })
      .select(`*, schools(id, name, school_code), platform_users(id, full_name)`)
      .single();

    if (isMissing(error)) {
      return NextResponse.json({ error: "Assignments table not found" }, { status: 500 });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Also update assigned_officer_id on the onboarding record
    await admin
      .from("school_onboarding")
      .update({ assigned_officer_id: officer_id, updated_at: new Date().toISOString() })
      .eq("school_id", school_id);

    // Log activity
    await admin.from("onboarding_activity_logs").insert({
      school_id,
      action: "officer_assigned",
      description: "Implementation officer assigned to school",
      metadata: { officer_id, assignment_id: data.id },
    });

    return NextResponse.json({ assignment: data }, { status: 201 });
  } catch (err) {
    console.error("POST platform/onboarding/assignments error", err);
    return NextResponse.json({ error: "Failed to create assignment" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get("id");

    if (!assignmentId) {
      return NextResponse.json({ error: "id query param is required" }, { status: 400 });
    }

    const admin = getAdmin();

    const { error } = await admin
      .from("implementation_assignments")
      .delete()
      .eq("id", assignmentId);

    if (isMissing(error)) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE platform/onboarding/assignments error", err);
    return NextResponse.json({ error: "Failed to delete assignment" }, { status: 500 });
  }
}
