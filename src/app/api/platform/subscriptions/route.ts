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

export async function GET(request: NextRequest) {
  try {
    const admin = getAdmin();
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get("schoolId");

    let query = admin
      .from("school_subscriptions")
      .select(
        `*, subscription_plans ( name, display_name, price_monthly, price_annual ),
         schools ( name )`,
      )
      .order("created_at", { ascending: false });

    if (schoolId) {
      query = query.eq("school_id", schoolId);
    }

    const { data, error } = await query;
    if (isMissing(error)) {
      return NextResponse.json({ subscriptions: [] });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ subscriptions: data ?? [] });
  } catch (err) {
    console.error("GET platform/subscriptions error", err);
    return NextResponse.json({ error: "Failed to load subscriptions" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = getAdmin();
    const body = await request.json();

    const {
      school_id,
      plan_id,
      status = "active",
      billing_cycle = "annual",
      amount,
      notes,
      created_by,
      trial_days,
    } = body;

    if (!school_id || !plan_id) {
      return NextResponse.json(
        { error: "school_id and plan_id are required" },
        { status: 400 },
      );
    }

    const now = new Date();
    const expiresAt = new Date(now);
    if (billing_cycle === "annual") {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    const trialEndsAt = trial_days
      ? new Date(now.getTime() + Number(trial_days) * 86400_000)
      : null;

    const { data, error } = await admin
      .from("school_subscriptions")
      .insert({
        school_id,
        plan_id,
        status,
        started_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        trial_ends_at: trialEndsAt?.toISOString() ?? null,
        amount: amount ?? null,
        billing_cycle,
        notes: notes ?? null,
        created_by: created_by ?? null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update school status
    await admin
      .from("schools")
      .update({ status: status === "trial" ? "trial" : "active" })
      .eq("id", school_id);

    return NextResponse.json({ subscription: data });
  } catch (err) {
    console.error("POST platform/subscriptions error", err);
    return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = getAdmin();
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    // If renewing, calculate new expiry
    if (updates.renew) {
      delete updates.renew;
      const now = new Date();
      const expiresAt = new Date(now);
      if (updates.billing_cycle === "annual") {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      } else {
        expiresAt.setMonth(expiresAt.getMonth() + 1);
      }
      updates.expires_at = expiresAt.toISOString();
      updates.status = "active";
      updates.started_at = now.toISOString();
    }

    const { data, error } = await admin
      .from("school_subscriptions")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Sync school status if subscription status changed
    if (updates.status && data?.school_id) {
      const statusMap: Record<string, string> = {
        active: "active",
        trial: "trial",
        expired: "expired",
        suspended: "suspended",
        cancelled: "expired",
      };
      await admin
        .from("schools")
        .update({ status: statusMap[updates.status] ?? "active" })
        .eq("id", data.school_id);
    }

    return NextResponse.json({ subscription: data });
  } catch (err) {
    console.error("PATCH platform/subscriptions error", err);
    return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 });
  }
}
