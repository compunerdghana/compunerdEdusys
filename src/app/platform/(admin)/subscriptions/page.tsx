import { createClient as createAdmin } from "@supabase/supabase-js";
import { SubscriptionsClient } from "./SubscriptionsClient";

export default async function SubscriptionsPage({
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
    .from("school_subscriptions")
    .select(`
      id, plan_name, status, started_at, expires_at, amount, billing_cycle,
      schools ( id, name, code )
    `)
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data: subscriptions } = await query;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <SubscriptionsClient subscriptions={(subscriptions ?? []) as any} activeFilter={status ?? "all"} />;
}
