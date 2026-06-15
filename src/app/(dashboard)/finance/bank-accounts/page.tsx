"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { SlidePanel } from "@/components/ui/SlidePanel";
import { Badge } from "@/components/ui/Badge";
import { Building2, PlusCircle, Edit2, Smartphone, CreditCard } from "lucide-react";

const GRADIENT = "linear-gradient(135deg, #262262, #92278F)";
const BRAND = "#262262";

const BANKS = [
  { name: "GCB Bank", color: "#006400" },
  { name: "ADB", color: "#8B0000" },
  { name: "Ecobank", color: "#005BAA" },
  { name: "Fidelity Bank", color: "#00205B" },
  { name: "Zenith Bank", color: "#C8102E" },
  { name: "Access Bank", color: "#FF6B00" },
  { name: "MTN MoMo", color: "#FFCC00" },
  { name: "Telecel Cash", color: "#E40520" },
  { name: "AirtelTigo", color: "#E00034" },
  { name: "Other", color: "#6B7280" },
];

const ACCOUNT_TYPES = ["Savings", "Current", "MoMo", "Fixed Deposit"];

interface BankAccount {
  id: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  account_type: string;
  current_balance: number;
  opening_balance: number;
  branch?: string;
  notes?: string;
  created_at: string;
}

export default function BankAccountsPage() {
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableNotReady, setTableNotReady] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editAccount, setEditAccount] = useState<BankAccount | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    bank_name: BANKS[0].name,
    account_name: "",
    account_number: "",
    account_type: "Savings",
    opening_balance: "",
    current_balance: "",
    branch: "",
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

  const fetchAccounts = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    const res = await fetch(`/api/admin/finance/bank-accounts?schoolId=${schoolId}`);
    const json = await res.json();
    if (json.tableNotReady) { setTableNotReady(true); setLoading(false); return; }
    setAccounts(json.data ?? []);
    setLoading(false);
  }, [schoolId]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  function openNew() {
    setEditAccount(null);
    setForm({ bank_name: BANKS[0].name, account_name: "", account_number: "", account_type: "Savings", opening_balance: "", current_balance: "", branch: "", notes: "" });
    setShowForm(true);
  }

  function openEdit(a: BankAccount) {
    setEditAccount(a);
    setForm({
      bank_name: a.bank_name,
      account_name: a.account_name,
      account_number: a.account_number,
      account_type: a.account_type,
      opening_balance: String(a.opening_balance),
      current_balance: String(a.current_balance),
      branch: a.branch ?? "",
      notes: a.notes ?? "",
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const body = {
      ...form,
      opening_balance: parseFloat(form.opening_balance || "0"),
      current_balance: parseFloat(form.current_balance || form.opening_balance || "0"),
      school_id: schoolId,
    };
    if (editAccount) {
      await fetch("/api/admin/finance/bank-accounts", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, id: editAccount.id }) });
    } else {
      await fetch("/api/admin/finance/bank-accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    setSubmitting(false);
    setShowForm(false);
    fetchAccounts();
  }

  function maskAccount(num: string) {
    if (num.length <= 4) return num;
    return "••••" + num.slice(-4);
  }

  function getBankColor(bankName: string) {
    return BANKS.find(b => b.name === bankName)?.color ?? "#262262";
  }

  function isMoMo(bankName: string) {
    return ["MTN MoMo", "Telecel Cash", "AirtelTigo"].includes(bankName);
  }

  const totalBalance = accounts.reduce((s, a) => s + Number(a.current_balance), 0);

  const typeVariant: Record<string, "success" | "info" | "brand" | "warning" | "default"> = {
    Savings: "success", Current: "info", MoMo: "brand", "Fixed Deposit": "warning",
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[22px] font-extrabold text-[var(--text-strong)]">Bank Accounts</h2>
          <p className="text-[14px] text-[var(--text-muted)] mt-0.5">Manage school bank accounts and mobile money wallets</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-bold text-white shadow-sm hover:opacity-90 transition-opacity"
          style={{ background: GRADIENT }}>
          <PlusCircle size={16} /> Add Account
        </button>
      </div>

      {tableNotReady && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <p className="font-semibold text-amber-800 text-[14px]">Finance Module Setup Required</p>
          <p className="text-[13px] text-amber-700 mt-1">Run the SQL migration first to enable this feature.</p>
          <a href="/finance/setup" className="text-[12px] font-semibold text-amber-800 underline mt-2 inline-block">View setup instructions →</a>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Balance", value: formatCurrency(totalBalance), sub: "Across all accounts", icon: Building2, bg: "#EEF2FF", color: BRAND },
          { label: "Total Accounts", value: accounts.length.toString(), sub: "Bank & MoMo", icon: CreditCard, bg: "#F0FDF4", color: "#16A34A" },
          { label: "Mobile Money", value: accounts.filter(a => isMoMo(a.bank_name)).length.toString(), sub: "MoMo wallets", icon: Smartphone, bg: "#FDF4FF", color: "#92278F" },
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

      {/* Account Cards */}
      {loading ? (
        <div className="py-12 text-center text-[14px] text-[var(--text-muted)]">Loading accounts…</div>
      ) : accounts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[var(--border)] p-16 text-center shadow-[0_1px_6px_rgba(0,0,0,0.05)]">
          <Building2 size={36} className="mx-auto mb-3 opacity-20 text-[var(--text-muted)]" />
          <p className="text-[16px] font-bold text-[var(--text-muted)]">No bank accounts added</p>
          <p className="text-[13px] text-[var(--text-muted)] mt-1">Add your school bank accounts to track balances</p>
          <button onClick={openNew} className="mt-5 px-5 py-2.5 rounded-xl text-[14px] font-bold text-white" style={{ background: GRADIENT }}>
            Add First Account
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map(a => {
            const bankColor = getBankColor(a.bank_name);
            const isMomo = isMoMo(a.bank_name);

            return (
              <div key={a.id} className="bg-white rounded-2xl border border-[var(--border)] shadow-[0_1px_6px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col">
                {/* Colored header */}
                <div className="px-5 py-4 flex items-center justify-between" style={{ background: bankColor }}>
                  <div className="flex items-center gap-2">
                    {isMomo ? <Smartphone size={18} className="text-white" /> : <CreditCard size={18} className="text-white" />}
                    <span className="text-[14px] font-bold text-white">{a.bank_name}</span>
                  </div>
                  <button onClick={() => openEdit(a)}
                    className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
                    <Edit2 size={12} className="text-white" />
                  </button>
                </div>

                {/* Body */}
                <div className="p-5 flex flex-col gap-3 flex-1">
                  <div>
                    <p className="text-[15px] font-bold text-[var(--text-strong)]">{a.account_name}</p>
                    <p className="text-[12px] font-mono text-[var(--text-muted)] mt-0.5">{maskAccount(a.account_number)}</p>
                    {a.branch && <p className="text-[11px] text-[var(--text-muted)]">{a.branch}</p>}
                  </div>

                  <div>
                    <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wide font-semibold mb-0.5">Current Balance</p>
                    <p className="text-[26px] font-extrabold leading-tight" style={{ color: BRAND }}>
                      {formatCurrency(Number(a.current_balance))}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)]">Opening: {formatCurrency(Number(a.opening_balance))}</p>
                  </div>

                  <div className="flex items-center justify-between mt-auto">
                    <Badge variant={typeVariant[a.account_type] ?? "default"}>{a.account_type}</Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Panel */}
      <SlidePanel open={showForm} onClose={() => setShowForm(false)}
        title={editAccount ? "Edit Bank Account" : "Add Bank Account"}
        subtitle={editAccount ? "Update account details or balance" : "Add a new bank or mobile money account"}
        width="md">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-semibold text-[var(--text-strong)] mb-1.5">Bank *</label>
              <select required value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))}
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-[14px] outline-none focus:border-[#262262] focus:ring-2 focus:ring-[#262262]/10 cursor-pointer">
                {BANKS.map(b => <option key={b.name}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[var(--text-strong)] mb-1.5">Account Type *</label>
              <select required value={form.account_type} onChange={e => setForm(f => ({ ...f, account_type: e.target.value }))}
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-[14px] outline-none focus:border-[#262262] focus:ring-2 focus:ring-[#262262]/10 cursor-pointer">
                {ACCOUNT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-[var(--text-strong)] mb-1.5">Account Name *</label>
            <input required value={form.account_name} onChange={e => setForm(f => ({ ...f, account_name: e.target.value }))} placeholder="e.g. School Main Account"
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-[14px] outline-none focus:border-[#262262] focus:ring-2 focus:ring-[#262262]/10 transition-all" />
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-[var(--text-strong)] mb-1.5">Account Number *</label>
            <input required value={form.account_number} onChange={e => setForm(f => ({ ...f, account_number: e.target.value }))} placeholder="Full account / mobile number"
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-[14px] outline-none focus:border-[#262262] focus:ring-2 focus:ring-[#262262]/10 transition-all" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-semibold text-[var(--text-strong)] mb-1.5">Opening Balance (GHS)</label>
              <input type="number" min="0" step="0.01" value={form.opening_balance} onChange={e => setForm(f => ({ ...f, opening_balance: e.target.value }))} placeholder="0.00"
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-[14px] outline-none focus:border-[#262262] focus:ring-2 focus:ring-[#262262]/10 transition-all" />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[var(--text-strong)] mb-1.5">Current Balance (GHS)</label>
              <input type="number" min="0" step="0.01" value={form.current_balance} onChange={e => setForm(f => ({ ...f, current_balance: e.target.value }))} placeholder="0.00"
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-[14px] outline-none focus:border-[#262262] focus:ring-2 focus:ring-[#262262]/10 transition-all" />
            </div>
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-[var(--text-strong)] mb-1.5">Branch (optional)</label>
            <input value={form.branch} onChange={e => setForm(f => ({ ...f, branch: e.target.value }))} placeholder="e.g. Accra Main"
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-[14px] outline-none focus:border-[#262262] focus:ring-2 focus:ring-[#262262]/10 transition-all" />
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-[var(--text-strong)] mb-1.5">Notes (optional)</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
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
              {submitting ? "Saving…" : editAccount ? "Update Account" : "Add Account"}
            </button>
          </div>
        </form>
      </SlidePanel>
    </div>
  );
}
