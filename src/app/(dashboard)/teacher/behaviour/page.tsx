"use client";

import { useState } from "react";
import { Smile, Plus, Save, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface BehaviourRecord {
  id: string;
  student: string;
  type: "positive" | "warning" | "discipline";
  incident: string;
  date: string;
}

export default function BehaviourManagementView() {
  const { success } = useToast();
  const [records, setRecords] = useState<BehaviourRecord[]>([
    { id: "1", student: "Kwame Mensah", type: "positive", incident: "Helped clean up class library catalog.", date: "2026-06-15" },
    { id: "2", student: "Yaw Asante", type: "warning", incident: "Disturbing peers during Math lecture.", date: "2026-06-14" },
  ]);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    student: "",
    type: "positive" as "positive" | "warning" | "discipline",
    incident: "",
  });

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.student || !form.incident) return;
    setSaving(true);
    setTimeout(() => {
      const newRec: BehaviourRecord = {
        id: String(Date.now()),
        student: form.student,
        type: form.type,
        incident: form.incident,
        date: new Date().toISOString().split("T")[0]
      };
      setRecords(prev => [newRec, ...prev]);
      setForm({ student: "", type: "positive", incident: "" });
      setShowCreate(false);
      setSaving(false);
      success("Conduct report logged and parents notified!");
    }, 800);
  }

  const badge: Record<string, string> = {
    positive: "bg-emerald-50 text-emerald-700 border-emerald-100",
    warning: "bg-amber-50 text-amber-700 border-amber-100",
    discipline: "bg-rose-50 text-rose-700 border-rose-100",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-extrabold text-slate-900 leading-tight">Student Conduct & Behaviour</h1>
          <p className="text-slate-500 text-[12px] font-semibold mt-0.5">Log positive commendations, classroom warnings and discipline case files.</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[12px] font-bold transition-all shadow-sm shrink-0"
          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
        >
          <Plus size={15} />
          {showCreate ? "View Logs" : "Log Incident"}
        </button>
      </div>

      {showCreate ? (
        <form onSubmit={handleAdd} className="bg-white rounded-2xl border border-[#e8e4f3] p-5 shadow-sm space-y-4 max-w-xl">
          <h3 className="font-extrabold text-slate-900 text-[14px]">Log Student Conduct Incident</h3>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Student Name</label>
            <input
              type="text"
              required
              value={form.student}
              onChange={(e) => setForm(f => ({ ...f, student: e.target.value }))}
              placeholder="e.g. Kwame Mensah"
              className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Conduct Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm(f => ({ ...f, type: e.target.value as any }))}
              className="w-full h-10 px-3 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-700 outline-none focus:border-[#7c3aed] bg-white"
            >
              <option value="positive">Positive Commendation</option>
              <option value="warning">Classroom Warning</option>
              <option value="discipline">Discipline Case</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Incident details</label>
            <textarea
              required
              rows={3}
              value={form.incident}
              onChange={(e) => setForm(f => ({ ...f, incident: e.target.value }))}
              placeholder="Provide exact details of the incident..."
              className="w-full p-3 text-[12.5px] font-semibold text-slate-800 border border-[#e0daf0] rounded-xl outline-none focus:border-[#7c3aed] bg-white"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full h-11 flex items-center justify-center gap-1.5 rounded-xl text-white font-bold text-[13px]"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Log Conduct Report
          </button>
        </form>
      ) : (
        <div className="space-y-3">
          {records.map(rec => (
            <div key={rec.id} className="bg-white rounded-2xl border border-[#e8e4f3] p-5 shadow-sm flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-900 text-[13.5px]">{rec.student}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${badge[rec.type]}`}>
                    {rec.type}
                  </span>
                </div>
                <p className="text-[12.5px] text-slate-600 font-semibold leading-relaxed">{rec.incident}</p>
              </div>
              <span className="text-[11px] font-medium text-slate-400 font-mono shrink-0">{rec.date}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
