"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { SlidePanel } from "@/components/ui/SlidePanel";
import { PlusCircle, BarChart2, AlertTriangle, Target, DollarSign, Pencil } from "lucide-react";

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

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-[13px] font-semibold text-[var(--text-strong)] mb-1.5">{children}</label>;
}
function FormInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-[14px] outline-none focus:border-[#262262] focus:ring-2 focus:ring-[#262262]/10 transition-all" />;
}

export default function BudgetPage() {
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableNotReady, setTableNotReady] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editBudget, setEditBudget] = useState<Budget | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ budget_name: "", category: CATEGORIES[0], period_start: "", period_end: "", allocated_amount: "", notes: "" });

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
    setForm({ budget_name: b.budget_name, category: b.category, period_start: b.period_start, period_end: b.period_end, allocated_amount: String(b.allocated_amount), notes: b.notes ?? "" });
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

  function barColor(used: number, allocated: number) {
    if (allocated === 0) return "#9CA3AF";
    const p = used / allocated;
    return p > 1 ? "#DC2626" : p >= 0.8 ? "#D97706" : "#16A34A";
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[22px] font-extrabold text-[var(--text-strong)]">Budget Management</h2>
          <p className="text-[14px] text-[var(--text-muted)] mt-0.5">Allocate and track spending across budget categories</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-bold text-white shadow-sm hover:opacity-90 transition-opacity"
          style={{ background: GRADIENT }}>
          <PlusCircle size={16} /> New Budget
        </button>
      </div>

      {tableNotReady && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <p className="font-bold text-amber-800 text-[15px]">Finance Module Setup Required</p>
          <a href="/finance/setup" className="text-[13px] font-semibold text-amber-800 underline mt-1 inline-block">View setup →</a>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Allocated", value: formatCurrency(totalAllocated), sub: `${budgets.length} budgets`, icon: Target, bg: "#EEF2FF", color: BRAND },
          { label: "Total Used", value: formatCurrency(totalUsed), sub: `${Math.round(totalAllocated > 0 ? (totalUsed / totalAllocated) * 100 : 0)}% of budget`, icon: BarChart2, bg: "#F0FDF4", color: "#16A34A" },
          { label: "Over Budget", value: overBudgetCount.toString(), sub: "categories exceeded", icon: AlertTriangle, bg: "#FEF2F2", color: "#DC2626" },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-[0_1px_6px_rgba(0,0,0,0.05)] flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: c.bg }}>
              <c.icon size={22} style={{ color: c.color }} />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">{c.label}</p>
              <p className="text-[24px] font-extrabold text-[var(--text-strong)] leading-tight">{c.value}</p>
              <p className="text-[12px] text-[var(--text-muted)]">{c.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Budget Cards */}
      {loading ? (
        <div className="py-12 text-center text-[14px] text-[var(--text-muted)]">Loading budgets…</div>
      ) : budgets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[var(--border)] p-16 text-center shadow-[0_1px_6px_rgba(0,0,0,0.05)]">
          <DollarSign size={36} className="mx-auto mb-3 opacity-20 text-[var(--text-muted)]" />
          <p className="text-[16px] font-bold text-[var(--text-muted)]">No budgets yet</p>
          <p className="text-[13px] text-[var(--text-muted)] mt-1">Create your first budget to track spending</p>
          <button onClick={openNew} className="mt-5 px-5 py-2.5 rounded-xl text-[14px] font-bold text-white" style={{ background: GRADIENT }}>
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
            const color = barColor(used, allocated);

            return (
              <div key={b.id} className="bg-white rounded-2xl border border-[var(--border)] shadow-[0_1px_6px_rgba(0,0,0,0.05)] p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <h3 className="text-[15px] font-bold text-[var(--text-strong)] truncate">{b.budget_name}</h3>
                      {isOver && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-red-500 px-2 py-0.5 rounded-full shrink-0">
                          <AlertTriangle size={9} /> OVER
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-[var(--text-muted)]">{b.category}</p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{formatDate(b.period_start)} – {formatDate(b.period_end)}</p>
                  </div>
                  <button onClick={() => openEdit(b)}
                    className="w-8 h-8 flex items-center justify-center rounded-xl border border-[var(--border)] text-[var(--text-muted)] hover:border-[#262262] hover:text-[#262262] transition-colors shrink-0">
                    <Pencil size={13} />
                  </button>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <div>
                      <p className="text-[11px] text-[var(--text-muted)]">Used</p>
                      <p className="text-[18px] font-extrabold" style={{ color }}>{formatCurrency(used)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-[var(--text-muted)]">Allocated</p>
                      <p className="text-[18px] font-extrabold text-[var(--text-strong)]">{formatCurrency(allocated)}</p>
                    </div>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
                  </div>
                  <p className="text-right text-[12px] font-bold mt-1" style={{ color }}>
                    {isOver ? `${Math.round(((used - allocated) / allocated) * 100)}% over` : `${pct}% used`}
                  </p>
                </div>

                {b.notes && <p className="text-[12px] text-[var(--text-muted)] italic border-t border-[var(--border)] pt-3">{b.notes}</p>}
              </div>
            );
          })}
        </div>
      )}

      {/* Form Panel */}
      <SlidePanel open={showForm} onClose={() => setShowForm(false)}
        title={editBudget ? "Edit Budget" : "New Budget"}
        subtitle={editBudget ? "Update budget allocation" : "Create a new spending budget"}
        width="md">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <FieldLabel>Budget Name *</FieldLabel>
            <FormInput required value={form.budget_name} onChange={e => setForm(f => ({ ...f, budget_name: e.target.value }))} placeholder="e.g. Term 1 Stationery" />
          </div>
          <div>
            <FieldLabel>Category *</FieldLabel>
            <select required value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-[14px] outline-none focus:border-[#262262] focus:ring-2 focus:ring-[#262262]/10 cursor-pointer">
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Period Start *</FieldLabel>
              <FormInput type="date" required value={form.period_start} onChange={e => setForm(f => ({ ...f, period_start: e.target.value }))} />
            </div>
            <div>
              <FieldLabel>Period End *</FieldLabel>
              <FormInput type="date" required value={form.period_end} onChange={e => setForm(f => ({ ...f, period_end: e.target.value }))} />
            </div>
          </div>
          <div>
            <FieldLabel>Allocated Amount (GHS) *</FieldLabel>
            <FormInput type="number" min="0.01" step="0.01" required value={form.allocated_amount} onChange={e => setForm(f => ({ ...f, allocated_amount: e.target.value }))} placeholder="0.00" />
          </div>
          <div>
            <FieldLabel>Notes</FieldLabel>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Optional notes…"
              className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-[14px] outline-none focus:border-[#262262] resize-none transition-all" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 h-11 rounded-xl border border-[var(--border)] text-[14px] font-semibold text-[var(--text-muted)] hover:bg-[var(--neutral-50)] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 h-11 rounded-xl text-[14px] font-bold text-white disabled:opacity-60 hover:opacity-90 transition-opacity"
              style={{ background: GRADIENT }}>
              {submitting ? "Saving…" : editBudget ? "Update Budget" : "Create Budget"}
            </button>
          </div>
        </form>
      </SlidePanel>
    </div>
  );
}
