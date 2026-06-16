"use client";

import Link from "next/link";
import { CheckCircle, Clock, Building2, TrendingUp } from "lucide-react";

interface OnboardingRecord {
  completed_steps: number;
  total_steps: number;
  started_at: string;
  updated_at: string;
}

interface School {
  id: string;
  name: string;
  code: string;
  status: string;
  created_at: string;
  school_onboarding?: OnboardingRecord[];
}

const TOTAL_STEPS = 9;

function getPct(school: School) {
  const ob = school.school_onboarding?.[0];
  if (!ob) return 0;
  return Math.round(((ob.completed_steps ?? 0) / (ob.total_steps ?? TOTAL_STEPS)) * 100);
}

function getStage(pct: number): "completed" | "in_progress" | "not_started" {
  if (pct >= 100) return "completed";
  if (pct > 0) return "in_progress";
  return "not_started";
}

const stageBadge = {
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200",
  not_started: "bg-slate-50 text-slate-500 border-slate-200",
};

const stageLabel = {
  completed: "Completed",
  in_progress: "In Progress",
  not_started: "Not Started",
};

export function OnboardingClient({ schools }: { schools: School[] }) {
  const completed = schools.filter((s) => getPct(s) >= 100).length;
  const inProgress = schools.filter((s) => { const p = getPct(s); return p > 0 && p < 100; }).length;
  const notStarted = schools.filter((s) => getPct(s) === 0).length;
  const avgPct = schools.length > 0
    ? Math.round(schools.reduce((sum, s) => sum + getPct(s), 0) / schools.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[24px] font-extrabold text-slate-900 leading-tight">School Onboarding</h1>
        <p className="text-slate-500 text-[15px] font-semibold mt-1">Track the onboarding progress of all schools on the platform</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Completed", value: completed, icon: CheckCircle, accent: "#10b981", iconBg: "#ecfdf5", iconColor: "#059669" },
          { label: "In Progress", value: inProgress, icon: Clock, accent: "#3b82f6", iconBg: "#eff6ff", iconColor: "#2563eb" },
          { label: "Not Started", value: notStarted, icon: Building2, accent: "#94a3b8", iconBg: "#f8fafc", iconColor: "#64748b" },
          { label: "Avg Progress", value: `${avgPct}%`, icon: TrendingUp, accent: "#7c3aed", iconBg: "#f5f3ff", iconColor: "#7c3aed" },
        ].map(({ label, value, icon: Icon, accent, iconBg, iconColor }) => (
          <div key={label} className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] p-5 border-l-4 flex items-center gap-4" style={{ borderLeftColor: accent }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: iconBg }}>
              <Icon size={18} style={{ color: iconColor }} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
              <p className="text-[22px] font-extrabold text-slate-900 leading-tight">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#f0edf8]">
          <h2 className="font-extrabold text-slate-900 text-[15px]">All Schools</h2>
        </div>
        {schools.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <Building2 size={32} className="text-slate-300" />
            <p className="text-slate-400 text-[13px] font-semibold">No schools found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#faf9ff] border-b border-[#f0edf8]">
                  {["School", "Started", "Progress", "Steps", "Last Updated", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5f3fc]">
                {schools.map((school) => {
                  const ob = school.school_onboarding?.[0];
                  const pct = getPct(school);
                  const stage = getStage(pct);
                  const completedSteps = ob?.completed_steps ?? 0;
                  return (
                    <tr key={school.id} className="hover:bg-[#faf9ff] transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-extrabold text-violet-700 text-[11px]" style={{ background: "linear-gradient(135deg, #ede9fe, #ddd6fe)" }}>
                            {school.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-[13px]">{school.name}</p>
                            <p className="text-slate-400 text-[11px] font-mono">{school.code ?? ""}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-[13px] font-semibold text-slate-500 whitespace-nowrap">
                        {ob?.started_at ? new Date(ob.started_at).toLocaleDateString("en-GH") : "-"}
                      </td>
                      <td className="px-4 py-3.5 min-w-[160px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct >= 100 ? "#10b981" : pct > 0 ? "linear-gradient(135deg, #4f46e5, #7c3aed)" : "#e2e8f0" }} />
                          </div>
                          <span className="text-[12px] font-extrabold text-slate-700 w-10 text-right">{pct}%</span>
                        </div>
                        <span className={`mt-1 inline-block rounded-full text-[10px] font-bold px-2 py-0.5 border ${stageBadge[stage]}`}>{stageLabel[stage]}</span>
                      </td>
                      <td className="px-4 py-3.5 text-[13px] font-semibold text-slate-700">
                        {completedSteps}/{ob?.total_steps ?? TOTAL_STEPS}
                      </td>
                      <td className="px-4 py-3.5 text-[12px] font-semibold text-slate-400 whitespace-nowrap">
                        {ob?.updated_at ? new Date(ob.updated_at).toLocaleDateString("en-GH") : "-"}
                      </td>
                      <td className="px-4 py-3.5">
                        <Link href={`/platform/schools/${school.id}`} className="px-2.5 py-1.5 rounded-lg bg-violet-50 text-violet-700 text-[11px] font-bold hover:bg-violet-100 transition-colors border border-violet-100">
                          View Profile
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
