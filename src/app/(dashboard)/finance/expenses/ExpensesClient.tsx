"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  PlusCircle, Search, Receipt, CheckCircle2, XCircle,
  Clock, AlertCircle, Ban, Loader2, ChevronRight,
} from "lucide-react";
import type { Expense, Category } from "./page";

const BRAND = "#262262";

interface Props {
  schoolId: string;
  role: string;
  userName: string;
  initialExpenses: Expense[];
  initialCategories: Category[];
  tableNotReady: boolean;
}

const STATUS: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  pending:           { label: "Pending",       icon: <Clock size={12} />,        cls: "bg-amber-100 text-amber-700" },
  approved:          { label: "Approved",       icon: <CheckCircle2 size={12} />, cls: "bg-green-100 text-green-700" },
  rejected:          { label: "Rejected",       icon: <XCircle size={12} />,      cls: "bg-red-100 text-red-700" },
  changes_requested: { label: "Changes Needed", icon: <AlertCircle size={12} />,  cls: "bg-orange-100 text-orange-700" },
  voided:            { label: "Voided",         icon: <Ban size={12} />,          cls: "bg-gray-100 text-gray-500" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? STATUS.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${s.cls}`}>
      {s.icon}{s.label}
    </span>
  );
}

export function ExpensesClient({ schoolId, role, initialExpenses, initialCategories, tableNotReady }: Props) {
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [modal, setModal] = useState<{ expense: Expense; action: "approve" | "reject" } | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [detail, setDetail] = useState<Expense | null>(null);

  const canApprove = ["owner", "headmaster"].includes(role);
  const canCreate  = ["owner", "headmaster", "accountant"].includes(role);

  const now = new Date();
  const thisMonth  = expenses.filter(e => { const d = new Date(e.expense_date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
  const totalMonth = thisMonth.reduce((s, e) => s + e.amount, 0);
  const pendingCount = expenses.filter(e => e.status === "pending").length;
  const totalAll   = expenses.reduce((s, e) => s + e.amount, 0);

  const filtered = useMemo(() => expenses.filter(e => {
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    if (categoryFilter !== "all" && e.category_id !== categoryFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return e.title.toLowerCase().includes(q) ||
        (e.supplier ?? "").toLowerCase().includes(q) ||
        (e.category_name ?? "").toLowerCase().includes(q);
    }
    return true;
  }), [expenses, statusFilter, categoryFilter, search]);

  async function handleApproval() {
    if (!modal) return;
    if (modal.action === "reject" && !reason.trim()) { setErr("Provide a reason."); return; }
    setSaving(true); setErr(null);
    try {
      const res = await fetch("/api/admin/finance/expenses/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expense_id: modal.expense.id, action: modal.action, reason: reason || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setExpenses(prev => prev.map(e => e.id === modal.expense.id
        ? { ...e, status: modal.action === "approve" ? "approved" : "rejected", approval_note: reason || null }
        : e
      ));
      setModal(null); setReason("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (tableNotReady) {
    return (
      <div className="space-y-4 pb-8">
        <h2 className="text-[20px] font-extrabold text-[var(--text-strong)]">Expenses</h2>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <p className="font-bold text-amber-800">Finance tables not set up yet</p>
          <p className="text-[13px] text-amber-700 mt-1">Run the SQL migration to enable this feature.</p>
          <Link href="/finance/setup" className="text-[12px] font-semibold text-amber-800 underline mt-2 inline-block">Go to setup →</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[20px] font-extrabold text-[var(--text-strong)]">Expenses</h2>
          <p className="text-[13px] text-[var(--text-muted)] mt-0.5">Track and approve school expenditures</p>
        </div>
        {canCreate && (
          <Link href="/finance/expenses/new">
            <Button className="flex items-center gap-2"><PlusCircle size={15} /> New Expense</Button>
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "This Month",       value: formatCurrency(totalMonth),   sub: `${thisMonth.length} expenses`,  color: BRAND },
          { label: "Pending Approval", value: String(pendingCount),         sub: "awaiting review",               color: "#D97706" },
          { label: "Total (All Time)", value: formatCurrency(totalAll),     sub: `${expenses.length} records`,    color: "#16A34A" },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-2xl border border-[var(--border)] p-4 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
            <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">{c.label}</p>
            <p className="text-[22px] font-extrabold mt-0.5" style={{ color: c.color }}>{c.value}</p>
            <p className="text-[11px] text-[var(--text-muted)]">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-[var(--border)] p-4 shadow-[0_1px_4px_rgba(0,0,0,0.05)] flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search expenses…" className="pl-8 h-9 text-[13px]" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="h-9 px-3 rounded-xl border border-[var(--border)] bg-white text-[13px] text-[var(--text-strong)] outline-none min-w-[140px] cursor-pointer">
          <option value="all">All Statuses</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          className="h-9 px-3 rounded-xl border border-[var(--border)] bg-white text-[13px] text-[var(--text-strong)] outline-none min-w-[150px] cursor-pointer">
          <option value="all">All Categories</option>
          {initialCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Receipt size={32} className="mx-auto mb-3 text-[var(--text-muted)] opacity-30" />
            <p className="text-[14px] font-semibold text-[var(--text-muted)]">No expenses found</p>
            {canCreate && (
              <Link href="/finance/expenses/new" className="text-[13px] font-semibold mt-1 inline-block" style={{ color: BRAND }}>
                Record first expense →
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--neutral-50)]">
                  {["Date", "Title", "Category", "Amount", "Status", "By", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map(e => (
                  <tr key={e.id} className="hover:bg-[var(--neutral-50)] transition-colors group">
                    <td className="px-4 py-3 text-[var(--text-muted)] whitespace-nowrap">{formatDate(e.expense_date)}</td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="font-semibold text-[var(--text-strong)] truncate">{e.title}</p>
                      {e.supplier && <p className="text-[11px] text-[var(--text-muted)] truncate">{e.supplier}</p>}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-muted)] whitespace-nowrap">{e.category_name ?? "—"}</td>
                    <td className="px-4 py-3 font-bold text-[var(--text-strong)] whitespace-nowrap">{formatCurrency(e.amount)}</td>
                    <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                    <td className="px-4 py-3 text-[var(--text-muted)] whitespace-nowrap">{e.created_by_name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canApprove && e.status === "pending" && (
                          <>
                            <button onClick={() => { setModal({ expense: e, action: "approve" }); setReason(""); setErr(null); }}
                              className="h-7 px-2.5 rounded-lg text-[11px] font-semibold bg-green-100 text-green-700 hover:bg-green-200 transition-colors">
                              Approve
                            </button>
                            <button onClick={() => { setModal({ expense: e, action: "reject" }); setReason(""); setErr(null); }}
                              className="h-7 px-2.5 rounded-lg text-[11px] font-semibold bg-red-100 text-red-700 hover:bg-red-200 transition-colors">
                              Reject
                            </button>
                          </>
                        )}
                        <button onClick={() => setDetail(e)}
                          className="h-7 w-7 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--neutral-100)] transition-colors">
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Approval Modal */}
      {modal && (
        <Modal open={true} onClose={() => setModal(null)} title={modal.action === "approve" ? "Approve Expense" : "Reject Expense"}>
          <div className="space-y-4">
            <div className="bg-[var(--neutral-50)] rounded-xl p-4">
              <p className="font-semibold text-[var(--text-strong)]">{modal.expense.title}</p>
              <p className="text-[13px] text-[var(--text-muted)] mt-0.5">{formatCurrency(modal.expense.amount)} · {formatDate(modal.expense.expense_date)}</p>
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">
                {modal.action === "approve" ? "Note (optional)" : "Reason *"}
              </label>
              <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
                placeholder={modal.action === "approve" ? "Optional approval note…" : "Why is this being rejected?"}
                className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#262262] resize-none" />
            </div>
            {err && <p className="text-[12px] text-red-600">{err}</p>}
            <div className="flex gap-3 pt-1">
              <Button variant="ghost" onClick={() => setModal(null)} disabled={saving} className="flex-1">Cancel</Button>
              <button onClick={handleApproval} disabled={saving}
                className="flex-1 h-10 rounded-xl text-[13px] font-bold text-white flex items-center justify-center gap-2 disabled:opacity-70 hover:opacity-90 transition-opacity"
                style={{ background: modal.action === "approve" ? "linear-gradient(135deg,#16A34A,#15803D)" : "linear-gradient(135deg,#DC2626,#B91C1C)" }}>
                {saving && <Loader2 size={14} className="animate-spin" />}
                {modal.action === "approve" ? "Approve" : "Reject"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Detail Modal */}
      {detail && (
        <Modal open={true} onClose={() => setDetail(null)} title="Expense Details">
          <div className="space-y-3 text-[13px]">
            {([
              ["Title",          detail.title],
              ["Amount",         formatCurrency(detail.amount)],
              ["Date",           formatDate(detail.expense_date)],
              ["Category",       detail.category_name ?? "—"],
              ["Supplier",       detail.supplier ?? "—"],
              ["Payment Method", detail.payment_method ?? "—"],
              ["Reference",      detail.reference_number ?? "—"],
              ["Department",     detail.department ?? "—"],
              ["Status",         detail.status],
              ["Created By",     detail.created_by_name ?? "—"],
              ["Approved By",    detail.approved_by_name ?? "—"],
              ["Note",           detail.approval_note ?? "—"],
              ["Description",    detail.description ?? "—"],
            ] as [string, string][]).map(([label, value]) => (
              <div key={label} className="flex gap-3">
                <span className="w-32 shrink-0 text-[var(--text-muted)] font-medium">{label}</span>
                <span className="text-[var(--text-strong)] font-semibold flex-1">{value}</span>
              </div>
            ))}
            {canApprove && detail.status === "pending" && (
              <div className="flex gap-3 pt-3 border-t border-[var(--border)]">
                <button onClick={() => { setDetail(null); setModal({ expense: detail, action: "approve" }); setReason(""); setErr(null); }}
                  className="flex-1 h-9 rounded-xl text-[12px] font-bold bg-green-100 text-green-700 hover:bg-green-200 transition-colors">Approve</button>
                <button onClick={() => { setDetail(null); setModal({ expense: detail, action: "reject" }); setReason(""); setErr(null); }}
                  className="flex-1 h-9 rounded-xl text-[12px] font-bold bg-red-100 text-red-700 hover:bg-red-200 transition-colors">Reject</button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
