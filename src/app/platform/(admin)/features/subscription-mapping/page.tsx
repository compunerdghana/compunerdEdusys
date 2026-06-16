"use client";

import { useState, useEffect, useCallback } from "react";
import { CreditCard, Check, X } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

const PLANS = ["Starter", "Standard", "Premium", "Enterprise"];

interface FeatureRow {
  id: string;
  name: string;
  category_id: string;
  category_name: string;
  category_color: string;
  mapping: Record<string, boolean>; // plan -> enabled
}

interface CategoryGroup {
  id: string;
  name: string;
  color: string;
  features: FeatureRow[];
}

const MOCK_DATA: CategoryGroup[] = [
  {
    id: "1", name: "Students", color: "#059669",
    features: [
      { id: "f1", name: "Student Records", category_id: "1", category_name: "Students", category_color: "#059669", mapping: { Starter: true, Standard: true, Premium: true, Enterprise: true } },
      { id: "f2", name: "Student Profiles", category_id: "1", category_name: "Students", category_color: "#059669", mapping: { Starter: true, Standard: true, Premium: true, Enterprise: true } },
      { id: "f3", name: "Bulk Import", category_id: "1", category_name: "Students", category_color: "#059669", mapping: { Starter: false, Standard: true, Premium: true, Enterprise: true } },
    ],
  },
  {
    id: "2", name: "Finance", color: "#7c3aed",
    features: [
      { id: "f4", name: "Fee Collection", category_id: "2", category_name: "Finance", category_color: "#7c3aed", mapping: { Starter: false, Standard: true, Premium: true, Enterprise: true } },
      { id: "f5", name: "Invoicing", category_id: "2", category_name: "Finance", category_color: "#7c3aed", mapping: { Starter: false, Standard: true, Premium: true, Enterprise: true } },
      { id: "f6", name: "Payroll", category_id: "2", category_name: "Finance", category_color: "#7c3aed", mapping: { Starter: false, Standard: false, Premium: true, Enterprise: true } },
      { id: "f7", name: "Financial Analytics", category_id: "2", category_name: "Finance", category_color: "#7c3aed", mapping: { Starter: false, Standard: false, Premium: false, Enterprise: true } },
    ],
  },
  {
    id: "3", name: "Academics", color: "#4f46e5",
    features: [
      { id: "f8", name: "Timetable", category_id: "3", category_name: "Academics", category_color: "#4f46e5", mapping: { Starter: true, Standard: true, Premium: true, Enterprise: true } },
      { id: "f9", name: "E-Learning", category_id: "3", category_name: "Academics", category_color: "#4f46e5", mapping: { Starter: false, Standard: false, Premium: true, Enterprise: true } },
      { id: "f10", name: "AI Grading", category_id: "3", category_name: "Academics", category_color: "#4f46e5", mapping: { Starter: false, Standard: false, Premium: false, Enterprise: true } },
    ],
  },
  {
    id: "4", name: "Communication", color: "#0284c7",
    features: [
      { id: "f11", name: "SMS Notifications", category_id: "4", category_name: "Communication", category_color: "#0284c7", mapping: { Starter: false, Standard: true, Premium: true, Enterprise: true } },
      { id: "f12", name: "Parent Portal", category_id: "4", category_name: "Communication", category_color: "#0284c7", mapping: { Starter: false, Standard: false, Premium: true, Enterprise: true } },
      { id: "f13", name: "WhatsApp Integration", category_id: "4", category_name: "Communication", category_color: "#0284c7", mapping: { Starter: false, Standard: false, Premium: false, Enterprise: true } },
    ],
  },
];

const PLAN_COLORS: Record<string, string> = {
  Starter: "#64748b",
  Standard: "#0284c7",
  Premium: "#d97706",
  Enterprise: "#7c3aed",
};

