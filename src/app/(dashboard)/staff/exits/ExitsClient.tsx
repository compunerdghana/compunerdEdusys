"use client";

import { useState, useMemo } from "react";
import { SlidePanel } from "@/components/ui/SlidePanel";
import { formatDate } from "@/lib/utils";
import { UserMinus, PlusCircle, Search, CheckCircle, Clock, AlertCircle } from "lucide-react";

const GRADIENT = "linear-gradient(135deg, #262262, #92278F)";

const EXIT_TYPES = ["resignation", "retirement", "termination", "death", "contract_end", "transfer_out"] as const;
const CLEARANCE_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  pending:  { bg: "#FFFBEB", color: "#D97706", label: "Pending" },
  partial:  { bg: "#EFF6FF", color: "#2563EB", label: "Partial" },
  cleared:  { bg: "#F0FDF4", color: "#16A34A", label: "Cleared" },
};
const EXIT_STYLE: Record<string, string> = {
  resignation: "#D97706", retirement: "#7C3AED", termination: "#DC2626",
  death: "#6B7280", contract_end: "#2563EB", transfer_out: "#16A34A",
};

interface ExitRecord {
  id: string; profile_id: string; staff_name: string; exit_type: string;
  exit_date: string; notice_date?: string; last_working_day?: string;
  reason?: string; clearance_status: string; handover_notes?: string; created_at: string;
}
interface StaffMember { id: string; full_name: string }

interface Props {
  schoolId: string; userId: string;
  staff: StaffMember[];
  initialRecords: ExitRecord[];
  tableNotReady: boolean;
}

