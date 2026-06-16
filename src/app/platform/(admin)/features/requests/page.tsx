"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageSquarePlus, Plus, ThumbsUp, Search } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { SlidePanel } from "@/components/ui/SlidePanel";

interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  requested_by: string;
  source: string;
  priority: string;
  status: string;
  votes: number;
  created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-slate-50 text-slate-600 border-slate-200",
  under_review: "bg-blue-50 text-blue-700 border-blue-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  in_progress: "bg-violet-50 text-violet-700 border-violet-200",
  completed: "bg-green-50 text-green-700 border-green-200",
  rejected: "bg-red-50 text-red-600 border-red-200",
};

const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-slate-50 text-slate-500 border-slate-200",
  medium: "bg-blue-50 text-blue-600 border-blue-200",
  high: "bg-amber-50 text-amber-700 border-amber-200",
  critical: "bg-red-50 text-red-700 border-red-200",
};

const SOURCE_STYLES: Record<string, string> = {
  school: "bg-indigo-50 text-indigo-700 border-indigo-200",
  teacher: "bg-cyan-50 text-cyan-700 border-cyan-200",
  student: "bg-violet-50 text-violet-700 border-violet-200",
  parent: "bg-emerald-50 text-emerald-700 border-emerald-200",
  internal: "bg-amber-50 text-amber-700 border-amber-200",
};

const MOCK_REQUESTS: FeatureRequest[] = [
  { id: "req1", title: "Offline Grade Entry", description: "Allow teachers to enter grades when offline and sync when connected.", requested_by: "Accra Academy", source: "school", priority: "high", status: "approved", votes: 42, created_at: "2025-01-10" },
  { id: "req2", title: "WhatsApp Report Cards", description: "Send student report cards directly to parents via WhatsApp.", requested_by: "Mrs. Asante", source: "teacher", priority: "medium", status: "in_progress", votes: 38, created_at: "2025-01-18" },
  { id: "req3", title: "Dark Mode for Student Portal", description: "Add a dark mode option to reduce eye strain for students using the portal at night.", requested_by: "Student Council", source: "student", priority: "low", status: "pending", votes: 27, created_at: "2025-02-03" },
  { id: "req4", title: "Bus Tracking Integration", description: "Real-time school bus tracking with parent notifications.", requested_by: "PTA Representative", source: "parent", priority: "high", status: "under_review", votes: 61, created_at: "2025-02-14" },
  { id: "req5", title: "AI-Powered Question Generator", description: "Generate exam questions from uploaded curriculum content using AI.", requested_by: "Product Team", source: "internal", priority: "critical", status: "in_progress", votes: 15, created_at: "2025-03-01" },
  { id: "req6", title: "Multi-School Dashboard", description: "Allow administrators to manage multiple schools from a single login.", requested_by: "Wesley Girls High", source: "school", priority: "medium", status: "pending", votes: 22, created_at: "2025-03-08" },
];

const EMPTY_SUBMIT_FORM = {
  title: "", description: "", source: "school" as string, requested_by: "", priority: "medium" as string,
};
const EMPTY_REVIEW_FORM = { status: "under_review" as string, notes: "" };

