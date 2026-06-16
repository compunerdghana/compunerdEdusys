"use client";

import { useEffect, useState } from "react";
import {
  GraduationCap, CalendarDays, CheckCircle2, Clock, Percent,
  Plus, Loader2, Monitor, Users, MapPin,
} from "lucide-react";
import { SlidePanel } from "@/components/ui/SlidePanel";
import { useToast } from "@/components/ui/Toast";

interface TrainingSession {
  id: string;
  school_name: string;
  training_type: string;
  trainer: string;
  date: string;
  duration: number;
  mode: string;
  attendance: number;
  status: "scheduled" | "completed" | "cancelled" | "rescheduled";
}

interface School {
  id: string;
  school_name: string;
}

const STATUS_BADGE: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700 border-blue-200",
  completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  rescheduled: "bg-amber-100 text-amber-700 border-amber-200",
};

const TRAINING_TYPES = [
  "System Overview", "Administrator Training", "Teacher Training",
  "Student Portal Training", "Finance Module", "Attendance Module",
  "Reports & Analytics", "Data Migration", "Go-Live Preparation",
];

const MODES = ["onsite", "remote", "hybrid"];

function StatCard({ icon: Icon, label, value, color, bg }: { icon: React.ElementType; label: string; value: number | string; color: string; bg: string }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-[#e8e4f3] border-l-4 p-5 flex items-center gap-4`} style={{ borderLeftColor: color }}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0`} style={{ background: bg }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <p className="text-[26px] font-extrabold text-slate-900 leading-none">{value}</p>
        <p className="text-[12px] font-semibold text-slate-500 mt-1">{label}</p>
      </div>
    </div>
  );
}

