"use client";

import { useState } from "react";
import { Smartphone, AlertTriangle, Send, Users, User, ChevronDown } from "lucide-react";

interface Template { id: string; name: string; body: string; }
interface Parent { id: string; full_name: string; phone?: string; }

interface Props {
  schoolId: string;
  userId: string;
  tableNotReady: boolean;
  smsEnabled: boolean;
  smsProvider: string;
  smsSenderName: string;
  smsCredits: number;
  templates: Template[];
  parents: Parent[];
}

const SMS_LIMIT = 160;

export function SMSClient({ schoolId, userId, tableNotReady, smsEnabled, smsProvider, smsSenderName, smsCredits, templates, parents }: Props) {
  const [audienceType, setAudienceType] = useState<"all_parents" | "individual">("all_parents");
  const [selectedParent, setSelectedParent] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const parts = Math.ceil(message.length / SMS_LIMIT) || 1;

  async function handleSend() {
    if (!message.trim()) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/admin/communication/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          school_id: schoolId,
          channel: "sms",
          recipient_type: audienceType,
          recipient_id: audienceType === "individual" ? selectedParent : null,
          template_id: templateId || null,
          message,
          status: smsEnabled ? "pending" : "failed",
          provider: smsProvider,
          sent_by: userId,
          recipient_count: audienceType === "all_parents" ? parents.length : 1,
          error_message: !smsEnabled ? "SMS not configured" : null,
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
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50">
          <Smartphone size={20} className="text-blue-500" />
        </div>
        <div>
          <h1 className="text-[22px] font-extrabold text-[var(--text-strong)]">SMS Center</h1>
          <p className="text-[14px] text-[var(--text-muted)] mt-0.5">Send SMS via {smsProvider || "Arkesel/Hubtel"}</p>
        </div>
      </div>

      {tableNotReady && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-[13px] text-amber-800 font-medium">Run <code className="bg-amber-100 px-1 rounded font-mono">communication_module.sql</code> to enable this module.</p>
        </div>
      )}

      {!smsEnabled && !tableNotReady && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-orange-50 border border-orange-200">
          <AlertTriangle size={16} className="text-orange-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-[13px] font-bold text-orange-800">SMS not configured</p>
            <p className="text-[12px] text-orange-700 mt-0.5">
              Go to <a href="/communications/settings" className="underline font-semibold">Communications → Settings</a> to add your SMS provider credentials.
            </p>
          </div>
        </div>
      )}

      {smsEnabled && (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-[12px] font-semibold text-blue-700">SMS Active · {smsProvider}</span>
          </div>
          <div className="px-3 py-2 bg-[var(--neutral-50)] border border-[var(--border)] rounded-xl">
            <span className="text-[12px] font-semibold text-[var(--text-muted)]">Credits: </span>
            <span className="text-[12px] font-extrabold text-[var(--text-strong)]">{smsCredits.toFixed(2)}</span>
          </div>
          {smsSenderName && (
            <div className="px-3 py-2 bg-[var(--neutral-50)] border border-[var(--border)] rounded-xl">
              <span className="text-[12px] font-semibold text-[var(--text-muted)]">From: </span>
              <span className="text-[12px] font-extrabold text-[var(--text-strong)]">{smsSenderName}</span>
            </div>
          )}
        </div>
      )}

      {sent && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-[13px] font-semibold text-green-800">✓ SMS queued successfully!</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-white rounded-2xl border border-[var(--border)] p-5 shadow-sm space-y-4">
          <h2 className="text-[15px] font-extrabold text-[var(--text-strong)]">Compose SMS</h2>

          {/* Audience */}
          <div>
            <label className="block text-[12px] font-bold text-[var(--text-muted)] mb-2 uppercase tracking-wide">Send To</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { val: "all_parents", label: `All Parents (${parents.length})`, icon: Users },
                { val: "individual", label: "Individual", icon: User },
              ].map(({ val, label, icon: Icon }) => (
                <button key={val} onClick={() => setAudienceType(val as typeof audienceType)}
                  className={`flex items-center gap-2 p-3 rounded-xl border text-[12px] font-semibold transition-all ${audienceType === val ? "border-blue-400 bg-blue-50 text-blue-800" : "border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--neutral-50)]"}`}>
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>
          </div>

          {audienceType === "individual" && (
            <div>
              <label className="block text-[12px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-wide">Parent</label>
              <div className="relative">
                <select value={selectedParent} onChange={(e) => setSelectedParent(e.target.value)}
                  className="w-full h-11 px-3 pr-8 border border-[var(--border)] rounded-xl text-[14px] bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/30 appearance-none">
                  <option value="">Select a parent…</option>
                  {parents.map((p) => <option key={p.id} value={p.id}>{p.full_name}{p.phone ? ` · ${p.phone}` : ""}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
              </div>
            </div>
          )}

          {templates.length > 0 && (
            <div>
              <label className="block text-[12px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-wide">Template (optional)</label>
              <div className="relative">
                <select value={templateId} onChange={(e) => { setTemplateId(e.target.value); const t = templates.find((t) => t.id === e.target.value); if (t) setMessage(t.body); }}
                  className="w-full h-11 px-3 pr-8 border border-[var(--border)] rounded-xl text-[14px] bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/30 appearance-none">
                  <option value="">Custom message…</option>
                  {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[12px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-wide">Message *</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5}
              className="w-full px-3 py-2.5 border border-[var(--border)] rounded-xl text-[14px] resize-none focus:outline-none focus:ring-2 focus:ring-blue-400/30"
              placeholder="Type your SMS here…" />
            <div className="flex justify-between mt-1">
              <p className={`text-[11px] font-semibold ${message.length > SMS_LIMIT ? "text-amber-600" : "text-[var(--text-muted)]"}`}>
                {message.length} chars · {parts} SMS part{parts > 1 ? "s" : ""}
              </p>
              <p className="text-[11px] text-[var(--text-muted)]">160 chars per part</p>
            </div>
          </div>

          {error && <p className="text-[13px] text-red-600 font-semibold">{error}</p>}

          <button onClick={handleSend} disabled={sending || !message.trim() || tableNotReady}
            className="w-full h-11 rounded-xl text-[14px] font-bold text-white flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors">
            <Send size={14} /> {sending ? "Sending…" : "Send SMS"}
          </button>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-sm">
            <h3 className="text-[14px] font-extrabold text-[var(--text-strong)] mb-3">SMS Tips</h3>
            <ul className="space-y-2 text-[12px] text-[var(--text-muted)]">
              <li className="flex items-start gap-2"><span className="text-blue-500 font-bold">•</span> Keep messages under 160 characters to use 1 SMS credit</li>
              <li className="flex items-start gap-2"><span className="text-blue-500 font-bold">•</span> Characters above 160 split the message into multiple SMS parts</li>
              <li className="flex items-start gap-2"><span className="text-blue-500 font-bold">•</span> Arkesel and Hubtel support are configured via Settings</li>
              <li className="flex items-start gap-2"><span className="text-blue-500 font-bold">•</span> Ensure parents have phone numbers in their profiles</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
