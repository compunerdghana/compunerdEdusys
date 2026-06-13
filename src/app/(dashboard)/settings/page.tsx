import { createClient } from "@/lib/supabase/server";
import { AccountForm } from "./AccountForm";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, phone")
    .eq("id", user!.id)
    .single();

  return (
    <div className="space-y-5 max-w-xl">
      <div>
        <h2 className="text-xl font-bold text-[var(--text-strong)]">My account</h2>
        <p className="text-[15px] text-[var(--text-muted)]">Update your name and contact details.</p>
      </div>

      <AccountForm
        userId={user!.id}
        initialName={profile?.full_name ?? ""}
        initialPhone={profile?.phone ?? ""}
        role={profile?.role ?? ""}
        email={user?.email ?? ""}
      />
    </div>
  );
}
