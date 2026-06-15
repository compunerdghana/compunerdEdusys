"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import {
  TrendingUp, PlusCircle, Trash2, Eye, DollarSign,
  Calendar, FileText,
} from "lucide-react";

const BRAND = "#262262";
const GRADIENT = "linear-gradient(135deg, #262262, #92278F)";

const INCOME_TYPES = [
  "All", "Donations", "Fundraising", "Uniform Sales", "Book Sales",
  "Rental", "Sponsorship", "Grant", "Other",
];

const PAYMENT_METHODS = ["Cash", "Bank Transfer", "Mobile Money", "Cheque", "Online"];

interface IncomeRecord {
  id: string;
  income_date: string;
  title: string;
  type: string;
  description?: string;
  amount: number;
  source?: string;
  payment_method?: string;
  reference?: string;
  created_at: string;
}

interface ViewModalState {
  open: boolean;
  record: IncomeRecord | null;
}

export default function IncomePage() {
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [records, setRecords] = useState<IncomeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableNotReady, setTableNotReady] = useState(false);
  const [activeType, setActiveType] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [viewModal, setViewModal] = useState<ViewModalState>({ open: false, record: null });
  const [form, setForm] = useState({
    income_date: new Date().toISOString().split("T")[0],
    type: "Donations",
    title: "",
    description: "",
    amount: "",
    source: "",
    payment_method: "Cash",
    reference: "",
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

  const fetchRecords = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    const res = await fetch(`/api/admin/finance/income?schoolId=${schoolId}`);
    const json = await res.json();
    if (json.tableNotReady) { setTableNotReady(true); setLoading(false); return; }
    setRecords(json.data ?? []);
    setLoading(false);
  }, [schoolId]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const filtered = activeType === "All" ? records : records.filter(r => r.type === activeType);

  const now = new Date();
  const thisMonth = records.filter(r => {
    const d = new Date(r.income_date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const thisYear = records.filter(r => new Date(r.income_date).getFullYear() === now.getFullYear());
  const totalMonth = thisMonth.reduce((s, r) => s + Number(r.amount), 0);
  const totalYear = thisYear.reduce((s, r) => s + Number(r.amount), 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await fetch("/api/admin/finance/income", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: parseFloat(form.amount), school_id: schoolId }),
    });
    setSubmitting(false);
    setShowForm(false);
    setForm({ income_date: new Date().toISOString().split("T")[0], type: "Donations", title: "", description: "", amount: "", source: "", payment_method: "Cash", reference: "" });
    fetchRecords();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this income record?")) return;
    await fetch(`/api/admin/finance/income?id=${id}`, { method: "DELETE" });
    fetchRecords();
  }

  const typeColor: Record<string, string> = {
    Donations: "info", Fundraising: "brand", "Uniform Sales": "success",
    "Book Sales": "success", Rental: "warning", Sponsorship: "brand",
    Grant: "info", Other: "default",
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[20px] font-extrabold text-[var(--text-strong)]">Other Income</h2>
          <p className="text-[13px] text-[var(--text-muted)] mt-0.5">Track donations, fundraising, sales and other income sources</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white shadow-sm hover:opacity-90 transition-opacity"
          style={{ background: GRADIENT }}>
          <PlusCircle size={15} /> Record Income
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total This Month", value: formatCurrency(totalMonth), sub: `${thisMonth.length} records`, icon: TrendingUp, iconBg: "#F0FDF4", iconColor: "#16A34A" },
          { label: "Total This Year", value: formatCurrency(totalYear), sub: `${thisYear.length} records`, icon: DollarSign, iconBg: "#EEF2FF", iconColor: BRAND },
          { label: "Total Records", value: records.length.toString(), sub: "All time", icon: FileText, iconBg: "#FDF4FF", iconColor: "#92278F" },
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

      {/* Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {INCOME_TYPES.map(t => (
          <button key={t} onClick={() => setActiveType(t)}
            className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all ${activeType === t ? "text-white shadow-sm" : "bg-white border border-[var(--border)] text-[var(--text-muted)] hover:border-[#262262]"}`}
            style={activeType === t ? { background: GRADIENT } : {}}>
            {t}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[0_1px_6px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <h3 className="text-[14px] font-bold text-[var(--text-strong)]">Income Records</h3>
          <span className="text-[11px] text-[var(--text-muted)]">{filtered.length} records</span>
        </div>
        {loading ? (
          <div className="px-5 py-12 text-center text-[13px] text-[var(--text-muted)]">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <TrendingUp size={28} className="mx-auto mb-2 opacity-20 text-[var(--text-muted)]" />
            <p className="text-[13px] text-[var(--text-muted)]">No income records found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--neutral-50)]">
                  {["Date", "Title", "Type", "Source", "Amount", "Method", "Actions"].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-[var(--neutral-50)] transition-colors">
                    <td className="px-5 py-3 text-[var(--text-muted)] whitespace-nowrap">{formatDate(r.income_date)}</td>
                    <td className="px-5 py-3 font-semibold text-[var(--text-strong)]">{r.title}</td>
                    <td className="px-5 py-3">
                      <Badge variant={(typeColor[r.type] as "info" | "brand" | "success" | "warning" | "default") ?? "default"}>{r.type}</Badge>
                    </td>
                    <td className="px-5 py-3 text-[var(--text-muted)]">{r.source ?? "—"}</td>
                    <td className="px-5 py-3 font-bold text-green-600">{formatCurrency(Number(r.amount))}</td>
                    <td className="px-5 py-3 text-[var(--text-muted)]">{r.payment_method ?? "—"}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setViewModal({ open: true, record: r })}
                          className="p-1.5 rounded-lg hover:bg-[var(--neutral-100)] text-[var(--text-muted)] hover:text-[#262262] transition-colors">
                          <Eye size={14} />
                        </button>
                        <button onClick={() => handleDelete(r.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-[var(--text-muted)] hover:text-red-600 transition-colors">
                          <Trash2 size={14} />
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

      {/* Record Income Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Record Income" subtitle="Credit the school wallet immediately" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-[var(--text-muted)] mb-1.5">Income Date *</label>
              <input type="date" required value={form.income_date} onChange={e => setForm(f => ({ ...f, income_date: e.target.value }))}
                className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-[13px] outline-none focus:border-[#262262]" />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[var(--text-muted)] mb-1.5">Type *</label>
              <select required value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-[13px] outline-none focus:border-[#262262]">
                {INCOME_TYPES.filter(t => t !== "All").map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[var(--text-muted)] mb-1.5">Title *</label>
            <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Annual Fundraising Dinner"
              className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-[13px] outline-none focus:border-[#262262]" />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[var(--text-muted)] mb-1.5">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Optional details…"
              className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#262262] resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-[var(--text-muted)] mb-1.5">Amount (GHS) *</label>
              <input type="number" min="0.01" step="0.01" required value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00"
                className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-[13px] outline-none focus:border-[#262262]" />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[var(--text-muted)] mb-1.5">Payment Method *</label>
              <select required value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
                className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-[13px] outline-none focus:border-[#262262]">
                {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-[var(--text-muted)] mb-1.5">Source / Donor</label>
              <input value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} placeholder="e.g. PTA, Mr. Mensah"
                className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-[13px] outline-none focus:border-[#262262]" />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[var(--text-muted)] mb-1.5">Reference</label>
              <input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="Receipt / transaction ref"
                className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-[13px] outline-none focus:border-[#262262]" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 h-10 rounded-xl border border-[var(--border)] text-[13px] font-semibold text-[var(--text-muted)] hover:bg-[var(--neutral-50)]">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 h-10 rounded-xl text-[13px] font-bold text-white disabled:opacity-60"
              style={{ background: GRADIENT }}>
              {submitting ? "Saving…" : "Record Income"}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      <Modal open={viewModal.open} onClose={() => setViewModal({ open: false, record: null })} title="Income Details" size="sm">
        {viewModal.record && (
          <div className="space-y-3">
            {[
              { label: "Title", value: viewModal.record.title },
              { label: "Date", value: formatDate(viewModal.record.income_date) },
              { label: "Type", value: viewModal.record.type },
              { label: "Amount", value: formatCurrency(Number(viewModal.record.amount)) },
              { label: "Source", value: viewModal.record.source ?? "—" },
              { label: "Payment Method", value: viewModal.record.payment_method ?? "—" },
              { label: "Reference", value: viewModal.record.reference ?? "—" },
              { label: "Description", value: viewModal.record.description ?? "—" },
            ].map(item => (
              <div key={item.label} className="flex justify-between py-2 border-b border-[var(--border)] last:border-0">
                <span className="text-[12px] font-semibold text-[var(--text-muted)]">{item.label}</span>
                <span className="text-[13px] font-semibold text-[var(--text-strong)] text-right max-w-[60%]">{item.value}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-1">
              <Calendar size={12} className="text-[var(--text-muted)]" />
              <span className="text-[11px] text-[var(--text-muted)]">Recorded on {formatDate(viewModal.record.created_at)}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
