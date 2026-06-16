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
      return NextResponse.json({ verification: null });
    }

    const { data, error } = await admin
      .from("onboarding_verification_records")
      .select("*")
      .eq("school_id", schoolId)
      .maybeSingle();

    if (isMissing(error)) {
      return NextResponse.json({ verification: null });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ verification: data });
  } catch (err) {
    console.error("GET platform/onboarding/[id]/verification error", err);
    return NextResponse.json({ error: "Failed to load verification record" }, { status: 500 });
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
      "school_info_verified", "contact_verified", "subscription_confirmed",
      "payment_confirmed", "logo_uploaded", "admin_account_created",
      "portal_created", "setup_completed",
    ];
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    const { data, error } = await admin
      .from("onboarding_verification_records")
      .upsert({ school_id: schoolId, ...updates }, { onConflict: "school_id" })
      .select()
      .single();

    if (isMissing(error)) {
      return NextResponse.json({ error: "Verification table not found" }, { status: 500 });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ verification: data });
  } catch (err) {
    console.error("PATCH platform/onboarding/[id]/verification error", err);
    return NextResponse.json({ error: "Failed to update verification record" }, { status: 500 });
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
    const { action, notes, user_id, user_name } = body;

    if (!action || !["verify", "approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "action must be one of: verify, approve, reject" }, { status: 400 });
    }

    const schoolId = await getSchoolId(admin, id);
    if (!schoolId) {
      return NextResponse.json({ error: "Onboarding not found" }, { status: 404 });
    }

    const now = new Date().toISOString();
    let updates: Record<string, unknown> = { updated_at: now };

    if (action === "verify") {
      updates = {
        ...updates,
        status: "verified",
        verified_by: user_id ?? null,
        verified_at: now,
        verification_notes: notes ?? null,
      };
    } else if (action === "approve") {
      updates = {
        ...updates,
        status: "approved",
        approved_by: user_id ?? null,
        approved_at: now,
        approval_notes: notes ?? null,
      };
    } else if (action === "reject") {
      updates = {
        ...updates,
        status: "rejected",
        verification_notes: notes ?? null,
      };
    }

    const { data, error } = await admin
      .from("onboarding_verification_records")
      .upsert({ school_id: schoolId, ...updates }, { onConflict: "school_id" })
      .select()
      .single();

    if (isMissing(error)) {
      return NextResponse.json({ error: "Verification table not found" }, { status: 500 });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log activity
    await admin.from("onboarding_activity_logs").insert({
      school_id: schoolId,
      user_id: user_id ?? null,
      user_name: user_name ?? null,
      action: `verification_${action}d`,
      description: `Verification ${action}d${notes ? `: ${notes}` : ""}`,
      metadata: { onboarding_id: id, action, notes },
    });

    return NextResponse.json({ verification: data });
  } catch (err) {
    console.error("POST platform/onboarding/[id]/verification error", err);
    return NextResponse.json({ error: "Failed to update verification status" }, { status: 500 });
  }
}
