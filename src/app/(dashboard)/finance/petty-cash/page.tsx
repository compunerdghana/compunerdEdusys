"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { PlusCircle, PiggyBank, ArrowDownCircle, ArrowUpCircle, RefreshCw } from "lucide-react";

const GRADIENT = "linear-gradient(135deg, #262262, #92278F)";
const BRAND = "#262262";

interface PettyCashAccount {
  id: string;
  account_name: string;
  allocated_to: string;
  opening_amount: number;
  current_balance: number;
  allocation_date: string;
  created_at: string;
}

type ActionType = "replenish" | "expenditure" | null;

interface ActionModal {
  type: ActionType;
  account: PettyCashAccount | null;
}

export default function PettyCashPage() {
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<PettyCashAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableNotReady, setTableNotReady] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [actionModal, setActionModal] = useState<ActionModal>({ type: null, account: null });
  const [submitting, setSubmitting] = useState(false);

  const [newForm, setNewForm] = useState({
    account_name: "",
    opening_amount: "",
    allocated_to: "",
    allocation_date: new Date().toISOString().split("T")[0],
  });
  const [actionForm, setActionForm] = useState({ amount: "", description: "" });

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("school_id").eq("id", user.id).single();
      setSchoolId(profile?.school_id ?? null);
    })();
  }, []);

  const fetchAccounts = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    const res = await fetch(`/api/admin/finance/petty-cash?schoolId=${schoolId}`);
    const json = await res.json();
    if (json.tableNotReady) { setTableNotReady(true); setLoading(false); return; }
    setAccounts(json.data ?? []);
    setLoading(false);
  }, [schoolId]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  async function handleNewSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await fetch("/api/admin/finance/petty-cash", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newForm, opening_amount: parseFloat(newForm.opening_amount), school_id: schoolId }),
    });
    setSubmitting(false);
    setShowNew(false);
    setNewForm({ account_name: "", opening_amount: "", allocated_to: "", allocation_date: new Date().toISOString().split("T")[0] });
    fetchAccounts();
  }

  async function handleAction(e: React.FormEvent) {
    e.preventDefault();
    if (!actionModal.account) return;
    setSubmitting(true);
    await fetch("/api/admin/finance/petty-cash", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: actionModal.account.id,
        action: actionModal.type,
        amount: parseFloat(actionForm.amount),
        description: actionForm.description,
        school_id: schoolId,
      }),
    });
    setSubmitting(false);
    setActionModal({ type: null, account: null });
    setActionForm({ amount: "", description: "" });
    fetchAccounts();
  }

  const totalBalance = accounts.reduce((s, a) => s + Number(a.current_balance), 0);
  const totalOpening = accounts.reduce((s, a) => s + Number(a.opening_amount), 0);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[20px] font-extrabold text-[var(--text-strong)]">Petty Cash</h2>
          <p className="text-[13px] text-[var(--text-muted)] mt-0.5">Manage petty cash accounts and track small expenditures</p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white shadow-sm hover:opacity-90 transition-opacity"
          style={{ background: GRADIENT }}>
          <PlusCircle size={15} /> New Account
        </button>
      </div>

      {tableNotReady && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <p className="font-semibold text-amber-800 text-[14px]">Finance Module Setup Required</p>
          <p className="text-[13px] text-amber-700 mt-1">Run the SQL migration first to enable this feature.</p>
          <a href="/finance/setup" className="text-[12px] font-semibold text-amber-800 underline mt-2 inline-block">View setup instructions →</a>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Current Balance", value: formatCurrency(totalBalance), sub: `${accounts.length} accounts`, icon: PiggyBank, iconBg: "#FDF4FF", iconColor: "#92278F" },
          { label: "Total Opening Amount", value: formatCurrency(totalOpening), sub: "Initial allocation", icon: ArrowDownCircle, iconBg: "#EEF2FF", iconColor: BRAND },
          { label: "Net Usage", value: formatCurrency(Math.max(0, totalOpening - totalBalance)), sub: "Spent so far", icon: ArrowUpCircle, iconBg: "#FFF7ED", iconColor: "#D97706" },
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

      {/* Account Cards */}
      {loading ? (
        <div className="py-12 text-center text-[13px] text-[var(--text-muted)]">Loading accounts…</div>
      ) : accounts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[var(--border)] p-12 text-center shadow-[0_1px_6px_rgba(0,0,0,0.05)]">
          <PiggyBank size={32} className="mx-auto mb-3 opacity-20 text-[var(--text-muted)]" />
          <p className="text-[14px] font-semibold text-[var(--text-muted)]">No petty cash accounts</p>
          <button onClick={() => setShowNew(true)} className="mt-4 px-4 py-2 rounded-xl text-[13px] font-bold text-white" style={{ background: GRADIENT }}>
            Create First Account
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map(a => {
            const balance = Number(a.current_balance);
            const opening = Number(a.opening_amount);
            const pct = opening > 0 ? Math.round((balance / opening) * 100) : 0;
            const barColor = pct > 50 ? "#16A34A" : pct > 20 ? "#D97706" : "#DC2626";

            return (
              <div key={a.id} className="bg-white rounded-2xl border border-[var(--border)] shadow-[0_1px_6px_rgba(0,0,0,0.05)] p-5 flex flex-col gap-4">
                <div>
                  <h3 className="text-[15px] font-bold text-[var(--text-strong)]">{a.account_name}</h3>
                  <p className="text-[12px] text-[var(--text-muted)] mt-0.5">Allocated to: {a.allocated_to}</p>
                  <p className="text-[11px] text-[var(--text-muted)]">Since {formatDate(a.allocation_date)}</p>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-1.5">
                    <span className="text-[11px] text-[var(--text-muted)]">Current Balance</span>
                    <span className="text-[11px] font-bold" style={{ color: barColor }}>{pct}%</span>
                  </div>
                  <p className="text-[24px] font-extrabold leading-none mb-2" style={{ color: barColor }}>
                    {formatCurrency(balance)}
                  </p>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">Opening: {formatCurrency(opening)}</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => { setActionModal({ type: "replenish", account: a }); setActionForm({ amount: "", description: "" }); }}
                    className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-[12px] font-bold text-white"
                    style={{ background: GRADIENT }}>
                    <RefreshCw size={13} /> Replenish
                  </button>
                  <button
                    onClick={() => { setActionModal({ type: "expenditure", account: a }); setActionForm({ amount: "", description: "" }); }}
                    className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-[12px] font-semibold border border-[var(--border)] text-[var(--text-muted)] hover:border-red-300 hover:text-red-600 transition-colors">
                    <ArrowUpCircle size={13} /> Expenditure
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Account Modal */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="New Petty Cash Account" size="sm">
        <form onSubmit={handleNewSubmit} className="space-y-4">
          <div>
            <label className="block text-[12px] font-semibold text-[var(--text-muted)] mb-1.5">Account Name *</label>
            <input required value={newForm.account_name} onChange={e => setNewForm(f => ({ ...f, account_name: e.target.value }))} placeholder="e.g. Administration Office"
              className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-[13px] outline-none focus:border-[#262262]" />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[var(--text-muted)] mb-1.5">Opening Amount (GHS) *</label>
            <input type="number" min="0.01" step="0.01" required value={newForm.opening_amount} onChange={e => setNewForm(f => ({ ...f, opening_amount: e.target.value }))} placeholder="0.00"
              className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-[13px] outline-none focus:border-[#262262]" />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[var(--text-muted)] mb-1.5">Allocated To *</label>
            <input required value={newForm.allocated_to} onChange={e => setNewForm(f => ({ ...f, allocated_to: e.target.value }))} placeholder="e.g. Head Accountant"
              className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-[13px] outline-none focus:border-[#262262]" />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[var(--text-muted)] mb-1.5">Allocation Date *</label>
            <input type="date" required value={newForm.allocation_date} onChange={e => setNewForm(f => ({ ...f, allocation_date: e.target.value }))}
              className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-[13px] outline-none focus:border-[#262262]" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowNew(false)}
              className="flex-1 h-10 rounded-xl border border-[var(--border)] text-[13px] font-semibold text-[var(--text-muted)] hover:bg-[var(--neutral-50)]">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 h-10 rounded-xl text-[13px] font-bold text-white disabled:opacity-60"
              style={{ background: GRADIENT }}>
              {submitting ? "Creating…" : "Create Account"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Action Modal */}
      <Modal
        open={actionModal.type !== null}
        onClose={() => setActionModal({ type: null, account: null })}
        title={actionModal.type === "replenish" ? "Replenish Account" : "Record Expenditure"}
        subtitle={actionModal.account?.account_name ?? ""}
        size="sm">
        <form onSubmit={handleAction} className="space-y-4">
          <div>
            <label className="block text-[12px] font-semibold text-[var(--text-muted)] mb-1.5">
              Amount (GHS) *
            </label>
            <input type="number" min="0.01" step="0.01" required value={actionForm.amount} onChange={e => setActionForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00"
              className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-[13px] outline-none focus:border-[#262262]" />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[var(--text-muted)] mb-1.5">Description *</label>
            <textarea required value={actionForm.description} onChange={e => setActionForm(f => ({ ...f, description: e.target.value }))} rows={2}
              placeholder={actionModal.type === "replenish" ? "Reason for replenishment…" : "What was purchased / paid for…"}
              className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#262262] resize-none" />
          </div>
          {actionModal.account && actionModal.type === "expenditure" && (
            <p className="text-[12px] text-[var(--text-muted)] bg-[var(--neutral-50)] rounded-xl p-3">
              Current balance: <strong className="text-[var(--text-strong)]">{formatCurrency(Number(actionModal.account.current_balance))}</strong>
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setActionModal({ type: null, account: null })}
              className="flex-1 h-10 rounded-xl border border-[var(--border)] text-[13px] font-semibold text-[var(--text-muted)] hover:bg-[var(--neutral-50)]">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 h-10 rounded-xl text-[13px] font-bold text-white disabled:opacity-60"
              style={{ background: actionModal.type === "expenditure" ? "linear-gradient(135deg,#DC2626,#B91C1C)" : GRADIENT }}>
              {submitting ? "Saving…" : actionModal.type === "replenish" ? "Add Funds" : "Record Expense"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
