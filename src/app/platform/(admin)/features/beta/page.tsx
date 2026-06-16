"use client";

import { useState, useEffect, useCallback } from "react";
import { FlaskConical, Plus, Rocket, Users, MessageSquare, TrendingUp } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { SlidePanel } from "@/components/ui/SlidePanel";

interface BetaFeature {
  id: string;
  feature_id: string;
  feature_name: string;
  feature_code: string;
  test_schools: number;
  feedback_count: number;
  adoption_pct: number;
  status: string;
  started_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  paused: "bg-amber-50 text-amber-700 border-amber-200",
  completed: "bg-blue-50 text-blue-700 border-blue-200",
};

const MOCK_BETAS: BetaFeature[] = [
  { id: "b1", feature_id: "f1", feature_name: "AI Report Generator", feature_code: "ai_reports", test_schools: 12, feedback_count: 47, adoption_pct: 78, status: "active", started_at: "2025-01-15" },
  { id: "b2", feature_id: "f2", feature_name: "E-Learning Portal", feature_code: "elearning", test_schools: 8, feedback_count: 23, adoption_pct: 54, status: "active", started_at: "2025-02-01" },
  { id: "b3", feature_id: "f3", feature_name: "WhatsApp Integration", feature_code: "whatsapp", test_schools: 5, feedback_count: 15, adoption_pct: 90, status: "paused", started_at: "2024-12-01" },
];

const AVAILABLE_FEATURES = [
  { id: "f4", name: "Biometric Attendance" },
  { id: "f5", name: "Analytics Dashboard" },
  { id: "f6", name: "Parent App" },
];

const EMPTY_FORM = { feature_id: "", school_ids: "" };

