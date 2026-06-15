"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet, TrendingUp, TrendingDown, Plus, Loader2 } from "lucide-react";
import { SlidePanel } from "@/components/ui/SlidePanel";
import { useToast } from "@/components/ui/Toast";

const PLATFORM_GRADIENT = "linear-gradient(135deg, #1a0533, #2d1b69, #6b1f8a)";

const CATEGORIES = ["subscription", "setup_fee", "sms", "hosting", "infrastructure", "support", "other"];

interface Transaction {
  id: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  description?: string;
  reference?: string;
  created_at: string;
  schools?: { id: string; name: string } | null;
}

interface School {
  id: string;
  name: string;
}

interface Props {
  transactions: Transaction[];
  schools: School[];
  balance: number;
  totalIncome: number;
  totalExpenses: number;
}

export function WalletClient({ transactions, schools, balance, totalIncome, totalExpenses }: Props) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [panelOpen, setPanelOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    type: "income", category: "subscription", amount: "", school_id: "", description: "", reference: "",
  });

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function handleRecord() {
    if (!form.amount || isNaN(Number(form.amount))) { toastError("Valid amount is required."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/platform/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
      });
      if (!res.ok) throw new Error();
      success("Transaction recorded.");
      setPanelOpen(false);
      router.refresh();
    } catch {
      toastError("Failed to record transaction.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl px-8 py-6 text-white flex items-center justify-between" style={{ background: PLATFORM_GRADIENT }}>
        <div>
          <h1 className="text-2xl font-extrabold">Platform Wallet</h1>
          <p className="text-white/60 font-semibold mt-1">Track platform income and expenses.</p>
        </div>
        <button onClick={() => setPanelOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-sm transition-all border border-white/20">
          <Plus size={16} />
          Record Transaction
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Balance", value: balance, icon: Wallet, iconBg: "bg-purple-100", iconColor: "text-purple-700", textColor: balance >= 0 ? "text-slate-900" : "text-red-600" },
          { label: "Total Income", value: totalIncome, icon: TrendingUp, iconBg: "bg-emerald-100", iconColor: "text-emerald-700", textColor: "text-emerald-700" },
          { label: "Total Expenses", value: totalExpenses, icon: TrendingDown, iconBg: "bg-red-100", iconColor: "text-red-600", textColor: "text-red-600" },
        ].map(({ label, value, icon: Icon, iconBg, iconColor, textColor }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
              <Icon size={22} className={iconColor} />
            </div>
            <div>
              <p className={`text-2xl font-extrabold ${textColor}`}>GHS {value.toLocaleString()}</p>
              <p className="text-slate-500 text-sm font-semibold">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Transactions table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-extrabold text-slate-900">Transactions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                {["Date", "Type", "Category", "School", "Amount", "Description", "Reference"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-extrabold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400 font-semibold">No transactions recorded yet.</td></tr>
              ) : transactions.map(tx => (
                <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">
                    {new Date(tx.created_at).toLocaleDateString("en-GH")}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${
                      tx.type === "income" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                    }`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-600 capitalize">{tx.category.replace("_", " ")}</td>
                  <td className="px-4 py-3 font-semibold text-slate-600">{tx.schools?.name ?? "—"}</td>
                  <td className={`px-4 py-3 font-extrabold ${tx.type === "income" ? "text-emerald-700" : "text-red-600"}`}>
                    {tx.type === "expense" ? "−" : "+"}GHS {tx.amount?.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-slate-500 font-semibold max-w-[180px] truncate">{tx.description ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{tx.reference ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <SlidePanel open={panelOpen} onClose={() => setPanelOpen(false)} title="Record Transaction">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Type</label>
            <div className="flex gap-3">
              {["income", "expense"].map(t => (
                <button key={t} type="button" onClick={() => set("type", t)}
                  className={`flex-1 py-2.5 rounded-xl border-2 font-bold capitalize text-sm transition-all ${
                    form.type === t ? "border-purple-500 bg-purple-50 text-purple-800" : "border-slate-200 text-slate-600"
                  }`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Category</label>
            <select value={form.category} onChange={e => set("category", e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold outline-none focus:border-purple-400 bg-white">
              {CATEGORIES.map(c => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Amount (GHS) <span className="text-red-500">*</span></label>
            <input type="number" value={form.amount} onChange={e => set("amount", e.target.value)} placeholder="e.g. 5999"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold outline-none focus:border-purple-400 transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">School (optional)</label>
            <select value={form.school_id} onChange={e => set("school_id", e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold outline-none focus:border-purple-400 bg-white">
              <option value="">No school</option>
              {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Description</label>
            <input type="text" value={form.description} onChange={e => set("description", e.target.value)} placeholder="Brief note"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold outline-none focus:border-purple-400 transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Reference</label>
            <input type="text" value={form.reference} onChange={e => set("reference", e.target.value)} placeholder="Receipt / invoice #"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold outline-none focus:border-purple-400 transition-colors" />
          </div>
          <button onClick={handleRecord} disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-sm disabled:opacity-60"
            style={{ background: PLATFORM_GRADIENT }}>
            {loading ? <><Loader2 size={15} className="animate-spin" /> Recording…</> : "Record Transaction"}
          </button>
        </div>
      </SlidePanel>
    </div>
  );
}
