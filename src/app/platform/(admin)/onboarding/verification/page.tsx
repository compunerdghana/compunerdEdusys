"use client";

import { useEffect, useState } from "react";
import {
  ShieldCheck, Clock, CheckCircle2, XCircle, Eye, Loader2,
  Shield, AlertCircle,
} from "lucide-react";
import { SlidePanel } from "@/components/ui/SlidePanel";
import { useToast } from "@/components/ui/Toast";

interface VerificationRecord {
  id: string;
  school_name: string;
  school_code: string;
  checklist: boolean[];
  verified_by?: string;
  verified_at?: string;
  verification_status: "pending" | "verified" | "rejected" | "approved";
  notes?: string;
}

const CHECKLIST_ITEMS = [
  "School Information Verified",
  "Contact Person Verified",
  "Subscription Confirmed",
  "Payment Confirmed",
  "School Logo Uploaded",
  "Administrator Account Created",
  "Portal Created",
  "Setup Completed",
];

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  verified: "bg-cyan-100 text-cyan-700 border-cyan-200",
  approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
};

function StatCard({ icon: Icon, label, value, color, bg }: { icon: React.ElementType; label: string; value: number; color: string; bg: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] p-5 flex items-center gap-4" style={{ borderLeftWidth: 4, borderLeftColor: color }}>
      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <p className="text-[26px] font-extrabold text-slate-900 leading-none">{value}</p>
        <p className="text-[12px] font-semibold text-slate-500 mt-1">{label}</p>
      </div>
    </div>
  );
}

