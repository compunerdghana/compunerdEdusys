import { createClient as createAdmin } from "@supabase/supabase-js";
import { OnboardingClient } from "./OnboardingClient";

export default async function SchoolOnboardingPage() {
  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: schools } = await admin
    .from("schools")
    .select(`
      id, name, code, status, created_at,
      school_onboarding ( completed_steps, total_steps, started_at, updated_at )
    `)
    .order("created_at", { ascending: false });

  return <OnboardingClient schools={schools ?? []} />;
}
