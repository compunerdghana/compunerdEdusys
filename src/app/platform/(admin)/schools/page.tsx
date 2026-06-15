import { createClient as createAdmin } from "@supabase/supabase-js";
import { SchoolsClient } from "./SchoolsClient";

export default async function PlatformSchoolsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  let query = admin
    .from("schools")
    .select(`
      id, name, code, type, region, status, created_at,
      school_subscriptions ( plan_name, expires_at, status ),
      students ( count ),
      staff ( count )
    `)
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data: schools } = await query;

  return <SchoolsClient schools={schools ?? []} activeFilter={status ?? "all"} />;
}
