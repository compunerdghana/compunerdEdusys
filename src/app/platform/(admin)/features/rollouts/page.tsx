"use client";

import { useState, useEffect, useCallback } from "react";
import { Map, Plus, Calendar, TrendingUp } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { SlidePanel } from "@/components/ui/SlidePanel";

interface Rollout {
  id: string;
  feature_name: string;
  feature_id: string;
  name: string;
  description: string;
  rollout_type: string;
  status: string;
  adoption_rate: number;
  start_date: string;
  end_date: string | null;
  target_regions: string[];
  notes: string;
}

const ROLLOUT_TYPE_STYLES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  global: { label: "Global", bg: "#eef2ff", text: "#4f46e5", border: "#c7d2fe" },
  regional: { label: "Regional", bg: "#eff6ff", text: "#0284c7", border: "#bfdbfe" },
  school: { label: "School", bg: "#ecfeff", text: "#0891b2", border: "#a5f3fc" },
  pilot: { label: "Pilot", bg: "#fffbeb", text: "#d97706", border: "#fde68a" },
};

const STATUS_STYLES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  planned: { label: "Planned", bg: "#f8fafc", text: "#64748b", border: "#e2e8f0" },
  active: { label: "Active", bg: "#ecfdf5", text: "#059669", border: "#a7f3d0" },
  paused: { label: "Paused", bg: "#fffbeb", text: "#d97706", border: "#fde68a" },
  completed: { label: "Completed", bg: "#f0fdf4", text: "#16a34a", border: "#86efac" },
  cancelled: { label: "Cancelled", bg: "#fef2f2", text: "#dc2626", border: "#fecaca" },
};

const GHANA_REGIONS = [
  "Greater Accra", "Ashanti", "Northern", "Western", "Eastern",
  "Central", "Volta", "Upper East", "Upper West", "Brong-Ahafo",
  "Oti", "Bono", "Bono East", "Ahafo", "Savannah",
  "North East", "Western North",
];

const MOCK_ROLLOUTS: Rollout[] = [
  { id: "r1", feature_id: "f1", feature_name: "AI Report Generator", name: "AI Reports Beta Launch", description: "Initial rollout of AI-powered report generation", rollout_type: "pilot", status: "active", adoption_rate: 68, start_date: "2025-01-15", end_date: "2025-03-31", target_regions: [], notes: "Pilot with 10 selected schools" },
  { id: "r2", feature_id: "f2", feature_name: "SMS Notifications", name: "SMS Global Rollout", description: "Enable SMS notifications for all Premium+ schools", rollout_type: "global", status: "completed", adoption_rate: 94, start_date: "2024-10-01", end_date: "2024-12-31", target_regions: [], notes: "" },
  { id: "r3", feature_id: "f3", feature_name: "E-Learning Portal", name: "Northern Region E-Learning", description: "E-learning portal rollout in northern Ghana", rollout_type: "regional", status: "planned", adoption_rate: 0, start_date: "2025-04-01", end_date: "2025-06-30", target_regions: ["Northern", "Upper East", "Upper West", "Savannah", "North East"], notes: "Part of digital education initiative" },
  { id: "r4", feature_id: "f4", feature_name: "Biometric Attendance", name: "Biometric Attendance Launch", description: "Biometric attendance system for all Enterprise schools", rollout_type: "school", status: "active", adoption_rate: 45, start_date: "2025-02-01", end_date: null, target_regions: [], notes: "Requires hardware installation" },
];

const MOCK_FEATURES = [
  { id: "f1", name: "AI Report Generator" },
  { id: "f2", name: "SMS Notifications" },
  { id: "f3", name: "E-Learning Portal" },
  { id: "f4", name: "Biometric Attendance" },
  { id: "f5", name: "WhatsApp Integration" },
];

const EMPTY_FORM = {
  feature_id: "", name: "", description: "", rollout_type: "global",
  start_date: "", end_date: "", target_regions: [] as string[], notes: "",
};

