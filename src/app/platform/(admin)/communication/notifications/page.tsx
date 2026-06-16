"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, Plus, Loader2, X, CheckCircle2, RefreshCw } from "lucide-react";
import { SlidePanel } from "@/components/ui/SlidePanel";
import { useToast } from "@/components/ui/Toast";

interface Notification {
  id: string;
  title: string;
  body?: string;
  type: string;
  category: string;
  target_audience: string;
  is_active: boolean;
  expires_at?: string;
  created_at: string;
}

const typeStyle: Record<string, { badge: string; dot: string }> = {
  info:    { badge: "bg-blue-50 text-blue-700 border border-blue-100",    dot: "#3b82f6" },
  success: { badge: "bg-emerald-50 text-emerald-700 border border-emerald-100", dot: "#22c55e" },
  warning: { badge: "bg-amber-50 text-amber-700 border border-amber-100", dot: "#f59e0b" },
  danger:  { badge: "bg-red-50 text-red-700 border border-red-100",       dot: "#ef4444" },
  urgent:  { badge: "bg-purple-50 text-purple-700 border border-purple-100", dot: "#7c3aed" },
};

const inputCls = "w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white";

const notifExamples = [
  { label: "Subscription Expiring", type: "warning", category: "subscription" },
  { label: "New Feature Released", type: "success", category: "feature" },
  { label: "Maintenance Scheduled", type: "info", category: "maintenance" },
  { label: "Platform Update Available", type: "info", category: "update" },
];

export default function NotificationsPage() {
  const { success, error: toastError } = useToast();
  const [panelOpen, setPanelOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [form, setForm] = useState({
    title: "", body: "", type: "info", category: "general", target_audience: "all", link: "", expires_at: "",
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const load = useCallback(async () => {
    setFetching(true);
    const data = await fetch("/api/platform/communication/notifications").then(r => r.json()).catch(() => ({ notifications: [] }));
    setNotifications(data.notifications ?? []);
    setFetching(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    if (!form.title) { toastError("Title is required."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/platform/communication/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      success("Platform notification created.");
      setPanelOpen(false);
      setForm({ title: "", body: "", type: "info", category: "general", target_audience: "all", link: "", expires_at: "" });
      load();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Failed to create notification.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(id: string, is_active: boolean) {
    await fetch("/api/platform/communication/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_active: !is_active }),
    });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_active: !is_active } : n));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold text-slate-900 leading-tight flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#8b5cf6,#6d28d9)" }}>
              <Bell size={16} className="text-white" />
            </div>
            Platform Notifications
          </h1>
          <p className="text-slate-500 text-[13px] font-semibold mt-1 ml-12">In-app notifications displayed on school dashboards.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-bold border border-[#e0daf0] text-slate-600 hover:bg-slate-50 transition-all">
            <RefreshCw size={13} className={fetching ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => setPanelOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-bold transition-all shadow-sm"
            style={{ background: "linear-gradient(135deg,#8b5cf6,#6d28d9)" }}
          >
            <Plus size={14} />
            New Notification
          </button>
        </div>
      </div>

      {/* Quick examples */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {notifExamples.map((ex) => {
          const style = typeStyle[ex.type];
          return (
            <button
              key={ex.label}
              onClick={() => { setForm(f => ({ ...f, title: ex.label, type: ex.type, category: ex.category })); setPanelOpen(true); }}
              className="flex items-center gap-2.5 px-4 py-3 bg-white rounded-xl border border-[#e8e4f3] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-left"
            >
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: style?.dot ?? "#6366f1" }} />
              <span className="text-[12px] font-bold text-slate-700">{ex.label}</span>
            </button>
          );
        })}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {fetching ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#e0daf0", borderTopColor: "#8b5cf6" }} />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3 bg-white rounded-2xl border border-[#e8e4f3] shadow-sm">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "rgba(139,92,246,0.1)" }}>
              <Bell size={20} style={{ color: "#8b5cf6" }} />
            </div>
            <p className="text-slate-500 font-semibold text-[13px]">No platform notifications yet.</p>
          </div>
        ) : (
          notifications.map(n => {
            const style = typeStyle[n.type] ?? typeStyle.info;
            return (
              <div key={n.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${n.is_active ? "border-[#e8e4f3]" : "border-slate-200 opacity-60"}`}>
                <div className="flex items-start gap-4 p-5">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0 mt-1.5" style={{ background: style.dot }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3 justify-between">
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-[14px]">{n.title}</h3>
                        {n.body && <p className="text-slate-500 text-[12px] font-semibold mt-1">{n.body}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${style.badge}`}>{n.type}</span>
                        <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-100">{n.target_audience}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 px-5 py-3 bg-[#faf9ff] border-t border-[#f0edf8]">
                  <span className="text-[11px] text-slate-400 font-semibold">
                    {new Date(n.created_at).toLocaleString("en-GH", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                  {n.expires_at && (
                    <span className="text-[11px] font-semibold text-amber-600">Expires {new Date(n.expires_at).toLocaleDateString()}</span>
                  )}
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      onClick={() => toggleActive(n.id, n.is_active)}
                      className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all ${n.is_active ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                    >
                      {n.is_active ? <><CheckCircle2 size={11} /> Active</> : <><X size={11} /> Inactive</>}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Panel */}
      <SlidePanel open={panelOpen} onClose={() => setPanelOpen(false)} title="New Platform Notification" subtitle="Displayed on school dashboards" width="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Title <span className="text-red-500">*</span></label>
            <input type="text" value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Scheduled Maintenance Tonight" className={inputCls} />
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Message Body</label>
            <textarea value={form.body} onChange={e => set("body", e.target.value)} placeholder="Optional additional details…" rows={3}
              className="w-full px-4 py-3 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all resize-none bg-white" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Type</label>
              <select value={form.type} onChange={e => set("type", e.target.value)} className={inputCls}>
                {["info", "success", "warning", "danger", "urgent"].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Category</label>
              <select value={form.category} onChange={e => set("category", e.target.value)} className={inputCls}>
                {["general", "maintenance", "feature", "subscription", "update", "support"].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Target Audience</label>
            <select value={form.target_audience} onChange={e => set("target_audience", e.target.value)} className={inputCls}>
              <option value="all">All Schools</option>
              <option value="active">Active Schools</option>
              <option value="trial">Trial Schools</option>
              <option value="expiring">Expiring Schools</option>
              <option value="expired">Expired Schools</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Link (optional)</label>
              <input type="url" value={form.link} onChange={e => set("link", e.target.value)} placeholder="https://…" className={inputCls} />
            </div>
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Expires At</label>
              <input type="datetime-local" value={form.expires_at} onChange={e => set("expires_at", e.target.value)} className={inputCls} />
            </div>
          </div>
          <button onClick={handleCreate} disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-[13px] disabled:opacity-60"
            style={{ background: "linear-gradient(135deg,#8b5cf6,#6d28d9)" }}>
            {loading ? <><Loader2 size={14} className="animate-spin" /> Creating…</> : <><Bell size={14} /> Create Notification</>}
          </button>
        </div>
      </SlidePanel>
    </div>
  );
}
