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
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const admin = getAdmin();

    const { data: onboarding, error } = await admin
      .from("school_onboarding")
      .select(
        `*, schools(id, name, logo_url, school_code, region, district, phone, website, school_type, status),
         platform_users(id, full_name)`,
      )
      .eq("id", id)
      .single();

    if (isMissing(error)) {
      return NextResponse.json({ error: "Onboarding not found" }, { status: 404 });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const schoolId = onboarding.school_id;

    const [profileRes, brandingRes, portalRes, verificationRes, goLiveRes, tasksRes, trainingRes, migrationsRes] =
      await Promise.all([
        admin.from("school_profiles").select("*").eq("school_id", schoolId).maybeSingle(),
        admin.from("school_branding").select("*").eq("school_id", schoolId).maybeSingle(),
        admin.from("school_portals").select("*").eq("school_id", schoolId).maybeSingle(),
        admin
          .from("onboarding_verification_records")
          .select("*")
          .eq("school_id", schoolId)
          .maybeSingle(),
        admin
          .from("onboarding_go_live_checklists")
          .select("*")
          .eq("school_id", schoolId)
          .maybeSingle(),
        admin
          .from("onboarding_tasks")
          .select("*")
          .eq("onboarding_id", id)
          .order("created_at", { ascending: true }),
        admin
          .from("onboarding_training_sessions")
          .select("*")
          .eq("school_id", schoolId)
          .order("scheduled_date", { ascending: true }),
        admin
          .from("onboarding_data_migrations")
          .select("*")
          .eq("school_id", schoolId)
          .order("created_at", { ascending: true }),
      ]);

    return NextResponse.json({
      onboarding,
      profile: isMissing(profileRes.error) ? null : profileRes.data,
      branding: isMissing(brandingRes.error) ? null : brandingRes.data,
      portal: isMissing(portalRes.error) ? null : portalRes.data,
      verification: isMissing(verificationRes.error) ? null : verificationRes.data,
      goLive: isMissing(goLiveRes.error) ? null : goLiveRes.data,
      tasks: isMissing(tasksRes.error) ? [] : (tasksRes.data ?? []),
      training: isMissing(trainingRes.error) ? [] : (trainingRes.data ?? []),
      dataMigrations: isMissing(migrationsRes.error) ? [] : (migrationsRes.data ?? []),
    });
  } catch (err) {
    console.error("GET platform/onboarding/[id] error", err);
    return NextResponse.json({ error: "Failed to load onboarding" }, { status: 500 });
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

    const allowedFields = ["stage", "progress_pct", "notes", "is_delayed", "delay_reason", "assigned_officer_id", "expected_go_live"];
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    const { data, error } = await admin
      .from("school_onboarding")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (isMissing(error)) {
      return NextResponse.json({ error: "Onboarding not found" }, { status: 404 });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ onboarding: data });
  } catch (err) {
    console.error("PATCH platform/onboarding/[id] error", err);
    return NextResponse.json({ error: "Failed to update onboarding" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const admin = getAdmin();

    const { error } = await admin.from("school_onboarding").delete().eq("id", id);

    if (isMissing(error)) {
      return NextResponse.json({ error: "Onboarding not found" }, { status: 404 });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE platform/onboarding/[id] error", err);
    return NextResponse.json({ error: "Failed to delete onboarding" }, { status: 500 });
  }
}
