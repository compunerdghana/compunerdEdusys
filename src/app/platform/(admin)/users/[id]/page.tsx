import { createClient as createAdmin } from "@supabase/supabase-js";
import { UserProfileClient } from "./UserProfileClient";

export default async function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: user } = await admin
    .from("platform_users")
    .select("*")
    .eq("id", id)
    .single();

  return <UserProfileClient user={user} />;
}
