import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

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

    const [
      totalRes,
      activeRes,
      inactiveRes,
      betaRes,
      draftRes,
      catsRes,
      schoolsRes,
      devRes,
    ] = await Promise.all([
      admin.from("platform_features").select("id", { count: "exact", head: true }),
      admin.from("platform_features").select("id", { count: "exact", head: true }).eq("status", "active"),
      admin.from("platform_features").select("id", { count: "exact", head: true }).eq("status", "inactive"),
      admin.from("platform_features").select("id", { count: "exact", head: true }).eq("status", "beta"),
      admin.from("platform_features").select("id", { count: "exact", head: true }).eq("status", "draft"),
      admin.from("feature_categories").select("id", { count: "exact", head: true }),
      admin.from("school_feature_overrides").select("school_id"),
      admin.from("platform_features").select("id", { count: "exact", head: true }).eq("status", "draft"),
    ]);

    // Count distinct schools from school_feature_overrides
    let schoolsUsingFeatures = 0;
    if (!isMissing(schoolsRes.error) && schoolsRes.data) {
      const unique = new Set(schoolsRes.data.map((r: { school_id: string }) => r.school_id));
      schoolsUsingFeatures = unique.size;
    }

    return NextResponse.json({
      totalFeatures:        isMissing(totalRes.error)    ? 0 : (totalRes.count    ?? 0),
      activeFeatures:       isMissing(activeRes.error)   ? 0 : (activeRes.count   ?? 0),
      inactiveFeatures:     isMissing(inactiveRes.error) ? 0 : (inactiveRes.count ?? 0),
      betaFeatures:         isMissing(betaRes.error)     ? 0 : (betaRes.count     ?? 0),
      draftFeatures:        isMissing(draftRes.error)    ? 0 : (draftRes.count    ?? 0),
      categoriesCount:      isMissing(catsRes.error)     ? 0 : (catsRes.count     ?? 0),
      schoolsUsingFeatures,
      featuresInDevelopment: isMissing(devRes.error)     ? 0 : (devRes.count      ?? 0),
    });
  } catch (err) {
    console.error("GET platform/features/stats error", err);
    return NextResponse.json({ error: "Failed to load feature stats" }, { status: 500 });
  }
}