export default function RolloutsPage() {
  const { success } = useToast();
  const [rollouts, setRollouts] = useState<Rollout[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/platform/features/rollouts");
      if (res.ok) {
        const d = await res.json();
        setRollouts(d.rollouts ?? d.data ?? []);
      } else {
        setRollouts(MOCK_ROLLOUTS);
      }
    } catch {
      setRollouts(MOCK_ROLLOUTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function toggleRegion(region: string) {
    setForm(p => ({
      ...p,
      target_regions: p.target_regions.includes(region)
        ? p.target_regions.filter(r => r !== region)
        : [...p.target_regions, region],
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/platform/features/rollouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      success("Rollout created");
      setPanelOpen(false);
      load();
    } catch {
      const feat = MOCK_FEATURES.find(f => f.id === form.feature_id);
      setRollouts(prev => [...prev, {
        id: String(Date.now()), ...form, feature_name: feat?.name ?? "", adoption_rate: 0,
      }]);
      success("Rollout created (demo)");
      setPanelOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-extrabold text-slate-900 leading-tight">Feature Rollouts</h1>
          <p className="text-slate-500 text-[13px] font-semibold mt-1">Manage controlled feature rollouts by region, school, or globally</p>
        </div>
        <button
          onClick={() => { setForm({ ...EMPTY_FORM }); setPanelOpen(true); }}
          className="flex items-center gap-2 px-4 h-10 rounded-xl text-[13px] font-bold text-white transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
        >
          <Plus size={15} />
          Create Rollout
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] p-5 animate-pulse h-40" />
          ))}
        </div>
      ) : rollouts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center">
            <Map size={28} className="text-violet-400" />
          </div>
          <div className="text-center">
            <p className="font-bold text-slate-700 text-[16px]">No rollouts yet</p>
            <p className="text-slate-400 text-[13px] font-semibold mt-1">Create your first rollout to track feature deployments</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {rollouts.map((r) => {
            const typeStyle = ROLLOUT_TYPE_STYLES[r.rollout_type] ?? ROLLOUT_TYPE_STYLES.global;
            const statusStyle = STATUS_STYLES[r.status] ?? STATUS_STYLES.planned;
            return (
              <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] p-5 hover:shadow-md hover:border-[#d0c9ef] transition-all">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="text-[15px] font-extrabold text-slate-900 leading-tight">{r.name}</p>
                    <p className="text-[12px] font-semibold text-violet-600 mt-0.5">{r.feature_name}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <span className="rounded-full text-[11px] font-bold px-2.5 py-0.5 border" style={{ background: typeStyle.bg, color: typeStyle.text, borderColor: typeStyle.border }}>
                      {typeStyle.label}
                    </span>
                    <span className="rounded-full text-[11px] font-bold px-2.5 py-0.5 border" style={{ background: statusStyle.bg, color: statusStyle.text, borderColor: statusStyle.border }}>
                      {statusStyle.label}
                    </span>
                  </div>
                </div>
                {r.description && (
                  <p className="text-[12px] font-semibold text-slate-500 mb-3 leading-relaxed">{r.description}</p>
                )}
                {/* Adoption bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                      <TrendingUp size={11} /> Adoption Rate
                    </span>
                    <span className="text-[12px] font-extrabold text-slate-900">{r.adoption_rate}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${r.adoption_rate}%`,
                        background: r.adoption_rate > 75 ? "#059669" : r.adoption_rate > 40 ? "#d97706" : "#4f46e5",
                      }}
                    />
                  </div>
                </div>
                {/* Dates */}
                <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar size={11} /> Start: {r.start_date}
                  </span>
                  {r.end_date && (
                    <span className="flex items-center gap-1">
                      <Calendar size={11} /> End: {r.end_date}
                    </span>
                  )}
                </div>
                {r.target_regions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {r.target_regions.map(region => (
                      <span key={region} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                        {region}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <SlidePanel open={panelOpen} onClose={() => setPanelOpen(false)} title="Create Rollout" subtitle="Deploy a feature to a target group" width="xl">
        <div className="space-y-5">
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Feature</label>
            <select
              value={form.feature_id}
              onChange={e => setForm(p => ({ ...p, feature_id: e.target.value }))}
              className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
            >
              <option value="">Select feature</option>
              {MOCK_FEATURES.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Rollout Type</label>
            <div className="grid grid-cols-4 gap-2">
              {["global", "regional", "school", "pilot"].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, rollout_type: t }))}
                  className={`py-2 px-3 rounded-xl border text-[11px] font-bold capitalize transition-all ${
                    form.rollout_type === t ? "border-violet-400 bg-violet-50 text-violet-700" : "border-[#e0daf0] text-slate-500 hover:border-violet-200"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
              placeholder="Rollout name..."
            />
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Start Date</label>
              <input
                type="date"
                value={form.start_date}
                onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
                className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
              />
            </div>
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">End Date</label>
              <input
                type="date"
                value={form.end_date}
                onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))}
                className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
              />
            </div>
          </div>
          {form.rollout_type === "regional" && (
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-2">Target Regions</label>
              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                {GHANA_REGIONS.map(r => (
                  <label key={r} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#e8e4f3] cursor-pointer hover:bg-violet-50 transition-all">
                    <input
                      type="checkbox"
                      checked={form.target_regions.includes(r)}
                      onChange={() => toggleRegion(r)}
                      className="w-3.5 h-3.5 accent-violet-600"
                    />
                    <span className="text-[12px] font-semibold text-slate-700">{r}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white resize-none"
            />
          </div>
          <div className="flex gap-3 pt-3 border-t border-[#f0edf8]">
            <button onClick={() => setPanelOpen(false)} className="flex-1 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-bold text-slate-700 hover:bg-slate-50 transition-all">Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 h-10 rounded-xl text-[13px] font-bold text-white disabled:opacity-70 hover:opacity-90 transition-all"
              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
            >
              {saving ? "Creating..." : "Create Rollout"}
            </button>
          </div>
        </div>
      </SlidePanel>
    </div>
  );
}