function FL({ c }: { c: React.ReactNode }) {
  return <label className="block text-[13px] font-semibold text-[var(--text-strong)] mb-1.5">{c}</label>;
}
function FI(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-[14px] outline-none focus:border-[#262262] transition-all" />;
}

export function ExitsClient({ schoolId, userId, staff, initialRecords, tableNotReady }: Props) {
  const [records, setRecords] = useState(initialRecords);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    profile_id: staff[0]?.id ?? "",
    exit_type: "resignation" as typeof EXIT_TYPES[number],
    exit_date: today, notice_date: "", last_working_day: "",
    reason: "", clearance_status: "pending", handover_notes: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const staffName = staff.find((s) => s.id === form.profile_id)?.full_name ?? "";
    const res = await fetch("/api/admin/staff/exits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schoolId, processed_by: userId, ...form }),
    });
    const json = await res.json();
    if (json.data) {
      setRecords((prev) => [{ ...json.data, staff_name: staffName }, ...prev]);
      setShowForm(false);
      setForm({ profile_id: staff[0]?.id ?? "", exit_type: "resignation", exit_date: today, notice_date: "", last_working_day: "", reason: "", clearance_status: "pending", handover_notes: "" });
    }
    setSubmitting(false);
  }

  async function updateClearance(id: string, clearance_status: string) {
    await fetch("/api/admin/staff/exits", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, clearance_status }),
    });
    setRecords((prev) => prev.map((r) => r.id === id ? { ...r, clearance_status } : r));
  }

  const filtered = useMemo(() =>
    records.filter((r) =>
      r.staff_name.toLowerCase().includes(search.toLowerCase()) ||
      r.exit_type.toLowerCase().includes(search.toLowerCase())
    ), [records, search]);

  const pendingClearance = records.filter((r) => r.clearance_status === "pending").length;

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[22px] font-extrabold text-[var(--text-strong)]">Exit Management</h2>
          <p className="text-[14px] text-[var(--text-muted)] mt-0.5">Process resignations, retirements, and terminations</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-bold text-white shadow-sm hover:opacity-90"
          style={{ background: GRADIENT }}>
          <PlusCircle size={16} /> Process Exit
        </button>
      </div>

      {tableNotReady && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-[13px] text-amber-800 font-semibold">Run <code className="bg-amber-100 px-1 rounded">supabase/migrations/staff_lifecycle.sql</code> to enable exit management.</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Exits",       value: records.length,                                                         icon: UserMinus,    bg: "#FEF2F2", color: "#DC2626" },
          { label: "Pending Clearance", value: pendingClearance,                                                        icon: Clock,        bg: "#FFFBEB", color: "#D97706" },
          { label: "Cleared",           value: records.filter((r) => r.clearance_status === "cleared").length,         icon: CheckCircle,  bg: "#F0FDF4", color: "#16A34A" },
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

      {pendingClearance > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-[13px] text-amber-800"><strong>{pendingClearance}</strong> exit{pendingClearance > 1 ? "s" : ""} pending clearance. Review and update clearance status below.</p>
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-2xl border border-[var(--border)] p-4 shadow-[0_1px_6px_rgba(0,0,0,0.05)]">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search staff or exit type…"
            className="h-9 w-full pl-9 pr-3 rounded-xl border border-[var(--border)] text-[13px] outline-none focus:border-[#262262]" />
        </div>
      </div>

      {/* Records */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[var(--border)] p-16 text-center shadow-[0_1px_6px_rgba(0,0,0,0.05)]">
          <UserMinus size={36} className="mx-auto mb-3 opacity-20 text-[var(--text-muted)]" />
          <p className="text-[16px] font-bold text-[var(--text-muted)]">No exit records</p>
          <p className="text-[13px] text-[var(--text-muted)] mt-1">Staff records are never deleted — exits are tracked here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const cs = CLEARANCE_STYLE[r.clearance_status] ?? CLEARANCE_STYLE.pending;
            const exitColor = EXIT_STYLE[r.exit_type] ?? "#6B7280";
            return (
              <div key={r.id} className="bg-white rounded-2xl border border-[var(--border)] shadow-[0_1px_6px_rgba(0,0,0,0.05)] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[12px] font-extrabold text-white shrink-0 bg-gray-400">
                      {r.staff_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[15px] font-bold text-[var(--text-strong)]">{r.staff_name}</p>
                      <p className="text-[12px] text-[var(--text-muted)]">Exit Date: {formatDate(r.exit_date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize" style={{ background: exitColor + "18", color: exitColor }}>
                      {r.exit_type.replace("_", " ")}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold" style={{ background: cs.bg, color: cs.color }}>
                      {cs.label}
                    </span>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-3 text-[12px]">
                  {r.notice_date && <div><span className="text-[var(--text-muted)]">Notice:</span> <strong>{formatDate(r.notice_date)}</strong></div>}
                  {r.last_working_day && <div><span className="text-[var(--text-muted)]">Last Day:</span> <strong>{formatDate(r.last_working_day)}</strong></div>}
                </div>
                {r.reason && <p className="mt-2 text-[12px] text-[var(--text-muted)]"><span className="font-semibold">Reason:</span> {r.reason}</p>}
                {r.handover_notes && <p className="mt-1 text-[12px] text-[var(--text-muted)] italic">{r.handover_notes}</p>}

                {r.clearance_status !== "cleared" && (
                  <div className="mt-3 flex gap-2 pt-3 border-t border-[var(--border)]">
                    <span className="text-[12px] text-[var(--text-muted)] font-semibold self-center">Update clearance:</span>
                    {["partial", "cleared"].map((s) => (
                      <button key={s} onClick={() => updateClearance(r.id, s)}
                        className="px-3 py-1 rounded-lg text-[11px] font-bold capitalize border transition-colors"
                        style={{ borderColor: CLEARANCE_STYLE[s].color, color: CLEARANCE_STYLE[s].color }}>
                        {CLEARANCE_STYLE[s].label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Exit Panel */}
      <SlidePanel open={showForm} onClose={() => setShowForm(false)} title="Process Exit" subtitle="Record a staff exit — records are never deleted" width="md">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <FL c="Staff Member *" />
            <select required value={form.profile_id} onChange={(e) => setForm((f) => ({ ...f, profile_id: e.target.value }))}
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-[14px] outline-none focus:border-[#262262] cursor-pointer">
              {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          </div>
          <div>
            <FL c="Exit Type *" />
            <select required value={form.exit_type} onChange={(e) => setForm((f) => ({ ...f, exit_type: e.target.value as typeof EXIT_TYPES[number] }))}
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-[14px] outline-none focus:border-[#262262] cursor-pointer capitalize">
              {EXIT_TYPES.map((t) => <option key={t} value={t} className="capitalize">{t.replace("_", " ")}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FL c="Exit Date *" />
              <FI type="date" required value={form.exit_date} onChange={(e) => setForm((f) => ({ ...f, exit_date: e.target.value }))} />
            </div>
            <div>
              <FL c="Notice Date" />
              <FI type="date" value={form.notice_date} onChange={(e) => setForm((f) => ({ ...f, notice_date: e.target.value }))} />
            </div>
          </div>
          <div>
            <FL c="Last Working Day" />
            <FI type="date" value={form.last_working_day} onChange={(e) => setForm((f) => ({ ...f, last_working_day: e.target.value }))} />
          </div>
          <div>
            <FL c="Reason" />
            <textarea value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} rows={2} placeholder="Reason for exit…"
              className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-[14px] outline-none focus:border-[#262262] resize-none" />
          </div>
          <div>
            <FL c="Handover Notes" />
            <textarea value={form.handover_notes} onChange={(e) => setForm((f) => ({ ...f, handover_notes: e.target.value }))} rows={3} placeholder="Key handover information, pending tasks…"
              className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-[14px] outline-none focus:border-[#262262] resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 h-11 rounded-xl border border-[var(--border)] text-[14px] font-semibold text-[var(--text-muted)] hover:bg-[var(--neutral-50)] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 h-11 rounded-xl text-[14px] font-bold text-white disabled:opacity-60"
              style={{ background: "#DC2626" }}>
              {submitting ? "Processing…" : "Process Exit"}
            </button>
          </div>
        </form>
      </SlidePanel>
    </div>
  );
}
