"use client";

import { useState, useMemo } from "react";
import { SlidePanel } from "@/components/ui/SlidePanel";
import { Modal } from "@/components/ui/Modal";
import { formatDate } from "@/lib/utils";
import { Calendar, PlusCircle, Clock, CheckCircle, XCircle, Search, AlertCircle } from "lucide-react";

const GRADIENT = "linear-gradient(135deg, #262262, #92278F)";

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  pending:   { bg: "#FFFBEB", color: "#D97706", label: "Pending" },
  approved:  { bg: "#F0FDF4", color: "#16A34A", label: "Approved" },
  rejected:  { bg: "#FEF2F2", color: "#DC2626", label: "Rejected" },
  cancelled: { bg: "#F9FAFB", color: "#6B7280", label: "Cancelled" },
};

interface LeaveType { id: string; name: string; max_days: number; is_paid: boolean }
interface LeaveRequest {
  id: string; profile_id: string; staff_name: string; leave_type_name: string;
  start_date: string; end_date: string; days_requested: number; reason?: string;
  status: string; reviewed_at?: string; reviewer_note?: string; created_at: string;
}

interface Props {
  schoolId: string; userId: string; userName: string; role: string;
  isAdmin: boolean;
  leaveTypes: LeaveType[];
  initialRequests: LeaveRequest[];
  tableNotReady: boolean;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-[13px] font-semibold text-[var(--text-strong)] mb-1.5">{children}</label>;
}
function FormInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-[14px] outline-none focus:border-[#262262] focus:ring-2 focus:ring-[#262262]/10 transition-all" />;
}

