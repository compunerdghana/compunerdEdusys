import { createClient as createAdmin } from "@supabase/supabase-js";
import { HealthClient } from "./HealthClient";

export default async function SchoolHealthPage() {
  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: schools } = await admin
    .from("schools")
    .select("id, name, code, status, health_score, health_sub_scores")
    .order("health_score", { ascending: false });

  return <HealthClient schools={schools ?? []} />;
}
