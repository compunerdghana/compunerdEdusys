"use client";

import { useState, useMemo } from "react";
import { Plus, FileText, AlertTriangle, Edit2, Trash2, MessageCircle, Smartphone, Mail, Bell, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { SlidePanel } from "@/components/ui/SlidePanel";
import { useToast } from "@/components/ui/Toast";

interface Template {
  id: string;
  name: string;
  channel: string;
  category: string;
  subject?: string;
  body: string;
  variables: string[];
  is_system: boolean;
  is_active: boolean;
  created_at: string;
}

interface Props {
  schoolId: string;
  userId: string;
  initialTemplates: Template[];
  tableNotReady: boolean;
}

const CHANNEL_ICON: Record<string, React.ReactNode> = {
  whatsapp: <MessageCircle size={14} className="text-[#25D366]" />,
  sms: <Smartphone size={14} className="text-blue-500" />,
  email: <Mail size={14} className="text-amber-500" />,
  notification: <Bell size={14} className="text-purple-500" />,
};

const CHANNEL_COLORS: Record<string, string> = {
  whatsapp: "#25D366",
  sms: "#3b82f6",
  email: "#f59e0b",
  notification: "#92278F",
};

export function TemplatesClient({ schoolId, userId, initialTemplates, tableNotReady }: Props) {
  const { success, error: toastError } = useToast();
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [preview, setPreview] = useState<Template | null>(null);
  const [channelFilter, setChannelFilter] = useState("all");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ name: "", channel: "whatsapp", category: "general", subject: "", body: "" });

  const filtered = useMemo(() =>
    templates.filter((t) => channelFilter === "all" || t.channel === channelFilter),
    [templates, channelFilter]);

  function openNew() {
    setEditing(null);
    setForm({ name: "", channel: "whatsapp", category: "general", subject: "", body: "" });
    setPanelOpen(true);
  }

  function openEdit(t: Template) {
    if (t.is_system) return;
    setEditing(t);
    setForm({ name: t.name, channel: t.channel, category: t.category, subject: t.subject ?? "", body: t.body });
    setPanelOpen(true);
  }

  async function save() {
    if (!form.name || !form.body) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/communication/templates", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editing ? { id: editing.id } : { school_id: schoolId }),
          name: form.name, channel: form.channel, category: form.category,
          subject: form.subject || null, message: form.body,
          created_by: userId,
        }),
      });
      const json = await res.json();
      if (json.error) {
        toastError(json.error.includes("does not exist") ? "Template tables not set up yet. Run the setup migration first." : `Error: ${json.error}`);
      } else if (json.data) {
        if (editing) {
          setTemplates((prev) => prev.map((t) => t.id === editing.id ? { ...t, ...json.data } : t));
        } else {
          setTemplates((prev) => [json.data, ...prev]);
        }
        setPanelOpen(false);
        success(editing ? "Template updated!" : "Template created!");
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteTemplate(id: string) {
    if (!confirm("Delete this template?")) return;
    await fetch("/api/admin/communication/templates", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
    });
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }

  const extractVars = (body: string) => {
    const matches = body.match(/\{(\w+)\}/g) ?? [];
    return [...new Set(matches)];
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[1100px] mx-auto">
      <Link href="/communications/dashboard" className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-strong)] transition-colors w-fit">
        <ArrowLeft size={14} /> Back to Communications
      </Link>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold text-[var(--text-strong)]">Message Templates</h1>
          <p className="text-[14px] text-[var(--text-muted)] mt-0.5">{templates.length} templates available across all channels</p>
        </div>
        <button onClick={openNew}
          className="h-10 px-5 rounded-xl text-[13px] font-bold text-white flex items-center gap-2 shadow"
          style={{ background: "linear-gradient(135deg, #262262, #92278F)" }}>
          <Plus size={15} /> New Template
        </button>
      </div>

      {tableNotReady && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-[13px] text-amber-800 font-medium">Run <code className="bg-amber-100 px-1 rounded font-mono">communication_module.sql</code> to enable templates.</p>
        </div>
      )}

      {/* Channel filter */}
      <div className="flex items-center gap-1 p-1 bg-[var(--neutral-100)] rounded-xl w-fit">
        {["all", "whatsapp", "sms", "email", "notification"].map((ch) => (
          <button key={ch} onClick={() => setChannelFilter(ch)}
            className={cn("px-3 py-1.5 rounded-lg text-[12px] font-semibold capitalize transition-all",
              channelFilter === ch ? "bg-white shadow text-[var(--text-strong)]" : "text-[var(--text-muted)] hover:text-[var(--text-strong)]")}>
            {ch === "all" ? "All" : ch === "notification" ? "In-App" : ch.charAt(0).toUpperCase() + ch.slice(1)}
          </button>
        ))}
      </div>

      {/* Templates grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((t) => (
          <div key={t.id} className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-sm hover:shadow transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                {CHANNEL_ICON[t.channel] ?? <FileText size={14} className="text-[var(--text-muted)]" />}
                <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: CHANNEL_COLORS[t.channel] ?? "#888" }}>
                  {t.channel}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {t.is_system && (
                  <span className="px-2 py-0.5 bg-[var(--neutral-100)] text-[10px] font-bold text-[var(--text-muted)] rounded-full">System</span>
                )}
                {!t.is_system && (
                  <>
                    <button onClick={() => openEdit(t)} className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[#262262] hover:bg-[#262262]/10 transition-colors">
                      <Edit2 size={12} />
                    </button>
                    <button onClick={() => deleteTemplate(t.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </>
                )}
              </div>
            </div>
            <h3 className="text-[14px] font-bold text-[var(--text-strong)] mb-2">{t.name}</h3>
            <p className="text-[12px] text-[var(--text-muted)] line-clamp-3 leading-relaxed">{t.body}</p>
            {extractVars(t.body).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {extractVars(t.body).map((v) => (
                  <span key={v} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-semibold rounded border border-blue-100">{v}</span>
                ))}
              </div>
            )}
            <button onClick={() => setPreview(t)}
              className="mt-3 text-[11px] font-semibold text-[#262262] hover:underline">Preview →</button>
          </div>
        ))}
        {filtered.length === 0 && !tableNotReady && (
          <div className="col-span-full py-20 text-center">
            <FileText size={36} className="mx-auto mb-3 opacity-20 text-[var(--text-muted)]" />
            <p className="text-[15px] font-bold text-[var(--text-muted)]">No templates found</p>
          </div>
        )}
      </div>

      {/* New/Edit SlidePanel */}
      <SlidePanel open={panelOpen} onClose={() => setPanelOpen(false)}
        title={editing ? "Edit Template" : "New Template"}
        subtitle="Create a reusable message template">
        <div className="space-y-4">
          <div>
            <label className="block text-[12px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-wide">Template Name *</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full h-11 px-3 border border-[var(--border)] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#262262]/20"
              placeholder="e.g., Fee Reminder" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-wide">Channel *</label>
              <select value={form.channel} onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value }))}
                className="w-full h-11 px-3 border border-[var(--border)] rounded-xl text-[14px] bg-white focus:outline-none focus:ring-2 focus:ring-[#262262]/20">
                <option value="whatsapp">WhatsApp</option>
                <option value="sms">SMS</option>
                <option value="email">Email</option>
                <option value="notification">In-App</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-wide">Category</label>
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full h-11 px-3 border border-[var(--border)] rounded-xl text-[14px] bg-white focus:outline-none focus:ring-2 focus:ring-[#262262]/20">
                <option value="general">General</option>
                <option value="finance">Finance</option>
                <option value="attendance">Attendance</option>
                <option value="academics">Academics</option>
                <option value="events">Events</option>
                <option value="staff">Staff</option>
                <option value="admission">Admission</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-wide">Message Body *</label>
            <textarea value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} rows={6}
              className="w-full px-3 py-2.5 border border-[var(--border)] rounded-xl text-[14px] resize-none focus:outline-none focus:ring-2 focus:ring-[#262262]/20"
              placeholder="Dear {parent_name}, your ward {student_name}..." />
            <p className="text-[11px] text-[var(--text-muted)] mt-1">Use <code className="font-mono">{"{variable_name}"}</code> for dynamic values</p>
          </div>
          {extractVars(form.body).length > 0 && (
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-[11px] font-bold text-blue-800 mb-1.5">Detected variables:</p>
              <div className="flex flex-wrap gap-1">
                {extractVars(form.body).map((v) => (
                  <span key={v} className="px-2 py-0.5 bg-white text-blue-700 text-[11px] font-semibold rounded border border-blue-200">{v}</span>
                ))}
              </div>
            </div>
          )}
          <button onClick={save} disabled={saving || !form.name || !form.body}
            className="w-full h-11 rounded-xl text-[14px] font-bold text-white disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #262262, #92278F)" }}>
            {saving ? "Saving…" : editing ? "Update Template" : "Create Template"}
          </button>
        </div>
      </SlidePanel>

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setPreview(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[500px] mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[16px] font-extrabold text-[var(--text-strong)]">{preview.name}</h3>
              <button onClick={() => setPreview(null)} className="w-7 h-7 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-strong)] flex items-center justify-center">✕</button>
            </div>
            <div className="p-4 bg-[var(--neutral-50)] rounded-xl border border-[var(--border)]">
              <p className="text-[14px] text-[var(--text-strong)] leading-relaxed whitespace-pre-wrap">{preview.body}</p>
            </div>
            <div className="flex items-center gap-2 mt-4">
              {CHANNEL_ICON[preview.channel]}
              <span className="text-[12px] font-bold capitalize" style={{ color: CHANNEL_COLORS[preview.channel] }}>{preview.channel}</span>
              <span className="mx-2 text-[var(--text-muted)]">·</span>
              <span className="text-[12px] text-[var(--text-muted)] capitalize">{preview.category}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
