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

    const { data, error } = await admin
      .from("beta_features")
      .select(`
        *,
        feature:platform_features(id, name, code, description, status, access_level, category:feature_categories(name, icon, color))
      `)
      .order("created_at", { ascending: false });

    if (isMissing(error)) {
      return NextResponse.json({ beta_features: [] });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ beta_features: data ?? [] });
  } catch (err) {
    console.error("GET platform/features/beta error", err);
    return NextResponse.json({ error: "Failed to load beta features" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = getAdmin();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const id = searchParams.get("id");

    // Promote beta to production
    if (action === "promote" && id) {
      const { data: betaRow, error: betaErr } = await admin
        .from("beta_features")
        .select("feature_id")
        .eq("id", id)
        .single();

      if (isMissing(betaErr)) {
        return NextResponse.json({ error: "beta_features table not found" }, { status: 500 });
      }
      if (betaErr || !betaRow) {
        return NextResponse.json({ error: betaErr?.message ?? "Beta program not found" }, { status: 404 });
      }

      // Mark promoted_at and update feature status to active
      const [betaUpdate, featureUpdate] = await Promise.all([
        admin
          .from("beta_features")
          .update({ promoted_at: new Date().toISOString() })
          .eq("id", id)
          .select()
          .single(),
        admin
          .from("platform_features")
          .update({ status: "active", updated_at: new Date().toISOString() })
          .eq("id", betaRow.feature_id)
          .select("id, name, code, status")
          .single(),
      ]);

      if (betaUpdate.error) {
        return NextResponse.json({ error: betaUpdate.error.message }, { status: 500 });
      }

      return NextResponse.json({
        beta: betaUpdate.data,
        feature: featureUpdate.data,
      });
    }

    // Create beta program
    const body = await request.json();
    const { feature_id } = body;

    if (!feature_id) {
      return NextResponse.json({ error: "feature_id is required" }, { status: 400 });
    }

    // Set feature status to beta
    const [betaCreate, featureUpdate] = await Promise.all([
      admin
        .from("beta_features")
        .insert({
          feature_id,
          beta_school_ids: [],
          feedback_count: 0,
          adoption_rate: 0,
        })
        .select(`
          *,
          feature:platform_features(id, name, code, status)
        `)
        .single(),
      admin
        .from("platform_features")
        .update({ status: "beta", updated_at: new Date().toISOString() })
        .eq("id", feature_id)
        .select("id, name, code, status")
        .single(),
    ]);

    if (isMissing(betaCreate.error)) {
      return NextResponse.json({ error: "beta_features table not found" }, { status: 500 });
    }
    if (betaCreate.error) {
      return NextResponse.json({ error: betaCreate.error.message }, { status: 500 });
    }

    return NextResponse.json({
      beta: betaCreate.data,
      feature: featureUpdate.data,
    }, { status: 201 });
  } catch (err) {
    console.error("POST platform/features/beta error", err);
    return NextResponse.json({ error: "Failed to manage beta program" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = getAdmin();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};
    if (body.beta_school_ids !== undefined) updates.beta_school_ids = body.beta_school_ids;
    if (body.feedback_count !== undefined) updates.feedback_count = body.feedback_count;
    if (body.adoption_rate !== undefined) updates.adoption_rate = body.adoption_rate;

    const { data, error } = await admin
      .from("beta_features")
      .update(updates)
      .eq("id", id)
      .select(`
        *,
        feature:platform_features(id, name, code, status)
      `)
      .single();

    if (isMissing(error)) {
      return NextResponse.json({ error: "beta_features table not found" }, { status: 500 });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ beta: data });
  } catch (err) {
    console.error("PATCH platform/features/beta error", err);
    return NextResponse.json({ error: "Failed to update beta program" }, { status: 500 });
  }
}
