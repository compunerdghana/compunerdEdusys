"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { SlidePanel } from "@/components/ui/SlidePanel";
import { Modal } from "@/components/ui/Modal";
import {
  TrendingUp, PlusCircle, Trash2, Eye,
  DollarSign, FileText, Search,
} from "lucide-react";

const BRAND = "#262262";
const GRADIENT = "linear-gradient(135deg, #262262, #92278F)";

const INCOME_TYPES = ["Donations", "Fundraising", "Uniform Sales", "Book Sales", "Rental", "Sponsorship", "Grant", "Other"];
const PAYMENT_METHODS = ["Cash", "Bank Transfer", "Mobile Money", "Cheque", "Online"];

const TYPE_COLORS: Record<string, string> = {
  Donations: "bg-blue-100 text-blue-700",
  Fundraising: "bg-purple-100 text-purple-700",
  "Uniform Sales": "bg-green-100 text-green-700",
  "Book Sales": "bg-emerald-100 text-emerald-700",
  Rental: "bg-amber-100 text-amber-700",
  Sponsorship: "bg-violet-100 text-violet-700",
  Grant: "bg-sky-100 text-sky-700",
  Other: "bg-gray-100 text-gray-600",
};

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

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-[13px] font-semibold text-[var(--text-strong)] mb-1.5">{children}</label>;
}

function FormInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...props}
      className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-[14px] outline-none focus:border-[#262262] focus:ring-2 focus:ring-[#262262]/10 transition-all" />
  );
}

