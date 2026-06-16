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

const ZERO_STATS = {
  totalOnboarding: 0,
  pendingVerification: 0,
  pendingSetup: 0,
  inTraining: 0,
  readyForGoLive: 0,
  activeImplementations: 0,
  completedOnboardings: 0,
  delayedOnboardings: 0,
};

export async function GET() {
  try {
    const admin = getAdmin();

    const [
      totalRes,
      pendingVerRes,
      pendingSetupRes,
      inTrainingRes,
      readyRes,
      activeImplRes,
      completedRes,
      delayedRes,
    ] = await Promise.all([
      admin.from("school_onboarding").select("id", { count: "exact", head: true }),
      admin
        .from("school_onboarding")
        .select("id", { count: "exact", head: true })
        .eq("stage", "verification_pending"),
      admin
        .from("school_onboarding")
        .select("id", { count: "exact", head: true })
        .eq("stage", "setup_in_progress"),
      admin
        .from("school_onboarding")
        .select("id", { count: "exact", head: true })
        .eq("stage", "training_ongoing"),
      admin
        .from("school_onboarding")
        .select("id", { count: "exact", head: true })
        .eq("stage", "go_live_ready"),
      admin
        .from("school_onboarding")
        .select("id", { count: "exact", head: true })
        .not("stage", "in", '("active","lead")'),
      admin
        .from("school_onboarding")
        .select("id", { count: "exact", head: true })
        .eq("stage", "active"),
      admin
        .from("school_onboarding")
        .select("id", { count: "exact", head: true })
        .eq("is_delayed", true),
    ]);

    if (isMissing(totalRes.error)) {
      return NextResponse.json(ZERO_STATS);
    }

    if (totalRes.error) {
      return NextResponse.json({ error: totalRes.error.message }, { status: 500 });
    }

    return NextResponse.json({
      totalOnboarding: totalRes.count ?? 0,
      pendingVerification: isMissing(pendingVerRes.error) ? 0 : (pendingVerRes.count ?? 0),
      pendingSetup: isMissing(pendingSetupRes.error) ? 0 : (pendingSetupRes.count ?? 0),
      inTraining: isMissing(inTrainingRes.error) ? 0 : (inTrainingRes.count ?? 0),
      readyForGoLive: isMissing(readyRes.error) ? 0 : (readyRes.count ?? 0),
      activeImplementations: isMissing(activeImplRes.error) ? 0 : (activeImplRes.count ?? 0),
      completedOnboardings: isMissing(completedRes.error) ? 0 : (completedRes.count ?? 0),
      delayedOnboardings: isMissing(delayedRes.error) ? 0 : (delayedRes.count ?? 0),
    });
  } catch (err) {
    console.error("GET platform/onboarding/stats error", err);
    return NextResponse.json(ZERO_STATS);
  }
}
