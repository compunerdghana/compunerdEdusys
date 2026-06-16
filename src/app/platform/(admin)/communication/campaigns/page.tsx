"use client";

import { useState, useEffect, useCallback } from "react";
import { Target, Plus, Loader2, Play, Pause, Archive, RefreshCw, CheckCircle2, Clock, XCircle } from "lucide-react";
import { SlidePanel } from "@/components/ui/SlidePanel";
import { useToast } from "@/components/ui/Toast";

interface Campaign {
  id: string;
  name: string;
  description?: string;
  type: string;
  channels: string[];
  target_audience: string;
  status: string;
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  failed_count: number;
  created_at: string;
  scheduled_at?: string;
}

const statusStyle: Record<string, { badge: string; icon: React.ElementType; color: string }> = {
  draft:     { badge: "bg-slate-50 text-slate-600 border border-slate-200",      icon: Clock,        color: "#94a3b8" },
  scheduled: { badge: "bg-blue-50 text-blue-700 border border-blue-100",         icon: Clock,        color: "#3b82f6" },
  active:    { badge: "bg-emerald-50 text-emerald-700 border border-emerald-100", icon: Play,         color: "#22c55e" },
  paused:    { badge: "bg-amber-50 text-amber-700 border border-amber-100",       icon: Pause,        color: "#f59e0b" },
  completed: { badge: "bg-violet-50 text-violet-700 border border-violet-100",    icon: CheckCircle2, color: "#7c3aed" },
  archived:  { badge: "bg-slate-100 text-slate-400 border border-slate-200",      icon: Archive,      color: "#cbd5e1" },
};

const typeLabel: Record<string, string> = {
  trial_conversion: "Trial Conversion",
  renewal: "Subscription Renewal",
  product_update: "Product Update",
  engagement: "School Engagement",
  custom: "Custom",
};

const channelColor: Record<string, string> = {
  whatsapp: "#22c55e", sms: "#3b82f6", email: "#f59e0b", notification: "#8b5cf6",
};

const inputCls = "w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white";

