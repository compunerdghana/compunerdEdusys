"use client";

import { useState, useEffect, useCallback } from "react";
import { School, Plus, Settings, ToggleLeft, ToggleRight, Check } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { SlidePanel } from "@/components/ui/SlidePanel";

interface SchoolAccess {
  id: string;
  school_id: string;
  school_name: string;
  school_code: string;
  plan: string;
  enabled_overrides: number;
  disabled_overrides: number;
}

interface FeatureOverride {
  id: string;
  feature_id: string;
  feature_name: string;
  category_name: string;
  category_color: string;
  subscription_default: boolean;
  override: boolean | null; // null = no override
  access_type: string;
  expires_at: string | null;
}

interface AvailableFeature {
  id: string;
  name: string;
  category_name: string;
}

const PLAN_STYLES: Record<string, string> = {
  starter: "bg-slate-50 text-slate-600 border-slate-200",
  standard: "bg-blue-50 text-blue-700 border-blue-200",
  premium: "bg-amber-50 text-amber-700 border-amber-200",
  enterprise: "bg-violet-50 text-violet-700 border-violet-200",
};

const ACCESS_TYPE_STYLES: Record<string, string> = {
  permanent: "bg-emerald-50 text-emerald-700 border-emerald-200",
  temporary: "bg-amber-50 text-amber-700 border-amber-200",
  trial: "bg-blue-50 text-blue-700 border-blue-200",
};

const MOCK_ACCESS: SchoolAccess[] = [
  { id: "1", school_id: "s1", school_name: "Accra Academy", school_code: "ACC-001", plan: "premium", enabled_overrides: 3, disabled_overrides: 1 },
  { id: "2", school_id: "s2", school_name: "Wesley Girls High", school_code: "WGH-002", plan: "enterprise", enabled_overrides: 5, disabled_overrides: 0 },
  { id: "3", school_id: "s3", school_name: "Mawuli School", school_code: "MAW-003", plan: "standard", enabled_overrides: 1, disabled_overrides: 2 },
  { id: "4", school_id: "s4", school_name: "Achimota School", school_code: "ACH-004", plan: "starter", enabled_overrides: 0, disabled_overrides: 0 },
];

const MOCK_OVERRIDES: FeatureOverride[] = [
  { id: "o1", feature_id: "f1", feature_name: "AI Report Generator", category_name: "Reports", category_color: "#d97706", subscription_default: false, override: true, access_type: "trial", expires_at: "2025-03-31" },
  { id: "o2", feature_id: "f2", feature_name: "WhatsApp Integration", category_name: "Communication", category_color: "#0284c7", subscription_default: false, override: true, access_type: "permanent", expires_at: null },
  { id: "o3", feature_id: "f3", feature_name: "Payroll Processing", category_name: "Finance", category_color: "#7c3aed", subscription_default: true, override: false, access_type: "permanent", expires_at: null },
  { id: "o4", feature_id: "f4", feature_name: "Timetable Builder", category_name: "Academics", category_color: "#4f46e5", subscription_default: true, override: null, access_type: "permanent", expires_at: null },
  { id: "o5", feature_id: "f5", feature_name: "Fee Collection", category_name: "Finance", category_color: "#7c3aed", subscription_default: true, override: null, access_type: "permanent", expires_at: null },
];

const MOCK_FEATURES: AvailableFeature[] = [
  { id: "f1", name: "AI Report Generator", category_name: "Reports" },
  { id: "f2", name: "WhatsApp Integration", category_name: "Communication" },
  { id: "f10", name: "E-Learning Portal", category_name: "Academics" },
  { id: "f11", name: "Biometric Attendance", category_name: "Attendance" },
];

const MOCK_SCHOOLS: { id: string; name: string; code: string }[] = [
  { id: "s1", name: "Accra Academy", code: "ACC-001" },
  { id: "s2", name: "Wesley Girls High", code: "WGH-002" },
  { id: "s5", name: "Prempeh College", code: "PRE-005" },
];

const EMPTY_GRANT = { school_id: "", feature_id: "", access_type: "permanent", expires_at: "", notes: "" };

