"use client";

import { useEffect, useState } from "react";
import {
  Rocket, CheckCircle2, Clock, Eye, Loader2, Calendar,
  ShieldCheck, UserCheck,
} from "lucide-react";
import { SlidePanel } from "@/components/ui/SlidePanel";
import { useToast } from "@/components/ui/Toast";

interface GoLiveRecord {
  id: string;
  school_name: string;
  school_code: string;
  golive_checklist: boolean[];
  impl_officer_approved: boolean;
  platform_manager_approved: boolean;
  go_live_date: string | null;
  go_live_status: "pending" | "approved" | "launched" | "delayed";
  created_at: string;
}

const GOLIVE_ITEMS = [
  "Verification Approved",
  "School Account Active",
  "Portal Configured",
  "Branding Completed",
  "Data Migration Done",
  "User Accounts Created",
  "Training Completed",
  "Testing Completed",
  "Subscription Activated",
];

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  approved: "bg-blue-100 text-blue-700 border-blue-200",
  launched: "bg-emerald-100 text-emerald-700 border-emerald-200",
  delayed: "bg-red-100 text-red-700 border-red-200",
};

function StatCard({ icon: Icon, label, value, borderColor, bgColor, iconColor }: {
  icon: React.ElementType; label: string; value: number; borderColor: string; bgColor: string; iconColor: string;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] p-5 flex items-center gap-4" style={{ borderLeftWidth: 4, borderLeftColor: borderColor }}>
      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: bgColor }}>
        <Icon size={20} style={{ color: iconColor }} />
      </div>
      <div>
        <p className="text-[26px] font-extrabold text-slate-900 leading-none">{value}</p>
        <p className="text-[12px] font-semibold text-slate-500 mt-1">{label}</p>
      </div>
    </div>
  );
}

