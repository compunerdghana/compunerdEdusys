"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  PlusCircle, ReceiptText, Clock, CheckCircle2, XCircle,
  Search, ChevronDown, Loader2, FileX,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Expense, Category } from "./page";

const BRAND = "#262262";
const ACCENT = "#92278F";

interface Props {
  schoolId: string;
  role: string;
  userName: string;
  initialExpenses: Expense[];
  initialCategories: Category[];
  tableNotReady: boolean;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; dot: string }
> = {
  pending: {
    label: "Pending",
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-400",
  },
  approved: {
    label: "Approved",
    bg: "bg-green-50",
    text: "text-green-700",
    dot: "bg-green-500",
  },
  rejected: {
    label: "Rejected",
    bg: "bg-red-50",
    text: "text-red-700",
    dot: "bg-red-500",
  },
  changes_requested: {
    label: "Changes Needed",
    bg: "bg-orange-50",
    text: "text-orange-700",
    dot: "bg-orange-400",
  },
  voided: {
    label: "Voided",
    bg: "bg-gray-100",
    text: "text-gray-500",
    dot: "bg-gray-400",
  },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${cfg.bg} ${cfg.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

interface ApprovalModalProps {
  expense: Expense;
  action: "approve" | "reject";
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

function ApprovalModal({ expense, action, onClose, onConfirm }: ApprovalModalProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (action === "reject" && !reason.trim()) {
      setError("Please provide a reason for rejection.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onConfirm(reason);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <h3 className="text-[16px] font-extrabold text-[var(--text-strong)] mb-1">
          {action === "approve" ? "Approve Expense" : "Reject Expense"}
        </h3>
        <p className="text-[13px] text-[var(--text-muted)] mb-4">
          <span className="font-semibold">{expense.title}</span> &mdash;{" "}
          {formatCurrency(expense.amount)}
        </p>

        <label className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">
          {action === "approve" ? "Note (optional)" : "Reason for rejection *"}
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#262262] resize-none"
          placeholder={
            action === "approve"
              ? "Add an optional note..."
              : "Explain why this expense is being rejected..."
          }
        />

        {error && (
          <p className="text-[12px] text-red-600 mt-2">{error}</p>
        )}

        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 h-10 rounded-xl border border-[var(--border)] text-[13px] font-semibold text-[var(--text-muted)] hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 h-10 rounded-xl text-[13px] font-bold text-white flex items-center justify-center gap-2 disabled:opacity-70 transition-opacity hover:opacity-90"
            style={{
              background:
                action === "approve"
                  ? "linear-gradient(135deg,#16A34A,#15803D)"
                  : "linear-gradient(135deg,#DC2626,#B91C1C)",
            }}
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {action === "approve" ? "Approve" : "Reject"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ExpensesClient({
  schoolId,
  role,
  initialExpenses,
  initialCategories,
  tableNotReady,
}: Props) {
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [categories] = useState<Category[]>(initialCategories);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  // Approval modal state
  const [modal, setModal] = useState<{
    expense: Expense;
    action: "approve" | "reject";
  } | null>(null);

  const canCreate = ["owner", "headmaster", "accountant"].includes(role);
  const canApprove = ["owner", "headmaster"].includes(role);

  // Stats
  const now = new Date();
  const thisMonth = expenses.filter((e) => {
    const d = new Date(e.expense_date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const totalThisMonth = thisMonth.reduce((s, e) => s + Number(e.amount), 0);
  const pendingCount = expenses.filter((e) => e.status === "pending").length;
  const approvedCount = expenses.filter((e) => e.status === "approved").length;
  const totalAmount = expenses.reduce((s, e) => s + Number(e.amount), 0);

  // Filtered list
  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (categoryFilter !== "all" && e.category_id !== categoryFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          e.title.toLowerCase().includes(q) ||
          (e.supplier ?? "").toLowerCase().includes(q) ||
          (e.created_by_name ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [expenses, statusFilter, categoryFilter, search]);

  async function handleApproval(reason: string) {
    if (!modal) return;
    const res = await fetch("/api/admin/finance/expenses/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        expense_id: modal.expense.id,
        action: modal.action,
        reason: reason || undefined,
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Request failed");

    // Update local state
    setExpenses((prev) =>
      prev.map((e) =>
        e.id === modal.expense.id
          ? {
              ...e,
              status: modal.action === "approve" ? "approved" : "rejected",
              approval_note: reason || null,
            }
          : e
      )
    );
    setModal(null);
  }

  const STATUS_PILLS = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
    { key: "changes_requested", label: "Changes Needed" },
    { key: "voided", label: "Voided" },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[20px] font-extrabold text-[var(--text-strong)]">
            Expenses
          </h2>
          <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
            Track, submit, and approve school expenditures
          </p>
        </div>
        {canCreate && (
          <Link
            href="/finance/expenses/new"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white shadow-sm hover:opacity-90 transition-opacity"
            style={{ background: BRAND }}
          >
            <PlusCircle size={15} /> New Expense
          </Link>
        )}
      </div>

      {/* Setup banner */}
      {tableNotReady && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <p className="font-semibold text-amber-800">Setup required</p>
          <p className="text-[13px] text-amber-700 mt-1">
            Run the Finance Module SQL migration in your Supabase SQL Editor first.
          </p>
          <a
            href="/finance/setup"
            className="text-[12px] text-amber-800 underline font-semibold mt-2 inline-block"
          >
            View migration SQL →
          </a>
        </div>
      )}

      {/* Stats row */}
      {!tableNotReady && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Total This Month",
              value: formatCurrency(totalThisMonth),
              sub: `${thisMonth.length} expenses`,
              icon: ReceiptText,
              iconBg: "#EEF2FF",
              iconColor: BRAND,
            },
            {
              label: "Pending Approval",
              value: String(pendingCount),
              sub: pendingCount === 1 ? "awaiting review" : "awaiting review",
              icon: Clock,
              iconBg: "#FFFBEB",
              iconColor: "#D97706",
            },
            {
              label: "Approved",
              value: String(approvedCount),
              sub: "this period",
              icon: CheckCircle2,
              iconBg: "#F0FDF4",
              iconColor: "#16A34A",
            },
            {
              label: "Total Amount",
              value: formatCurrency(totalAmount),
              sub: `${expenses.length} total expenses`,
              icon: XCircle,
              iconBg: "#FDF4FF",
              iconColor: ACCENT,
            },
          ].map((card) => (
            <div
              key={card.label}
              className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-[0_1px_6px_rgba(0,0,0,0.05)] flex items-start gap-4"
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: card.iconBg }}
              >
                <card.icon size={20} style={{ color: card.iconColor }} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                  {card.label}
                </p>
                <p className="text-[22px] font-extrabold text-[var(--text-strong)] leading-tight mt-0.5">
                  {card.value}
                </p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  {card.sub}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filter bar */}
      {!tableNotReady && (
        <div className="bg-white rounded-2xl border border-[var(--border)] p-4 shadow-[0_1px_6px_rgba(0,0,0,0.05)] space-y-3">
          {/* Status pills */}
          <div className="flex flex-wrap gap-2">
            {STATUS_PILLS.map((p) => (
              <button
                key={p.key}
                onClick={() => setStatusFilter(p.key)}
                className="px-3 py-1 rounded-full text-[12px] font-semibold transition-colors"
                style={
                  statusFilter === p.key
                    ? { background: BRAND, color: "#fff" }
                    : {
                        background: "var(--neutral-100, #F3F4F6)",
                        color: "var(--text-muted)",
                      }
                }
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Search + category */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search expenses..."
                className="h-10 w-full rounded-xl border border-[var(--border)] bg-white pl-9 pr-3 text-[13px] outline-none focus:border-[#262262]"
              />
            </div>
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-10 appearance-none rounded-xl border border-[var(--border)] bg-white pl-3 pr-8 text-[13px] outline-none focus:border-[#262262] cursor-pointer"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={13}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {!tableNotReady && (
        <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[0_1px_6px_rgba(0,0,0,0.05)] overflow-hidden">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileX size={36} className="text-[var(--text-muted)] opacity-30 mb-3" />
              <p className="text-[14px] font-semibold text-[var(--text-strong)]">
                No expenses yet
              </p>
              <p className="text-[13px] text-[var(--text-muted)] mt-1">
                {expenses.length === 0
                  ? "Submit your first expense to get started."
                  : "No expenses match the current filters."}
              </p>
              {canCreate && expenses.length === 0 && (
                <Link
                  href="/finance/expenses/new"
                  className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold"
                  style={{ color: BRAND }}
                >
                  <PlusCircle size={14} /> Add first expense
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--neutral-50,#F9FAFB)]">
                    {[
                      "Date",
                      "Title",
                      "Category",
                      "Amount",
                      "Supplier",
                      "Status",
                      "Created By",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filtered.map((expense) => (
                    <tr
                      key={expense.id}
                      className="hover:bg-[var(--neutral-50,#F9FAFB)] transition-colors"
                    >
                      <td className="px-4 py-3 text-[12px] text-[var(--text-muted)] whitespace-nowrap">
                        {formatDate(expense.expense_date)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[13px] font-semibold text-[var(--text-strong)] max-w-[180px] truncate">
                          {expense.title}
                        </p>
                        {expense.description && (
                          <p className="text-[11px] text-[var(--text-muted)] truncate max-w-[180px]">
                            {expense.description}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[var(--text-muted)] whitespace-nowrap">
                        {expense.category?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-[13px] font-bold text-[var(--text-strong)] whitespace-nowrap">
                        {formatCurrency(expense.amount)}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[var(--text-muted)] whitespace-nowrap">
                        {expense.supplier ?? "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={expense.status} />
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[var(--text-muted)] whitespace-nowrap">
                        {expense.created_by_name ?? "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {canApprove && expense.status === "pending" && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                setModal({ expense, action: "approve" })
                              }
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white"
                              style={{ background: "#16A34A" }}
                            >
                              Approve
                            </button>
                            <button
                              onClick={() =>
                                setModal({ expense, action: "reject" })
                              }
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white"
                              style={{ background: "#DC2626" }}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Approval modal */}
      {modal && (
        <ApprovalModal
          expense={modal.expense}
          action={modal.action}
          onClose={() => setModal(null)}
          onConfirm={handleApproval}
        />
      )}
    </div>
  );
}
