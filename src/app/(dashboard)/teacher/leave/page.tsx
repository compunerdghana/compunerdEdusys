"use client";

import { useState, useEffect } from "react";
import { Calendar, Plus, Save, Loader2, FileText, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-extrabold text-slate-900 leading-tight">Leave Management</h1>
          <p className="text-slate-500 text-[12px] font-semibold mt-0.5">Apply for Study, Annual, Sick or Parental leaves and track approval status.</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[12px] font-bold transition-all shadow-sm shrink-0"
          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
        >
          <Plus size={15} />
          {showCreate ? "View Requests" : "Apply for Leave"}
        </button>
      </div>

      {showCreate ? (
        <form onSubmit={handleApply} className="bg-white rounded-2xl border border-[#e8e4f3] p-5 shadow-sm space-y-4 max-w-xl">
          <h3 className="font-extrabold text-slate-900 text-[14px]">Submit Leave Request</h3>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Leave Type</label>
            <select
              value={form.leave_type_id}
              onChange={(e) => {
                const type = types.find(t => t.id === e.target.value);
                setForm(f => ({ ...f, leave_type_id: e.target.value, leave_type_name: type?.name || "" }));
              }}
              className="w-full h-10 px-3 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-700 outline-none focus:border-[#7c3aed] bg-white"
            >
              {types.map(t => (
                <option key={t.id} value={t.id}>{t.name} (Max {t.max_days} days)</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Start Date</label>
              <input
                type="date"
                required
                value={form.start_date}
                onChange={(e) => setForm(f => ({ ...f, start_date: e.target.value }))}
                className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] bg-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">End Date</label>
              <input
                type="date"
                required
                value={form.end_date}
                onChange={(e) => setForm(f => ({ ...f, end_date: e.target.value }))}
                className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] bg-white"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Days Requested</label>
            <input
              type="number"
              min={1}
              required
              value={form.days_requested}
              onChange={(e) => setForm(f => ({ ...f, days_requested: e.target.value }))}
              className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Reason / Description</label>
            <textarea
              required
              rows={2}
              value={form.reason}
              onChange={(e) => setForm(f => ({ ...f, reason: e.target.value }))}
              placeholder="State reason for your leave request..."
              className="w-full p-3 text-[12.5px] font-semibold text-slate-800 border border-[#e0daf0] rounded-xl outline-none focus:border-[#7c3aed] bg-white"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full h-11 flex items-center justify-center gap-1.5 rounded-xl text-white font-bold text-[13px]"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Submit Application
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          {loading ? (
            <div className="py-20 text-center">
              <Loader2 size={24} className="animate-spin text-violet-600 mx-auto" />
              <p className="text-slate-400 text-[12px] font-semibold mt-2">Loading leave files...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#e8e4f3] p-16 text-center text-slate-400 font-semibold text-[13px] shadow-sm">
              No leave requests submitted yet.
            </div>
          ) : (
            requests.map(req => (
              <div key={req.id} className="bg-white rounded-2xl border border-[#e8e4f3] p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900 text-[13.5px]">{req.leave_type_name}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${badge[req.status]}`}>
                      {req.status}
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-slate-400 font-mono">{req.days_requested} Days Requested</span>
                </div>

                <div className="space-y-1">
                  <p className="text-[12.5px] text-slate-600 font-semibold leading-relaxed">
                    <strong>Schedule:</strong> {req.start_date} to {req.end_date}
                  </p>
                  <p className="text-[12.5px] text-slate-600 font-semibold"><strong>Reason:</strong> {req.reason}</p>
                </div>

                {req.reviewer_note && (
                  <div className="bg-[#faf9ff] border border-[#f0edf8] rounded-xl p-3 text-[12px] text-slate-600 font-semibold">
                    <strong className="text-slate-900 block">Supervisor Note:</strong>
                    <p className="mt-0.5">{req.reviewer_note}</p>
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
