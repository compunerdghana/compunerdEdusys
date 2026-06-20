"use client";

import { useState, useEffect } from "react";
import { ScrollText, Plus, Save, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface LessonNote {
  id: string;
  week_number: number;
  academic_year: string;
  topic: string;
  objectives: string;
  activities: string;
  assessment_strategy: string;
  status: "draft" | "pending_approval" | "approved" | "rejected";
  remarks: string;
  created_at: string;
  classroom?: { name: string };
  subject?: { name: string };
}

export default function LessonNotesView() {
  const { success, error: toastError } = useToast();
  const [plans, setPlans] = useState<LessonNote[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    week_number: "1",
    academic_year: "2026/2027",
    topic: "",
    objectives: "",
    activities: "",
    assessment_strategy: "",
    status: "draft"
  });

  async function loadPlans() {
    try {
      const res = await fetch("/api/teacher/lesson-plan");
      const data = await res.json();
      if (!res.ok) throw new Error();
      setPlans(data.plans || []);
    } catch {
      toastError("Failed to load lesson notes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPlans();
  }, [toastError]);

  async function handleSubmit(e: React.FormEvent, submitStatus: "draft" | "pending_approval") {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/teacher/lesson-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, status: submitStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");

      success(submitStatus === "pending_approval" ? "Lesson plan submitted for review!" : "Lesson note draft saved successfully.");
      setShowCreate(false);
      setForm({ week_number: "1", academic_year: "2026/2027", topic: "", objectives: "", activities: "", assessment_strategy: "", status: "draft" });
      loadPlans();
    } catch (err: any) {
      toastError(err.message || "Failed to submit lesson note.");
    } finally {
      setSaving(false);
    }
  }

  const statusBadge: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700 border-slate-200",
    pending_approval: "bg-amber-100 text-amber-800 border-amber-200",
    approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
    rejected: "bg-rose-100 text-rose-800 border-rose-200",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-extrabold text-slate-900 leading-tight">Lesson Note Management</h1>
          <p className="text-slate-500 text-[12px] font-semibold mt-0.5">Prepare weekly curricula lesson notes and submit them for supervisor approval.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[12px] font-bold transition-all shadow-sm shrink-0"
          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
        >
          <Plus size={15} />
          New Lesson Note
        </button>
      </div>

      {/* Roster List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 size={24} className="animate-spin text-violet-600 mx-auto" />
            <p className="text-slate-400 text-[12px] font-semibold mt-2">Loading lesson notes...</p>
          </div>
        ) : plans.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#e8e4f3] p-16 text-center text-slate-400 font-semibold text-[13px] shadow-sm">
            No lesson notes submitted yet.
          </div>
        ) : (
          plans.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border border-[#e8e4f3] p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wide text-violet-600 bg-violet-50 px-2.5 py-0.5 rounded border border-violet-100/50">
                    Week {p.week_number} · {p.academic_year}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase capitalize ${statusBadge[p.status]}`}>
                    {p.status.replace("_", " ")}
                  </span>
                </div>
                <span className="text-[11px] font-medium text-slate-400">{new Date(p.created_at).toLocaleDateString()}</span>
              </div>

              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-900 text-[14px] leading-tight">{p.topic}</h4>
                {p.objectives && <p className="text-[12.5px] text-slate-600 font-semibold mt-1"><strong>Objectives:</strong> {p.objectives}</p>}
              </div>

              {p.remarks && (
                <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3.5 flex items-start gap-2.5 text-amber-800 text-[12px]">
                  <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Supervisor Note:</span>
                    <p className="font-medium mt-0.5">{p.remarks}</p>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create Lesson Note Modal Overlay */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
          <form className="bg-white rounded-2xl border border-[#e8e4f3] p-6 shadow-2xl space-y-4 w-full max-w-xl relative animate-scale-up my-8 max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="absolute right-4 top-4 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all font-bold text-[14px]"
            >
              ✕
            </button>
            <h3 className="font-extrabold text-slate-900 text-[15px] border-b border-[#f5f3fc] pb-3 flex items-center gap-2">
              <ScrollText size={18} className="text-violet-600" />
              <span>Draft Lesson Plan</span>
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Week Number</label>
                <input
                  type="number"
                  min={1}
                  value={form.week_number}
                  onChange={(e) => setForm(f => ({ ...f, week_number: e.target.value }))}
                  className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] bg-white transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Academic Year</label>
                <input
                  type="text"
                  value={form.academic_year}
                  onChange={(e) => setForm(f => ({ ...f, academic_year: e.target.value }))}
                  className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] bg-white transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Topic</label>
              <input
                type="text"
                required
                value={form.topic}
                onChange={(e) => setForm(f => ({ ...f, topic: e.target.value }))}
                placeholder="e.g. Introduction to Quadratic Equations"
                className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] bg-white transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Objectives</label>
              <textarea
                rows={2}
                value={form.objectives}
                onChange={(e) => setForm(f => ({ ...f, objectives: e.target.value }))}
                placeholder="What should students know by the end of the lesson..."
                className="w-full p-3 text-[12.5px] font-semibold text-slate-800 border border-[#e0daf0] rounded-xl outline-none focus:border-[#7c3aed] bg-white transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Activities</label>
              <textarea
                rows={2}
                value={form.activities}
                onChange={(e) => setForm(f => ({ ...f, activities: e.target.value }))}
                placeholder="Step by step teacher and student classroom actions..."
                className="w-full p-3 text-[12.5px] font-semibold text-slate-800 border border-[#e0daf0] rounded-xl outline-none focus:border-[#7c3aed] bg-white transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Assessment Strategy</label>
              <textarea
                rows={2}
                value={form.assessment_strategy}
                onChange={(e) => setForm(f => ({ ...f, assessment_strategy: e.target.value }))}
                placeholder="e.g. Individual classroom worksheet assignments..."
                className="w-full p-3 text-[12.5px] font-semibold text-slate-800 border border-[#e0daf0] rounded-xl outline-none focus:border-[#7c3aed] bg-white transition-all"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={saving}
                onClick={(e) => handleSubmit(e, "draft")}
                className="flex-1 h-11 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-[12.5px] hover:bg-slate-50 transition-all active:scale-98"
              >
                Save as Draft
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={(e) => handleSubmit(e, "pending_approval")}
                className="flex-1 h-11 flex items-center justify-center gap-1.5 rounded-xl text-white font-bold text-[12.5px] transition-all hover:opacity-90 active:scale-98"
                style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                Submit for Approval
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
