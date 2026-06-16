"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutGrid, List, User, Calendar, ChevronRight, ArrowRight,
  Building2, Loader2, Clock,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface OnboardingRecord {
  id: string;
  school_name: string;
  school_code: string;
  stage: string;
  assigned_officer: string;
  progress: number;
  go_live_date: string | null;
  created_at: string;
  days_in_stage?: number;
}

const STAGES = [
  { key: "registered", label: "Registered", color: "#6366f1", bg: "#eef2ff", border: "#c7d2fe" },
  { key: "verification pending", label: "Verification Pending", color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  { key: "verified", label: "Verified", color: "#0891b2", bg: "#ecfeff", border: "#a5f3fc" },
  { key: "setup", label: "Setup", color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
  { key: "training", label: "Training", color: "#0284c7", bg: "#f0f9ff", border: "#bae6fd" },
  { key: "testing", label: "Testing", color: "#ea580c", bg: "#fff7ed", border: "#fed7aa" },
  { key: "go-live ready", label: "Go-Live Ready", color: "#059669", bg: "#ecfdf5", border: "#a7f3d0" },
  { key: "active", label: "Active", color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
];

const STAGE_BADGE: Record<string, string> = {
  registered: "bg-indigo-100 text-indigo-700 border-indigo-200",
  "verification pending": "bg-amber-100 text-amber-700 border-amber-200",
  verified: "bg-cyan-100 text-cyan-700 border-cyan-200",
  setup: "bg-violet-100 text-violet-700 border-violet-200",
  training: "bg-blue-100 text-blue-700 border-blue-200",
  testing: "bg-orange-100 text-orange-700 border-orange-200",
  "go-live ready": "bg-emerald-100 text-emerald-700 border-emerald-200",
  active: "bg-green-100 text-green-700 border-green-200",
};

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-[#e8e4f3] p-4 space-y-2 animate-pulse">
      <div className="h-4 bg-slate-100 rounded w-3/4" />
      <div className="h-3 bg-slate-100 rounded w-1/2" />
      <div className="h-2 bg-slate-100 rounded-full mt-2" />
    </div>
  );
}

export default function PipelinePage() {
  const { error: toastError } = useToast();
  const [records, setRecords] = useState<OnboardingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [advancing, setAdvancing] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/platform/onboarding/pipeline")
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setRecords(d.onboardings ?? d.data ?? d ?? []))
      .catch(() => {
        fetch("/api/platform/onboarding")
          .then(r => r.ok ? r.json() : Promise.reject())
          .then(d => setRecords(d.onboardings ?? d.data ?? d ?? []))
          .catch(() => toastError("Failed to load pipeline"));
      })
      .finally(() => setLoading(false));
  }, [toastError]);

  const stageMap: Record<string, OnboardingRecord[]> = {};
  STAGES.forEach(s => { stageMap[s.key] = []; });
  records.forEach(r => {
    const k = (r.stage ?? "registered").toLowerCase();
    if (stageMap[k]) stageMap[k].push(r);
    else stageMap["registered"].push(r);
  });

  async function advanceStage(id: string, currentStage: string) {
    const idx = STAGES.findIndex(s => s.key === currentStage.toLowerCase());
    if (idx === -1 || idx >= STAGES.length - 1) return;
    const nextStage = STAGES[idx + 1].key;
    setAdvancing(id);
    try {
      const res = await fetch(`/api/platform/onboarding/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: nextStage }),
      });
      if (res.ok) {
        setRecords(prev => prev.map(r => r.id === id ? { ...r, stage: nextStage } : r));
      }
    } catch {
      toastError("Failed to advance stage");
    } finally {
      setAdvancing(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <div className="px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[26px] font-extrabold text-slate-900">Onboarding Pipeline</h1>
            <p className="text-[13px] text-slate-500 mt-0.5">{records.length} schools in pipeline</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white border border-[#e0daf0] rounded-xl p-1 gap-1">
              <button onClick={() => setViewMode("kanban")}
                className={`flex items-center gap-1.5 px-3 h-7 rounded-lg text-[12px] font-bold transition-all ${viewMode === "kanban" ? "text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                style={viewMode === "kanban" ? { background: "linear-gradient(135deg,#4f46e5,#7c3aed)" } : {}}>
                <LayoutGrid size={13} /> Kanban
              </button>
              <button onClick={() => setViewMode("list")}
                className={`flex items-center gap-1.5 px-3 h-7 rounded-lg text-[12px] font-bold transition-all ${viewMode === "list" ? "text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                style={viewMode === "list" ? { background: "linear-gradient(135deg,#4f46e5,#7c3aed)" } : {}}>
                <List size={13} /> List
              </button>
            </div>
            <Link href="/platform/onboarding/new"
              className="inline-flex items-center gap-2 px-4 h-9 rounded-xl text-[12px] font-bold text-white hover:opacity-90 transition-opacity"
              style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}>
              + Register School
            </Link>
          </div>
        </div>

        {/* Kanban View */}
        {viewMode === "kanban" && (
          <div className="flex gap-4 overflow-x-auto pb-6">
            {STAGES.map(stage => (
              <div key={stage.key} className="shrink-0 w-[220px]">
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="text-[12px] font-extrabold text-slate-700">{stage.label}</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: stage.bg, color: stage.color, border: `1px solid ${stage.border}` }}>
                    {loading ? "…" : stageMap[stage.key].length}
                  </span>
                </div>
                <div className="space-y-2.5">
                  {loading ? (
                    [1, 2].map(i => <SkeletonCard key={i} />)
                  ) : stageMap[stage.key].length === 0 ? (
                    <div className="border-2 border-dashed border-[#e8e4f3] rounded-xl p-4 text-center">
                      <p className="text-[11px] text-slate-300 font-semibold">No schools</p>
                    </div>
                  ) : (
                    stageMap[stage.key].map(rec => {
                      const isAdv = advancing === rec.id;
                      return (
                        <div key={rec.id} className="bg-white rounded-xl border border-[#e8e4f3] p-4 hover:shadow-md transition-all group cursor-pointer">
                          <div className="flex items-start gap-2 mb-2">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-extrabold shrink-0"
                              style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}>
                              {rec.school_name?.slice(0, 2).toUpperCase() ?? "SC"}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[12px] font-extrabold text-slate-800 truncate">{rec.school_name}</p>
                              <p className="text-[10px] text-slate-400 font-semibold">{rec.school_code}</p>
                            </div>
                          </div>
                          {rec.assigned_officer && (
                            <div className="flex items-center gap-1.5 mb-2">
                              <User size={10} className="text-slate-300" />
                              <span className="text-[10px] font-semibold text-slate-400 truncate">{rec.assigned_officer}</span>
                            </div>
                          )}
                          <div className="mb-2">
                            <div className="flex justify-between mb-1">
                              <span className="text-[10px] text-slate-400 font-semibold">Progress</span>
                              <span className="text-[10px] font-bold text-slate-600">{rec.progress ?? 0}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-1.5 rounded-full transition-all" style={{ width: `${rec.progress ?? 0}%`, background: stage.color }} />
                            </div>
                          </div>
                          {rec.days_in_stage !== undefined && (
                            <div className="flex items-center gap-1 mb-3">
                              <Clock size={10} className="text-slate-300" />
                              <span className="text-[10px] text-slate-400 font-semibold">{rec.days_in_stage}d in stage</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <Link href={`/platform/onboarding/profiles?view=${rec.id}`}
                              className="flex-1 h-6 rounded-lg text-[10px] font-bold text-indigo-600 bg-indigo-50 flex items-center justify-center hover:bg-indigo-100 transition-colors border border-indigo-100">
                              View
                            </Link>
                            {STAGES.findIndex(s => s.key === (rec.stage ?? "").toLowerCase()) < STAGES.length - 1 && (
                              <button onClick={() => advanceStage(rec.id, rec.stage ?? "registered")}
                                disabled={isAdv}
                                className="flex-1 h-6 rounded-lg text-[10px] font-bold text-white flex items-center justify-center gap-1 disabled:opacity-50 transition-opacity"
                                style={{ background: stage.color }}>
                                {isAdv ? <Loader2 size={9} className="animate-spin" /> : <><ChevronRight size={9} /> Advance</>}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* List View */}
        {viewMode === "list" && (
          <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3]">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#faf9ff]">
                    {["School", "Stage", "Officer", "Progress %", "Go-Live", "Days in Stage", "Actions"].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-slate-400 uppercase tracking-widest text-[11px] font-bold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0edf8]">
                  {loading ? (
                    [1, 2, 3].map(i => (
                      <tr key={i}>
                        {[1, 2, 3, 4, 5, 6, 7].map(j => (
                          <td key={j} className="px-5 py-3.5"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                        ))}
                      </tr>
                    ))
                  ) : records.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center">
                        <Building2 size={32} className="text-slate-200 mx-auto mb-3" />
                        <p className="text-[13px] font-semibold text-slate-400">No schools in pipeline</p>
                      </td>
                    </tr>
                  ) : (
                    records.map(rec => (
                      <tr key={rec.id} className="hover:bg-[#faf9ff] transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[11px] font-extrabold shrink-0"
                              style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}>
                              {rec.school_name?.slice(0, 2).toUpperCase() ?? "SC"}
                            </div>
                            <div>
                              <p className="text-[13px] font-bold text-slate-800">{rec.school_name}</p>
                              <p className="text-[11px] text-slate-400">{rec.school_code}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`rounded-full text-[11px] font-bold px-2.5 py-0.5 border ${STAGE_BADGE[(rec.stage ?? "").toLowerCase()] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}>
                            {rec.stage ?? "—"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-[13px] font-semibold text-slate-600">{rec.assigned_officer ?? "—"}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2 min-w-[100px]">
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-2 rounded-full" style={{ width: `${rec.progress ?? 0}%`, background: "linear-gradient(90deg,#4f46e5,#7c3aed)" }} />
                            </div>
                            <span className="text-[11px] font-bold text-slate-500">{rec.progress ?? 0}%</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          {rec.go_live_date ? (
                            <div className="flex items-center gap-1.5">
                              <Calendar size={11} className="text-slate-400" />
                              <span className="text-[12px] font-semibold text-slate-600">
                                {new Date(rec.go_live_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                              </span>
                            </div>
                          ) : <span className="text-[12px] text-slate-300">Not set</span>}
                        </td>
                        <td className="px-5 py-3.5 text-[12px] font-semibold text-slate-500">
                          {rec.days_in_stage !== undefined ? `${rec.days_in_stage}d` : "—"}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <Link href={`/platform/onboarding/profiles?view=${rec.id}`}
                              className="inline-flex items-center gap-1.5 px-3 h-7 rounded-lg text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 transition-colors">
                              View
                            </Link>
                            {STAGES.findIndex(s => s.key === (rec.stage ?? "").toLowerCase()) < STAGES.length - 1 && (
                              <button onClick={() => advanceStage(rec.id, rec.stage ?? "registered")}
                                disabled={advancing === rec.id}
                                className="inline-flex items-center gap-1.5 px-3 h-7 rounded-lg text-[11px] font-bold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors disabled:opacity-50">
                                {advancing === rec.id ? <Loader2 size={10} className="animate-spin" /> : <><ArrowRight size={10} /> Advance</>}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
