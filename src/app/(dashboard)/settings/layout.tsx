import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsNav } from "./SettingsNav";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isHeadmaster = profile?.role === "headmaster" || profile?.role === "owner";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[var(--text-strong)]">Settings</h2>
        <p className="text-[15px] text-[var(--text-muted)]">Manage school configuration and your account.</p>
      </div>

      <SettingsNav isHeadmaster={isHeadmaster} />

      {children}
    </div>
  );
}
