"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SlidePanel } from "@/components/ui/SlidePanel";
import { useToast } from "@/components/ui/Toast";
import { RefreshCw, Loader2, CreditCard } from "lucide-react";

const STATUS_TABS = ["all", "active", "trial", "expired", "suspended"];

const statusBadge: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  trial: "bg-blue-50 text-blue-700 border border-blue-100",
  expired: "bg-amber-50 text-amber-700 border border-amber-100",
  suspended: "bg-red-50 text-red-700 border border-red-100",
};

const planBadge: Record<string, string> = {
  starter: "bg-slate-50 text-slate-600",
  standard: "bg-blue-50 text-blue-700",
  premium: "bg-violet-50 text-violet-700",
  enterprise: "bg-indigo-50 text-indigo-700",
};

interface Subscription {
  id: string;
  plan_name: string;
  status: string;
  started_at: string;
  expires_at: string;
  amount: number;
  billing_cycle: string;
  schools?: { id: string; name: string; code: string } | null;
}

export function SubscriptionsClient({ subscriptions, activeFilter }: { subscriptions: Subscription[]; activeFilter: string }) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [panelOpen, setPanelOpen] = useState(false);
  const [selected, setSelected] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [renewForm, setRenewForm] = useState({ months: "12", amount: "" });

  async function handleRenew() {
    if (!selected) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/platform/subscriptions/${selected.id}/renew`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(renewForm),
      });
      if (!res.ok) throw new Error("Renewal failed");
      success("Subscription renewed successfully.");
      setPanelOpen(false);
      router.refresh();
    } catch {
      toastError("Failed to renew subscription.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold text-slate-900 leading-tight">Subscriptions</h1>
          <p className="text-slate-500 text-[13px] font-semibold mt-1">{subscriptions.length} subscription records</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] overflow-hidden">
        {/* Status tabs */}
        <div className="flex items-center gap-1 px-5 py-4 border-b border-[#f0edf8] overflow-x-auto">
          {STATUS_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => router.push(`/platform/subscriptions${tab !== "all" ? `?status=${tab}` : ""}`)}
              className={`px-4 py-2 rounded-xl text-[12px] font-bold capitalize whitespace-nowrap transition-all ${
                activeFilter === tab
                  ? "text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
              style={activeFilter === tab ? { background: "linear-gradient(135deg, #4f46e5, #7c3aed)" } : {}}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#faf9ff] border-b border-[#f0edf8]">
                {["School", "Plan", "Status", "Started", "Expires", "Amount", "Billing", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-extrabold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5f3fc]">
              {subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center">
                        <CreditCard size={22} className="text-violet-400" />
                      </div>
                      <p className="text-slate-400 font-semibold text-[13px]">No subscriptions found.</p>
                    </div>
                  </td>
                </tr>
              ) : subscriptions.map(sub => (
                <tr key={sub.id} className="hover:bg-[#faf9ff] transition-colors">
                  <td className="px-4 py-3.5">
                    <p className="font-bold text-slate-900 text-[13px]">{sub.schools?.name ?? "—"}</p>
                    <p className="text-slate-400 text-[11px] font-mono">{sub.schools?.code ?? ""}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full ${planBadge[sub.plan_name] ?? "bg-slate-50 text-slate-500"}`}>
                      {sub.plan_name}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${statusBadge[sub.status] ?? "bg-slate-50 text-slate-500"}`}>
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 font-semibold text-[12px] whitespace-nowrap">
                    {sub.started_at ? new Date(sub.started_at).toLocaleDateString("en-GH") : "—"}
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 font-semibold text-[12px] whitespace-nowrap">
                    {sub.expires_at ? new Date(sub.expires_at).toLocaleDateString("en-GH") : "—"}
                  </td>
                  <td className="px-4 py-3.5 font-extrabold text-slate-900 text-[13px]">
                    GHS {sub.amount?.toLocaleString() ?? "—"}
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 font-semibold text-[12px] capitalize">{sub.billing_cycle ?? "—"}</td>
                  <td className="px-4 py-3.5">
                    <button
                      onClick={() => { setSelected(sub); setRenewForm({ months: "12", amount: String(sub.amount ?? "") }); setPanelOpen(true); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-50 text-violet-700 text-[11px] font-bold hover:bg-violet-100 transition-colors border border-violet-100"
                    >
                      <RefreshCw size={11} />
                      Renew
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <SlidePanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title="Renew Subscription"
        subtitle={selected?.schools?.name}
      >
        <div className="space-y-5">
          <div className="p-4 rounded-2xl" style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
            <p className="text-white/60 text-[10px] font-extrabold uppercase tracking-widest mb-1">Current Plan</p>
            <p className="font-extrabold text-white text-xl capitalize">{selected?.plan_name}</p>
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Renewal Period (months)</label>
            <select
              value={renewForm.months}
              onChange={e => setRenewForm(f => ({ ...f, months: e.target.value }))}
              className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
            >
              <option value="1">1 month</option>
              <option value="3">3 months</option>
              <option value="6">6 months</option>
              <option value="12">12 months (annual)</option>
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Amount (GHS)</label>
            <input
              type="number"
              value={renewForm.amount}
              onChange={e => setRenewForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="e.g. 5999"
              className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all"
            />
          </div>
          <button
            onClick={handleRenew}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-[13px] transition-all disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
          >
            {loading ? <><Loader2 size={14} className="animate-spin" /> Processing…</> : "Confirm Renewal"}
          </button>
        </div>
      </SlidePanel>
    </div>
  );
}
