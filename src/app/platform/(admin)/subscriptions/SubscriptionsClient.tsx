"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SlidePanel } from "@/components/ui/SlidePanel";
import { useToast } from "@/components/ui/Toast";
import { RefreshCw, Loader2 } from "lucide-react";

const PLATFORM_GRADIENT = "linear-gradient(135deg, #1a0533, #2d1b69, #6b1f8a)";
const STATUS_TABS = ["all", "active", "trial", "expired", "suspended"];

const statusBadge: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  trial: "bg-blue-100 text-blue-700",
  expired: "bg-amber-100 text-amber-700",
  suspended: "bg-red-100 text-red-700",
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
      <div className="rounded-2xl px-8 py-6 text-white" style={{ background: PLATFORM_GRADIENT }}>
        <h1 className="text-2xl font-extrabold">Subscriptions</h1>
        <p className="text-white/60 font-semibold mt-1">{subscriptions.length} subscription records</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex items-center gap-1 bg-slate-50 px-4 py-3 border-b border-slate-100 overflow-x-auto">
          {STATUS_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => router.push(`/platform/subscriptions${tab !== "all" ? `?status=${tab}` : ""}`)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize whitespace-nowrap transition-all ${
                activeFilter === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                {["School", "Plan", "Status", "Started", "Expires", "Amount", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-extrabold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 font-semibold">No subscriptions found.</td>
                </tr>
              ) : subscriptions.map(sub => (
                <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-900">{sub.schools?.name ?? "—"}</p>
                    <p className="text-slate-400 text-xs font-mono">{sub.schools?.code ?? ""}</p>
                  </td>
                  <td className="px-4 py-3 font-bold text-purple-700 capitalize">{sub.plan_name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${statusBadge[sub.status] ?? "bg-slate-100 text-slate-500"}`}>
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 font-semibold text-xs">
                    {sub.started_at ? new Date(sub.started_at).toLocaleDateString("en-GH") : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600 font-semibold text-xs">
                    {sub.expires_at ? new Date(sub.expires_at).toLocaleDateString("en-GH") : "—"}
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-900">
                    GHS {sub.amount?.toLocaleString() ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => { setSelected(sub); setRenewForm({ months: "12", amount: String(sub.amount ?? "") }); setPanelOpen(true); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 text-xs font-bold hover:bg-purple-100 transition-colors"
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
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Current Plan</label>
            <p className="font-extrabold text-purple-700 capitalize text-lg">{selected?.plan_name}</p>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Renewal Period (months)</label>
            <select
              value={renewForm.months}
              onChange={e => setRenewForm(f => ({ ...f, months: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 outline-none focus:border-purple-400 transition-colors bg-white"
            >
              <option value="1">1 month</option>
              <option value="3">3 months</option>
              <option value="6">6 months</option>
              <option value="12">12 months (annual)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Amount (GHS)</label>
            <input
              type="number"
              value={renewForm.amount}
              onChange={e => setRenewForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="e.g. 5999"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 outline-none focus:border-purple-400 transition-colors"
            />
          </div>
          <button
            onClick={handleRenew}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-60"
            style={{ background: PLATFORM_GRADIENT }}
          >
            {loading ? <><Loader2 size={15} className="animate-spin" /> Processing…</> : "Confirm Renewal"}
          </button>
        </div>
      </SlidePanel>
    </div>
  );
}
