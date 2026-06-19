"use client";

import { useState, useEffect } from "react";
import { Calendar, Plus, Save, Loader2, FileText, CheckCircle2, XCircle, AlertCircle, Clock } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface LeaveRequest {
  id: string;
  leave_type_name: string;
  start_date: string;
  end_date: string;
  days_requested: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  reviewer_note?: string;
  created_at: string;
}

interface LeaveType {
  id: string;
  name: string;
  max_days: number;
}

export default function LeaveManagerView() {
  const { success, error: toastError } = useToast();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    leave_type_id: "",
    leave_type_name: "",
    start_date: "",
    end_date: "",
    days_requested: "1",
    reason: "",
  });

  async function loadLeaves() {
    try {
      const res = await fetch("/api/teacher/leave-request");
      const data = await res.json();
      if (!res.ok) throw new Error();
      setRequests(data.requests || []);
      setTypes(data.leaveTypes || []);
      if (data.leaveTypes && data.leaveTypes.length > 0) {
        setForm(f => ({
          ...f,
          leave_type_id: data.leaveTypes[0].id,
          leave_type_name: data.leaveTypes[0].name
        }));
      }
    } catch {
      toastError("Failed to fetch leaves records.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLeaves();
  }, [toastError]);

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/teacher/leave-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");

      success("Leave request submitted successfully! Headmaster review pending.");
      setShowCreate(false);
      setForm(f => ({ ...f, start_date: "", end_date: "", days_requested: "1", reason: "" }));
      loadLeaves();
    } catch (err: any) {
      toastError(err.message || "Failed to submit leave request.");
    } finally {
      setSaving(false);
    }
  }

  const badge: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700 border-amber-100",
    approved: "bg-emerald-50 text-emerald-700 border-emerald-100",
    rejected: "bg-rose-50 text-rose-700 border-rose-100",
  };

  const badgeIcon = {
    pending: <Clock size={12} className="text-amber-500" />,
    approved: <CheckCircle2 size={12} className="text-emerald-500" />,
    rejected: <XCircle size={12} className="text-rose-500" />,
  };

  // Calculate stats
  const totalApproved = requests
    .filter(r => r.status === "approved")
    .reduce((sum, r) => sum + r.days_requested, 0);

  const pendingRequests = requests.filter(r => r.status === "pending");
  const totalPendingDays = pendingRequests.reduce((sum, r) => sum + r.days_requested, 0);
  
  // Find Annual Leave max days, or default to 24
  const annualLeaveType = types.find(t => t.name.toLowerCase().includes("annual"));
  const maxAnnualDays = annualLeaveType ? annualLeaveType.max_days : 24;
  const remainingAnnualDays = Math.max(0, maxAnnualDays - totalApproved);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white/70 backdrop-blur-md p-6 rounded-2xl border border-[#e8e4f3] shadow-sm">
        <div>
          <h1 className="text-[20px] font-extrabold text-slate-900 leading-tight">Leave Management</h1>
          <p className="text-slate-500 text-[12px] font-semibold mt-1">Apply for Study, Annual, Sick or Parental leaves and track approval status.</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[12.5px] font-bold transition-all shadow-md hover:shadow-lg active:scale-95 shrink-0"
          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
        >
          <Plus size={15} />
          {showCreate ? "View Requests" : "Apply for Leave"}
        </button>
      </div>

      {/* Stats Cards Dashboard */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Annual Leave Balance */}
          <div className="bg-white/70 backdrop-blur-md border border-[#e8e4f3] rounded-2xl p-5 shadow-sm relative overflow-hidden transition-all duration-300 hover:scale-[1.01] hover:shadow-md hover:border-violet-200">
            <div className="absolute top-0 right-0 p-4 opacity-[0.08] pointer-events-none text-violet-700">
              <Calendar size={70} />
            </div>
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-violet-50 border border-violet-100 text-violet-600 flex items-center justify-center shrink-0">
                <Calendar size={18} />
              </span>
              <span className="text-[12px] font-bold text-slate-500">Annual Leave Balance</span>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{remainingAnnualDays}</span>
              <span className="text-[12px] font-bold text-slate-400">Days Left</span>
            </div>
            <p className="text-[11px] font-semibold text-slate-400 mt-1">
              Out of {maxAnnualDays} days allocated limit
            </p>
          </div>

          {/* Card 2: Approved Leaves */}
          <div className="bg-white/70 backdrop-blur-md border border-[#e8e4f3] rounded-2xl p-5 shadow-sm relative overflow-hidden transition-all duration-300 hover:scale-[1.01] hover:shadow-md hover:border-emerald-200">
            <div className="absolute top-0 right-0 p-4 opacity-[0.08] pointer-events-none text-emerald-700">
              <CheckCircle2 size={70} />
            </div>
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 size={18} />
              </span>
              <span className="text-[12px] font-bold text-slate-500">Approved Leaves</span>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{totalApproved}</span>
              <span className="text-[12px] font-bold text-slate-400">Days Taken</span>
            </div>
            <p className="text-[11px] font-semibold text-slate-400 mt-1">
              Taken this current academic cycle
            </p>
          </div>

          {/* Card 3: Pending Applications */}
          <div className="bg-white/70 backdrop-blur-md border border-[#e8e4f3] rounded-2xl p-5 shadow-sm relative overflow-hidden transition-all duration-300 hover:scale-[1.01] hover:shadow-md hover:border-amber-200">
            <div className="absolute top-0 right-0 p-4 opacity-[0.08] pointer-events-none text-amber-700">
              <Clock size={70} />
            </div>
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <Clock size={18} />
              </span>
              <span className="text-[12px] font-bold text-slate-500">Pending Approvals</span>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{pendingRequests.length}</span>
              <span className="text-[12px] font-bold text-slate-400">Application{pendingRequests.length === 1 ? "" : "s"}</span>
            </div>
            <p className="text-[11px] font-semibold text-slate-400 mt-1">
              {pendingRequests.length > 0 ? `${totalPendingDays} day${totalPendingDays === 1 ? "" : "s"} awaiting review` : "All requests review completed"}
            </p>
          </div>
        </div>
      )}

      {showCreate ? (
        <form onSubmit={handleApply} className="bg-white/75 backdrop-blur-md rounded-2xl border border-[#e8e4f3] p-6 shadow-sm space-y-4 max-w-xl transition-all">
          <h3 className="font-extrabold text-slate-900 text-[14px] border-b border-[#f5f3fc] pb-3 flex items-center gap-2">
            <Plus size={16} className="text-violet-600" />
            <span>Submit Leave Request</span>
          </h3>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Leave Type</label>
            <select
              value={form.leave_type_id}
              onChange={(e) => {
                const type = types.find(t => t.id === e.target.value);
                setForm(f => ({ ...f, leave_type_id: e.target.value, leave_type_name: type?.name || "" }));
              }}
              className="w-full h-10 px-3 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-700 outline-none focus:border-[#7c3aed] bg-white transition-all"
            >
              {types.length === 0 ? (
                <option value="">No custom leave types defined</option>
              ) : (
                types.map(t => (
                  <option key={t.id} value={t.id}>{t.name} (Max {t.max_days} days)</option>
                ))
              )}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Start Date</label>
              <input
                type="date"
                required
                value={form.start_date}
                onChange={(e) => setForm(f => ({ ...f, start_date: e.target.value }))}
                className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] bg-white transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">End Date</label>
              <input
                type="date"
                required
                value={form.end_date}
                onChange={(e) => setForm(f => ({ ...f, end_date: e.target.value }))}
                className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] bg-white transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Days Requested</label>
            <input
              type="number"
              min={1}
              required
              value={form.days_requested}
              onChange={(e) => setForm(f => ({ ...f, days_requested: e.target.value }))}
              className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] bg-white transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Reason / Description</label>
            <textarea
              required
              rows={3}
              value={form.reason}
              onChange={(e) => setForm(f => ({ ...f, reason: e.target.value }))}
              placeholder="State reason for your leave request..."
              className="w-full p-3 text-[12.5px] font-semibold text-slate-800 border border-[#e0daf0] rounded-xl outline-none focus:border-[#7c3aed] bg-white transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full h-11 flex items-center justify-center gap-1.5 rounded-xl text-white font-bold text-[13px] shadow-md hover:shadow-lg active:scale-98 transition-all"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Submit Application
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          {loading ? (
            <div className="py-20 text-center bg-white/50 backdrop-blur-sm rounded-2xl border border-[#e8e4f3]">
              <Loader2 size={24} className="animate-spin text-violet-600 mx-auto" />
              <p className="text-slate-400 text-[12px] font-semibold mt-2">Loading leave files...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-[#e8e4f3] p-16 text-center text-slate-400 font-semibold text-[13px] shadow-sm">
              <FileText size={32} className="mx-auto mb-3 text-slate-300" />
              No leave requests submitted yet.
            </div>
          ) : (
            requests.map(req => (
              <div key={req.id} className="bg-white/90 backdrop-blur-sm rounded-2xl border border-[#e8e4f3] p-5 shadow-sm space-y-4 hover:border-violet-200 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900 text-[13.5px]">{req.leave_type_name}</span>
                    <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border flex items-center gap-1 ${badge[req.status]}`}>
                      {badgeIcon[req.status as keyof typeof badgeIcon]}
                      {req.status}
                    </span>
                  </div>
                  <span className="text-[11.5px] font-extrabold text-violet-600 bg-violet-50 border border-violet-100/50 px-2.5 py-0.5 rounded-full">{req.days_requested} Days Requested</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12.5px] text-slate-600 font-semibold bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                  <p className="leading-relaxed flex items-center gap-1.5">
                    <span className="text-slate-400 font-bold">Duration:</span> 
                    <span className="text-slate-800">{req.start_date} to {req.end_date}</span>
                  </p>
                  <p className="leading-relaxed flex items-center gap-1.5">
                    <span className="text-slate-400 font-bold">Reason:</span> 
                    <span className="text-slate-800 truncate" title={req.reason}>{req.reason}</span>
                  </p>
                </div>

                {req.reviewer_note && (
                  <div className="bg-[#faf9ff] border border-[#f0edf8] rounded-xl p-3.5 text-[12px] text-slate-600 font-semibold">
                    <div className="flex items-center gap-1.5 text-slate-900 font-extrabold mb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-600" />
                      <span>Supervisor Note:</span>
                    </div>
                    <p className="text-slate-500 pl-3 leading-relaxed">{req.reviewer_note}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
