import { createClient as createAdmin } from "@supabase/supabase-js";
import { GroupsClient } from "./GroupsClient";

export default async function GroupsPage() {
  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const [{ data: groups }, { data: users }] = await Promise.all([
    admin.from("platform_groups").select("*").order("created_at", { ascending: false }),
    admin.from("platform_users").select("id, full_name, email, role").eq("status", "active"),
  ]);

  return <GroupsClient groups={groups ?? []} users={users ?? []} />;
}
