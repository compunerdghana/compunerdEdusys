"use client";

import { useState, useMemo } from "react";
import { SlidePanel } from "@/components/ui/SlidePanel";
import { formatDate } from "@/lib/utils";
import { ArrowRightLeft, PlusCircle, Search } from "lucide-react";

const GRADIENT = "linear-gradient(135deg, #262262, #92278F)";

const DEPARTMENTS = ["Primary", "JHS", "KG/Nursery", "Day Care", "Administration", "Finance", "Library", "Security", "Kitchen", "Other"];
const TRANSFER_TYPES = ["department", "branch", "school"] as const;

interface Transfer {
  id: string; profile_id: string; staff_name: string; transfer_type: string;
  previous_department?: string; new_department: string;
  previous_branch?: string; new_branch?: string;
  effective_date: string; reason?: string; created_at: string;
}
interface StaffMember { id: string; full_name: string }

interface Props {
  schoolId: string; userId: string; isAdmin: boolean;
  staff: StaffMember[];
  initialRecords: Transfer[];
  tableNotReady: boolean;
}

function FL({ c }: { c: React.ReactNode }) {
  return <label className="block text-[13px] font-semibold text-[var(--text-strong)] mb-1.5">{c}</label>;
}

export function TransfersClient({ schoolId, userId, isAdmin, staff, initialRecords, tableNotReady }: Props) {
  const [records, setRecords] = useState(initialRecords);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    profile_id: staff[0]?.id ?? "",
    transfer_type: "department" as typeof TRANSFER_TYPES[number],
    previous_department: "", new_department: DEPARTMENTS[0],
    previous_branch: "", new_branch: "",
    effective_date: today, reason: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const staffName = staff.find((s) => s.id === form.profile_id)?.full_name ?? "";
    const res = await fetch("/api/admin/staff/transfers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schoolId, approved_by: userId, ...form }),
    });
    const json = await res.json();
    if (json.data) {
      setRecords((prev) => [{ ...json.data, staff_name: staffName }, ...prev]);
      setShowForm(false);
      setForm({ profile_id: staff[0]?.id ?? "", transfer_type: "department", previous_department: "", new_department: DEPARTMENTS[0], previous_branch: "", new_branch: "", effective_date: today, reason: "" });
    }
    setSubmitting(false);
  }

  const filtered = useMemo(() =>
    records.filter((r) =>
      r.staff_name.toLowerCase().includes(search.toLowerCase()) ||
      r.new_department.toLowerCase().includes(search.toLowerCase())
    ), [records, search]);

  const inp = (props: React.InputHTMLAttributes<HTMLInputElement>) =>
    <input {...props} className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-[14px] outline-none focus:border-[#262262] transition-all" />;

  const TYPE_BADGE: Record<string, { bg: string; color: string }> = {
    department: { bg: "#EEF2FF", color: "#4338CA" },
    branch: { bg: "#F0FDF4", color: "#16A34A" },
    school: { bg: "#FDF4FF", color: "#92278F" },
  };

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[22px] font-extrabold text-[var(--text-strong)]">Transfers</h2>
          <p className="text-[14px] text-[var(--text-muted)] mt-0.5">Track department and branch transfers</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-bold text-white shadow-sm hover:opacity-90"
            style={{ background: GRADIENT }}>
            <PlusCircle size={16} /> Record Transfer
          </button>
        )}
      </div>

      {tableNotReady && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-[13px] text-amber-800 font-semibold">Run <code className="bg-amber-100 px-1 rounded">supabase/migrations/staff_lifecycle.sql</code> to enable transfers.</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Transfers",      value: records.length },
          { label: "Department Transfers", value: records.filter((r) => r.transfer_type === "department").length },
          { label: "Branch Transfers",     value: records.filter((r) => r.transfer_type === "branch").length },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-[0_1px_6px_rgba(0,0,0,0.05)] flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "#EEF2FF" }}>
              <ArrowRightLeft size={22} style={{ color: "#4338CA" }} />
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
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search staff or department…"
            className="h-9 w-full pl-9 pr-3 rounded-xl border border-[var(--border)] text-[13px] outline-none focus:border-[#262262]" />
        </div>
      </div>

      {/* Records */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[var(--border)] p-16 text-center shadow-[0_1px_6px_rgba(0,0,0,0.05)]">
          <ArrowRightLeft size={36} className="mx-auto mb-3 opacity-20 text-[var(--text-muted)]" />
          <p className="text-[16px] font-bold text-[var(--text-muted)]">No transfer records yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[0_1px_6px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--neutral-50)]">
                  {["Staff", "Type", "From", "To", "Effective Date", "Reason"].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map((r) => {
                  const tb = TYPE_BADGE[r.transfer_type] ?? { bg: "#F9FAFB", color: "#6B7280" };
                  return (
                    <tr key={r.id} className="hover:bg-[var(--neutral-50)] transition-colors">
                      <td className="px-5 py-4 text-[14px] font-semibold text-[var(--text-strong)]">{r.staff_name}</td>
                      <td className="px-5 py-4">
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize" style={{ background: tb.bg, color: tb.color }}>{r.transfer_type}</span>
                      </td>
                      <td className="px-5 py-4 text-[13px] text-[var(--text-muted)]">{r.previous_department ?? "—"}</td>
                      <td className="px-5 py-4 text-[13px] font-semibold text-[var(--text-strong)]">{r.new_department}</td>
                      <td className="px-5 py-4 text-[13px] text-[var(--text-muted)] whitespace-nowrap">{formatDate(r.effective_date)}</td>
                      <td className="px-5 py-4 text-[12px] text-[var(--text-muted)] max-w-[200px] truncate">{r.reason ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transfer Panel */}
      <SlidePanel open={showForm} onClose={() => setShowForm(false)} title="Record Transfer" subtitle="Log a department or branch transfer" width="md">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <FL c="Staff Member *" />
            <select required value={form.profile_id} onChange={(e) => setForm((f) => ({ ...f, profile_id: e.target.value }))}
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-[14px] outline-none focus:border-[#262262] cursor-pointer">
              {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          </div>
          <div>
            <FL c="Transfer Type *" />
            <select required value={form.transfer_type} onChange={(e) => setForm((f) => ({ ...f, transfer_type: e.target.value as typeof TRANSFER_TYPES[number] }))}
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-[14px] outline-none focus:border-[#262262] cursor-pointer capitalize">
              {TRANSFER_TYPES.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FL c="From Department" />
              {inp({ value: form.previous_department, onChange: (e) => setForm((f) => ({ ...f, previous_department: e.target.value })), placeholder: "Previous dept" })}
            </div>
            <div>
              <FL c="To Department *" />
              <select required value={form.new_department} onChange={(e) => setForm((f) => ({ ...f, new_department: e.target.value }))}
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-[14px] outline-none focus:border-[#262262] cursor-pointer">
                {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>
          {form.transfer_type === "branch" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FL c="From Branch" />
                {inp({ value: form.previous_branch, onChange: (e) => setForm((f) => ({ ...f, previous_branch: e.target.value })), placeholder: "Previous branch" })}
              </div>
              <div>
                <FL c="To Branch *" />
                {inp({ required: true, value: form.new_branch, onChange: (e) => setForm((f) => ({ ...f, new_branch: e.target.value })), placeholder: "New branch" })}
              </div>
            </div>
          )}
          <div>
            <FL c="Effective Date *" />
            {inp({ type: "date", required: true, value: form.effective_date, onChange: (e) => setForm((f) => ({ ...f, effective_date: e.target.value })) })}
          </div>
          <div>
            <FL c="Reason" />
            <textarea value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} rows={3} placeholder="Reason for transfer…"
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
              {submitting ? "Saving…" : "Record Transfer"}
            </button>
          </div>
        </form>
      </SlidePanel>
    </div>
  );
}
