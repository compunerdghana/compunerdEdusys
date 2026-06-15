import { createClient as createAdmin } from "@supabase/supabase-js";
import { UsersClient } from "./UsersClient";

export default async function PlatformUsersPage() {
  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: users } = await admin
    .from("platform_users")
    .select("*")
    .order("created_at", { ascending: false });

  return <UsersClient users={users ?? []} />;
}
