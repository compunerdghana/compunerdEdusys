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
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-extrabold text-[var(--text-strong)]">Settings</h2>
          <p className="text-[13px] text-[var(--text-muted)] mt-0.5">Configure your school, academic calendar, fees and account.</p>
        </div>
      </div>

      <SettingsNav isHeadmaster={isHeadmaster} />

      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[0_1px_6px_rgba(0,0,0,0.05)] p-6">
        {children}
      </div>
    </div>
  );
}
