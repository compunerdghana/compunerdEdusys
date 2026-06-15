"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { PlusCircle, BarChart2, AlertTriangle, DollarSign, Target } from "lucide-react";

const GRADIENT = "linear-gradient(135deg, #262262, #92278F)";
const BRAND = "#262262";

const CATEGORIES = [
  "Salaries & Benefits", "Utilities", "Maintenance", "Supplies & Materials",
  "Technology", "Events & Activities", "Transportation", "Food & Nutrition",
  "Security", "Marketing", "Furniture & Equipment", "Professional Development", "Other",
];

interface Budget {
  id: string;
  budget_name: string;
  category: string;
  period_start: string;
  period_end: string;
  allocated_amount: number;
  used_amount: number;
  notes?: string;
  created_at: string;
}

export default function BudgetPage() {
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableNotReady, setTableNotReady] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editBudget, setEditBudget] = useState<Budget | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    budget_name: "",
    category: CATEGORIES[0],
    period_start: "",
    period_end: "",
    allocated_amount: "",
    notes: "",
  });

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("school_id").eq("id", user.id).single();
      setSchoolId(profile?.school_id ?? null);
    })();
  }, []);

  const fetchBudgets = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    const res = await fetch(`/api/admin/finance/budget?schoolId=${schoolId}`);
    const json = await res.json();
    if (json.tableNotReady) { setTableNotReady(true); setLoading(false); return; }
    setBudgets(json.data ?? []);
    setLoading(false);
  }, [schoolId]);

  useEffect(() => { fetchBudgets(); }, [fetchBudgets]);

  function openNew() {
    setEditBudget(null);
    setForm({ budget_name: "", category: CATEGORIES[0], period_start: "", period_end: "", allocated_amount: "", notes: "" });
    setShowForm(true);
  }

  function openEdit(b: Budget) {
    setEditBudget(b);
    setForm({
      budget_name: b.budget_name,
      category: b.category,
      period_start: b.period_start,
      period_end: b.period_end,
      allocated_amount: String(b.allocated_amount),
      notes: b.notes ?? "",
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const body = { ...form, allocated_amount: parseFloat(form.allocated_amount), school_id: schoolId };
    if (editBudget) {
      await fetch("/api/admin/finance/budget", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, id: editBudget.id }) });
    } else {
      await fetch("/api/admin/finance/budget", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    setSubmitting(false);
    setShowForm(false);
    fetchBudgets();
  }

  const totalAllocated = budgets.reduce((s, b) => s + Number(b.allocated_amount), 0);
  const totalUsed = budgets.reduce((s, b) => s + Number(b.used_amount), 0);
  const overBudgetCount = budgets.filter(b => Number(b.used_amount) > Number(b.allocated_amount)).length;

  function getBarColor(used: number, allocated: number) {
    if (allocated === 0) return "#9CA3AF";
    const pct = used / allocated;
    if (pct > 1) return "#DC2626";
    if (pct >= 0.8) return "#D97706";
    return "#16A34A";
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[20px] font-extrabold text-[var(--text-strong)]">Budget Management</h2>
          <p className="text-[13px] text-[var(--text-muted)] mt-0.5">Allocate and track spending across budget categories</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white shadow-sm hover:opacity-90 transition-opacity"
          style={{ background: GRADIENT }}>
          <PlusCircle size={15} /> New Budget
        </button>
      </div>

      {tableNotReady && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <p className="font-semibold text-amber-800 text-[14px]">Finance Module Setup Required</p>
          <p className="text-[13px] text-amber-700 mt-1">Run the SQL migration first to enable this feature.</p>
          <a href="/finance/setup" className="text-[12px] font-semibold text-amber-800 underline mt-2 inline-block">View setup instructions →</a>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Allocated", value: formatCurrency(totalAllocated), sub: `${budgets.length} budgets`, icon: Target, iconBg: "#EEF2FF", iconColor: BRAND },
          { label: "Total Used", value: formatCurrency(totalUsed), sub: `${Math.round(totalAllocated > 0 ? (totalUsed / totalAllocated) * 100 : 0)}% of budget`, icon: BarChart2, iconBg: "#F0FDF4", iconColor: "#16A34A" },
          { label: "Over Budget", value: overBudgetCount.toString(), sub: "categories exceeded", icon: AlertTriangle, iconBg: "#FEF2F2", iconColor: "#DC2626" },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-[0_1px_6px_rgba(0,0,0,0.05)] flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: card.iconBg }}>
              <card.icon size={20} style={{ color: card.iconColor }} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">{card.label}</p>
              <p className="text-[22px] font-extrabold text-[var(--text-strong)] leading-tight mt-0.5">{card.value}</p>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Budget Cards Grid */}
      {loading ? (
        <div className="py-12 text-center text-[13px] text-[var(--text-muted)]">Loading budgets…</div>
      ) : budgets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[var(--border)] p-12 text-center shadow-[0_1px_6px_rgba(0,0,0,0.05)]">
          <DollarSign size={32} className="mx-auto mb-3 opacity-20 text-[var(--text-muted)]" />
          <p className="text-[14px] font-semibold text-[var(--text-muted)]">No budgets yet</p>
          <p className="text-[12px] text-[var(--text-muted)] mt-1">Create your first budget to track spending</p>
          <button onClick={openNew} className="mt-4 px-4 py-2 rounded-xl text-[13px] font-bold text-white" style={{ background: GRADIENT }}>
            Create Budget
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map(b => {
            const allocated = Number(b.allocated_amount);
            const used = Number(b.used_amount);
            const pct = allocated > 0 ? Math.min(Math.round((used / allocated) * 100), 100) : 0;
            const isOver = used > allocated;
            const barColor = getBarColor(used, allocated);

            return (
              <div key={b.id} className="bg-white rounded-2xl border border-[var(--border)] shadow-[0_1px_6px_rgba(0,0,0,0.05)] p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-[14px] font-bold text-[var(--text-strong)] truncate">{b.budget_name}</h3>
                      {isOver && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-red-600 px-2 py-0.5 rounded-full">
                          <AlertTriangle size={10} /> OVER BUDGET
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{b.category}</p>
                  </div>
                  <button onClick={() => openEdit(b)}
                    className="text-[11px] font-semibold px-2 py-1 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:border-[#262262] hover:text-[#262262] transition-colors shrink-0">
                    Edit
                  </button>
                </div>

                <div className="text-[11px] text-[var(--text-muted)]">
                  {formatDate(b.period_start)} – {formatDate(b.period_end)}
                </div>

                <div>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-[11px] text-[var(--text-muted)]">Used: <strong style={{ color: barColor }}>{formatCurrency(used)}</strong></span>
                    <span className="text-[11px] font-bold" style={{ color: barColor }}>{isOver ? `+${Math.round(((used - allocated) / allocated) * 100)}%` : `${pct}%`}</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(pct, 100)}%`, background: barColor }} />
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-[10px] text-[var(--text-muted)]">GH₵ 0</span>
                    <span className="text-[10px] font-semibold text-[var(--text-muted)]">Allocated: {formatCurrency(allocated)}</span>
                  </div>
                </div>

                {b.notes && <p className="text-[11px] text-[var(--text-muted)] italic border-t border-[var(--border)] pt-2">{b.notes}</p>}
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)}
        title={editBudget ? "Edit Budget" : "New Budget"}
        subtitle={editBudget ? "Update budget allocation" : "Create a new spending budget"}
        size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[12px] font-semibold text-[var(--text-muted)] mb-1.5">Budget Name *</label>
            <input required value={form.budget_name} onChange={e => setForm(f => ({ ...f, budget_name: e.target.value }))} placeholder="e.g. Term 1 Stationery"
              className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-[13px] outline-none focus:border-[#262262]" />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[var(--text-muted)] mb-1.5">Category *</label>
            <select required value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-[13px] outline-none focus:border-[#262262]">
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-[var(--text-muted)] mb-1.5">Period Start *</label>
              <input type="date" required value={form.period_start} onChange={e => setForm(f => ({ ...f, period_start: e.target.value }))}
                className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-[13px] outline-none focus:border-[#262262]" />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[var(--text-muted)] mb-1.5">Period End *</label>
              <input type="date" required value={form.period_end} onChange={e => setForm(f => ({ ...f, period_end: e.target.value }))}
                className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-[13px] outline-none focus:border-[#262262]" />
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[var(--text-muted)] mb-1.5">Allocated Amount (GHS) *</label>
            <input type="number" min="0.01" step="0.01" required value={form.allocated_amount} onChange={e => setForm(f => ({ ...f, allocated_amount: e.target.value }))} placeholder="0.00"
              className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-[13px] outline-none focus:border-[#262262]" />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[var(--text-muted)] mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Optional notes…"
              className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#262262] resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 h-10 rounded-xl border border-[var(--border)] text-[13px] font-semibold text-[var(--text-muted)] hover:bg-[var(--neutral-50)]">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 h-10 rounded-xl text-[13px] font-bold text-white disabled:opacity-60"
              style={{ background: GRADIENT }}>
              {submitting ? "Saving…" : editBudget ? "Update Budget" : "Create Budget"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