export default function SubscriptionMappingPage() {
  const { success, error: toastError } = useToast();
  const [groups, setGroups] = useState<CategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulkModal, setBulkModal] = useState<{ plan: string; enable: boolean } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/platform/features/subscription-mapping");
      if (res.ok) {
        const d = await res.json();
        setGroups(d.groups ?? d.data ?? []);
      } else {
        setGroups(MOCK_DATA);
      }
    } catch {
      setGroups(MOCK_DATA);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleCell(featureId: string, plan: string, current: boolean) {
    // Optimistic update
    setGroups(prev => prev.map(g => ({
      ...g,
      features: g.features.map(f => f.id === featureId ? { ...f, mapping: { ...f.mapping, [plan]: !current } } : f),
    })));
    try {
      const res = await fetch("/api/platform/features/subscription-mapping", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feature_id: featureId, plan, enabled: !current }),
      });
      if (!res.ok) throw new Error();
    } catch {
      // Revert
      setGroups(prev => prev.map(g => ({
        ...g,
        features: g.features.map(f => f.id === featureId ? { ...f, mapping: { ...f.mapping, [plan]: current } } : f),
      })));
      toastError("Failed to update mapping");
    }
  }

  async function handleBulkAssign() {
    if (!bulkModal) return;
    setSaving(true);
    const { plan, enable } = bulkModal;
    setGroups(prev => prev.map(g => ({
      ...g,
      features: g.features.map(f => ({ ...f, mapping: { ...f.mapping, [plan]: enable } })),
    })));
    try {
      await fetch("/api/platform/features/subscription-mapping", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bulk: true, plan, enabled: enable }),
      });
    } catch { /* already updated optimistically */ }
    success(`All features ${enable ? "enabled" : "disabled"} for ${plan}`);
    setBulkModal(null);
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-extrabold text-slate-900 leading-tight">Subscription Feature Mapping</h1>
        <p className="text-slate-500 text-[13px] font-semibold mt-1">Control which features are included in each subscription plan</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#faf9ff]">
                <th className="text-left px-6 py-3 text-slate-400 uppercase tracking-widest text-[11px] font-bold min-w-[220px]">Feature</th>
                {PLANS.map(plan => (
                  <th key={plan} className="px-4 py-3 text-center min-w-[120px]">
                    <div className="flex flex-col items-center gap-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: PLAN_COLORS[plan] }}>{plan}</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setBulkModal({ plan, enable: true })}
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100 transition-all"
                        >
                          ALL ON
                        </button>
                        <button
                          onClick={() => setBulkModal({ plan, enable: false })}
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-100 transition-all"
                        >
                          ALL OFF
                        </button>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-t border-[#f5f3fc]">
                    <td className="px-6 py-3.5">
                      <div className="h-3 bg-slate-100 rounded animate-pulse w-40" />
                    </td>
                    {PLANS.map(p => (
                      <td key={p} className="px-4 py-3.5 text-center">
                        <div className="h-6 w-6 bg-slate-100 rounded animate-pulse mx-auto" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                groups.map(group => (
                  <>
                    <tr key={`cat-${group.id}`} className="border-t border-[#f5f3fc] bg-[#faf9ff]">
                      <td colSpan={PLANS.length + 1} className="px-6 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ background: group.color }} />
                          <span className="text-[11px] font-extrabold uppercase tracking-widest" style={{ color: group.color }}>{group.name}</span>
                        </div>
                      </td>
                    </tr>
                    {group.features.map(f => (
                      <tr key={f.id} className="border-t border-[#f5f3fc] hover:bg-[#faf9ff] transition-colors">
                        <td className="px-6 py-3 pl-10">
                          <span className="text-[13px] font-semibold text-slate-700">{f.name}</span>
                        </td>
                        {PLANS.map(plan => {
                          const enabled = f.mapping[plan] ?? false;
                          return (
                            <td key={plan} className="px-4 py-3 text-center">
                              <button
                                onClick={() => toggleCell(f.id, plan, enabled)}
                                className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center mx-auto transition-all ${
                                  enabled
                                    ? "border-emerald-400 bg-emerald-50 hover:bg-emerald-100"
                                    : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                                }`}
                              >
                                {enabled
                                  ? <Check size={14} className="text-emerald-600 font-extrabold" strokeWidth={3} />
                                  : <X size={12} className="text-slate-300" />
                                }
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Modal */}
      {bulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setBulkModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-[16px] font-extrabold text-slate-900 mb-2">
              {bulkModal.enable ? "Enable" : "Disable"} All for {bulkModal.plan}?
            </h3>
            <p className="text-slate-500 text-[13px] font-semibold mb-5">
              This will {bulkModal.enable ? "enable" : "disable"} all features for the <strong>{bulkModal.plan}</strong> plan. Individual overrides can still be made after.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setBulkModal(null)} className="flex-1 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-bold text-slate-700 hover:bg-slate-50 transition-all">Cancel</button>
              <button
                onClick={handleBulkAssign}
                disabled={saving}
                className={`flex-1 h-10 rounded-xl text-[13px] font-bold text-white disabled:opacity-70 transition-all ${bulkModal.enable ? "bg-emerald-600 hover:bg-emerald-700" : "bg-slate-600 hover:bg-slate-700"}`}
              >
                {saving ? "Applying..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