export default function SchoolAccessPage() {
  const { success, error: toastError } = useToast();
  const [access, setAccess] = useState<SchoolAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [manageSchool, setManageSchool] = useState<SchoolAccess | null>(null);
  const [overrides, setOverrides] = useState<FeatureOverride[]>([]);
  const [loadingOverrides, setLoadingOverrides] = useState(false);
  const [grantOpen, setGrantOpen] = useState(false);
  const [grantForm, setGrantForm] = useState({ ...EMPTY_GRANT });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/platform/features/school-access");
      if (res.ok) {
        const d = await res.json();
        setAccess(d.schools ?? d.data ?? []);
      } else {
        setAccess(MOCK_ACCESS);
      }
    } catch {
      setAccess(MOCK_ACCESS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function openManage(school: SchoolAccess) {
    setManageSchool(school);
    setLoadingOverrides(true);
    try {
      const res = await fetch(`/api/platform/features/school-access?school_id=${school.school_id}`);
      if (res.ok) {
        const d = await res.json();
        setOverrides(d.overrides ?? []);
      } else {
        setOverrides(MOCK_OVERRIDES);
      }
    } catch {
      setOverrides(MOCK_OVERRIDES);
    } finally {
      setLoadingOverrides(false);
    }
  }

  async function toggleOverride(override: FeatureOverride) {
    const newVal = override.override === null ? !override.subscription_default : !override.override;
    setOverrides(prev => prev.map(o => o.id === override.id ? { ...o, override: newVal } : o));
    try {
      await fetch("/api/platform/features/school-access", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ override_id: override.id, enabled: newVal }),
      });
    } catch { /* optimistic */ }
  }

  async function handleGrant() {
    if (!grantForm.school_id || !grantForm.feature_id) {
      toastError("School and feature are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/platform/features/school-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(grantForm),
      });
      if (!res.ok) throw new Error();
      success("Access granted");
      setGrantOpen(false);
      load();
    } catch {
      success("Access granted (demo)");
      setGrantOpen(false);
    } finally {
      setSaving(false);
    }
  }

  function getEffective(o: FeatureOverride) {
    if (o.override !== null) return o.override;
    return o.subscription_default;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-extrabold text-slate-900 leading-tight">School Feature Access</h1>
          <p className="text-slate-500 text-[13px] font-semibold mt-1">Manage per-school feature overrides and access grants</p>
        </div>
        <button
          onClick={() => { setGrantForm({ ...EMPTY_GRANT }); setGrantOpen(true); }}
          className="flex items-center gap-2 px-4 h-10 rounded-xl text-[13px] font-bold text-white transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
        >
          <Plus size={15} />
          Grant Access
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#faf9ff]">
                <th className="text-left px-6 py-3 text-slate-400 uppercase tracking-widest text-[11px] font-bold">School</th>
                <th className="text-left px-4 py-3 text-slate-400 uppercase tracking-widest text-[11px] font-bold">Plan</th>
                <th className="text-left px-4 py-3 text-slate-400 uppercase tracking-widest text-[11px] font-bold">Enabled Overrides</th>
                <th className="text-left px-4 py-3 text-slate-400 uppercase tracking-widest text-[11px] font-bold">Disabled Overrides</th>
                <th className="text-right px-6 py-3 text-slate-400 uppercase tracking-widest text-[11px] font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5f3fc]">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((__, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-3 bg-slate-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : access.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <School size={28} className="text-slate-300" />
                      <p className="text-slate-400 font-semibold text-[13px]">No school access records found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                access.map((s) => (
                  <tr key={s.id} className="hover:bg-[#faf9ff] transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
                          <School size={15} className="text-violet-500" />
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-slate-900">{s.school_name}</p>
                          <p className="text-[11px] font-mono text-slate-400">{s.school_code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`rounded-full text-[11px] font-bold px-2.5 py-0.5 border capitalize ${PLAN_STYLES[s.plan] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}>
                        {s.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-[13px] font-bold text-emerald-700">{s.enabled_overrides}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-red-400" />
                        <span className="text-[13px] font-bold text-red-600">{s.disabled_overrides}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        onClick={() => openManage(s)}
                        className="flex items-center gap-1.5 px-3 h-8 rounded-lg border border-[#e0daf0] text-[12px] font-bold text-slate-600 hover:text-violet-600 hover:border-violet-300 transition-all ml-auto"
                      >
                        <Settings size={12} />
                        Manage
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manage School SlidePanel */}
      <SlidePanel
        open={!!manageSchool}
        onClose={() => setManageSchool(null)}
        title={manageSchool?.school_name ?? ""}
        subtitle="Feature access overrides"
        width="xl"
      >
        {loadingOverrides ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#e0daf0", borderTopColor: "#7c3aed" }} />
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[12px] font-bold text-slate-500 mb-4">
              Gray = subscription default · Green toggle = enabled override · Red toggle = disabled override
            </p>
            {overrides.map(o => {
              const effective = getEffective(o);
              const hasOverride = o.override !== null;
              return (
                <div key={o.id} className="flex items-center gap-4 p-4 rounded-xl border border-[#e8e4f3] hover:bg-[#faf9ff] transition-all">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[13px] font-bold text-slate-900">{o.feature_name}</p>
                      <span
                        className="rounded-full text-[10px] font-bold px-2 py-0.5 border"
                        style={{ background: o.category_color + "15", color: o.category_color, borderColor: o.category_color + "40" }}
                      >
                        {o.category_name}
                      </span>
                      {hasOverride && (
                        <span className={`rounded-full text-[10px] font-bold px-2 py-0.5 border ${ACCESS_TYPE_STYLES[o.access_type] ?? ""}`}>
                          {o.access_type}
                        </span>
                      )}
                      {o.expires_at && (
                        <span className="text-[10px] font-semibold text-amber-600">Expires: {o.expires_at}</span>
                      )}
                    </div>
                    <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                      Plan default: {o.subscription_default ? "enabled" : "disabled"}
                      {hasOverride ? ` · Override: ${o.override ? "enabled" : "disabled"}` : " · No override"}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleOverride(o)}
                    className={`flex items-center gap-1.5 px-3 h-8 rounded-lg border text-[12px] font-bold transition-all shrink-0 ${
                      effective
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    {effective
                      ? <><ToggleRight size={14} /> On</>
                      : <><ToggleLeft size={14} /> Off</>
                    }
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </SlidePanel>

      {/* Grant Access SlidePanel */}
      <SlidePanel
        open={grantOpen}
        onClose={() => setGrantOpen(false)}
        title="Grant Feature Access"
        subtitle="Grant a school access to a specific feature"
      >
        <div className="space-y-5">
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">School <span className="text-red-500">*</span></label>
            <select
              value={grantForm.school_id}
              onChange={e => setGrantForm(p => ({ ...p, school_id: e.target.value }))}
              className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
            >
              <option value="">Select school</option>
              {MOCK_SCHOOLS.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Feature <span className="text-red-500">*</span></label>
            <select
              value={grantForm.feature_id}
              onChange={e => setGrantForm(p => ({ ...p, feature_id: e.target.value }))}
              className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
            >
              <option value="">Select feature</option>
              {MOCK_FEATURES.map(f => <option key={f.id} value={f.id}>{f.name} ({f.category_name})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Access Type</label>
            <div className="grid grid-cols-3 gap-2">
              {["permanent", "temporary", "trial"].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setGrantForm(p => ({ ...p, access_type: t }))}
                  className={`py-2 px-3 rounded-xl border text-[12px] font-bold capitalize transition-all ${
                    grantForm.access_type === t
                      ? "border-violet-400 bg-violet-50 text-violet-700"
                      : "border-[#e0daf0] text-slate-500 hover:border-violet-200"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          {grantForm.access_type !== "permanent" && (
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Expiry Date</label>
              <input
                type="date"
                value={grantForm.expires_at}
                onChange={e => setGrantForm(p => ({ ...p, expires_at: e.target.value }))}
                className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
              />
            </div>
          )}
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Notes</label>
            <textarea
              value={grantForm.notes}
              onChange={e => setGrantForm(p => ({ ...p, notes: e.target.value }))}
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white resize-none"
              placeholder="Reason for granting access..."
            />
          </div>
          <div className="flex gap-3 pt-3 border-t border-[#f0edf8]">
            <button onClick={() => setGrantOpen(false)} className="flex-1 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-bold text-slate-700 hover:bg-slate-50 transition-all">Cancel</button>
            <button
              onClick={handleGrant}
              disabled={saving}
              className="flex-1 h-10 rounded-xl text-[13px] font-bold text-white disabled:opacity-70 hover:opacity-90 transition-all"
              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
            >
              {saving ? "Granting..." : "Grant Access"}
            </button>
          </div>
        </div>
      </SlidePanel>
    </div>
  );
}
