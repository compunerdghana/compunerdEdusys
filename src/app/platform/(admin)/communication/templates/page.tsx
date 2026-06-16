"use client";

import { useState, useEffect, useCallback } from "react";
import { FileText, Plus, Loader2, Pencil, Trash2, Copy, RefreshCw, Tag } from "lucide-react";
import { SlidePanel } from "@/components/ui/SlidePanel";
import { useToast } from "@/components/ui/Toast";

interface Template {
  id: string;
  name: string;
  category: string;
  channel: string;
  subject?: string;
  body: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
}

const categoryColor: Record<string, string> = {
  subscription: "#ef4444", onboarding: "#22c55e", payment: "#3b82f6",
  maintenance: "#f59e0b", feature: "#8b5cf6", general: "#64748b",
};

const channelColor: Record<string, string> = {
  whatsapp: "#22c55e", sms: "#3b82f6", email: "#f59e0b", notification: "#8b5cf6", all: "#6366f1",
};

const inputCls = "w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white";

export default function TemplatesPage() {
  const { success, error: toastError } = useToast();
  const [panelOpen, setPanelOpen] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [filterCat, setFilterCat] = useState("all");
  const [form, setForm] = useState({
    name: "", category: "general", channel: "all", subject: "", body: "", variables: "",
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const load = useCallback(async () => {
    setFetching(true);
    const data = await fetch("/api/platform/communication/templates").then(r => r.json()).catch(() => ({ templates: [] }));
    setTemplates(data.templates ?? []);
    setFetching(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filterCat === "all" ? templates : templates.filter(t => t.category === filterCat);
  const previewTemplate = templates.find(t => t.id === previewId);

  async function handleCreate() {
    if (!form.name || !form.body) { toastError("Name and body are required."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/platform/communication/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          variables: form.variables.split(",").map(v => v.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      success("Template created.");
      setPanelOpen(false);
      setForm({ name: "", category: "general", channel: "all", subject: "", body: "", variables: "" });
      load();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Failed to create template.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteTemplate(id: string) {
    if (!confirm("Delete this template?")) return;
    await fetch(`/api/platform/communication/templates/${id}`, { method: "DELETE" });
    load();
  }

  function copyBody(body: string) {
    navigator.clipboard.writeText(body);
    success("Message body copied to clipboard.");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold text-slate-900 leading-tight flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#6366f1,#4338ca)" }}>
              <FileText size={16} className="text-white" />
            </div>
            Message Templates
          </h1>
          <p className="text-slate-500 text-[13px] font-semibold mt-1 ml-12">Reusable templates for all communication channels.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-bold border border-[#e0daf0] text-slate-600 hover:bg-slate-50 transition-all">
            <RefreshCw size={13} className={fetching ? "animate-spin" : ""} />
          </button>
          <button onClick={() => setPanelOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-bold shadow-sm"
            style={{ background: "linear-gradient(135deg,#6366f1,#4338ca)" }}>
            <Plus size={14} /> New Template
          </button>
        </div>
      </div>

      {/* Category filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {["all", "subscription", "onboarding", "payment", "maintenance", "feature", "general"].map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            className="px-3.5 py-2 rounded-xl text-[12px] font-bold transition-all capitalize"
            style={filterCat === cat
              ? { background: `${categoryColor[cat] ?? "#6366f1"}20`, color: categoryColor[cat] ?? "#6366f1" }
              : { background: "#faf9ff", color: "#94a3b8", border: "1px solid #e0daf0" }}
          >
            {cat === "all" ? "All Categories" : cat}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      {fetching ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#e0daf0", borderTopColor: "#6366f1" }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-20 gap-4 bg-white rounded-2xl border border-[#e8e4f3] shadow-sm">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "rgba(99,102,241,0.1)" }}>
            <FileText size={26} style={{ color: "#6366f1" }} />
          </div>
          <p className="text-slate-700 font-bold text-[15px]">No templates in this category.</p>
          <button onClick={() => setPanelOpen(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-bold" style={{ background: "linear-gradient(135deg,#6366f1,#4338ca)" }}>
            <Plus size={14} /> Create Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(t => (
            <div key={t.id} className="bg-white rounded-2xl border border-[#e8e4f3] shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-all">
              <div className="p-5 flex-1">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${categoryColor[t.category] ?? "#6366f1"}20` }}>
                    <FileText size={14} style={{ color: categoryColor[t.category] ?? "#6366f1" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-extrabold text-slate-900 text-[13px] leading-tight">{t.name}</h3>
                    {t.subject && <p className="text-[11px] text-slate-500 font-semibold truncate mt-0.5">Subject: {t.subject}</p>}
                  </div>
                </div>
                <p className="text-slate-500 text-[12px] font-semibold line-clamp-4 leading-relaxed">{t.body}</p>
                {t.variables.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap mt-3">
                    {t.variables.map(v => (
                      <span key={v} className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-100">{`{${v}}`}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="px-5 py-3 border-t border-[#f0edf8] flex items-center gap-2 bg-[#faf9ff]">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full"
                  style={{ background: `${channelColor[t.channel]}20`, color: channelColor[t.channel] ?? "#6366f1" }}>
                  {t.channel}
                </span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full capitalize"
                  style={{ background: `${categoryColor[t.category] ?? "#6366f1"}15`, color: categoryColor[t.category] ?? "#6366f1" }}>
                  {t.category}
                </span>
                <div className="ml-auto flex items-center gap-1">
                  <button onClick={() => copyBody(t.body)} title="Copy body" className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-all">
                    <Copy size={12} />
                  </button>
                  <button onClick={() => setPreviewId(t.id)} title="Preview" className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
                    <FileText size={12} />
                  </button>
                  <button onClick={() => deleteTemplate(t.id)} title="Delete" className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Panel */}
      <SlidePanel open={panelOpen} onClose={() => setPanelOpen(false)} title="New Message Template" subtitle="Create reusable templates for any channel" width="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Template Name <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Subscription Expiry Reminder (7 Days)" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Category</label>
              <select value={form.category} onChange={e => set("category", e.target.value)} className={inputCls}>
                {["subscription", "onboarding", "payment", "maintenance", "feature", "general"].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Channel</label>
              <select value={form.channel} onChange={e => set("channel", e.target.value)} className={inputCls}>
                {["all", "whatsapp", "sms", "email", "notification"].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          {(form.channel === "email" || form.channel === "all") && (
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Email Subject</label>
              <input type="text" value={form.subject} onChange={e => set("subject", e.target.value)} placeholder="e.g. Your Subscription Expires Soon" className={inputCls} />
            </div>
          )}
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Message Body <span className="text-red-500">*</span></label>
            <textarea value={form.body} onChange={e => set("body", e.target.value)}
              placeholder="Dear {school_name},&#10;&#10;Your message here…&#10;&#10;Compunerd Ghana Team"
              rows={8}
              className="w-full px-4 py-3 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all resize-none bg-white font-mono" />
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5 flex items-center gap-1.5"><Tag size={13} /> Variables (comma-separated)</label>
            <input type="text" value={form.variables} onChange={e => set("variables", e.target.value)}
              placeholder="school_name, expiry_date, amount" className={inputCls} />
            <p className="text-[10px] text-slate-400 font-semibold mt-1">Use {"{variable}"} syntax in your message body</p>
          </div>
          <button onClick={handleCreate} disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-[13px] disabled:opacity-60"
            style={{ background: "linear-gradient(135deg,#6366f1,#4338ca)" }}>
            {loading ? <><Loader2 size={14} className="animate-spin" /> Creating…</> : <><FileText size={14} /> Create Template</>}
          </button>
        </div>
      </SlidePanel>

      {/* Preview Panel */}
      <SlidePanel open={!!previewId} onClose={() => setPreviewId(null)} title="Template Preview" subtitle={previewTemplate?.name} width="lg">
        {previewTemplate && (
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <span className="text-[11px] font-bold px-3 py-1 rounded-full" style={{ background: `${channelColor[previewTemplate.channel]}20`, color: channelColor[previewTemplate.channel] }}>
                {previewTemplate.channel}
              </span>
              <span className="text-[11px] font-bold px-3 py-1 rounded-full capitalize" style={{ background: `${categoryColor[previewTemplate.category] ?? "#6366f1"}15`, color: categoryColor[previewTemplate.category] ?? "#6366f1" }}>
                {previewTemplate.category}
              </span>
            </div>
            {previewTemplate.subject && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                <p className="text-[11px] font-bold text-amber-700 mb-0.5">Subject</p>
                <p className="text-[13px] font-semibold text-slate-800">{previewTemplate.subject}</p>
              </div>
            )}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <pre className="text-[12px] font-semibold text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">{previewTemplate.body}</pre>
            </div>
            {previewTemplate.variables.length > 0 && (
              <div>
                <p className="text-[12px] font-bold text-slate-600 mb-2">Template Variables</p>
                <div className="flex gap-1.5 flex-wrap">
                  {previewTemplate.variables.map(v => (
                    <span key={v} className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-100">{`{${v}}`}</span>
                  ))}
                </div>
              </div>
            )}
            <button onClick={() => copyBody(previewTemplate.body)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#e0daf0] text-slate-700 font-bold text-[13px] hover:bg-slate-50 transition-all">
              <Copy size={13} /> Copy Message Body
            </button>
          </div>
        )}
      </SlidePanel>
    </div>
  );
}