export default function VerificationPage() {
  const { success, error: toastError } = useToast();
  const [records, setRecords] = useState<VerificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<VerificationRecord | null>(null);
  const [checklist, setChecklist] = useState<boolean[]>(Array(8).fill(false));
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/platform/onboarding")
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => {
        const list = d.onboardings ?? d.data ?? [];
        setRecords(list.map((s: { id: string; school_name: string; school_code: string; verification_checklist?: boolean[]; verified_by?: string; verified_at?: string; verification_status?: string; verification_notes?: string }) => ({
          id: s.id,
          school_name: s.school_name,
          school_code: s.school_code,
          checklist: s.verification_checklist ?? Array(8).fill(false),
          verified_by: s.verified_by,
          verified_at: s.verified_at,
          verification_status: s.verification_status ?? "pending",
          notes: s.verification_notes,
        })));
      })
      .catch(() => toastError("Failed to load verification records"))
      .finally(() => setLoading(false));
  }, [toastError]);

  function openReview(rec: VerificationRecord) {
    setSelected(rec);
    setChecklist([...rec.checklist]);
    setNotes(rec.notes ?? "");
  }

  async function doAction(action: "verify" | "approve" | "reject") {
    if (!selected) return;
    setSubmitting(action);
    try {
      const res = await fetch(`/api/platform/onboarding/${selected.id}/verification`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, checklist, notes }),
      });
      if (!res.ok) throw new Error("Action failed");
      const newStatus = action === "verify" ? "verified" : action === "approve" ? "approved" : "rejected";
      success(`School ${action === "reject" ? "rejected" : action + "d"} successfully`);
      setRecords(prev => prev.map(r => r.id === selected.id ? { ...r, verification_status: newStatus as VerificationRecord["verification_status"], checklist, notes } : r));
      setSelected(null);
    } catch (e: unknown) {
      toastError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setSubmitting(null);
    }
  }

  const pending = records.filter(r => r.verification_status === "pending").length;
  const verified = records.filter(r => r.verification_status === "verified").length;
  const rejected = records.filter(r => r.verification_status === "rejected").length;
  const approved = records.filter(r => r.verification_status === "approved").length;

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <div className="max-w-screen-xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[26px] font-extrabold text-slate-900">Verification & Approval</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">Review and approve school onboarding verification</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <StatCard icon={Clock} label="Pending" value={pending} color="#d97706" bg="#fffbeb" />
          <StatCard icon={ShieldCheck} label="Verified" value={verified} color="#0891b2" bg="#ecfeff" />
          <StatCard icon={XCircle} label="Rejected" value={rejected} color="#dc2626" bg="#fef2f2" />
          <StatCard icon={CheckCircle2} label="Approved" value={approved} color="#16a34a" bg="#f0fdf4" />
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#faf9ff]">
                  {["School", "Checklist Progress", "Verified By", "Date", "Status", "Actions"].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-slate-400 uppercase tracking-widest text-[11px] font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0edf8]">
                {loading ? (
                  [1, 2, 3].map(i => (
                    <tr key={i}>
                      {[1, 2, 3, 4, 5, 6].map(j => (
                        <td key={j} className="px-5 py-3.5"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-14 text-center">
                      <Shield size={36} className="text-slate-200 mx-auto mb-3" />
                      <p className="text-[13px] font-semibold text-slate-400">No verification records found</p>
                    </td>
                  </tr>
                ) : (
                  records.map(rec => {
                    const done = rec.checklist.filter(Boolean).length;
                    const total = CHECKLIST_ITEMS.length;
                    return (
                      <tr key={rec.id} className="hover:bg-[#faf9ff] transition-colors">
                        <td className="px-5 py-3.5">
                          <div>
                            <p className="text-[13px] font-bold text-slate-800">{rec.school_name}</p>
                            <p className="text-[11px] text-slate-400 font-semibold">{rec.school_code}</p>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] font-bold text-slate-700">{done}/{total} items</span>
                            <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-1.5 rounded-full bg-indigo-500 transition-all" style={{ width: `${(done / total) * 100}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-[12px] font-semibold text-slate-600">{rec.verified_by ?? "—"}</td>
                        <td className="px-5 py-3.5 text-[12px] font-semibold text-slate-500">
                          {rec.verified_at ? new Date(rec.verified_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`rounded-full text-[11px] font-bold px-2.5 py-0.5 border ${STATUS_BADGE[rec.verification_status] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}>
                            {rec.verification_status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <button onClick={() => openReview(rec)}
                            className="inline-flex items-center gap-1.5 px-3 h-7 rounded-lg text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 transition-colors">
                            <Eye size={11} /> Review
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Review Panel */}
      {selected && (
        <SlidePanel open onClose={() => setSelected(null)} title="Verification Review" subtitle={selected.school_name} width="lg">
          <div className="space-y-5">
            <div className="space-y-2.5">
              <p className="text-[12px] font-extrabold uppercase tracking-widest text-slate-400">Verification Checklist</p>
              {CHECKLIST_ITEMS.map((item, i) => (
                <label key={item} className="flex items-center gap-3 p-3 bg-[#faf9ff] rounded-xl border border-[#e8e4f3] cursor-pointer hover:bg-[#f0edf8] transition-colors">
                  <div
                    onClick={() => setChecklist(prev => { const n = [...prev]; n[i] = !n[i]; return n; })}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer ${checklist[i] ? "border-emerald-500 bg-emerald-500" : "border-[#e0daf0]"}`}>
                    {checklist[i] && <CheckCircle2 size={12} className="text-white" />}
                  </div>
                  <span className="text-[13px] font-semibold text-slate-700 select-none">{item}</span>
                  {checklist[i] && <CheckCircle2 size={14} className="text-emerald-500 ml-auto" />}
                </label>
              ))}
            </div>
            <div>
              <p className="text-[12px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">Notes</p>
              <textarea
                className="w-full px-4 py-2.5 h-24 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white resize-none"
                placeholder="Add verification notes..."
                value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => doAction("verify")} disabled={!!submitting}
                className="flex-1 h-10 rounded-xl text-[13px] font-bold text-white disabled:opacity-40 hover:opacity-90 transition-opacity flex items-center justify-center gap-2 bg-cyan-600">
                {submitting === "verify" ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                Verify
              </button>
              <button onClick={() => doAction("approve")} disabled={!!submitting}
                className="flex-1 h-10 rounded-xl text-[13px] font-bold text-white disabled:opacity-40 hover:opacity-90 transition-opacity flex items-center justify-center gap-2 bg-emerald-600">
                {submitting === "approve" ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Approve
              </button>
              <button onClick={() => doAction("reject")} disabled={!!submitting}
                className="flex-1 h-10 rounded-xl text-[13px] font-bold text-white disabled:opacity-40 hover:opacity-90 transition-opacity flex items-center justify-center gap-2 bg-red-600">
                {submitting === "reject" ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                Reject
              </button>
            </div>
          </div>
        </SlidePanel>
      )}
    </div>
  );
}
