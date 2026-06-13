import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, role, phone")
    .eq("id", user!.id)
    .single();

  return (
    <div className="space-y-5 max-w-xl">
      <div>
        <h2 className="text-xl font-bold text-[var(--text-strong)]">Settings</h2>
        <p className="text-sm text-[var(--text-muted)]">Your account details</p>
      </div>

      <Card>
        <h3 className="text-sm font-semibold text-[var(--text-strong)] mb-4">Account information</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-[var(--border)]">
            <span className="text-[var(--text-muted)]">Full name</span>
            <span className="font-medium text-[var(--text-strong)]">{profile?.full_name ?? "—"}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-[var(--border)]">
            <span className="text-[var(--text-muted)]">Email</span>
            <span className="font-medium text-[var(--text-strong)]">{profile?.email ?? user?.email ?? "—"}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-[var(--border)]">
            <span className="text-[var(--text-muted)]">Role</span>
            <span className="font-medium text-[var(--text-strong)] capitalize">{profile?.role?.replace("_", " ") ?? "—"}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-[var(--text-muted)]">Phone</span>
            <span className="font-medium text-[var(--text-strong)]">{profile?.phone ?? "—"}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
