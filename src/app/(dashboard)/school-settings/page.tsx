import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";

export default async function SchoolSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("school_id").eq("id", user!.id).single();

  const { data: school } = profile?.school_id
    ? await supabase.from("schools").select("*").eq("id", profile.school_id).single()
    : { data: null };

  if (!school) {
    return (
      <div className="max-w-xl">
        <h2 className="text-xl font-bold text-[var(--text-strong)] mb-2">School settings</h2>
        <Card>
          <p className="text-sm text-[var(--text-muted)]">Your account is not linked to a school. Contact your super administrator.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold text-[var(--text-strong)]">School settings</h2>
        <p className="text-sm text-[var(--text-muted)]">{school.name}</p>
      </div>

      <Card>
        <h3 className="text-sm font-semibold text-[var(--text-strong)] mb-4">School details</h3>
        <div className="space-y-2 text-sm">
          {[
            ["Name", school.name],
            ["Code", school.code],
            ["Motto", school.motto],
            ["Address", school.address],
            ["City / Town", school.city],
            ["Region", school.region],
            ["Phone", school.phone],
            ["Email", school.email],
            ["Admission prefix", school.admission_prefix],
          ].map(([label, value]) => value ? (
            <div key={label} className="flex justify-between py-2 border-b border-[var(--border)] last:border-0">
              <span className="text-[var(--text-muted)]">{label}</span>
              <span className="font-medium text-[var(--text-strong)]">{value}</span>
            </div>
          ) : null)}
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-[var(--text-strong)] mb-4">Subscription</h3>
        <div className="flex items-center gap-3">
          <Badge variant={school.subscription_status === "active" ? "success" : school.subscription_status === "trial" ? "warning" : "danger"}>
            {school.subscription_status}
          </Badge>
          {school.subscription_expires_at && (
            <span className="text-sm text-[var(--text-muted)]">Expires {formatDate(school.subscription_expires_at)}</span>
          )}
        </div>
      </Card>
    </div>
  );
}
