"use client";

import Link from "next/link";
import { Heart, AlertTriangle, Activity } from "lucide-react";

interface School {
  id: string;
  name: string;
  code: string;
  status: string;
  health_score?: number;
  health_sub_scores?: {
    subscription?: number;
    login_activity?: number;
    students?: number;
    data_completeness?: number;
  };
}

const statusBadge: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  trial: "bg-blue-50 text-blue-700 border-blue-200",
  suspended: "bg-red-50 text-red-700 border-red-200",
  expired: "bg-amber-50 text-amber-700 border-amber-200",
  archived: "bg-slate-50 text-slate-500 border-slate-200",
};

function getHealthInfo(score?: number) {
  const s = score ?? 0;
  if (s >= 75) return { label: "Healthy", color: "#10b981", ring: "ring-emerald-400", bg: "bg-emerald-50" };
  if (s >= 40) return { label: "Warning", color: "#f59e0b", ring: "ring-amber-400", bg: "bg-amber-50" };
  return { label: "Critical", color: "#ef4444", ring: "ring-red-400", bg: "bg-red-50" };
}

function SubScoreBar({ label, score }: { label: string; score: number }) {
  const color = score >= 19 ? "#10b981" : score >= 10 ? "#f59e0b" : "#ef4444";
  return (
    <div>
      <div className="flex justify-between mb-0.5">
        <span className="text-[10px] font-semibold text-slate-500">{label}</span>
        <span className="text-[10px] font-bold text-slate-700">{score}/25</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${(score / 25) * 100}%`, background: color }} />
      </div>
    </div>
  );
}

export function HealthClient({ schools }: { schools: School[] }) {
  const healthy = schools.filter((s) => (s.health_score ?? 0) >= 75).length;
  const warning = schools.filter((s) => { const sc = s.health_score ?? 0; return sc >= 40 && sc < 75; }).length;
  const critical = schools.filter((s) => (s.health_score ?? 0) < 40).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[24px] font-extrabold text-slate-900 leading-tight">School Health Monitor</h1>
        <p className="text-slate-500 text-[15px] font-semibold mt-1">Real-time health status of all schools on the platform</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] p-5 border-l-4 border-l-emerald-400 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <Heart size={18} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Healthy</p>
            <p className="text-[22px] font-extrabold text-slate-900">{healthy}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] p-5 border-l-4 border-l-amber-400 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <AlertTriangle size={18} className="text-amber-600" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Warning</p>
            <p className="text-[22px] font-extrabold text-slate-900">{warning}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] p-5 border-l-4 border-l-red-400 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <Activity size={18} className="text-red-600" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Critical</p>
            <p className="text-[22px] font-extrabold text-slate-900">{critical}</p>
          </div>
        </div>
      </div>

      {/* Health Grid */}
      {schools.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] flex flex-col items-center py-16 gap-3">
          <Heart size={32} className="text-slate-300" />
          <p className="text-slate-400 text-[13px] font-semibold">No schools found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {schools.map((school) => {
            const score = school.health_score ?? 0;
            const info = getHealthInfo(score);
            const sub = school.health_sub_scores ?? {};
            const subScores = [
              { label: "Subscription", score: sub.subscription ?? 0 },
              { label: "Login Activity", score: sub.login_activity ?? 0 },
              { label: "Students", score: sub.students ?? 0 },
              { label: "Data Completeness", score: sub.data_completeness ?? 0 },
            ];

            return (
              <div key={school.id} className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] p-5 space-y-4">
                {/* School header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-extrabold text-violet-700 text-[12px]" style={{ background: "linear-gradient(135deg, #ede9fe, #ddd6fe)" }}>
                      {school.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 text-[13px] truncate">{school.name}</p>
                      <p className="text-slate-400 text-[11px] font-mono">{school.code ?? ""}</p>
                    </div>
                  </div>
                  <span className={`rounded-full text-[10px] font-bold px-2.5 py-0.5 border shrink-0 ml-2 ${statusBadge[school.status] ?? "bg-slate-50 text-slate-500 border-slate-200"}`}>
                    {school.status}
                  </span>
                </div>

                {/* Score circle */}
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-full ring-4 flex items-center justify-center shrink-0 font-extrabold text-[22px] ${info.ring} ${info.bg}`} style={{ color: info.color }}>
                    {score}
                  </div>
                  <div>
                    <p className="font-extrabold text-[15px]" style={{ color: info.color }}>{info.label}</p>
                    <p className="text-[11px] text-slate-400 font-semibold">Health Score</p>
                  </div>
                </div>

                {/* Sub scores */}
                <div className="space-y-2">
                  {subScores.map(({ label, score: ss }) => (
                    <SubScoreBar key={label} label={label} score={ss} />
                  ))}
                </div>

                {/* Link */}
                <Link href={`/platform/schools/${school.id}`}
                  className="block w-full text-center py-2 rounded-xl border border-[#e0daf0] text-violet-700 text-[12px] font-bold hover:bg-violet-50 transition-all">
                  View School
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
