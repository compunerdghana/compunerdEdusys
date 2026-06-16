"use client";

import { useEffect, useState } from "react";
import {
  UserCheck, ChevronDown, ChevronUp, Building2, Loader2,
  Users, Plus, Percent, X,
} from "lucide-react";
import { SlidePanel } from "@/components/ui/SlidePanel";
import { useToast } from "@/components/ui/Toast";

interface Officer {
  id: string;
  name: string;
  email: string;
  active_schools: number;
  completion_rate: number;
  schools?: { id: string; name: string; code: string; stage: string; progress: number }[];
}

interface UnassignedSchool {
  id: string;
  school_name: string;
  school_code: string;
}

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

function initials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function AssignmentsPage() {
  const { success, error: toastError } = useToast();
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [unassigned, setUnassigned] = useState<UnassignedSchool[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ officerId: "", schoolId: "", notes: "" });

  useEffect(() => {
    Promise.all([
      fetch("/api/platform/onboarding/assignments").then(r => r.ok ? r.json() : null),
      fetch("/api/platform/onboarding").then(r => r.ok ? r.json() : null),
    ]).then(([assignData, onboardData]) => {
      if (assignData) setOfficers(assignData.officers ?? assignData.data ?? []);
      if (onboardData) {
        const all: UnassignedSchool[] = (onboardData.onboardings ?? onboardData.data ?? [])
          .filter((s: { assigned_officer?: string; school_name: string; school_code: string; id: string }) => !s.assigned_officer)
          .map((s: { id: string; school_name: string; school_code: string }) => ({ id: s.id, school_name: s.school_name, school_code: s.school_code }));
        setUnassigned(all);
      }
    }).catch(() => toastError("Failed to load assignment data"))
      .finally(() => setLoading(false));
  }, [toastError]);

  async function assign() {
    if (!form.officerId || !form.schoolId) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/platform/onboarding/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to assign");
      success("School assigned successfully!");
      setPanelOpen(false);
      setForm({ officerId: "", schoolId: "", notes: "" });
    } catch (e: unknown) {
      toastError(e instanceof Error ? e.message : "Assignment failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <div className="max-w-screen-xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[26px] font-extrabold text-slate-900">Implementation Officers</h1>
            <p className="text-[13px] text-slate-500 mt-0.5">Manage school assignments to implementation officers</p>
          </div>
          <button onClick={() => setPanelOpen(true)}
            className="inline-flex items-center gap-2 px-5 h-10 rounded-xl text-[13px] font-bold text-white hover:opacity-90 transition-opacity"
            style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}>
            <Plus size={15} /> Assign School
          </button>
        </div>

        {/* Officers Grid */}
        {loading ? (
          <div className="grid grid-cols-3 gap-5">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] p-6 animate-pulse">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-100 rounded w-3/4" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : officers.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] py-16 text-center">
            <Users size={40} className="text-slate-200 mx-auto mb-4" />
            <p className="text-[15px] font-extrabold text-slate-400 mb-1">No implementation officers found</p>
            <p className="text-[13px] text-slate-300">Officers will appear here once platform users are assigned onboarding roles</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-5">
            {officers.map(officer => (
              <div key={officer.id} className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start gap-4 mb-5">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-[18px] font-extrabold shrink-0"
                      style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}>
                      {initials(officer.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-extrabold text-slate-900 truncate">{officer.name}</p>
                      <p className="text-[12px] text-slate-400 font-semibold truncate">{officer.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-[#faf9ff] rounded-xl p-3 border border-[#e8e4f3] text-center">
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <Building2 size={12} className="text-indigo-400" />
                        <span className="text-[11px] font-bold text-slate-400">Active Schools</span>
                      </div>
                      <p className="text-[20px] font-extrabold text-indigo-600">{officer.active_schools ?? 0}</p>
                    </div>
                    <div className="bg-[#faf9ff] rounded-xl p-3 border border-[#e8e4f3] text-center">
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <Percent size={12} className="text-emerald-400" />
                        <span className="text-[11px] font-bold text-slate-400">Completion</span>
                      </div>
                      <p className="text-[20px] font-extrabold text-emerald-600">{officer.completion_rate ?? 0}%</p>
                    </div>
                  </div>

                  <button onClick={() => setExpanded(expanded === officer.id ? null : officer.id)}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[12px] font-bold text-slate-500 hover:bg-[#faf9ff] hover:text-slate-700 transition-all border border-[#e8e4f3]">
                    {expanded === officer.id ? <><ChevronUp size={13} /> Hide Schools</> : <><ChevronDown size={13} /> View Schools ({officer.active_schools ?? 0})</>}
                  </button>
                </div>

                {expanded === officer.id && officer.schools && (
                  <div className="border-t border-[#e8e4f3] divide-y divide-[#f0edf8]">
                    {officer.schools.length === 0 ? (
                      <div className="px-5 py-4 text-center text-[12px] text-slate-300 font-semibold">No schools assigned</div>
                    ) : (
                      officer.schools.map(s => (
                        <div key={s.id} className="px-5 py-3 flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-extrabold shrink-0"
                            style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}>
                            {s.name?.slice(0, 2).toUpperCase() ?? "SC"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-bold text-slate-800 truncate">{s.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`rounded-full text-[10px] font-bold px-2 py-0.5 border ${STAGE_BADGE[(s.stage ?? "").toLowerCase()] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}>{s.stage}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${s.progress ?? 0}%` }} />
                            </div>
                            <span className="text-[10px] font-bold text-slate-400">{s.progress ?? 0}%</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assign School Panel */}
      <SlidePanel open={panelOpen} onClose={() => setPanelOpen(false)} title="Assign School" subtitle="Assign a school to an implementation officer" width="md">
        <div className="space-y-5">
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Implementation Officer</label>
            <select
              className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
              value={form.officerId} onChange={e => setForm(f => ({ ...f, officerId: e.target.value }))}>
              <option value="">Select officer</option>
              {officers.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">School</label>
            <select
              className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
              value={form.schoolId} onChange={e => setForm(f => ({ ...f, schoolId: e.target.value }))}>
              <option value="">Select school</option>
              {unassigned.map(s => <option key={s.id} value={s.id}>{s.school_name} ({s.school_code})</option>)}
            </select>
            {unassigned.length === 0 && !loading && (
              <p className="text-[11px] text-slate-400 mt-1.5 font-semibold">All schools are assigned. Register more schools first.</p>
            )}
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Notes</label>
            <textarea
              className="w-full px-4 py-2.5 h-24 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white resize-none"
              placeholder="Optional notes about this assignment..."
              value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <button onClick={assign} disabled={!form.officerId || !form.schoolId || submitting}
            className="w-full h-10 rounded-xl text-[13px] font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}>
            {submitting ? <><Loader2 size={14} className="animate-spin" /> Assigning…</> : <><UserCheck size={14} /> Confirm Assignment</>}
          </button>
        </div>
      </SlidePanel>
    </div>
  );
}
