"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { SlidePanel } from "@/components/ui/SlidePanel";
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

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-[13px] font-semibold text-[var(--text-strong)] mb-1.5">{children}</label>;
}
function FormInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-[14px] outline-none focus:border-[#262262] focus:ring-2 focus:ring-[#262262]/10 transition-all" />;
}

export default function PettyCashPage() {
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<PettyCashAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableNotReady, setTableNotReady] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [actionAccount, setActionAccount] = useState<PettyCashAccount | null>(null);
  const [actionType, setActionType] = useState<"replenish" | "expenditure" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [newForm, setNewForm] = useState({ account_name: "", opening_amount: "", allocated_to: "", allocation_date: new Date().toISOString().split("T")[0] });
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

  async function handleNew(e: React.FormEvent) {
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
    if (!actionAccount || !actionType) return;
    setSubmitting(true);
    await fetch("/api/admin/finance/petty-cash/transaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account_id: actionAccount.id, type: actionType, amount: parseFloat(actionForm.amount), description: actionForm.description, school_id: schoolId }),
    });
    setSubmitting(false);
    setActionAccount(null);
    setActionType(null);
    setActionForm({ amount: "", description: "" });
    fetchAccounts();
  }

  const totalBalance = accounts.reduce((s, a) => s + Number(a.current_balance), 0);
  const totalOpening = accounts.reduce((s, a) => s + Number(a.opening_amount), 0);

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[22px] font-extrabold text-[var(--text-strong)]">Petty Cash</h2>
          <p className="text-[14px] text-[var(--text-muted)] mt-0.5">Manage petty cash accounts and expenditures</p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-bold text-white shadow-sm hover:opacity-90 transition-opacity"
          style={{ background: GRADIENT }}>
          <PlusCircle size={16} /> New Account
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
          { label: "Total Balance", value: formatCurrency(totalBalance), sub: "Across all accounts", icon: PiggyBank, bg: "#EEF2FF", color: BRAND },
          { label: "Total Opened", value: formatCurrency(totalOpening), sub: "Initial allocation", icon: ArrowDownCircle, bg: "#F0FDF4", color: "#16A34A" },
          { label: "Active Accounts", value: accounts.length.toString(), sub: "Petty cash funds", icon: RefreshCw, bg: "#FDF4FF", color: "#92278F" },
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

      {/* Accounts */}
      {loading ? (
        <div className="py-12 text-center text-[14px] text-[var(--text-muted)]">Loading accounts…</div>
      ) : accounts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[var(--border)] p-16 text-center shadow-[0_1px_6px_rgba(0,0,0,0.05)]">
          <PiggyBank size={36} className="mx-auto mb-3 opacity-20 text-[var(--text-muted)]" />
          <p className="text-[16px] font-bold text-[var(--text-muted)]">No petty cash accounts</p>
          <p className="text-[13px] text-[var(--text-muted)] mt-1">Create an account to start tracking petty cash</p>
          <button onClick={() => setShowNew(true)} className="mt-5 px-5 py-2.5 rounded-xl text-[14px] font-bold text-white" style={{ background: GRADIENT }}>
            New Account
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map(acc => {
            const balance = Number(acc.current_balance);
            const opening = Number(acc.opening_amount);
            const pct = opening > 0 ? Math.round((balance / opening) * 100) : 0;
            const color = pct < 20 ? "#DC2626" : pct < 50 ? "#D97706" : "#16A34A";

            return (
              <div key={acc.id} className="bg-white rounded-2xl border border-[var(--border)] shadow-[0_1px_6px_rgba(0,0,0,0.05)] p-5 flex flex-col gap-4">
                <div>
                  <h3 className="text-[15px] font-bold text-[var(--text-strong)]">{acc.account_name}</h3>
                  <p className="text-[12px] text-[var(--text-muted)] mt-0.5">Held by: <span className="font-semibold">{acc.allocated_to}</span></p>
                  <p className="text-[11px] text-[var(--text-muted)]">Since {formatDate(acc.allocation_date)}</p>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <div>
                      <p className="text-[11px] text-[var(--text-muted)]">Current</p>
                      <p className="text-[20px] font-extrabold" style={{ color }}>{formatCurrency(balance)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-[var(--text-muted)]">Opening</p>
                      <p className="text-[20px] font-extrabold text-[var(--text-strong)]">{formatCurrency(opening)}</p>
                    </div>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <p className="text-right text-[11px] font-semibold mt-1" style={{ color }}>{pct}% remaining</p>
                </div>

                <div className="flex gap-2 pt-1 border-t border-[var(--border)]">
                  <button onClick={() => { setActionAccount(acc); setActionType("expenditure"); setActionForm({ amount: "", description: "" }); }}
                    className="flex-1 h-9 flex items-center justify-center gap-1.5 rounded-xl border border-red-200 text-[12px] font-semibold text-red-600 hover:bg-red-50 transition-colors">
                    <ArrowUpCircle size={13} /> Spend
                  </button>
                  <button onClick={() => { setActionAccount(acc); setActionType("replenish"); setActionForm({ amount: "", description: "" }); }}
                    className="flex-1 h-9 flex items-center justify-center gap-1.5 rounded-xl border border-green-200 text-[12px] font-semibold text-green-600 hover:bg-green-50 transition-colors">
                    <ArrowDownCircle size={13} /> Replenish
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Account Panel */}
      <SlidePanel open={showNew} onClose={() => setShowNew(false)} title="New Petty Cash Account" subtitle="Set up a new petty cash fund" width="md">
        <form onSubmit={handleNew} className="space-y-5">
          <div>
            <FieldLabel>Account Name *</FieldLabel>
            <FormInput required value={newForm.account_name} onChange={e => setNewForm(f => ({ ...f, account_name: e.target.value }))} placeholder="e.g. Office Petty Cash" />
          </div>
          <div>
            <FieldLabel>Custodian / Allocated To *</FieldLabel>
            <FormInput required value={newForm.allocated_to} onChange={e => setNewForm(f => ({ ...f, allocated_to: e.target.value }))} placeholder="e.g. Mrs. Mensah" />
          </div>
          <div>
            <FieldLabel>Opening Amount (GHS) *</FieldLabel>
            <FormInput type="number" min="0.01" step="0.01" required value={newForm.opening_amount} onChange={e => setNewForm(f => ({ ...f, opening_amount: e.target.value }))} placeholder="0.00" />
          </div>
          <div>
            <FieldLabel>Allocation Date *</FieldLabel>
            <FormInput type="date" required value={newForm.allocation_date} onChange={e => setNewForm(f => ({ ...f, allocation_date: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowNew(false)}
              className="flex-1 h-11 rounded-xl border border-[var(--border)] text-[14px] font-semibold text-[var(--text-muted)] hover:bg-[var(--neutral-50)] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 h-11 rounded-xl text-[14px] font-bold text-white disabled:opacity-60 hover:opacity-90 transition-opacity"
              style={{ background: GRADIENT }}>
              {submitting ? "Creating…" : "Create Account"}
            </button>
          </div>
        </form>
      </SlidePanel>

      {/* Action Modal */}
      {actionAccount && actionType && (
        <Modal open={true} onClose={() => { setActionAccount(null); setActionType(null); }}
          title={actionType === "replenish" ? `Replenish — ${actionAccount.account_name}` : `Record Expenditure — ${actionAccount.account_name}`}>
          <form onSubmit={handleAction} className="space-y-4 pt-2">
            <div>
              <FieldLabel>Amount (GHS) *</FieldLabel>
              <FormInput type="number" min="0.01" step="0.01" required value={actionForm.amount} onChange={e => setActionForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
            </div>
            <div>
              <FieldLabel>Description *</FieldLabel>
              <FormInput required value={actionForm.description} onChange={e => setActionForm(f => ({ ...f, description: e.target.value }))} placeholder={actionType === "replenish" ? "Reason for replenishment" : "What was purchased"} />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { setActionAccount(null); setActionType(null); }}
                className="flex-1 h-11 rounded-xl border border-[var(--border)] text-[14px] font-semibold text-[var(--text-muted)] hover:bg-[var(--neutral-50)] transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={submitting}
                className="flex-1 h-11 rounded-xl text-[14px] font-bold text-white disabled:opacity-60"
                style={{ background: actionType === "replenish" ? "#16A34A" : "#DC2626" }}>
                {submitting ? "Saving…" : actionType === "replenish" ? "Replenish" : "Record Spend"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
