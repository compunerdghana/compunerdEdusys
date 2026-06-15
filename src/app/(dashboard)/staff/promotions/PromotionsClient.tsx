"use client";

import { useState, useMemo } from "react";
import { SlidePanel } from "@/components/ui/SlidePanel";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Award, PlusCircle, TrendingUp, Search } from "lucide-react";

const GRADIENT = "linear-gradient(135deg, #262262, #92278F)";

interface Promotion {
  id: string; profile_id: string; staff_name: string;
  previous_designation?: string; new_designation: string;
  previous_salary?: number; new_salary?: number;
  effective_date: string; reason?: string; created_at: string;
}
interface StaffMember { id: string; full_name: string }

interface Props {
  schoolId: string; userId: string; isAdmin: boolean;
  staff: StaffMember[];
  initialRecords: Promotion[];
  tableNotReady: boolean;
}

function FL({ c }: { c: React.ReactNode }) {
  return <label className="block text-[13px] font-semibold text-[var(--text-strong)] mb-1.5">{c}</label>;
}

export function PromotionsClient({ schoolId, userId, isAdmin, staff, initialRecords, tableNotReady }: Props) {
  const [records, setRecords] = useState(initialRecords);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    profile_id: staff[0]?.id ?? "",
    previous_designation: "", new_designation: "",
    previous_salary: "", new_salary: "",
    effective_date: today, reason: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const staffName = staff.find((s) => s.id === form.profile_id)?.full_name ?? "";
    const res = await fetch("/api/admin/staff/promotions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        schoolId, approved_by: userId, ...form,
        previous_salary: form.previous_salary ? parseFloat(form.previous_salary) : null,
        new_salary: form.new_salary ? parseFloat(form.new_salary) : null,
      }),
    });
    const json = await res.json();
    if (json.data) {
      setRecords((prev) => [{ ...json.data, staff_name: staffName }, ...prev]);
      setShowForm(false);
      setForm({ profile_id: staff[0]?.id ?? "", previous_designation: "", new_designation: "", previous_salary: "", new_salary: "", effective_date: today, reason: "" });
    }
    setSubmitting(false);
  }

  const filtered = useMemo(() =>
    records.filter((r) =>
      r.staff_name.toLowerCase().includes(search.toLowerCase()) ||
      r.new_designation.toLowerCase().includes(search.toLowerCase())
    ), [records, search]);

  function inp(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return <input {...props} className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-[14px] outline-none focus:border-[#262262] focus:ring-2 focus:ring-[#262262]/10 transition-all" />;
  }

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[22px] font-extrabold text-[var(--text-strong)]">Promotions</h2>
          <p className="text-[14px] text-[var(--text-muted)] mt-0.5">Track staff promotions and career progression</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-bold text-white shadow-sm hover:opacity-90"
            style={{ background: GRADIENT }}>
            <PlusCircle size={16} /> Record Promotion
          </button>
        )}
      </div>

      {tableNotReady && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-[13px] text-amber-800 font-semibold">Run <code className="bg-amber-100 px-1 rounded">supabase/migrations/staff_lifecycle.sql</code> to enable promotions.</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "Total Promotions", value: records.length,  icon: Award,     bg: "#EEF2FF", color: "#4338CA" },
          { label: "This Year",        value: records.filter((r) => r.effective_date.startsWith(new Date().getFullYear().toString())).length, icon: TrendingUp, bg: "#F0FDF4", color: "#16A34A" },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-[0_1px_6px_rgba(0,0,0,0.05)] flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: c.bg }}>
              <c.icon size={22} style={{ color: c.color }} />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">{c.label}</p>
              <p className="text-[28px] font-extrabold text-[var(--text-strong)] leading-tight">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-[var(--border)] p-4 shadow-[0_1px_6px_rgba(0,0,0,0.05)]">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or designation…"
            className="h-9 w-full pl-9 pr-3 rounded-xl border border-[var(--border)] text-[13px] outline-none focus:border-[#262262]" />
        </div>
      </div>

      {/* Records */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[var(--border)] p-16 text-center shadow-[0_1px_6px_rgba(0,0,0,0.05)]">
          <Award size={36} className="mx-auto mb-3 opacity-20 text-[var(--text-muted)]" />
          <p className="text-[16px] font-bold text-[var(--text-muted)]">No promotions recorded yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl border border-[var(--border)] shadow-[0_1px_6px_rgba(0,0,0,0.05)] p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[12px] font-extrabold text-white shrink-0" style={{ background: GRADIENT }}>
                    {r.staff_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-[15px] font-bold text-[var(--text-strong)]">{r.staff_name}</p>
                    <p className="text-[12px] text-[var(--text-muted)]">Effective {formatDate(r.effective_date)}</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-white shrink-0" style={{ background: GRADIENT }}>PROMOTED</span>
              </div>
              <div className="mt-4 flex items-center gap-3 text-[13px]">
                {r.previous_designation && (
                  <>
                    <span className="px-3 py-1.5 bg-[var(--neutral-50)] rounded-xl font-semibold text-[var(--text-muted)]">{r.previous_designation}</span>
                    <TrendingUp size={16} className="text-[#262262] shrink-0" />
                  </>
                )}
                <span className="px-3 py-1.5 rounded-xl font-bold text-white" style={{ background: GRADIENT }}>{r.new_designation}</span>
              </div>
              {(r.previous_salary || r.new_salary) && (
                <div className="mt-3 flex gap-4 text-[12px] text-[var(--text-muted)]">
                  {r.previous_salary && <span>From: {formatCurrency(r.previous_salary)}</span>}
                  {r.new_salary && <span>To: <strong className="text-[var(--text-strong)]">{formatCurrency(r.new_salary)}</strong></span>}
                </div>
              )}
              {r.reason && <p className="mt-2 text-[12px] text-[var(--text-muted)] italic">{r.reason}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Promotion Panel */}
      <SlidePanel open={showForm} onClose={() => setShowForm(false)} title="Record Promotion" subtitle="Log a staff promotion or designation change" width="md">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <FL c="Staff Member *" />
            <select required value={form.profile_id} onChange={(e) => setForm((f) => ({ ...f, profile_id: e.target.value }))}
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-[14px] outline-none focus:border-[#262262] cursor-pointer">
              {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          </div>
          <div>
            <FL c="Previous Designation" />
            {inp({ value: form.previous_designation, onChange: (e) => setForm((f) => ({ ...f, previous_designation: e.target.value })), placeholder: "e.g. Teacher" })}
          </div>
          <div>
            <FL c="New Designation *" />
            {inp({ required: true, value: form.new_designation, onChange: (e) => setForm((f) => ({ ...f, new_designation: e.target.value })), placeholder: "e.g. Senior Teacher" })}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FL c="Previous Salary (GHS)" />
              {inp({ type: "number", min: "0", step: "0.01", value: form.previous_salary, onChange: (e) => setForm((f) => ({ ...f, previous_salary: e.target.value })), placeholder: "0.00" })}
            </div>
            <div>
              <FL c="New Salary (GHS)" />
              {inp({ type: "number", min: "0", step: "0.01", value: form.new_salary, onChange: (e) => setForm((f) => ({ ...f, new_salary: e.target.value })), placeholder: "0.00" })}
            </div>
          </div>
          <div>
            <FL c="Effective Date *" />
            {inp({ type: "date", required: true, value: form.effective_date, onChange: (e) => setForm((f) => ({ ...f, effective_date: e.target.value })) })}
          </div>
          <div>
            <FL c="Reason / Notes" />
            <textarea value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} rows={3}
              placeholder="Reason for promotion…"
              className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-[14px] outline-none focus:border-[#262262] resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 h-11 rounded-xl border border-[var(--border)] text-[14px] font-semibold text-[var(--text-muted)] hover:bg-[var(--neutral-50)] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 h-11 rounded-xl text-[14px] font-bold text-white disabled:opacity-60"
              style={{ background: GRADIENT }}>
              {submitting ? "Saving…" : "Record Promotion"}
            </button>
          </div>
        </form>
      </SlidePanel>
    </div>
  );
}
