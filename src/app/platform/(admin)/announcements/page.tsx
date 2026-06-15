"use client";

import { useState, useEffect } from "react";
import { Megaphone, Plus, Loader2, Bell } from "lucide-react";
import { SlidePanel } from "@/components/ui/SlidePanel";
import { useToast } from "@/components/ui/Toast";

const PLATFORM_GRADIENT = "linear-gradient(135deg, #1a0533, #2d1b69, #6b1f8a)";

const typeBadge: Record<string, string> = {
  announcement: "bg-blue-100 text-blue-700",
  maintenance: "bg-amber-100 text-amber-700",
  update: "bg-emerald-100 text-emerald-700",
  warning: "bg-red-100 text-red-700",
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

  return (
    <div className="space-y-6">
      <div className="rounded-2xl px-8 py-6 text-white flex items-center justify-between" style={{ background: PLATFORM_GRADIENT }}>
        <div>
          <h1 className="text-2xl font-extrabold">Announcements</h1>
          <p className="text-white/60 font-semibold mt-1">Broadcast messages to schools on the platform.</p>
        </div>
        <button onClick={() => setPanelOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-sm transition-all border border-white/20">
          <Plus size={16} />
          New Announcement
        </button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {fetching ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-purple-300 border-t-purple-700 rounded-full animate-spin" />
          </div>
        ) : announcements.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3 bg-white rounded-2xl border border-slate-100">
            <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center">
              <Megaphone size={24} className="text-purple-700" />
            </div>
            <p className="text-slate-500 font-bold">No announcements yet.</p>
            <button onClick={() => setPanelOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold"
              style={{ background: PLATFORM_GRADIENT }}>
              <Plus size={14} />
              Create First Announcement
            </button>
          </div>
        ) : (
          announcements.map(ann => (
            <div key={ann.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Bell size={17} className="text-purple-700" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-slate-900">{ann.title}</h3>
                    <p className="text-slate-500 text-sm font-semibold mt-1 line-clamp-2">{ann.body}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${typeBadge[ann.type] ?? "bg-slate-100 text-slate-500"}`}>
                    {ann.type}
                  </span>
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">
                    {ann.target}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-50">
                <span className="text-xs font-semibold text-slate-400">
                  {new Date(ann.created_at).toLocaleString("en-GH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
                {ann.expires_at && (
                  <span className="text-xs font-semibold text-amber-600">
                    Expires {new Date(ann.expires_at).toLocaleDateString()}
                  </span>
                )}
                <span className="text-xs font-bold text-slate-400 capitalize ml-auto">Priority: {ann.priority}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <SlidePanel open={panelOpen} onClose={() => setPanelOpen(false)} title="New Announcement" subtitle="Broadcast a message to schools on the platform">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Title <span className="text-red-500">*</span></label>
            <input type="text" value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Scheduled Maintenance on Saturday"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold outline-none focus:border-purple-400 transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Body <span className="text-red-500">*</span></label>
            <textarea value={form.body} onChange={e => set("body", e.target.value)}
              placeholder="Full message content to display to school administrators…" rows={5}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold outline-none focus:border-purple-400 resize-none transition-colors" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Type</label>
              <select value={form.type} onChange={e => set("type", e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold outline-none focus:border-purple-400 bg-white">
                {["announcement", "maintenance", "update", "warning"].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Priority</label>
              <select value={form.priority} onChange={e => set("priority", e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold outline-none focus:border-purple-400 bg-white">
                {["low", "normal", "high", "urgent"].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Target Audience</label>
            <select value={form.target} onChange={e => set("target", e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold outline-none focus:border-purple-400 bg-white">
              <option value="all">All Schools</option>
              <option value="active">Active Schools Only</option>
              <option value="trial">Trial Schools Only</option>
              <option value="expired">Expired Schools</option>
              <option value="specific">Specific School</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Expires At (optional)</label>
            <input type="datetime-local" value={form.expires_at} onChange={e => set("expires_at", e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold outline-none focus:border-purple-400 transition-colors" />
          </div>
          <button onClick={handleSend} disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-sm disabled:opacity-60"
            style={{ background: PLATFORM_GRADIENT }}>
            {loading ? <><Loader2 size={15} className="animate-spin" /> Sending…</> : <><Megaphone size={15} /> Send Announcement</>}
          </button>
        </div>
      </SlidePanel>
    </div>
  );
}
