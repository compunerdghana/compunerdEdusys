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
      id, name, code, type:school_type, region, status, created_at,
      school_subscriptions ( expires_at, status, plan:subscription_plans ( name ) ),
      students ( count ),
      staff:profiles ( count )
    `)
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data: schools } = await query;

  // Map nested subscription plan name to plan_name for client-side component compatibility
  const transformedSchools = (schools ?? []).map((s: any) => {
    const subs = s.school_subscriptions?.map((sub: any) => ({
      expires_at: sub.expires_at,
      status: sub.status,
      plan_name: sub.plan?.name ?? null,
    }));
    return {
      ...s,
      school_subscriptions: subs ?? [],
    };
  });

  return <SchoolsClient schools={transformedSchools as any} activeFilter={status ?? "all"} />;
}
