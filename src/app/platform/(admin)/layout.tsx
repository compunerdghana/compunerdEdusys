import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { ToastProvider } from "@/components/ui/Toast";

export default async function PlatformAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/platform/login");

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: platformUser } = await admin
    .from("platform_users")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (!platformUser) redirect("/platform/login");

  return (
    <ToastProvider>
      <PlatformShell
        userName={platformUser.full_name ?? user.email ?? "Platform Admin"}
        userRole={platformUser.role ?? "platform_user"}
      >
        {children}
      </PlatformShell>
    </ToastProvider>
  );
}
