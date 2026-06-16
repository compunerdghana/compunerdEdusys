"use client";

import { useState, useEffect, useCallback } from "react";
import { Mail, Send, Loader2, FileText, Users, RefreshCw, Paperclip } from "lucide-react";
import { SlidePanel } from "@/components/ui/SlidePanel";
import { useToast } from "@/components/ui/Toast";

interface Template { id: string; name: string; subject?: string; body: string; }
interface Message { id: string; school_name: string; recipient_name: string; recipient_email: string; subject: string; body: string; status: string; created_at: string; }

const statusStyle: Record<string, string> = {
  sent: "bg-blue-50 text-blue-700 border border-blue-100",
  delivered: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  read: "bg-violet-50 text-violet-700 border border-violet-100",
  failed: "bg-red-50 text-red-700 border border-red-100",
  pending: "bg-slate-50 text-slate-500 border border-slate-100",
};

const inputCls = "w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white";

export default function EmailCenterPage() {
  const { success, error: toastError } = useToast();
  const [panelOpen, setPanelOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [form, setForm] = useState({
    target_audience: "all",
    recipient_email: "",
    recipient_name: "",
    subject: "",
    message: "",
    template_id: "",
    is_html: "false",
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const load = useCallback(async () => {
    setFetching(true);
    const [msgs, tmpls] = await Promise.all([
      fetch("/api/platform/communication/email").then(r => r.json()).catch(() => ({ messages: [] })),
      fetch("/api/platform/communication/templates?channel=email").then(r => r.json()).catch(() => ({ templates: [] })),
    ]);
    setMessages(msgs.messages ?? []);
    setTemplates(tmpls.templates ?? []);
    setFetching(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function applyTemplate(id: string) {
    const t = templates.find(t => t.id === id);
    if (t) {
      set("message", t.body);
      set("template_id", id);
      if (t.subject) set("subject", t.subject);
    }
  }

  async function handleSend() {
    if (!form.message || !form.subject) { toastError("Subject and message are required."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/platform/communication/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_audience: form.recipient_email ? "selected" : form.target_audience,
          recipient_email: form.recipient_email || undefined,
          recipient_name: form.recipient_name || undefined,
          subject: form.subject,
          message: form.message,
          is_html: form.is_html === "true",
          template_id: form.template_id || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      success(`Email sent to ${data.sent} recipient${data.sent !== 1 ? "s" : ""}. Failed: ${data.failed}.`);
      setPanelOpen(false);
      setForm({ target_audience: "all", recipient_email: "", recipient_name: "", subject: "", message: "", template_id: "", is_html: "false" });
      load();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Failed to send email.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold text-slate-900 leading-tight flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}>
              <Mail size={16} className="text-white" />
            </div>
            Email Center
          </h1>
          <p className="text-slate-500 text-[13px] font-semibold mt-1 ml-12">Send individual emails, newsletters, and platform updates.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-bold border border-[#e0daf0] text-slate-600 hover:bg-slate-50 transition-all">
            <RefreshCw size={13} className={fetching ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => setPanelOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-bold transition-all shadow-sm"
            style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}
          >
            <Mail size={14} />
            Compose Email
          </button>
        </div>
      </div>

      {/* Messages Table */}
      <div className="bg-white rounded-2xl border border-[#e8e4f3] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#f0edf8]">
          <h3 className="font-extrabold text-slate-900 text-[14px]">Sent Emails</h3>
        </div>
        {fetching ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#e0daf0", borderTopColor: "#f59e0b" }} />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "rgba(245,158,11,0.1)" }}>
              <Mail size={20} style={{ color: "#f59e0b" }} />
            </div>
            <p className="text-slate-500 font-semibold text-[13px]">No emails sent yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#faf9ff]">
                  {["School / Recipient", "Email", "Subject", "Status", "Date"].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[11px] font-extrabold text-slate-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f8f6ff]">
                {messages.map(msg => (
                  <tr key={msg.id} className="hover:bg-[#faf9ff] transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-slate-800 text-[13px]">{msg.school_name ?? msg.recipient_name}</p>
                    </td>
                    <td className="px-5 py-3.5 text-[12px] text-slate-600 font-semibold">{msg.recipient_email}</td>
                    <td className="px-5 py-3.5 max-w-[220px]">
                      <p className="text-[12px] text-slate-700 font-bold truncate">{msg.subject}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${statusStyle[msg.status] ?? "bg-slate-50 text-slate-500"}`}>{msg.status}</span>
                    </td>
                    <td className="px-5 py-3.5 text-[11px] text-slate-400 font-semibold whitespace-nowrap">
                      {new Date(msg.created_at).toLocaleString("en-GH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Send Panel */}
      <SlidePanel open={panelOpen} onClose={() => setPanelOpen(false)} title="Compose Email" subtitle="Send emails to schools and administrators" width="xl">
        <div className="space-y-4">
          {templates.length > 0 && (
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5 flex items-center gap-1.5"><FileText size={13} /> Use Template</label>
              <select value={form.template_id} onChange={e => applyTemplate(e.target.value)} className={inputCls}>
                <option value="">— Select a template —</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5 flex items-center gap-1.5"><Users size={13} /> Target Audience</label>
              <select value={form.target_audience} onChange={e => set("target_audience", e.target.value)} className={inputCls}>
                <option value="all">All Schools</option>
                <option value="active">Active Schools</option>
                <option value="trial">Trial Schools</option>
                <option value="expiring">Expiring Schools</option>
                <option value="expired">Expired Schools</option>
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Format</label>
              <select value={form.is_html} onChange={e => set("is_html", e.target.value)} className={inputCls}>
                <option value="false">Plain Text</option>
                <option value="true">HTML</option>
              </select>
            </div>
          </div>

          <div className="p-3 rounded-xl border border-dashed border-amber-200 bg-amber-50/40">
            <p className="text-[11px] font-bold text-amber-700 mb-3">— OR send to a specific email address —</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-bold text-slate-600 mb-1">Recipient Name</label>
                <input type="text" value={form.recipient_name} onChange={e => set("recipient_name", e.target.value)} placeholder="John Agyei" className={inputCls} />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-slate-600 mb-1">Email Address</label>
                <input type="email" value={form.recipient_email} onChange={e => set("recipient_email", e.target.value)} placeholder="john@school.edu.gh" className={inputCls} />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Subject <span className="text-red-500">*</span></label>
            <input type="text" value={form.subject} onChange={e => set("subject", e.target.value)} placeholder="e.g. Your EduSys Subscription is Expiring Soon" className={inputCls} />
          </div>

          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Message Body <span className="text-red-500">*</span></label>
            <textarea
              value={form.message}
              onChange={e => set("message", e.target.value)}
              placeholder="Compose your email. Use {school_name}, {expiry_date} for personalization…"
              rows={8}
              className="w-full px-4 py-3 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all resize-none bg-white"
            />
          </div>

          <button
            onClick={handleSend}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-[13px] disabled:opacity-60 transition-all"
            style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}
          >
            {loading ? <><Loader2 size={14} className="animate-spin" /> Sending…</> : <><Mail size={14} /> Send Email</>}
          </button>
        </div>
      </SlidePanel>
    </div>
  );
}
