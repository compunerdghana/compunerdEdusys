import { createClient as createAdmin } from "@supabase/supabase-js";
import { PermissionsClient } from "./PermissionsClient";

export default async function PermissionsPage() {
  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const [{ data: permissions }, { data: roles }] = await Promise.all([
    admin.from("platform_permissions").select("*").order("module"),
    admin.from("platform_roles").select("id, name, display_name, color").order("hierarchy_level", { ascending: false }),
  ]);

  return <PermissionsClient permissions={permissions ?? []} roles={roles ?? []} />;
}