export default function BetaFeaturesPage() {
  const { success, error: toastError } = useToast();
  const [betas, setBetas] = useState<BetaFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [promoteConfirm, setPromoteConfirm] = useState<BetaFeature | null>(null);
  const [promoting, setPromoting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/platform/features/beta");
      if (res.ok) {
        const d = await res.json();
        setBetas(d.betas ?? d.data ?? []);
      } else {
        setBetas(MOCK_BETAS);
      }
    } catch {
      setBetas(MOCK_BETAS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAddBeta() {
    if (!form.feature_id) { toastError("Please select a feature"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/platform/features/beta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      success("Feature added to beta program");
      setPanelOpen(false);
      load();
    } catch {
      const feat = AVAILABLE_FEATURES.find(f => f.id === form.feature_id);
      setBetas(prev => [...prev, {
        id: String(Date.now()), feature_id: form.feature_id,
        feature_name: feat?.name ?? "", feature_code: feat?.name.toLowerCase().replace(/\s+/g, "_") ?? "",
        test_schools: form.school_ids.split(",").filter(Boolean).length, feedback_count: 0, adoption_pct: 0,
        status: "active", started_at: new Date().toISOString().split("T")[0],
      }]);
      success("Feature added to beta program (demo)");
      setPanelOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handlePromote(beta: BetaFeature) {
    setPromoting(true);
    try {
      const res = await fetch(`/api/platform/features/beta?action=promote&id=${beta.feature_id}`, { method: "POST" });
      if (!res.ok) throw new Error();
      success(`${beta.feature_name} promoted to production!`);
      setPromoteConfirm(null);
      load();
    } catch {
      setBetas(prev => prev.filter(b => b.id !== beta.id));
      success(`${beta.feature_name} promoted to production! (demo)`);
      setPromoteConfirm(null);
    } finally {
      setPromoting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-extrabold text-slate-900 leading-tight">Beta Features Program</h1>
          <p className="text-slate-500 text-[13px] font-semibold mt-1">Test features with selected schools before full release</p>
        </div>
        <button
          onClick={() => { setForm({ ...EMPTY_FORM }); setPanelOpen(true); }}
          className="flex items-center gap-2 px-4 h-10 rounded-xl text-[13px] font-bold text-white transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
        >
          <Plus size={15} />
          Add to Beta
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] p-5 animate-pulse h-52" />
          ))}
        </div>
      ) : betas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center">
            <FlaskConical size={28} className="text-violet-400" />
          </div>
          <div className="text-center">
            <p className="font-bold text-slate-700 text-[16px]">No beta features</p>
            <p className="text-slate-400 text-[13px] font-semibold mt-1">Add features to the beta program to start testing</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {betas.map((b) => (
            <div key={b.id} className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] p-5 hover:shadow-md hover:border-[#d0c9ef] transition-all flex flex-col">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                    <FlaskConical size={18} className="text-violet-600" />
                  </div>
                  <div>
                    <p className="text-[14px] font-extrabold text-slate-900 leading-tight">{b.feature_name}</p>
                    <p className="text-[11px] font-mono text-slate-400">{b.feature_code}</p>
                  </div>
                </div>
                <span className={`rounded-full text-[11px] font-bold px-2.5 py-0.5 border shrink-0 capitalize ${STATUS_STYLES[b.status] ?? ""}`}>
                  {b.status}
                </span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-2.5 rounded-xl bg-slate-50 border border-[#f0edf8]">
                  <div className="flex items-center justify-center gap-1 text-slate-700 mb-0.5">
                    <Users size={12} />
                    <span className="text-[14px] font-extrabold">{b.test_schools}</span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400">Schools</p>
                </div>
                <div className="text-center p-2.5 rounded-xl bg-slate-50 border border-[#f0edf8]">
                  <div className="flex items-center justify-center gap-1 text-slate-700 mb-0.5">
                    <MessageSquare size={12} />
                    <span className="text-[14px] font-extrabold">{b.feedback_count}</span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400">Feedback</p>
                </div>
                <div className="text-center p-2.5 rounded-xl bg-slate-50 border border-[#f0edf8]">
                  <div className="flex items-center justify-center gap-1 text-slate-700 mb-0.5">
                    <TrendingUp size={12} />
                    <span className="text-[14px] font-extrabold">{b.adoption_pct}%</span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400">Adoption</p>
                </div>
              </div>

              {/* Adoption bar */}
              <div className="mb-4">
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${b.adoption_pct}%`,
                      background: b.adoption_pct > 70 ? "#059669" : b.adoption_pct > 40 ? "#d97706" : "#7c3aed",
                    }}
                  />
                </div>
              </div>

              <div className="mt-auto">
                <p className="text-[10px] font-semibold text-slate-400 mb-3">Started: {b.started_at}</p>
                <button
                  onClick={() => setPromoteConfirm(b)}
                  className="w-full flex items-center justify-center gap-2 h-9 rounded-xl border border-violet-200 bg-violet-50 text-[12px] font-bold text-violet-700 hover:bg-violet-100 transition-all"
                >
                  <Rocket size={13} />
                  Promote to Production
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Promote Confirm Modal */}
      {promoteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setPromoteConfirm(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center">
                <Rocket size={20} className="text-violet-600" />
              </div>
              <div>
                <h3 className="text-[16px] font-extrabold text-slate-900">Promote to Production?</h3>
                <p className="text-[12px] font-semibold text-slate-500">{promoteConfirm.feature_name}</p>
              </div>
            </div>
            <p className="text-slate-500 text-[13px] font-semibold mb-5">
              This will mark the feature as <strong>active</strong> and make it available to all eligible schools. This action cannot be undone easily.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setPromoteConfirm(null)} className="flex-1 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-bold text-slate-700 hover:bg-slate-50 transition-all">Cancel</button>
              <button
                onClick={() => handlePromote(promoteConfirm)}
                disabled={promoting}
                className="flex-1 h-10 rounded-xl text-[13px] font-bold text-white disabled:opacity-70 transition-all"
                style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
              >
                {promoting ? "Promoting..." : "Promote"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add to Beta SlidePanel */}
      <SlidePanel open={panelOpen} onClose={() => setPanelOpen(false)} title="Add to Beta Program" subtitle="Select a feature to include in the beta program">
        <div className="space-y-5">
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Feature</label>
            <select
              value={form.feature_id}
              onChange={e => setForm(p => ({ ...p, feature_id: e.target.value }))}
              className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
            >
              <option value="">Select feature (beta/draft)</option>
              {AVAILABLE_FEATURES.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Initial Beta School IDs</label>
            <textarea
              value={form.school_ids}
              onChange={e => setForm(p => ({ ...p, school_ids: e.target.value }))}
              rows={4}
              className="w-full px-4 py-2.5 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white resize-none font-mono text-[12px]"
              placeholder="Enter school IDs separated by commas&#10;e.g. s1, s2, s3"
            />
            <p className="text-[11px] font-semibold text-slate-400 mt-1">Enter school IDs separated by commas</p>
          </div>
          <div className="flex gap-3 pt-3 border-t border-[#f0edf8]">
            <button onClick={() => setPanelOpen(false)} className="flex-1 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-bold text-slate-700 hover:bg-slate-50 transition-all">Cancel</button>
            <button
              onClick={handleAddBeta}
              disabled={saving}
              className="flex-1 h-10 rounded-xl text-[13px] font-bold text-white disabled:opacity-70 hover:opacity-90 transition-all"
              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
            >
              {saving ? "Adding..." : "Add to Beta"}
            </button>
          </div>
        </div>
      </SlidePanel>
    </div>
  );
}
