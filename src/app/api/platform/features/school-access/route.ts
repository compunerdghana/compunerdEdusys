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

    if (schoolId) {
      // Get this school's features: subscription features + overrides merged
      const [subFeaturesRes, overridesRes, schoolRes] = await Promise.all([
        admin
          .from("subscription_features")
          .select(`
            feature_id,
            enabled,
            feature:platform_features(id, name, code, description, route_path, icon, access_level, status, category:feature_categories(name, icon, color))
          `)
          .eq("enabled", true),
        admin
          .from("school_feature_overrides")
          .select(`
            id,
            feature_id,
            enabled,
            access_type,
            expires_at,
            notes,
            feature:platform_features(id, name, code, description, route_path, icon, access_level, status, category:feature_categories(name, icon, color))
          `)
          .eq("school_id", schoolId),
        admin.from("schools").select("id, name").eq("id", schoolId).single(),
      ]);

      if (isMissing(subFeaturesRes.error)) {
        return NextResponse.json({ school: schoolRes.data, features: [], overrides: [] });
      }
      if (subFeaturesRes.error) {
        return NextResponse.json({ error: subFeaturesRes.error.message }, { status: 500 });
      }

      const overrides = isMissing(overridesRes.error) ? [] : (overridesRes.data ?? []);
      const overrideMap = Object.fromEntries(
        overrides.map((o: Record<string, unknown>) => [o.feature_id, o]),
      );

      // Merge: start with subscription features, apply overrides
      const features = (subFeaturesRes.data ?? []).map((sf: Record<string, unknown>) => {
        const override = overrideMap[sf.feature_id as string];
        return {
          ...(sf.feature as object),
          enabled: override ? (override as Record<string, unknown>).enabled : sf.enabled,
          override: override ?? null,
          source: override ? "override" : "subscription",
        };
      });

      // Add override-only features not in subscription
      for (const override of overrides) {
        const o = override as Record<string, unknown>;
        const alreadyIncluded = (subFeaturesRes.data ?? []).some(
          (sf: Record<string, unknown>) => sf.feature_id === o.feature_id,
        );
        if (!alreadyIncluded) {
          features.push({
            ...(o.feature as object),
            enabled: o.enabled,
            override,
            source: "override",
          });
        }
      }

      return NextResponse.json({
        school: schoolRes.data ?? null,
        features,
        overrides,
      });
    }

    // No schoolId: list schools with override counts
    const { data: overrides, error } = await admin
      .from("school_feature_overrides")
      .select("school_id, id");

    if (isMissing(error)) {
      return NextResponse.json({ schools: [] });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const countMap: Record<string, number> = {};
    for (const row of overrides ?? []) {
      countMap[row.school_id] = (countMap[row.school_id] ?? 0) + 1;
    }

    const schoolIds = Object.keys(countMap);
    const { data: schools } = await admin
      .from("schools")
      .select("id, name")
      .in("id", schoolIds.length > 0 ? schoolIds : ["00000000-0000-0000-0000-000000000000"]);

    const result = (schools ?? []).map((s: Record<string, unknown>) => ({
      ...s,
      override_count: countMap[s.id as string] ?? 0,
    }));

    return NextResponse.json({ schools: result });
  } catch (err) {
    console.error("GET platform/features/school-access error", err);
    return NextResponse.json({ error: "Failed to load school access" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = getAdmin();
    const body = await request.json();
    const { school_id, feature_id, enabled, access_type, expires_at, notes, granted_by } = body;

    if (!school_id || !feature_id || enabled === undefined) {
      return NextResponse.json(
        { error: "school_id, feature_id, and enabled are required" },
        { status: 400 },
      );
    }

    const { data, error } = await admin
      .from("school_feature_overrides")
      .upsert(
        {
          school_id,
          feature_id,
          enabled,
          access_type: access_type ?? "permanent",
          expires_at: expires_at ?? null,
          notes: notes ?? null,
          granted_by: granted_by ?? null,
        },
        { onConflict: "school_id,feature_id" },
      )
      .select()
      .single();

    if (isMissing(error)) {
      return NextResponse.json({ error: "school_feature_overrides table not found" }, { status: 500 });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ override: data });
  } catch (err) {
    console.error("POST platform/features/school-access error", err);
    return NextResponse.json({ error: "Failed to set school feature override" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = getAdmin();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const { error } = await admin.from("school_feature_overrides").delete().eq("id", id);

    if (isMissing(error)) {
      return NextResponse.json({ error: "school_feature_overrides table not found" }, { status: 500 });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE platform/features/school-access error", err);
    return NextResponse.json({ error: "Failed to remove school feature override" }, { status: 500 });
  }
}
