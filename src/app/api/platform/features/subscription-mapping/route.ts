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

    const [plansRes, featuresRes, mappingsRes] = await Promise.all([
      admin.from("subscription_plans").select("id, name, code").order("name"),
      admin
        .from("platform_features")
        .select("id, name, code, access_level, category_id, category:feature_categories(name)")
        .order("display_order"),
      admin.from("subscription_features").select("plan_id, feature_id, enabled"),
    ]);

    if (isMissing(plansRes.error)) {
      return NextResponse.json({ plans: [], features: [], matrix: {} });
    }
    if (plansRes.error) {
      return NextResponse.json({ error: plansRes.error.message }, { status: 500 });
    }
    if (isMissing(featuresRes.error)) {
      return NextResponse.json({ plans: plansRes.data ?? [], features: [], matrix: {} });
    }
    if (featuresRes.error) {
      return NextResponse.json({ error: featuresRes.error.message }, { status: 500 });
    }

    // Build matrix: matrix[plan_id][feature_id] = enabled
    const matrix: Record<string, Record<string, boolean>> = {};
    for (const plan of plansRes.data ?? []) {
      matrix[plan.id] = {};
    }
    for (const row of mappingsRes.data ?? []) {
      if (matrix[row.plan_id]) {
        matrix[row.plan_id][row.feature_id] = row.enabled;
      }
    }

    return NextResponse.json({
      plans: plansRes.data ?? [],
      features: featuresRes.data ?? [],
      matrix,
    });
  } catch (err) {
    console.error("GET platform/features/subscription-mapping error", err);
    return NextResponse.json({ error: "Failed to load subscription mapping" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = getAdmin();
    const body = await request.json();

    // Bulk update
    if (body.bulk === true) {
      const { plan_id, feature_ids, enabled } = body as {
        plan_id: string;
        feature_ids: string[];
        enabled: boolean;
      };

      if (!plan_id || !Array.isArray(feature_ids)) {
        return NextResponse.json(
          { error: "plan_id and feature_ids array are required for bulk update" },
          { status: 400 },
        );
      }

      const rows = feature_ids.map((feature_id) => ({
        plan_id,
        feature_id,
        enabled,
      }));

      const { error } = await admin
        .from("subscription_features")
        .upsert(rows, { onConflict: "plan_id,feature_id" });

      if (isMissing(error)) {
        return NextResponse.json({ error: "subscription_features table not found" }, { status: 500 });
      }
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, updated: feature_ids.length });
    }

    // Single upsert
    const { plan_id, feature_id, enabled } = body as {
      plan_id: string;
      feature_id: string;
      enabled: boolean;
    };

    if (!plan_id || !feature_id) {
      return NextResponse.json(
        { error: "plan_id and feature_id are required" },
        { status: 400 },
      );
    }

    const { data, error } = await admin
      .from("subscription_features")
      .upsert(
        { plan_id, feature_id, enabled: enabled ?? true },
        { onConflict: "plan_id,feature_id" },
      )
      .select()
      .single();

    if (isMissing(error)) {
      return NextResponse.json({ error: "subscription_features table not found" }, { status: 500 });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ mapping: data });
  } catch (err) {
    console.error("POST platform/features/subscription-mapping error", err);
    return NextResponse.json({ error: "Failed to update subscription mapping" }, { status: 500 });
  }
}
