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
    const admin = getAdmin();
    const { id } = await params;

    const { data: feature, error } = await admin
      .from("platform_features")
      .select(`
        *,
        category:feature_categories(id, name, icon, color),
        group:feature_groups(id, name)
      `)
      .eq("id", id)
      .single();

    if (isMissing(error)) {
      return NextResponse.json({ error: "platform_features table not found" }, { status: 500 });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!feature) {
      return NextResponse.json({ error: "Feature not found" }, { status: 404 });
    }

    // Get dependencies
    const { data: dependencies } = await admin
      .from("feature_dependencies")
      .select(`
        id,
        requires_feature:platform_features!requires_feature_id(id, name, code)
      `)
      .eq("feature_id", id);

    // Get school overrides count
    const { count: schoolOverridesCount } = await admin
      .from("school_feature_overrides")
      .select("id", { count: "exact", head: true })
      .eq("feature_id", id);

    // Get usage count
    const { count: usageCount } = await admin
      .from("feature_usage_logs")
      .select("id", { count: "exact", head: true })
      .eq("feature_id", id);

    return NextResponse.json({
      feature: {
        ...feature,
        dependencies: dependencies ?? [],
        school_overrides_count: schoolOverridesCount ?? 0,
        usage_count: usageCount ?? 0,
      },
    });
  } catch (err) {
    console.error("GET platform/features/[id] error", err);
    return NextResponse.json({ error: "Failed to load feature" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = getAdmin();
    const { id } = await params;
    const body = await request.json();

    const updates: Record<string, unknown> = { ...body, updated_at: new Date().toISOString() };
    delete updates.id;

    const { data, error } = await admin
      .from("platform_features")
      .update(updates)
      .eq("id", id)
      .select(`
        *,
        category:feature_categories(id, name, icon, color),
        group:feature_groups(id, name)
      `)
      .single();

    if (isMissing(error)) {
      return NextResponse.json({ error: "platform_features table not found" }, { status: 500 });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ feature: data });
  } catch (err) {
    console.error("PATCH platform/features/[id] error", err);
    return NextResponse.json({ error: "Failed to update feature" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = getAdmin();
    const { id } = await params;

    // Check for dependencies
    const { data: deps, error: depsError } = await admin
      .from("feature_dependencies")
      .select("id")
      .or(`feature_id.eq.${id},requires_feature_id.eq.${id}`)
      .limit(1);

    if (!isMissing(depsError) && depsError) {
      return NextResponse.json({ error: depsError.message }, { status: 500 });
    }
    if (deps && deps.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete feature with existing dependencies" },
        { status: 409 },
      );
    }

    const { error } = await admin.from("platform_features").delete().eq("id", id);

    if (isMissing(error)) {
      return NextResponse.json({ error: "platform_features table not found" }, { status: 500 });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE platform/features/[id] error", err);
    return NextResponse.json({ error: "Failed to delete feature" }, { status: 500 });
  }
}
