import { createClient as createAdmin } from "@supabase/supabase-js";
import { RolesClient } from "./RolesClient";

export default async function RolesPage() {
  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: roles } = await admin
    .from("platform_roles")
    .select("*")
    .order("hierarchy_level", { ascending: false });

  return <RolesClient roles={roles ?? []} />;
}
