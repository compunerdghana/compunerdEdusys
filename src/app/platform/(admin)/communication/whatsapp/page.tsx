"use client";

import { useState, useEffect, useCallback } from "react";
import { Phone, Send, Loader2, CheckCircle2, XCircle, ChevronDown, FileText, Users, RefreshCw } from "lucide-react";
import { SlidePanel } from "@/components/ui/SlidePanel";
import { useToast } from "@/components/ui/Toast";

interface Template { id: string; name: string; body: string; channel: string; category: string; }
interface Message { id: string; school_name: string; recipient_name: string; recipient_phone: string; body: string; status: string; created_at: string; error_message?: string; }

const statusStyle: Record<string, string> = {
  sent: "bg-blue-50 text-blue-700 border border-blue-100",
  delivered: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  read: "bg-violet-50 text-violet-700 border border-violet-100",
  failed: "bg-red-50 text-red-700 border border-red-100",
  pending: "bg-slate-50 text-slate-500 border border-slate-100",
};

const inputCls = "w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white";

export default function WhatsAppCenterPage() {
  const { success, error: toastError } = useToast();
  const [panelOpen, setPanelOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [form, setForm] = useState({
    target_audience: "all",
    recipient_type: "school_owner",
    recipient_phone: "",
    recipient_name: "",
    message: "",
    template_id: "",
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const load = useCallback(async () => {
    setFetching(true);
    const [msgs, tmpls] = await Promise.all([
      fetch("/api/platform/communication/whatsapp").then(r => r.json()).catch(() => ({ messages: [] })),
      fetch("/api/platform/communication/templates?channel=whatsapp").then(r => r.json()).catch(() => ({ templates: [] })),
    ]);
    setMessages(msgs.messages ?? []);
    setTemplates(tmpls.templates ?? []);
    setFetching(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function applyTemplate(id: string) {
    const t = templates.find(t => t.id === id);
    if (t) { set("message", t.body); set("template_id", id); }
  }

  async function handleSend() {
    if (!form.message) { toastError("Message is required."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/platform/communication/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_audience: form.recipient_phone ? "selected" : form.target_audience,
          recipient_type: form.recipient_type,
          recipient_phone: form.recipient_phone || undefined,
          recipient_name: form.recipient_name || undefined,
          message: form.message,
          template_id: form.template_id || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      success(`WhatsApp sent to ${data.sent} recipient${data.sent !== 1 ? "s" : ""}. Failed: ${data.failed}.`);
      setPanelOpen(false);
      setForm({ target_audience: "all", recipient_type: "school_owner", recipient_phone: "", recipient_name: "", message: "", template_id: "" });
      load();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Failed to send WhatsApp message.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold text-slate-900 leading-tight flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)" }}>
              <Phone size={16} className="text-white" />
            </div>
            WhatsApp Center
          </h1>
          <p className="text-slate-500 text-[13px] font-semibold mt-1 ml-12">Send WhatsApp messages to schools via Meta Cloud API.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-bold border border-[#e0daf0] text-slate-600 hover:bg-slate-50 transition-all">
            <RefreshCw size={13} className={fetching ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => setPanelOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-bold transition-all shadow-sm"
            style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)" }}
          >
            <Send size={14} />
            Send WhatsApp
          </button>
        </div>
      </div>

      {/* Messages Table */}
      <div className="bg-white rounded-2xl border border-[#e8e4f3] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#f0edf8]">
          <h3 className="font-extrabold text-slate-900 text-[14px]">Sent Messages</h3>
        </div>
        {fetching ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#e0daf0", borderTopColor: "#22c55e" }} />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "rgba(34,197,94,0.1)" }}>
              <Phone size={20} style={{ color: "#22c55e" }} />
            </div>
            <p className="text-slate-500 font-semibold text-[13px]">No WhatsApp messages sent yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#faf9ff]">
                  {["School / Recipient", "Phone", "Message Preview", "Status", "Date"].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[11px] font-extrabold text-slate-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f8f6ff]">
                {messages.map(msg => (
                  <tr key={msg.id} className="hover:bg-[#faf9ff] transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-slate-800 text-[13px]">{msg.school_name ?? msg.recipient_name}</p>
                      {msg.recipient_name && msg.school_name && <p className="text-[11px] text-slate-400 font-semibold">{msg.recipient_name}</p>}
                    </td>
                    <td className="px-5 py-3.5 text-[12px] text-slate-600 font-semibold">{msg.recipient_phone}</td>
                    <td className="px-5 py-3.5 max-w-[280px]">
                      <p className="text-[12px] text-slate-500 font-semibold truncate">{msg.body}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${statusStyle[msg.status] ?? "bg-slate-50 text-slate-500"}`}>
                        {msg.status}
                      </span>
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
      <SlidePanel open={panelOpen} onClose={() => setPanelOpen(false)} title="Send WhatsApp Message" subtitle="Send via Meta WhatsApp Cloud API" width="lg">
        <div className="space-y-4">
          {/* Template picker */}
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
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Recipient Type</label>
              <select value={form.recipient_type} onChange={e => set("recipient_type", e.target.value)} className={inputCls}>
                <option value="school_owner">School Owners</option>
                <option value="headmaster">Headmasters</option>
                <option value="admin">Administrators</option>
              </select>
            </div>
          </div>

          <div className="p-3 rounded-xl border border-dashed border-violet-200 bg-violet-50/40">
            <p className="text-[11px] font-bold text-violet-700 mb-3">— OR send to a specific number —</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-bold text-slate-600 mb-1">Recipient Name</label>
                <input type="text" value={form.recipient_name} onChange={e => set("recipient_name", e.target.value)} placeholder="John Agyei" className={inputCls} />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-slate-600 mb-1">Phone Number</label>
                <input type="text" value={form.recipient_phone} onChange={e => set("recipient_phone", e.target.value)} placeholder="+233xxxxxxxxx" className={inputCls} />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Message <span className="text-red-500">*</span></label>
            <textarea
              value={form.message}
              onChange={e => set("message", e.target.value)}
              placeholder="Type your WhatsApp message here. Use {school_name} for personalization…"
              rows={6}
              className="w-full px-4 py-3 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all resize-none bg-white"
            />
            <p className="text-[10px] text-slate-400 font-semibold mt-1">{form.message.length} characters</p>
          </div>

          <button
            onClick={handleSend}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-[13px] disabled:opacity-60 transition-all"
            style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)" }}
          >
            {loading ? <><Loader2 size={14} className="animate-spin" /> Sending…</> : <><Send size={14} /> Send WhatsApp</>}
          </button>
        </div>
      </SlidePanel>
    </div>
  );
}
