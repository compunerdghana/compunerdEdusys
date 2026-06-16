"use client";

import { useState, useEffect } from "react";
import { Megaphone, Plus, Loader2, Bell, Clock, Users } from "lucide-react";
import { SlidePanel } from "@/components/ui/SlidePanel";
import { useToast } from "@/components/ui/Toast";

const typeBadge: Record<string, string> = {
  announcement: "bg-blue-50 text-blue-700 border border-blue-100",
  maintenance: "bg-amber-50 text-amber-700 border border-amber-100",
  update: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  warning: "bg-red-50 text-red-700 border border-red-100",
};

const typeIcon: Record<string, React.ElementType> = {
  announcement: Bell,
  maintenance: Clock,
  update: Megaphone,
  warning: Megaphone,
};

const typeGrad: Record<string, string> = {
  announcement: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
  maintenance: "linear-gradient(135deg, #f59e0b, #d97706)",
  update: "linear-gradient(135deg, #10b981, #059669)",
  warning: "linear-gradient(135deg, #ef4444, #b91c1c)",
};

interface Announcement {
  id: string;
  title: string;
  body: string;
  type: string;
  priority: string;
  target: string;
  expires_at?: string;
  created_at: string;
}

export default function AnnouncementsPage() {
  const { success, error: toastError } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [form, setForm] = useState({
    title: "", body: "", type: "announcement", priority: "normal", target: "all", expires_at: "",
  });

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  useEffect(() => {
    fetch("/api/platform/announcements")
      .then(r => r.json())
      .then(d => setAnnouncements(d.announcements ?? []))
      .catch(() => {})
      .finally(() => setFetching(false));
  }, []);

  async function handleSend() {
    if (!form.title || !form.body) { toastError("Title and body are required."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/platform/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAnnouncements(prev => [data.announcement, ...prev]);
      success("Announcement sent successfully.");
      setPanelOpen(false);
      setForm({ title: "", body: "", type: "announcement", priority: "normal", target: "all", expires_at: "" });
    } catch {
      toastError("Failed to send announcement.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold text-slate-900 leading-tight">Announcements</h1>
          <p className="text-slate-500 text-[13px] font-semibold mt-1">Broadcast messages to schools on the platform.</p>
        </div>
        <button
          onClick={() => setPanelOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-bold transition-all shadow-sm"
          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
        >
          <Plus size={15} />
          New Announcement
        </button>
      </div>

      {/* List */}
      {fetching ? (
        <div className="flex items-center justify-center py-20">
          <div
            className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: "#e0daf0", borderTopColor: "#7c3aed" }}
          />
        </div>
      ) : announcements.length === 0 ? (
        <div className="flex flex-col items-center py-20 gap-4 bg-white rounded-2xl border border-[#e8e4f3] shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center">
            <Megaphone size={26} className="text-violet-400" />
          </div>
          <div className="text-center">
            <p className="text-slate-700 font-bold text-[15px]">No announcements yet.</p>
            <p className="text-slate-400 text-[13px] font-semibold mt-1">Create one to broadcast a message to all schools.</p>
          </div>
          <button
            onClick={() => setPanelOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-bold"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
          >
            <Plus size={14} />
            Create First Announcement
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map(ann => {
            const IconComp = typeIcon[ann.type] ?? Bell;
            return (
              <div key={ann.id} className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] overflow-hidden">
                <div className="flex items-start gap-4 p-5">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: typeGrad[ann.type] ?? "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
                  >
                    <IconComp size={16} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="font-extrabold text-slate-900 text-[15px] leading-tight">{ann.title}</h3>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${typeBadge[ann.type] ?? "bg-slate-50 text-slate-500"}`}>
                          {ann.type}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-100">
                          <Users size={9} />
                          {ann.target}
                        </span>
                      </div>
                    </div>
                    <p className="text-slate-500 text-[13px] font-semibold mt-1.5 line-clamp-2">{ann.body}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 px-5 py-3 bg-[#faf9ff] border-t border-[#f0edf8]">
                  <span className="text-[11px] font-semibold text-slate-400">
                    {new Date(ann.created_at).toLocaleString("en-GH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {ann.expires_at && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-600">
                      <Clock size={10} />
                      Expires {new Date(ann.expires_at).toLocaleDateString()}
                    </span>
                  )}
                  <span className="text-[11px] font-bold text-slate-400 capitalize ml-auto">Priority: {ann.priority}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <SlidePanel open={panelOpen} onClose={() => setPanelOpen(false)} title="New Announcement" subtitle="Broadcast a message to schools on the platform">
        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Title <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.title}
              onChange={e => set("title", e.target.value)}
              placeholder="e.g. Scheduled Maintenance on Saturday"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Body <span className="text-red-500">*</span></label>
            <textarea
              value={form.body}
              onChange={e => set("body", e.target.value)}
              placeholder="Full message content to display to school administrators…"
              rows={5}
              className="w-full px-4 py-3 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all resize-none bg-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Type</label>
              <select value={form.type} onChange={e => set("type", e.target.value)} className={inputClass}>
                {["announcement", "maintenance", "update", "warning"].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Priority</label>
              <select value={form.priority} onChange={e => set("priority", e.target.value)} className={inputClass}>
                {["low", "normal", "high", "urgent"].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Target Audience</label>
            <select value={form.target} onChange={e => set("target", e.target.value)} className={inputClass}>
              <option value="all">All Schools</option>
              <option value="active">Active Schools Only</option>
              <option value="trial">Trial Schools Only</option>
              <option value="expired">Expired Schools</option>
              <option value="specific">Specific School</option>
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Expires At (optional)</label>
            <input
              type="datetime-local"
              value={form.expires_at}
              onChange={e => set("expires_at", e.target.value)}
              className={inputClass}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-[13px] disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
          >
            {loading ? <><Loader2 size={14} className="animate-spin" /> Sending…</> : <><Megaphone size={14} /> Send Announcement</>}
          </button>
        </div>
      </SlidePanel>
    </div>
  );
}