export function LeaveClient({ schoolId, userId, userName, isAdmin, leaveTypes, initialRequests, tableNotReady }: Props) {
  const [requests, setRequests] = useState(initialRequests);
  const [showForm, setShowForm] = useState(false);
  const [reviewModal, setReviewModal] = useState<LeaveRequest | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [submitting, setSubmitting] = useState(false);
  const [reviewNote, setReviewNote] = useState("");

  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    leave_type_id: leaveTypes[0]?.id ?? "",
    leave_type_name: leaveTypes[0]?.name ?? "Annual Leave",
    start_date: today, end_date: today, reason: "",
  });

  function computeDays(start: string, end: string) {
    if (!start || !end) return 0;
    const ms = new Date(end).getTime() - new Date(start).getTime();
    return Math.max(1, Math.round(ms / 86400000) + 1);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const days_requested = computeDays(form.start_date, form.end_date);
    const res = await fetch("/api/admin/staff/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schoolId, profile_id: userId, days_requested, staff_name: userName, ...form }),
    });
    const json = await res.json();
    if (json.data) {
      setRequests((prev) => [{ ...json.data, staff_name: userName }, ...prev]);
      setShowForm(false);
    }
    setSubmitting(false);
  }

  async function handleReview(action: "approved" | "rejected") {
    if (!reviewModal) return;
    setSubmitting(true);
    const res = await fetch("/api/admin/staff/leave", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: reviewModal.id, status: action, reviewer_note: reviewNote, reviewed_by: userId }),
    });
    const json = await res.json();
    if (json.data) {
      setRequests((prev) => prev.map((r) => r.id === reviewModal.id ? { ...r, status: action, reviewer_note: reviewNote } : r));
      setReviewModal(null);
      setReviewNote("");
    }
    setSubmitting(false);
  }

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      const matchSearch = r.staff_name.toLowerCase().includes(search.toLowerCase()) ||
        r.leave_type_name.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "all" || r.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [requests, search, filterStatus]);

  const pendingCount  = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const rejectedCount = requests.filter((r) => r.status === "rejected").length;

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[22px] font-extrabold text-[var(--text-strong)]">Leave Management</h2>
          <p className="text-[14px] text-[var(--text-muted)] mt-0.5">Apply for and manage staff leave requests</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-bold text-white shadow-sm hover:opacity-90 transition-opacity"
          style={{ background: GRADIENT }}>
          <PlusCircle size={16} /> Apply for Leave
        </button>
      </div>

      {tableNotReady && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-[13px] text-amber-800 font-semibold">Run the SQL migration to enable leave management.</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Pending Review", value: pendingCount,  icon: Clock,         bg: "#FFFBEB", color: "#D97706" },
          { label: "Approved",       value: approvedCount, icon: CheckCircle,   bg: "#F0FDF4", color: "#16A34A" },
          { label: "Rejected",       value: rejectedCount, icon: XCircle,       bg: "#FEF2F2", color: "#DC2626" },
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

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[0_1px_6px_rgba(0,0,0,0.05)] p-4 flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or leave type…"
            className="h-9 w-full pl-9 pr-3 rounded-xl border border-[var(--border)] text-[13px] outline-none focus:border-[#262262]" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="h-9 rounded-xl border border-[var(--border)] px-3 text-[13px] outline-none cursor-pointer">
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Leave Requests Table */}
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[0_1px_6px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--neutral-50)]">
                {["Staff", "Leave Type", "Duration", "Days", "Status", "Applied", isAdmin ? "Actions" : ""].filter(Boolean).map((h) => (
                  <th key={h} className="px-5 py-3.5 text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-[13px] text-[var(--text-muted)]">
                  <Calendar size={28} className="mx-auto mb-2 opacity-20" /> No leave requests found
                </td></tr>
              ) : filtered.map((r) => {
                const st = STATUS_STYLE[r.status] ?? STATUS_STYLE.pending;
                return (
                  <tr key={r.id} className="hover:bg-[var(--neutral-50)] transition-colors">
                    <td className="px-5 py-4 text-[14px] font-semibold text-[var(--text-strong)]">{r.staff_name}</td>
                    <td className="px-5 py-4 text-[13px] text-[var(--text-muted)]">{r.leave_type_name}</td>
                    <td className="px-5 py-4 text-[13px] text-[var(--text-muted)] whitespace-nowrap">{formatDate(r.start_date)} – {formatDate(r.end_date)}</td>
                    <td className="px-5 py-4 text-[14px] font-bold text-[var(--text-strong)]">{r.days_requested}d</td>
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                    </td>
                    <td className="px-5 py-4 text-[12px] text-[var(--text-muted)] whitespace-nowrap">{formatDate(r.created_at)}</td>
                    {isAdmin && (
                      <td className="px-5 py-4">
                        {r.status === "pending" && (
                          <button onClick={() => { setReviewModal(r); setReviewNote(""); }}
                            className="px-3 py-1.5 rounded-lg text-[12px] font-bold text-white"
                            style={{ background: GRADIENT }}>
                            Review
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Apply Leave Panel */}
      <SlidePanel open={showForm} onClose={() => setShowForm(false)} title="Apply for Leave" subtitle="Submit a leave request for approval" width="md">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <FieldLabel>Leave Type *</FieldLabel>
            <select required value={form.leave_type_id}
              onChange={(e) => {
                const t = leaveTypes.find((lt) => lt.id === e.target.value);
                setForm((f) => ({ ...f, leave_type_id: e.target.value, leave_type_name: t?.name ?? "" }));
              }}
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-[14px] outline-none focus:border-[#262262] cursor-pointer">
              {leaveTypes.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.max_days} days max) {t.is_paid ? "• Paid" : "• Unpaid"}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Start Date *</FieldLabel>
              <FormInput type="date" required min={today} value={form.start_date}
                onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div>
              <FieldLabel>End Date *</FieldLabel>
              <FormInput type="date" required min={form.start_date} value={form.end_date}
                onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} />
            </div>
          </div>
          <div className="bg-[var(--neutral-50)] rounded-xl p-4 text-[13px] font-semibold text-[var(--text-strong)]">
            Duration: <span className="text-[#262262] text-[16px] font-extrabold">{computeDays(form.start_date, form.end_date)}</span> days
          </div>
          <div>
            <FieldLabel>Reason</FieldLabel>
            <textarea value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} rows={3}
              placeholder="Brief reason for the leave request…"
              className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-[14px] outline-none focus:border-[#262262] resize-none transition-all" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 h-11 rounded-xl border border-[var(--border)] text-[14px] font-semibold text-[var(--text-muted)] hover:bg-[var(--neutral-50)] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 h-11 rounded-xl text-[14px] font-bold text-white disabled:opacity-60"
              style={{ background: GRADIENT }}>
              {submitting ? "Submitting…" : "Submit Request"}
            </button>
          </div>
        </form>
      </SlidePanel>

      {/* Review Modal */}
      {reviewModal && (
        <Modal open={true} onClose={() => setReviewModal(null)} title={`Review Leave — ${reviewModal.staff_name}`}>
          <div className="space-y-4 pt-2">
            <div className="bg-[var(--neutral-50)] rounded-xl p-4 space-y-1.5 text-[13px]">
              <p><span className="text-[var(--text-muted)]">Type:</span> <strong>{reviewModal.leave_type_name}</strong></p>
              <p><span className="text-[var(--text-muted)]">Duration:</span> <strong>{formatDate(reviewModal.start_date)} – {formatDate(reviewModal.end_date)} ({reviewModal.days_requested} days)</strong></p>
              {reviewModal.reason && <p><span className="text-[var(--text-muted)]">Reason:</span> {reviewModal.reason}</p>}
            </div>
            <div>
              <FieldLabel>Reviewer Note (optional)</FieldLabel>
              <textarea value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} rows={3}
                placeholder="Add a note for the staff member…"
                className="w-full rounded-xl border border-[var(--border)] px-4 py-3 text-[14px] outline-none focus:border-[#262262] resize-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => handleReview("rejected")} disabled={submitting}
                className="flex-1 h-11 rounded-xl border-2 border-red-500 text-[14px] font-bold text-red-600 disabled:opacity-60 hover:bg-red-50 transition-colors">
                Reject
              </button>
              <button onClick={() => handleReview("approved")} disabled={submitting}
                className="flex-1 h-11 rounded-xl text-[14px] font-bold text-white disabled:opacity-60"
                style={{ background: "#16A34A" }}>
                {submitting ? "Saving…" : "Approve"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