function FormSelect({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  return (
    <select {...props}
      className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-[14px] outline-none focus:border-[#262262] focus:ring-2 focus:ring-[#262262]/10 transition-all cursor-pointer">
      {children}
    </select>
  );
}

const BLANK_FORM = {
  income_date: new Date().toISOString().split("T")[0],
  type: "Donations",
  title: "",
  description: "",
  amount: "",
  source: "",
  payment_method: "Cash",
  reference: "",
};

export default function IncomePage() {
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [records, setRecords] = useState<IncomeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableNotReady, setTableNotReady] = useState(false);
  const [activeType, setActiveType] = useState("All");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [viewRecord, setViewRecord] = useState<IncomeRecord | null>(null);
  const [form, setForm] = useState(BLANK_FORM);
  const [formErr, setFormErr] = useState<string | null>(null);

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

  const now = new Date();
  const thisMonth = records.filter(r => { const d = new Date(r.income_date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
  const thisYear  = records.filter(r => new Date(r.income_date).getFullYear() === now.getFullYear());
  const totalMonth = thisMonth.reduce((s, r) => s + Number(r.amount), 0);
  const totalYear  = thisYear.reduce((s, r) => s + Number(r.amount), 0);

  const filtered = records.filter(r => {
    if (activeType !== "All" && r.type !== activeType) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return r.title.toLowerCase().includes(q) || (r.source ?? "").toLowerCase().includes(q);
    }
    return true;
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.amount || isNaN(parseFloat(form.amount))) { setFormErr("Enter a valid amount."); return; }
    setSubmitting(true); setFormErr(null);
    const res = await fetch("/api/admin/finance/income", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: parseFloat(form.amount), school_id: schoolId }),
    });
    const json = await res.json();
    setSubmitting(false);
    if (!res.ok) { setFormErr(json.error ?? "Failed to save"); return; }
    setShowForm(false);
    setForm(BLANK_FORM);
    fetchRecords();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this income record?")) return;
    await fetch(`/api/admin/finance/income?id=${id}`, { method: "DELETE" });
    fetchRecords();
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[22px] font-extrabold text-[var(--text-strong)]">Other Income</h2>
          <p className="text-[14px] text-[var(--text-muted)] mt-0.5">Track donations, fundraising, sales and other income sources</p>
        </div>
        <button onClick={() => { setForm(BLANK_FORM); setFormErr(null); setShowForm(true); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-bold text-white shadow-sm hover:opacity-90 transition-opacity"
          style={{ background: GRADIENT }}>
          <PlusCircle size={16} /> Record Income
        </button>
      </div>

      {tableNotReady && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <p className="font-bold text-amber-800 text-[15px]">Finance Module Setup Required</p>
          <p className="text-[14px] text-amber-700 mt-1">Run the SQL migration first.</p>
          <a href="/finance/setup" className="text-[13px] font-semibold text-amber-800 underline mt-2 inline-block">View setup →</a>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "This Month", value: formatCurrency(totalMonth), sub: `${thisMonth.length} entries`, icon: TrendingUp, bg: "#F0FDF4", color: "#16A34A" },
          { label: "This Year",  value: formatCurrency(totalYear),  sub: `${thisYear.length} entries`,  icon: DollarSign, bg: "#EEF2FF", color: BRAND },
          { label: "All Records",value: records.length.toString(),  sub: "all time",                    icon: FileText,   bg: "#FDF4FF", color: "#92278F" },
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

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search income…"
            className="h-9 pl-8 pr-3 rounded-xl border border-[var(--border)] bg-white text-[13px] outline-none focus:border-[#262262] w-48" />
        </div>
        <div className="flex flex-wrap gap-2">
          {["All", ...INCOME_TYPES].map(t => (
            <button key={t} onClick={() => setActiveType(t)}
              className={`px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all ${activeType === t ? "text-white shadow-sm" : "bg-white border border-[var(--border)] text-[var(--text-muted)] hover:border-[#262262]"}`}
              style={activeType === t ? { background: GRADIENT } : {}}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[0_1px_6px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <h3 className="text-[15px] font-bold text-[var(--text-strong)]">Income Records</h3>
          <span className="text-[12px] text-[var(--text-muted)]">{filtered.length} records</span>
        </div>
        {loading ? (
          <div className="py-16 text-center text-[14px] text-[var(--text-muted)]">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <TrendingUp size={32} className="mx-auto mb-3 opacity-20 text-[var(--text-muted)]" />
            <p className="text-[15px] font-semibold text-[var(--text-muted)]">No income records found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--neutral-50)]">
                  {["Date", "Title", "Type", "Source", "Amount", "Method", ""].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-[var(--neutral-50)] transition-colors group">
                    <td className="px-5 py-3.5 text-[13px] text-[var(--text-muted)] whitespace-nowrap">{formatDate(r.income_date)}</td>
                    <td className="px-5 py-3.5 text-[14px] font-semibold text-[var(--text-strong)]">{r.title}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-[12px] font-semibold ${TYPE_COLORS[r.type] ?? "bg-gray-100 text-gray-600"}`}>{r.type}</span>
                    </td>
                    <td className="px-5 py-3.5 text-[13px] text-[var(--text-muted)]">{r.source ?? "—"}</td>
                    <td className="px-5 py-3.5 text-[14px] font-bold text-green-600">{formatCurrency(Number(r.amount))}</td>
                    <td className="px-5 py-3.5 text-[13px] text-[var(--text-muted)]">{r.payment_method ?? "—"}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setViewRecord(r)}
                          className="p-1.5 rounded-lg hover:bg-[var(--neutral-100)] text-[var(--text-muted)] hover:text-[#262262] transition-colors">
                          <Eye size={15} />
                        </button>
                        <button onClick={() => handleDelete(r.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-[var(--text-muted)] hover:text-red-600 transition-colors">
                          <Trash2 size={15} />
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

      {/* Record Income — Slide Panel */}
      <SlidePanel open={showForm} onClose={() => setShowForm(false)} title="Record Income" subtitle="Credit the school wallet immediately">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Income Date *</FieldLabel>
              <FormInput type="date" required value={form.income_date} onChange={e => setForm(f => ({ ...f, income_date: e.target.value }))} />
            </div>
            <div>
              <FieldLabel>Type *</FieldLabel>
              <FormSelect required value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {INCOME_TYPES.map(t => <option key={t}>{t}</option>)}
              </FormSelect>
            </div>
          </div>

          <div>
            <FieldLabel>Title *</FieldLabel>
            <FormInput required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Annual Fundraising Dinner" />
          </div>

          <div>
            <FieldLabel>Description</FieldLabel>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Optional details…"
              className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-[14px] outline-none focus:border-[#262262] focus:ring-2 focus:ring-[#262262]/10 resize-none transition-all" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Amount (GHS) *</FieldLabel>
              <FormInput type="number" min="0.01" step="0.01" required value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
            </div>
            <div>
              <FieldLabel>Payment Method *</FieldLabel>
              <FormSelect required value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}>
                {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
              </FormSelect>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Source / Donor</FieldLabel>
              <FormInput value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} placeholder="e.g. PTA, Mr. Mensah" />
            </div>
            <div>
              <FieldLabel>Reference</FieldLabel>
              <FormInput value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="Receipt / transaction ref" />
            </div>
          </div>

          {formErr && <p className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{formErr}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 h-11 rounded-xl border border-[var(--border)] text-[14px] font-semibold text-[var(--text-muted)] hover:bg-[var(--neutral-50)] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 h-11 rounded-xl text-[14px] font-bold text-white disabled:opacity-60 transition-opacity hover:opacity-90"
              style={{ background: GRADIENT }}>
              {submitting ? "Saving…" : "Record Income"}
            </button>
          </div>
        </form>
      </SlidePanel>

      {/* View Detail Modal */}
      <Modal open={!!viewRecord} onClose={() => setViewRecord(null)} title="Income Details" size="sm">
        {viewRecord && (
          <div className="space-y-1">
            {([
              ["Title", viewRecord.title],
              ["Date", formatDate(viewRecord.income_date)],
              ["Type", viewRecord.type],
              ["Amount", formatCurrency(Number(viewRecord.amount))],
              ["Source", viewRecord.source ?? "—"],
              ["Payment Method", viewRecord.payment_method ?? "—"],
              ["Reference", viewRecord.reference ?? "—"],
              ["Description", viewRecord.description ?? "—"],
              ["Recorded on", formatDate(viewRecord.created_at)],
            ] as [string, string][]).map(([label, value]) => (
              <div key={label} className="flex justify-between py-2.5 border-b border-[var(--border)] last:border-0">
                <span className="text-[13px] font-semibold text-[var(--text-muted)]">{label}</span>
                <span className="text-[14px] font-semibold text-[var(--text-strong)] text-right max-w-[55%]">{value}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
