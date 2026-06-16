"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet, TrendingUp, TrendingDown, Plus, Loader2 } from "lucide-react";
import { SlidePanel } from "@/components/ui/SlidePanel";
import { useToast } from "@/components/ui/Toast";

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

  const inputClass = "w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold text-slate-900 leading-tight">Platform Wallet</h1>
          <p className="text-slate-500 text-[13px] font-semibold mt-1">Track platform income and expenses.</p>
        </div>
        <button
          onClick={() => setPanelOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-bold transition-all shadow-sm"
          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
        >
          <Plus size={15} />
          Record Transaction
        </button>
      </div>

      {/* Big stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e8e4f3] border-l-4 border-l-violet-500">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
              <Wallet size={22} className="text-violet-600" />
            </div>
            <div>
              <p className={`text-2xl font-extrabold leading-tight ${balance >= 0 ? "text-slate-900" : "text-red-600"}`}>
                GHS {balance.toLocaleString()}
              </p>
              <p className="text-slate-500 text-[13px] font-semibold mt-0.5">Current Balance</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e8e4f3] border-l-4 border-l-emerald-500">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <TrendingUp size={22} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-emerald-700 leading-tight">GHS {totalIncome.toLocaleString()}</p>
              <p className="text-slate-500 text-[13px] font-semibold mt-0.5">Total Income</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e8e4f3] border-l-4 border-l-red-500">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
              <TrendingDown size={22} className="text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-red-600 leading-tight">GHS {totalExpenses.toLocaleString()}</p>
              <p className="text-slate-500 text-[13px] font-semibold mt-0.5">Total Expenses</p>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions table */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#f0edf8] flex items-center justify-between">
          <h2 className="font-extrabold text-slate-900 text-[15px]">Transactions</h2>
          <span className="text-[12px] font-bold text-slate-400">{transactions.length} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#faf9ff] border-b border-[#f0edf8]">
                {["Date", "Type", "Category", "School", "Amount", "Description", "Reference"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-extrabold text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5f3fc]">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center">
                        <Wallet size={22} className="text-violet-400" />
                      </div>
                      <p className="text-slate-400 font-semibold text-[13px]">No transactions recorded yet.</p>
                    </div>
                  </td>
                </tr>
              ) : transactions.map(tx => (
                <tr key={tx.id} className="hover:bg-[#faf9ff] transition-colors">
                  <td className="px-4 py-3.5 text-[12px] font-semibold text-slate-500 whitespace-nowrap">
                    {new Date(tx.created_at).toLocaleDateString("en-GH")}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border ${
                      tx.type === "income"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                        : "bg-red-50 text-red-700 border-red-100"
                    }`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-slate-600 text-[13px] capitalize">{tx.category.replace("_", " ")}</td>
                  <td className="px-4 py-3.5 font-semibold text-slate-600 text-[13px]">{tx.schools?.name ?? "—"}</td>
                  <td className={`px-4 py-3.5 font-extrabold text-[13px] ${tx.type === "income" ? "text-emerald-700" : "text-red-600"}`}>
                    {tx.type === "expense" ? "−" : "+"}GHS {tx.amount?.toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 font-semibold text-[12px] max-w-[180px] truncate">{tx.description ?? "—"}</td>
                  <td className="px-4 py-3.5 font-mono text-[11px] text-slate-400">{tx.reference ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <SlidePanel open={panelOpen} onClose={() => setPanelOpen(false)} title="Record Transaction">
        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Type</label>
            <div className="flex gap-3">
              {["income", "expense"].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set("type", t)}
                  className={`flex-1 py-2.5 rounded-xl border-2 font-bold capitalize text-[13px] transition-all ${
                    form.type === t
                      ? t === "income"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                        : "border-red-400 bg-red-50 text-red-800"
                      : "border-[#e8e4f3] text-slate-600"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Category</label>
            <select value={form.category} onChange={e => set("category", e.target.value)} className={inputClass}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Amount (GHS) <span className="text-red-500">*</span></label>
            <input type="number" value={form.amount} onChange={e => set("amount", e.target.value)} placeholder="e.g. 5999" className={inputClass} />
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">School (optional)</label>
            <select value={form.school_id} onChange={e => set("school_id", e.target.value)} className={inputClass}>
              <option value="">No school</option>
              {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Description</label>
            <input type="text" value={form.description} onChange={e => set("description", e.target.value)} placeholder="Brief note" className={inputClass} />
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Reference</label>
            <input type="text" value={form.reference} onChange={e => set("reference", e.target.value)} placeholder="Receipt / invoice #" className={inputClass} />
          </div>
          <button
            onClick={handleRecord}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-[13px] disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
          >
            {loading ? <><Loader2 size={14} className="animate-spin" /> Recording…</> : "Record Transaction"}
          </button>
        </div>
      </SlidePanel>
    </div>
  );
}
