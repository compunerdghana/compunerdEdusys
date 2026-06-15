"use client";

import { useState } from "react";
import { MessageCircle, AlertTriangle, Send, Users, User, School, ChevronDown } from "lucide-react";

interface Template { id: string; name: string; body: string; variables: string[]; }
interface ClassItem { id: string; name: string; level?: string; }
interface Parent { id: string; full_name: string; phone?: string; }

interface Props {
  schoolId: string;
  userId: string;
  tableNotReady: boolean;
  whatsappEnabled: boolean;
  whatsappCredits: number;
  templates: Template[];
  classes: ClassItem[];
  parents: Parent[];
}

export function WhatsAppClient({ schoolId, userId, tableNotReady, whatsappEnabled, whatsappCredits, templates, classes, parents }: Props) {
  const [audienceType, setAudienceType] = useState<"individual" | "class" | "all_parents">("all_parents");
  const [selectedParent, setSelectedParent] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  function applyTemplate(id: string) {
    setTemplateId(id);
    const t = templates.find((t) => t.id === id);
    if (t) setMessage(t.body);
  }

  function estimateRecipients() {
    if (audienceType === "all_parents") return parents.length;
    if (audienceType === "class") return "varies";
    if (audienceType === "individual") return selectedParent ? 1 : 0;
    return 0;
  }

  async function handleSend() {
    if (!message.trim()) return;
    setSending(true);
    setError("");
    try {
      // Log the message — actual WhatsApp delivery handled by the API helper once configured
      const res = await fetch("/api/admin/communication/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          school_id: schoolId,
          channel: "whatsapp",
          recipient_type: audienceType,
          recipient_id: audienceType === "individual" ? selectedParent : null,
          recipient_ref: audienceType === "class" ? selectedClass : null,
          template_id: templateId || null,
          message: message,
          status: whatsappEnabled ? "pending" : "failed",
          sent_by: userId,
          recipient_count: audienceType === "all_parents" ? parents.length : 1,
          error_message: !whatsappEnabled ? "WhatsApp not configured" : null,
        }),
      });
      if (res.ok) { setSent(true); setMessage(""); setTemplateId(""); }
      else setError("Failed to queue message");
    } catch {
      setError("Network error");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[900px] mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#25D36618" }}>
          <MessageCircle size={20} className="text-[#25D366]" />
        </div>
        <div>
          <h1 className="text-[22px] font-extrabold text-[var(--text-strong)]">WhatsApp Center</h1>
          <p className="text-[14px] text-[var(--text-muted)] mt-0.5">Send WhatsApp messages to parents and staff</p>
        </div>
      </div>

      {tableNotReady && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-[13px] text-amber-800 font-medium">Run <code className="bg-amber-100 px-1 rounded font-mono">communication_module.sql</code> to enable this module.</p>
        </div>
      )}

      {!whatsappEnabled && !tableNotReady && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-orange-50 border border-orange-200">
          <AlertTriangle size={16} className="text-orange-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-[13px] font-bold text-orange-800">WhatsApp not configured</p>
            <p className="text-[12px] text-orange-700 mt-0.5">
              Go to <a href="/communications/settings" className="underline font-semibold">Communications → Settings</a> to add your Meta WhatsApp Business API credentials.
            </p>
          </div>
        </div>
      )}

      {whatsappEnabled && (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-xl w-fit">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-[12px] font-semibold text-green-700">WhatsApp Active · Credits: {whatsappCredits.toFixed(2)}</span>
        </div>
      )}

      {sent && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-[13px] font-semibold text-green-800">
          ✓ Message queued successfully!
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Compose */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-[var(--border)] p-5 shadow-sm space-y-4">
          <h2 className="text-[15px] font-extrabold text-[var(--text-strong)]">Compose</h2>

          {/* Audience */}
          <div>
            <label className="block text-[12px] font-bold text-[var(--text-muted)] mb-2 uppercase tracking-wide">Audience</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: "all_parents", label: "All Parents", icon: School },
                { val: "class", label: "By Class", icon: Users },
                { val: "individual", label: "Individual", icon: User },
              ].map(({ val, label, icon: Icon }) => (
                <button key={val} onClick={() => setAudienceType(val as typeof audienceType)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-[12px] font-semibold transition-all ${audienceType === val ? "border-[#25D366] bg-green-50 text-green-800" : "border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--neutral-50)]"}`}>
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {audienceType === "class" && (
            <div>
              <label className="block text-[12px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-wide">Class</label>
              <div className="relative">
                <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full h-11 px-3 pr-8 border border-[var(--border)] rounded-xl text-[14px] bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 appearance-none">
                  <option value="">Select a class…</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
              </div>
            </div>
          )}

          {audienceType === "individual" && (
            <div>
              <label className="block text-[12px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-wide">Parent</label>
              <div className="relative">
                <select value={selectedParent} onChange={(e) => setSelectedParent(e.target.value)}
                  className="w-full h-11 px-3 pr-8 border border-[var(--border)] rounded-xl text-[14px] bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 appearance-none">
                  <option value="">Select a parent…</option>
                  {parents.map((p) => <option key={p.id} value={p.id}>{p.full_name}{p.phone ? ` (${p.phone})` : ""}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
              </div>
            </div>
          )}

          {/* Template picker */}
          {templates.length > 0 && (
            <div>
              <label className="block text-[12px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-wide">Use Template (optional)</label>
              <div className="relative">
                <select value={templateId} onChange={(e) => applyTemplate(e.target.value)}
                  className="w-full h-11 px-3 pr-8 border border-[var(--border)] rounded-xl text-[14px] bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 appearance-none">
                  <option value="">Custom message…</option>
                  {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
              </div>
            </div>
          )}

          {/* Message */}
          <div>
            <label className="block text-[12px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-wide">Message *</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6}
              className="w-full px-3 py-2.5 border border-[var(--border)] rounded-xl text-[14px] resize-none focus:outline-none focus:ring-2 focus:ring-[#25D366]/30"
              placeholder="Type your message here…" />
            <div className="flex justify-between mt-1">
              <p className="text-[11px] text-[var(--text-muted)]">{message.length} characters</p>
              <p className="text-[11px] text-[var(--text-muted)]">~{estimateRecipients()} recipients</p>
            </div>
          </div>

          {error && <p className="text-[13px] text-red-600 font-semibold">{error}</p>}

          <button onClick={handleSend} disabled={sending || !message.trim() || tableNotReady}
            className="w-full h-11 rounded-xl text-[14px] font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: "#25D366", color: "white" }}>
            <Send size={14} /> {sending ? "Sending…" : "Send WhatsApp Message"}
          </button>
        </div>

        {/* Tips panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-sm">
            <h3 className="text-[14px] font-extrabold text-[var(--text-strong)] mb-3">Tips</h3>
            <ul className="space-y-2 text-[12px] text-[var(--text-muted)]">
              <li className="flex items-start gap-2"><span className="text-[#25D366] font-bold mt-0.5">•</span> Use templates to save time on recurring messages</li>
              <li className="flex items-start gap-2"><span className="text-[#25D366] font-bold mt-0.5">•</span> Replace <code className="font-mono bg-[var(--neutral-100)] px-1 rounded">{"{parent_name}"}</code> placeholders with actual data before sending</li>
              <li className="flex items-start gap-2"><span className="text-[#25D366] font-bold mt-0.5">•</span> Parents must have a valid WhatsApp-registered phone number</li>
              <li className="flex items-start gap-2"><span className="text-[#25D366] font-bold mt-0.5">•</span> WhatsApp Business API requires template approval for outbound messages to new contacts</li>
            </ul>
          </div>
          <div className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-sm">
            <h3 className="text-[14px] font-extrabold text-[var(--text-strong)] mb-3">Quick Stats</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-[13px]">
                <span className="text-[var(--text-muted)]">Total parents</span>
                <span className="font-bold text-[var(--text-strong)]">{parents.length}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-[var(--text-muted)]">Templates</span>
                <span className="font-bold text-[var(--text-strong)]">{templates.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