export default function CampaignsPage() {
  const { success, error: toastError } = useToast();
  const [panelOpen, setPanelOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [launching, setLaunching] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", description: "", type: "custom", channels: [] as string[],
    target_audience: "all", message_body: "", subject: "", scheduled_at: "",
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const toggleChannel = (ch: string) => setForm(f => ({
    ...f,
    channels: f.channels.includes(ch) ? f.channels.filter(c => c !== ch) : [...f.channels, ch],
  }));

  const load = useCallback(async () => {
    setFetching(true);
    const data = await fetch("/api/platform/communication/campaigns").then(r => r.json()).catch(() => ({ campaigns: [] }));
    setCampaigns(data.campaigns ?? []);
    setFetching(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    if (!form.name || !form.message_body) { toastError("Name and message body are required."); return; }
    if (form.channels.length === 0) { toastError("Select at least one channel."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/platform/communication/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      success("Campaign created successfully.");
      setPanelOpen(false);
      setForm({ name: "", description: "", type: "custom", channels: [], target_audience: "all", message_body: "", subject: "", scheduled_at: "" });
      load();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Failed to create campaign.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLaunch(id: string) {
    setLaunching(id);
    try {
      const res = await fetch(`/api/platform/communication/campaigns/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "launch" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      success(`Campaign launched! Sent: ${data.sent}, Failed: ${data.failed}`);
      load();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Failed to launch campaign.");
    } finally {
      setLaunching(null);
    }
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/platform/communication/campaigns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold text-slate-900 leading-tight flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#ef4444,#b91c1c)" }}>
              <Target size={16} className="text-white" />
            </div>
            Communication Campaigns
          </h1>
          <p className="text-slate-500 text-[13px] font-semibold mt-1 ml-12">Create and launch targeted communication campaigns.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-bold border border-[#e0daf0] text-slate-600 hover:bg-slate-50 transition-all">
            <RefreshCw size={13} className={fetching ? "animate-spin" : ""} />
          </button>
          <button onClick={() => setPanelOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-bold shadow-sm"
            style={{ background: "linear-gradient(135deg,#ef4444,#b91c1c)" }}>
            <Plus size={14} />
            New Campaign
          </button>
        </div>
      </div>

      {/* Campaign list */}
      {fetching ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#e0daf0", borderTopColor: "#ef4444" }} />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center py-20 gap-4 bg-white rounded-2xl border border-[#e8e4f3] shadow-sm">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)" }}>
            <Target size={26} style={{ color: "#ef4444" }} />
          </div>
          <p className="text-slate-700 font-bold text-[15px]">No campaigns yet.</p>
          <p className="text-slate-400 text-[13px] font-semibold">Create your first campaign to reach schools at scale.</p>
          <button onClick={() => setPanelOpen(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-bold" style={{ background: "linear-gradient(135deg,#ef4444,#b91c1c)" }}>
            <Plus size={14} /> Create Campaign
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map(camp => {
            const st = statusStyle[camp.status] ?? statusStyle.draft;
            const StatusIcon = st.icon;
            const rate = camp.total_recipients > 0 ? Math.round((camp.sent_count / camp.total_recipients) * 100) : 0;
            return (
              <div key={camp.id} className="bg-white rounded-2xl border border-[#e8e4f3] shadow-sm overflow-hidden">
                <div className="flex items-start gap-5 p-5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${st.color}20` }}>
                    <StatusIcon size={16} style={{ color: st.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-4 justify-between">
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-[15px]">{camp.name}</h3>
                        {camp.description && <p className="text-slate-500 text-[12px] font-semibold mt-0.5">{camp.description}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${st.badge}`}>{camp.status}</span>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase px-2 py-1 rounded-full border border-slate-100 bg-slate-50">{typeLabel[camp.type] ?? camp.type}</span>
                      </div>
                    </div>

                    {/* Channel pills */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {camp.channels.map(ch => (
                        <span key={ch} className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full"
                          style={{ background: `${channelColor[ch]}20`, color: channelColor[ch] }}>
                          {ch}
                        </span>
                      ))}
                      <span className="text-[10px] text-slate-400 font-semibold ml-1">→ {camp.target_audience} schools</span>
                    </div>

                    {/* Stats bar */}
                    {camp.total_recipients > 0 && (
                      <div className="mt-3">
                        <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-500 mb-1">
                          <span>{camp.sent_count} sent</span>
                          <span>{camp.delivered_count} delivered</span>
                          <span className="text-red-500">{camp.failed_count} failed</span>
                          <span className="ml-auto font-bold text-slate-700">{rate}% success</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${rate}%`, background: "linear-gradient(90deg,#22c55e,#16a34a)" }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 px-5 py-3 bg-[#faf9ff] border-t border-[#f0edf8]">
                  <span className="text-[11px] text-slate-400 font-semibold">
                    Created {new Date(camp.created_at).toLocaleDateString("en-GH")}
                  </span>
                  <div className="ml-auto flex items-center gap-2">
                    {camp.status === "draft" && (
                      <button
                        onClick={() => handleLaunch(camp.id)}
                        disabled={launching === camp.id}
                        className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg text-white transition-all disabled:opacity-60"
                        style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)" }}
                      >
                        {launching === camp.id ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
                        Launch
                      </button>
                    )}
                    {camp.status === "active" && (
                      <button onClick={() => updateStatus(camp.id, "paused")}
                        className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all">
                        <Pause size={11} /> Pause
                      </button>
                    )}
                    {camp.status === "paused" && (
                      <button onClick={() => handleLaunch(camp.id)}
                        className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg text-white" style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)" }}>
                        <Play size={11} /> Resume
                      </button>
                    )}
                    {!["archived"].includes(camp.status) && (
                      <button onClick={() => updateStatus(camp.id, "archived")}
                        className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all">
                        <Archive size={11} /> Archive
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Panel */}
      <SlidePanel open={panelOpen} onClose={() => setPanelOpen(false)} title="New Campaign" subtitle="Define and launch a communication campaign" width="xl">
        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Campaign Name <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Q3 Subscription Renewal Drive" className={inputCls} />
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Description</label>
            <input type="text" value={form.description} onChange={e => set("description", e.target.value)} placeholder="Brief description of this campaign" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Campaign Type</label>
              <select value={form.type} onChange={e => set("type", e.target.value)} className={inputCls}>
                <option value="trial_conversion">Trial Conversion</option>
                <option value="renewal">Subscription Renewal</option>
                <option value="product_update">Product Update</option>
                <option value="engagement">School Engagement</option>
                <option value="custom">Custom</option>
              </select>
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
          </div>

          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-2">Channels <span className="text-red-500">*</span></label>
            <div className="flex gap-2 flex-wrap">
              {[
                { key: "whatsapp", label: "WhatsApp", color: "#22c55e" },
                { key: "sms", label: "SMS", color: "#3b82f6" },
                { key: "email", label: "Email", color: "#f59e0b" },
                { key: "notification", label: "Notification", color: "#8b5cf6" },
              ].map(ch => (
                <button
                  key={ch.key}
                  type="button"
                  onClick={() => toggleChannel(ch.key)}
                  className="px-3.5 py-2 rounded-xl text-[12px] font-bold border transition-all"
                  style={form.channels.includes(ch.key)
                    ? { background: `${ch.color}20`, color: ch.color, borderColor: ch.color }
                    : { background: "#faf9ff", color: "#94a3b8", borderColor: "#e0daf0" }}
                >
                  {ch.label}
                </button>
              ))}
            </div>
          </div>

          {form.channels.includes("email") && (
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Email Subject</label>
              <input type="text" value={form.subject} onChange={e => set("subject", e.target.value)} placeholder="e.g. Your EduSys subscription is expiring soon" className={inputCls} />
            </div>
          )}

          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Message Body <span className="text-red-500">*</span></label>
            <textarea value={form.message_body} onChange={e => set("message_body", e.target.value)}
              placeholder="Campaign message. Use {school_name}, {expiry_date} etc. for personalization…"
              rows={6}
              className="w-full px-4 py-3 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all resize-none bg-white"
            />
          </div>

          <button onClick={handleCreate} disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-[13px] disabled:opacity-60"
            style={{ background: "linear-gradient(135deg,#ef4444,#b91c1c)" }}>
            {loading ? <><Loader2 size={14} className="animate-spin" /> Creating…</> : <><Target size={14} /> Create Campaign</>}
          </button>
        </div>
      </SlidePanel>
    </div>
  );
}