export default function TrainingPage() {
  const { success, error: toastError } = useToast();
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    schoolId: "", trainingType: "", trainer: "",
    date: "", duration: "", mode: "onsite", notes: "",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/platform/onboarding").then(r => r.ok ? r.json() : null),
    ]).then(([onboardData]) => {
      if (onboardData) {
        const list = onboardData.onboardings ?? onboardData.data ?? [];
        // Aggregate training sessions from onboarding records
        const sess: TrainingSession[] = list.flatMap((s: { id: string; school_name: string; training_sessions?: TrainingSession[] }) =>
          (s.training_sessions ?? []).map((t: TrainingSession) => ({ ...t, school_name: s.school_name }))
        );
        setSessions(sess);
        setSchools(list.map((s: { id: string; school_name: string }) => ({ id: s.id, school_name: s.school_name })));
      }
    }).catch(() => toastError("Failed to load training data"))
      .finally(() => setLoading(false));
  }, [toastError]);

  const completed = sessions.filter(s => s.status === "completed").length;
  const scheduled = sessions.filter(s => s.status === "scheduled").length;
  const upcoming = sessions.filter(s => s.status === "scheduled" && new Date(s.date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).length;
  const completionRate = sessions.length > 0 ? Math.round((completed / sessions.length) * 100) : 0;

  async function scheduleSession() {
    if (!form.schoolId || !form.trainingType || !form.date) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/platform/onboarding/training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to schedule");
      success("Training session scheduled!");
      setPanelOpen(false);
      setForm({ schoolId: "", trainingType: "", trainer: "", date: "", duration: "", mode: "onsite", notes: "" });
    } catch (e: unknown) {
      toastError(e instanceof Error ? e.message : "Failed to schedule training");
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
            <h1 className="text-[26px] font-extrabold text-slate-900">Training Management</h1>
            <p className="text-[13px] text-slate-500 mt-0.5">Schedule and track training sessions for onboarding schools</p>
          </div>
          <button onClick={() => setPanelOpen(true)}
            className="inline-flex items-center gap-2 px-5 h-10 rounded-xl text-[13px] font-bold text-white hover:opacity-90 transition-opacity"
            style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}>
            <Plus size={15} /> Schedule Training
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <StatCard icon={CalendarDays} label="Scheduled Sessions" value={scheduled} color="#2563eb" bg="#eff6ff" />
          <StatCard icon={CheckCircle2} label="Completed Sessions" value={completed} color="#059669" bg="#ecfdf5" />
          <StatCard icon={Clock} label="Upcoming (7 days)" value={upcoming} color="#d97706" bg="#fffbeb" />
          <StatCard icon={Percent} label="Completion Rate" value={`${completionRate}%`} color="#7c3aed" bg="#f5f3ff" />
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3]">
          <div className="px-6 py-4 border-b border-[#e8e4f3]">
            <h2 className="text-[18px] font-extrabold text-slate-900">Training Sessions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#faf9ff]">
                  {["School", "Training Type", "Trainer", "Date", "Duration", "Mode", "Attendance", "Status", "Actions"].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-slate-400 uppercase tracking-widest text-[11px] font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0edf8]">
                {loading ? (
                  [1, 2, 3].map(i => (
                    <tr key={i}>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(j => (
                        <td key={j} className="px-5 py-3.5"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : sessions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-14 text-center">
                      <GraduationCap size={36} className="text-slate-200 mx-auto mb-3" />
                      <p className="text-[13px] font-semibold text-slate-400">No training sessions scheduled yet</p>
                      <p className="text-[12px] text-slate-300 mt-1">Schedule a training session to get started</p>
                    </td>
                  </tr>
                ) : (
                  sessions.map(s => (
                    <tr key={s.id} className="hover:bg-[#faf9ff] transition-colors">
                      <td className="px-5 py-3.5 text-[13px] font-bold text-slate-800">{s.school_name}</td>
                      <td className="px-5 py-3.5">
                        <span className="rounded-full text-[11px] font-bold px-2.5 py-0.5 border bg-violet-100 text-violet-700 border-violet-200">
                          {s.training_type}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[13px] font-semibold text-slate-600">{s.trainer || "—"}</td>
                      <td className="px-5 py-3.5 text-[12px] font-semibold text-slate-600">
                        {s.date ? new Date(s.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-[12px] font-semibold text-slate-500">{s.duration ? `${s.duration}h` : "—"}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          {s.mode === "remote" ? <Monitor size={12} className="text-blue-400" /> : s.mode === "hybrid" ? <Users size={12} className="text-violet-400" /> : <MapPin size={12} className="text-orange-400" />}
                          <span className="text-[12px] font-semibold text-slate-600 capitalize">{s.mode ?? "—"}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-[12px] font-semibold text-slate-500">{s.attendance !== undefined ? `${s.attendance}%` : "—"}</td>
                      <td className="px-5 py-3.5">
                        <span className={`rounded-full text-[11px] font-bold px-2.5 py-0.5 border ${STATUS_BADGE[s.status] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <button className="inline-flex items-center gap-1.5 px-3 h-7 rounded-lg text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 transition-colors">
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Schedule Panel */}
      <SlidePanel open={panelOpen} onClose={() => setPanelOpen(false)} title="Schedule Training Session" subtitle="Set up a new training session for a school" width="md">
        <div className="space-y-5">
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">School <span className="text-red-500">*</span></label>
            <select className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
              value={form.schoolId} onChange={e => setForm(f => ({ ...f, schoolId: e.target.value }))}>
              <option value="">Select school</option>
              {schools.map(s => <option key={s.id} value={s.id}>{s.school_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Training Type <span className="text-red-500">*</span></label>
            <select className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
              value={form.trainingType} onChange={e => setForm(f => ({ ...f, trainingType: e.target.value }))}>
              <option value="">Select type</option>
              {TRAINING_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Trainer Name</label>
            <input className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
              placeholder="Trainer's name" value={form.trainer} onChange={e => setForm(f => ({ ...f, trainer: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Scheduled Date <span className="text-red-500">*</span></label>
              <input type="date" className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
                value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Duration (hours)</label>
              <input type="number" className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
                placeholder="e.g. 2" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Mode</label>
            <div className="flex gap-2">
              {MODES.map(m => (
                <button key={m} type="button" onClick={() => setForm(f => ({ ...f, mode: m }))}
                  className={`flex-1 h-9 rounded-xl border text-[12px] font-bold capitalize transition-all ${form.mode === m ? "text-white border-indigo-500" : "border-[#e0daf0] text-slate-500 hover:border-indigo-300"}`}
                  style={form.mode === m ? { background: "linear-gradient(135deg,#4f46e5,#7c3aed)" } : {}}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Notes</label>
            <textarea className="w-full px-4 py-2.5 h-20 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white resize-none"
              placeholder="Additional notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <button onClick={scheduleSession} disabled={!form.schoolId || !form.trainingType || !form.date || submitting}
            className="w-full h-10 rounded-xl text-[13px] font-bold text-white disabled:opacity-40 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}>
            {submitting ? <><Loader2 size={14} className="animate-spin" /> Scheduling…</> : <><GraduationCap size={14} /> Schedule Session</>}
          </button>
        </div>
      </SlidePanel>
    </div>
  );
}
