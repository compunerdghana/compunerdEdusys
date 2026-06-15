import { createClient as createAdmin } from "@supabase/supabase-js";
import { SupportClient } from "./SupportClient";

export default async function SupportPage() {
  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const [{ data: tickets }, { data: platformUsers }] = await Promise.all([
    admin
      .from("support_tickets")
      .select(`*, schools ( name, code )`)
      .order("created_at", { ascending: false }),
    admin
      .from("platform_users")
      .select("id, full_name")
      .order("full_name"),
  ]);

  return <SupportClient tickets={tickets ?? []} platformUsers={platformUsers ?? []} />;
}