export default function RequestsPage() {
  const { success, error: toastError } = useToast();
  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [search, setSearch] = useState("");
  const [submitOpen, setSubmitOpen] = useState(false);
  const [reviewRequest, setReviewRequest] = useState<FeatureRequest | null>(null);
  const [submitForm, setSubmitForm] = useState({ ...EMPTY_SUBMIT_FORM });
  const [reviewForm, setReviewForm] = useState({ ...EMPTY_REVIEW_FORM });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      if (filterPriority) params.set("priority", filterPriority);
      if (filterSource) params.set("source", filterSource);
      const res = await fetch(`/api/platform/features/requests?${params}`);
      if (res.ok) {
        const d = await res.json();
        setRequests(d.requests ?? d.data ?? []);
      } else {
        setRequests(MOCK_REQUESTS);
      }
    } catch {
      setRequests(MOCK_REQUESTS);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterPriority, filterSource]);

  useEffect(() => { load(); }, [load]);

  function openReview(r: FeatureRequest) {
    setReviewRequest(r);
    setReviewForm({ status: r.status, notes: "" });
  }

  async function handleSubmit() {
    if (!submitForm.title.trim() || !submitForm.description.trim()) {
      toastError("Title and description are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/platform/features/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitForm),
      });
      if (!res.ok) throw new Error();
      success("Feature request submitted");
      setSubmitOpen(false);
      load();
    } catch {
      const newReq: FeatureRequest = {
        id: String(Date.now()), ...submitForm, votes: 0,
        status: "pending", created_at: new Date().toISOString().split("T")[0],
      };
      setRequests(prev => [newReq, ...prev]);
      success("Request submitted (demo)");
      setSubmitOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleReview() {
    if (!reviewRequest) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/platform/features/requests?id=${reviewRequest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reviewForm),
      });
      if (!res.ok) throw new Error();
      success("Request updated");
      setReviewRequest(null);
      load();
    } catch {
      setRequests(prev => prev.map(r => r.id === reviewRequest.id ? { ...r, status: reviewForm.status } : r));
      success("Request updated (demo)");
      setReviewRequest(null);
    } finally {
      setSaving(false);
    }
  }

  const filtered = requests.filter(r => {
    if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus && r.status !== filterStatus) return false;
    if (filterPriority && r.priority !== filterPriority) return false;
    if (filterSource && r.source !== filterSource) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[22px] font-extrabold text-slate-900 leading-tight">Feature Requests</h1>
            <span className="rounded-full text-[11px] font-bold px-2.5 py-0.5 border bg-violet-50 text-violet-700 border-violet-200">
              {requests.length} total
            </span>
          </div>
          <p className="text-slate-500 text-[13px] font-semibold mt-1">Review and manage feature requests from schools and users</p>
        </div>
        <button
          onClick={() => { setSubmitForm({ ...EMPTY_SUBMIT_FORM }); setSubmitOpen(true); }}
          className="flex items-center gap-2 px-4 h-10 rounded-xl text-[13px] font-bold text-white transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
        >
          <Plus size={15} />
          Submit Request
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search requests..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
        >
          <option value="">All Statuses</option>
          {["pending", "under_review", "approved", "in_progress", "completed", "rejected"].map(s => (
            <option key={s} value={s}>{s.replace("_", " ")}</option>
          ))}
        </select>
        <select
          value={filterPriority}
          onChange={e => setFilterPriority(e.target.value)}
          className="px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
        >
          <option value="">All Priorities</option>
          {["low", "medium", "high", "critical"].map(p => (
            <option key={p} value={p} className="capitalize">{p}</option>
          ))}
        </select>
        <select
          value={filterSource}
          onChange={e => setFilterSource(e.target.value)}
          className="px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
        >
          <option value="">All Sources</option>
          {["school", "teacher", "student", "parent", "internal"].map(s => (
            <option key={s} value={s} className="capitalize">{s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#faf9ff]">
                <th className="text-left px-6 py-3 text-slate-400 uppercase tracking-widest text-[11px] font-bold">Title</th>
                <th className="text-left px-4 py-3 text-slate-400 uppercase tracking-widest text-[11px] font-bold">Requested By</th>
                <th className="text-left px-4 py-3 text-slate-400 uppercase tracking-widest text-[11px] font-bold">Source</th>
                <th className="text-left px-4 py-3 text-slate-400 uppercase tracking-widest text-[11px] font-bold">Priority</th>
                <th className="text-left px-4 py-3 text-slate-400 uppercase tracking-widest text-[11px] font-bold">Votes</th>
                <th className="text-left px-4 py-3 text-slate-400 uppercase tracking-widest text-[11px] font-bold">Status</th>
                <th className="text-left px-4 py-3 text-slate-400 uppercase tracking-widest text-[11px] font-bold">Date</th>
                <th className="text-right px-6 py-3 text-slate-400 uppercase tracking-widest text-[11px] font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5f3fc]">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-3 bg-slate-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center">
                        <MessageSquarePlus size={24} className="text-violet-400" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-700 text-[15px]">No requests found</p>
                        <p className="text-slate-400 text-[13px] font-semibold mt-1">
                          {search || filterStatus || filterPriority || filterSource
                            ? "Try adjusting your filters"
                            : "No feature requests submitted yet"}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-[#faf9ff] transition-colors">
                    <td className="px-6 py-3.5 max-w-[240px]">
                      <p className="text-[13px] font-bold text-slate-900 truncate">{r.title}</p>
                      <p className="text-[11px] font-semibold text-slate-400 truncate mt-0.5">{r.description}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-[12px] font-semibold text-slate-700">{r.requested_by}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`rounded-full text-[11px] font-bold px-2.5 py-0.5 border capitalize ${SOURCE_STYLES[r.source] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}>
                        {r.source}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`rounded-full text-[11px] font-bold px-2.5 py-0.5 border capitalize ${PRIORITY_STYLES[r.priority] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}>
                        {r.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 text-[13px] font-bold text-slate-700">
                        <ThumbsUp size={12} className="text-violet-400" />
                        {r.votes}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`rounded-full text-[11px] font-bold px-2.5 py-0.5 border capitalize ${STATUS_STYLES[r.status] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}>
                        {r.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-[12px] font-semibold text-slate-400">{r.created_at}</span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        onClick={() => openReview(r)}
                        className="flex items-center gap-1.5 px-3 h-8 rounded-lg border border-[#e0daf0] text-[12px] font-bold text-slate-600 hover:text-violet-600 hover:border-violet-300 transition-all ml-auto"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review SlidePanel */}
      <SlidePanel
        open={!!reviewRequest}
        onClose={() => setReviewRequest(null)}
        title="Review Feature Request"
        subtitle={reviewRequest?.title ?? ""}
        width="xl"
      >
        {reviewRequest && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-[#faf9ff] border border-[#e8e4f3] space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`rounded-full text-[11px] font-bold px-2.5 py-0.5 border capitalize ${SOURCE_STYLES[reviewRequest.source] ?? ""}`}>
                  {reviewRequest.source}
                </span>
                <span className={`rounded-full text-[11px] font-bold px-2.5 py-0.5 border capitalize ${PRIORITY_STYLES[reviewRequest.priority] ?? ""}`}>
                  {reviewRequest.priority} priority
                </span>
                <span className="text-[12px] font-semibold text-slate-400 flex items-center gap-1">
                  <ThumbsUp size={11} className="text-violet-400" /> {reviewRequest.votes} votes
                </span>
              </div>
              <p className="text-[13px] font-semibold text-slate-700 leading-relaxed">{reviewRequest.description}</p>
              <div className="text-[12px] font-semibold text-slate-400">
                Requested by <span className="text-slate-600 font-bold">{reviewRequest.requested_by}</span> on {reviewRequest.created_at}
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Update Status</label>
              <select
                value={reviewForm.status}
                onChange={e => setReviewForm(p => ({ ...p, status: e.target.value }))}
                className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
              >
                {["pending", "under_review", "approved", "in_progress", "completed", "rejected"].map(s => (
                  <option key={s} value={s}>{s.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Notes</label>
              <textarea
                value={reviewForm.notes}
                onChange={e => setReviewForm(p => ({ ...p, notes: e.target.value }))}
                rows={4}
                className="w-full px-4 py-2.5 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white resize-none"
                placeholder="Add review notes or feedback..."
              />
            </div>

            <div className="flex gap-3 pt-2 border-t border-[#f0edf8]">
              <button
                onClick={() => setReviewRequest(null)}
                className="flex-1 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-bold text-slate-700 hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleReview}
                disabled={saving}
                className="flex-1 h-10 rounded-xl text-[13px] font-bold text-white disabled:opacity-70 hover:opacity-90 transition-all"
                style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
              >
                {saving ? "Saving..." : "Save Review"}
              </button>
            </div>
          </div>
        )}
      </SlidePanel>

      {/* Submit Request SlidePanel */}
      <SlidePanel
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        title="Submit Feature Request"
        subtitle="Propose a new feature for the platform"
      >
        <div className="space-y-5">
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Title <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={submitForm.title}
              onChange={e => setSubmitForm(p => ({ ...p, title: e.target.value }))}
              className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
              placeholder="Feature title..."
            />
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Description <span className="text-red-500">*</span></label>
            <textarea
              value={submitForm.description}
              onChange={e => setSubmitForm(p => ({ ...p, description: e.target.value }))}
              rows={4}
              className="w-full px-4 py-2.5 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white resize-none"
              placeholder="Describe the feature request in detail..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Source</label>
              <select
                value={submitForm.source}
                onChange={e => setSubmitForm(p => ({ ...p, source: e.target.value }))}
                className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
              >
                {["school", "teacher", "student", "parent", "internal"].map(s => (
                  <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Priority</label>
              <select
                value={submitForm.priority}
                onChange={e => setSubmitForm(p => ({ ...p, priority: e.target.value }))}
                className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
              >
                {["low", "medium", "high", "critical"].map(p => (
                  <option key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Requested By</label>
            <input
              type="text"
              value={submitForm.requested_by}
              onChange={e => setSubmitForm(p => ({ ...p, requested_by: e.target.value }))}
              className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
              placeholder="Name or school..."
            />
          </div>
          <div className="flex gap-3 pt-3 border-t border-[#f0edf8]">
            <button
              onClick={() => setSubmitOpen(false)}
              className="flex-1 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-bold text-slate-700 hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 h-10 rounded-xl text-[13px] font-bold text-white disabled:opacity-70 hover:opacity-90 transition-all"
              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
            >
              {saving ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </div>
      </SlidePanel>
    </div>
  );
}
