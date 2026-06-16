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
      return NextResponse.json({ branding: null });
    }

    const { data, error } = await admin
      .from("school_branding")
      .select("*")
      .eq("school_id", schoolId)
      .maybeSingle();

    if (isMissing(error)) {
      return NextResponse.json({ branding: null });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ branding: data });
  } catch (err) {
    console.error("GET platform/onboarding/[id]/branding error", err);
    return NextResponse.json({ error: "Failed to load branding" }, { status: 500 });
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
    const { logo_url, banner_url, primary_color, secondary_color, uploaded_by } = body;

    const schoolId = await getSchoolId(admin, id);
    if (!schoolId) {
      return NextResponse.json({ error: "Onboarding not found" }, { status: 404 });
    }

    const now = new Date().toISOString();
    const updates: Record<string, unknown> = { updated_at: now };

    if ("logo_url" in body) {
      updates.logo_url = logo_url;
      updates.logo_uploaded_at = now;
      updates.logo_uploaded_by = uploaded_by ?? null;
    }
    if ("banner_url" in body) {
      updates.banner_url = banner_url;
      updates.banner_uploaded_at = now;
    }
    if ("primary_color" in body) {
      updates.primary_color = primary_color;
    }
    if ("secondary_color" in body) {
      updates.secondary_color = secondary_color;
    }

    const { data, error } = await admin
      .from("school_branding")
      .upsert({ school_id: schoolId, ...updates }, { onConflict: "school_id" })
      .select()
      .single();

    if (isMissing(error)) {
      return NextResponse.json({ error: "Branding table not found" }, { status: 500 });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log activity
    await admin.from("onboarding_activity_logs").insert({
      school_id: schoolId,
      action: "branding_updated",
      description: "School branding assets updated",
      metadata: {
        updated_fields: Object.keys(body).filter((k) =>
          ["logo_url", "banner_url", "primary_color", "secondary_color"].includes(k),
        ),
      },
    });

    return NextResponse.json({ branding: data });
  } catch (err) {
    console.error("PATCH platform/onboarding/[id]/branding error", err);
    return NextResponse.json({ error: "Failed to update branding" }, { status: 500 });
  }
}
