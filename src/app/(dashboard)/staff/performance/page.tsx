import { createClient as createAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { TrendingUp, Users, Star } from "lucide-react";
import { formatDate } from "@/lib/utils";

const GRADIENT = "linear-gradient(135deg, #262262, #92278F)";

export default async function PerformancePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("school_id, role").eq("id", user.id).single();
  if (!profile?.school_id) redirect("/dashboard");
  const schoolId = profile.school_id as string;

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const isMissing = (e: { code?: string; message?: string } | null) =>
    e?.code === "42P01" || e?.message?.includes("does not exist");

  const [perfRes, staffRes] = await Promise.all([
    admin.from("staff_performance_records")
      .select("id, profile_id, period, attendance_score, task_score, submission_score, conduct_score, overall_score, remarks, created_at")
      .eq("school_id", schoolId).order("created_at", { ascending: false }).limit(100),
    admin.from("profiles").select("id, full_name, role").eq("school_id", schoolId).neq("role", "parent").order("full_name"),
  ]);

  const tableNotReady = isMissing(perfRes.error);
  const staffMap = Object.fromEntries((staffRes.data ?? []).map((s) => [s.id, s.full_name]));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const records = tableNotReady ? [] : (perfRes.data ?? []).map((r: any) => ({
    ...r, staff_name: staffMap[r.profile_id] ?? "Unknown",
  }));

  const avgScore = records.length > 0
    ? Math.round(records.reduce((s: number, r: { overall_score?: number }) => s + (Number(r.overall_score) || 0), 0) / records.length)
    : 0;

  function scoreColor(score: number) {
    return score >= 80 ? "#16A34A" : score >= 60 ? "#D97706" : "#DC2626";
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[22px] font-extrabold text-[var(--text-strong)]">Performance Management</h2>
          <p className="text-[14px] text-[var(--text-muted)] mt-0.5">Track and review staff performance scores</p>
        </div>
      </div>

      {tableNotReady && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-[13px] text-amber-800 font-semibold">Run <code className="bg-amber-100 px-1 rounded">supabase/migrations/staff_lifecycle.sql</code> to enable performance tracking.</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Staff Reviewed",  value: records.length, icon: Users,      bg: "#EEF2FF", color: "#4338CA" },
          { label: "Average Score",   value: `${avgScore}%`, icon: Star,       bg: "#F0FDF4", color: "#16A34A" },
          { label: "Reviews Pending", value: (staffRes.data ?? []).length - records.length, icon: TrendingUp, bg: "#FFFBEB", color: "#D97706" },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-[0_1px_6px_rgba(0,0,0,0.05)] flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: c.bg }}>
              <c.icon size={22} style={{ color: c.color }} />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">{c.label}</p>
              <p className="text-[26px] font-extrabold text-[var(--text-strong)] leading-tight">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Performance Records */}
      {records.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[var(--border)] p-16 text-center shadow-[0_1px_6px_rgba(0,0,0,0.05)]">
          <Star size={36} className="mx-auto mb-3 opacity-20 text-[var(--text-muted)]" />
          <p className="text-[16px] font-bold text-[var(--text-muted)]">No performance reviews yet</p>
          <p className="text-[13px] text-[var(--text-muted)] mt-1">Performance scores will appear here once reviews are recorded</p>
          <p className="text-[12px] text-[var(--text-muted)] mt-3">View each staff profile to add a performance review</p>
          <Link href="/staff" className="inline-block mt-4 px-5 py-2.5 rounded-xl text-[14px] font-bold text-white" style={{ background: GRADIENT }}>
            View All Staff
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[0_1px_6px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--neutral-50)]">
                  {["Staff", "Period", "Attendance", "Tasks", "Submissions", "Conduct", "Overall", "Remarks"].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {records.map((r: any) => (
                  <tr key={r.id} className="hover:bg-[var(--neutral-50)] transition-colors">
                    <td className="px-5 py-4 text-[14px] font-semibold text-[var(--text-strong)] whitespace-nowrap">{r.staff_name}</td>
                    <td className="px-5 py-4 text-[13px] text-[var(--text-muted)]">{r.period}</td>
                    {["attendance_score", "task_score", "submission_score", "conduct_score"].map((key) => (
                      <td key={key} className="px-5 py-4 text-[13px] font-semibold" style={{ color: scoreColor(Number(r[key] ?? 0)) }}>{r[key] ?? "—"}</td>
                    ))}
                    <td className="px-5 py-4">
                      <span className="text-[15px] font-extrabold" style={{ color: scoreColor(Number(r.overall_score ?? 0)) }}>{r.overall_score ? `${Math.round(r.overall_score)}%` : "—"}</span>
                    </td>
                    <td className="px-5 py-4 text-[12px] text-[var(--text-muted)] max-w-[160px] truncate">{r.remarks ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-[12px] text-[var(--text-muted)] text-center">
        Performance reviews are added from individual{" "}
        <Link href="/staff" className="text-[#262262] font-semibold underline">staff profiles</Link>
      </p>
    </div>
  );
}