export default function GoLivePage() {
  const { success, error: toastError } = useToast();
  const [records, setRecords] = useState<GoLiveRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<GoLiveRecord | null>(null);
  const [checklist, setChecklist] = useState<boolean[]>(Array(9).fill(false));
  const [goLiveDate, setGoLiveDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/platform/onboarding")
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => {
        const list = d.onboardings ?? d.data ?? [];
        setRecords(list
          .filter((s: { stage?: string }) => ["go-live ready", "active", "testing"].includes((s.stage ?? "").toLowerCase()))
          .map((s: { id: string; school_name: string; school_code: string; golive_checklist?: boolean[]; impl_officer_approved?: boolean; platform_manager_approved?: boolean; go_live_date?: string | null; go_live_status?: string; created_at: string }) => ({
            id: s.id,
            school_name: s.school_name,
            school_code: s.school_code,
            golive_checklist: s.golive_checklist ?? Array(9).fill(false),
            impl_officer_approved: s.impl_officer_approved ?? false,
            platform_manager_approved: s.platform_manager_approved ?? false,
            go_live_date: s.go_live_date ?? null,
            go_live_status: s.go_live_status ?? "pending",
            created_at: s.created_at,
          })));
      })
      .catch(() => toastError("Failed to load go-live data"))
      .finally(() => setLoading(false));
  }, [toastError]);

  function openReview(rec: GoLiveRecord) {
    setSelected(rec);
    setChecklist([...rec.golive_checklist]);
    setGoLiveDate(rec.go_live_date ?? "");
  }

  async function approveLaunch() {
    if (!selected) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/platform/onboarding/${selected.id}/golive`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checklist, go_live_date: goLiveDate }),
      });
      if (!res.ok) throw new Error("Failed to approve");
      success("School approved for Go-Live!");
      setRecords(prev => prev.map(r => r.id === selected.id
        ? { ...r, golive_checklist: checklist, go_live_date: goLiveDate, go_live_status: "approved", platform_manager_approved: true }
        : r));
      setSelected(null);
    } catch (e: unknown) {
      toastError(e instanceof Error ? e.message : "Approval failed");
    } finally {
      setSubmitting(false);
    }
  }

  const readyCount = records.filter(r => r.go_live_status === "pending").length;
  const approvedCount = records.filter(r => r.go_live_status === "approved").length;
  const launchedCount = records.filter(r => r.go_live_status === "launched").length;
  const pendingApproval = records.filter(r => !r.platform_manager_approved).length;

  const thisMonth = new Date();
  const launchedThisMonth = records.filter(r => {
    if (r.go_live_status !== "launched" || !r.go_live_date) return false;
    const d = new Date(r.go_live_date);
    return d.getMonth() === thisMonth.getMonth() && d.getFullYear() === thisMonth.getFullYear();
  }).length;

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <div className="max-w-screen-xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[26px] font-extrabold text-slate-900">Go-Live Management</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">Manage final go-live approvals and school launches</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <StatCard icon={Rocket} label="Ready for Go-Live" value={readyCount} borderColor="#059669" bgColor="#ecfdf5" iconColor="#059669" />
          <StatCard icon={CheckCircle2} label="Approved" value={approvedCount} borderColor="#2563eb" bgColor="#eff6ff" iconColor="#2563eb" />
          <StatCard icon={Clock} label="Launched This Month" value={launchedThisMonth} borderColor="#7c3aed" bgColor="#f5f3ff" iconColor="#7c3aed" />
          <StatCard icon={ShieldCheck} label="Pending Approval" value={pendingApproval} borderColor="#d97706" bgColor="#fffbeb" iconColor="#d97706" />
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#faf9ff]">
                  {["School", "Checklist", "Impl. Officer", "Platform Manager", "Go-Live Date", "Status", "Actions"].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-slate-400 uppercase tracking-widest text-[11px] font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0edf8]">
                {loading ? (
                  [1, 2, 3].map(i => (
                    <tr key={i}>
                      {[1, 2, 3, 4, 5, 6, 7].map(j => (
                        <td key={j} className="px-5 py-3.5"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-14 text-center">
                      <Rocket size={36} className="text-slate-200 mx-auto mb-3" />
                      <p className="text-[13px] font-semibold text-slate-400">No schools ready for go-live yet</p>
                      <p className="text-[12px] text-slate-300 mt-1">Schools in testing or go-live ready stage will appear here</p>
                    </td>
                  </tr>
                ) : (
                  records.map(rec => {
                    const done = rec.golive_checklist.filter(Boolean).length;
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
                            <span className="text-[12px] font-bold text-slate-700">{done}/{GOLIVE_ITEMS.length}</span>
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${(done / GOLIVE_ITEMS.length) * 100}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          {rec.impl_officer_approved
                            ? <span className="flex items-center gap-1.5 text-[12px] font-bold text-emerald-600"><CheckCircle2 size={13} /> Approved</span>
                            : <span className="flex items-center gap-1.5 text-[12px] font-bold text-amber-600"><Clock size={13} /> Pending</span>}
                        </td>
                        <td className="px-5 py-3.5">
                          {rec.platform_manager_approved
                            ? <span className="flex items-center gap-1.5 text-[12px] font-bold text-emerald-600"><CheckCircle2 size={13} /> Approved</span>
                            : <span className="flex items-center gap-1.5 text-[12px] font-bold text-amber-600"><Clock size={13} /> Pending</span>}
                        </td>
                        <td className="px-5 py-3.5">
                          {rec.go_live_date ? (
                            <div className="flex items-center gap-1.5">
                              <Calendar size={11} className="text-slate-400" />
                              <span className="text-[12px] font-semibold text-slate-600">
                                {new Date(rec.go_live_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                              </span>
                            </div>
                          ) : <span className="text-[12px] text-slate-300">Not set</span>}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`rounded-full text-[11px] font-bold px-2.5 py-0.5 border ${STATUS_BADGE[rec.go_live_status] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}>
                            {rec.go_live_status}
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
        <SlidePanel open onClose={() => setSelected(null)} title="Go-Live Review" subtitle={selected.school_name} width="lg">
          <div className="space-y-5">
            <div className="space-y-2.5">
              <p className="text-[12px] font-extrabold uppercase tracking-widest text-slate-400">Go-Live Checklist</p>
              {GOLIVE_ITEMS.map((item, i) => (
                <label key={item}
                  className="flex items-center gap-3 p-3 bg-[#faf9ff] rounded-xl border border-[#e8e4f3] cursor-pointer hover:bg-[#f0edf8] transition-colors"
                  onClick={() => setChecklist(prev => { const n = [...prev]; n[i] = !n[i]; return n; })}>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${checklist[i] ? "border-emerald-500 bg-emerald-500" : "border-[#e0daf0]"}`}>
                    {checklist[i] && <CheckCircle2 size={12} className="text-white" />}
                  </div>
                  <span className="text-[13px] font-semibold text-slate-700 select-none flex-1">{item}</span>
                  {checklist[i] && <CheckCircle2 size={14} className="text-emerald-500" />}
                </label>
              ))}
            </div>

            <div>
              <p className="text-[12px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">Set Go-Live Date</p>
              <input type="date"
                className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
                value={goLiveDate} onChange={e => setGoLiveDate(e.target.value)} />
            </div>

            <div className="flex gap-3 pt-2">
              <div className="flex-1 bg-[#faf9ff] rounded-xl p-3 border border-[#e8e4f3]">
                <div className="flex items-center gap-2 mb-1">
                  <UserCheck size={14} className="text-slate-400" />
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Officer</span>
                </div>
                {selected.impl_officer_approved
                  ? <span className="text-[12px] font-bold text-emerald-600 flex items-center gap-1"><CheckCircle2 size={12} /> Approved</span>
                  : <span className="text-[12px] font-bold text-amber-600 flex items-center gap-1"><Clock size={12} /> Pending</span>}
              </div>
              <div className="flex-1 bg-[#faf9ff] rounded-xl p-3 border border-[#e8e4f3]">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck size={14} className="text-slate-400" />
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Platform Mgr</span>
                </div>
                {selected.platform_manager_approved
                  ? <span className="text-[12px] font-bold text-emerald-600 flex items-center gap-1"><CheckCircle2 size={12} /> Approved</span>
                  : <span className="text-[12px] font-bold text-amber-600 flex items-center gap-1"><Clock size={12} /> Pending</span>}
              </div>
            </div>

            <button onClick={approveLaunch} disabled={submitting || !goLiveDate}
              className="w-full h-10 rounded-xl text-[13px] font-bold text-white disabled:opacity-40 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg,#059669,#16a34a)" }}>
              {submitting ? <><Loader2 size={14} className="animate-spin" /> Processing…</> : <><Rocket size={14} /> Approve & Launch</>}
            </button>
          </div>
        </SlidePanel>
      )}
    </div>
  );
}
