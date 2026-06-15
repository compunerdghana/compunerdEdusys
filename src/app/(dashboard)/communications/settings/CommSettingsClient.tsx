"use client";

import { useState } from "react";
import { Settings2, AlertTriangle, CheckCircle, Save, MessageCircle, Smartphone, Mail, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Settings {
  whatsapp_enabled: boolean;
  whatsapp_provider: string;
  whatsapp_phone_id: string;
  whatsapp_token: string;
  whatsapp_waba_id: string;
  sms_enabled: boolean;
  sms_provider: string;
  sms_api_key: string;
  sms_sender_id: string;
  sms_sender_name: string;
  email_enabled: boolean;
  email_provider: string;
  email_api_key: string;
  email_from: string;
  email_from_name: string;
  sms_credits: number;
  whatsapp_credits: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SettingsRow = Record<string, any>;

interface Props {
  schoolId: string;
  initialSettings: SettingsRow | null;
  tableNotReady: boolean;
}

const DEFAULT: Settings = {
  whatsapp_enabled: false, whatsapp_provider: "meta", whatsapp_phone_id: "", whatsapp_token: "", whatsapp_waba_id: "",
  sms_enabled: false, sms_provider: "arkesel", sms_api_key: "", sms_sender_id: "", sms_sender_name: "",
  email_enabled: false, email_provider: "sendgrid", email_api_key: "", email_from: "", email_from_name: "",
  sms_credits: 0, whatsapp_credits: 0,
};

export function CommSettingsClient({ schoolId, initialSettings, tableNotReady }: Props) {
  const [settings, setSettings] = useState<Settings>({ ...DEFAULT, ...(initialSettings ?? {}) });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function set(key: keyof Settings, value: string | boolean | number) {
    setSettings((s) => ({ ...s, [key]: value }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/communication/settings", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ school_id: schoolId, ...settings }),
      });
      if (res.ok) setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  const field = (key: keyof Settings, label: string, placeholder?: string, type = "text") => (
    <div key={key}>
      <label className="block text-[12px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-wide">{label}</label>
      <input type={type} value={String(settings[key] ?? "")} onChange={(e) => set(key, e.target.value)}
        className="w-full h-11 px-3 border border-[var(--border)] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#262262]/20"
        placeholder={placeholder ?? ""} />
    </div>
  );

  const toggle = (key: keyof Settings, label: string) => (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-[14px] font-semibold text-[var(--text-strong)]">{label}</span>
      <button onClick={() => set(key, !settings[key])}
        className={`relative w-11 h-6 rounded-full transition-colors ${settings[key] ? "bg-green-500" : "bg-[var(--neutral-200)]"}`}>
        <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${settings[key] ? "translate-x-5" : ""}`} />
      </button>
    </label>
  );

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[800px] mx-auto">
      <Link href="/communications/dashboard" className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-strong)] transition-colors w-fit">
        <ArrowLeft size={14} /> Back to Communications
      </Link>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--neutral-100)]">
            <Settings2 size={20} className="text-[var(--text-muted)]" />
          </div>
          <div>
            <h1 className="text-[22px] font-extrabold text-[var(--text-strong)]">Communication Settings</h1>
            <p className="text-[14px] text-[var(--text-muted)] mt-0.5">Configure WhatsApp, SMS, and Email providers</p>
          </div>
        </div>
        <button onClick={save} disabled={saving || tableNotReady}
          className="h-10 px-5 rounded-xl text-[13px] font-bold text-white flex items-center gap-2 shadow disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #262262, #92278F)" }}>
          <Save size={14} /> {saving ? "Saving…" : "Save Settings"}
        </button>
      </div>

      {tableNotReady && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-[13px] text-amber-800 font-medium">Run <code className="bg-amber-100 px-1 rounded font-mono">communication_module.sql</code> to enable settings.</p>
        </div>
      )}

      {saved && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-green-50 border border-green-200">
          <CheckCircle size={16} className="text-green-600" />
          <p className="text-[13px] font-semibold text-green-800">Settings saved successfully!</p>
        </div>
      )}

      {/* WhatsApp */}
      <div className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <MessageCircle size={18} className="text-[#25D366]" />
          <h2 className="text-[16px] font-extrabold text-[var(--text-strong)]">WhatsApp Business API</h2>
        </div>
        {toggle("whatsapp_enabled", "Enable WhatsApp")}
        {settings.whatsapp_enabled && (
          <div className="space-y-3 pt-2">
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-[12px] text-blue-800">
              Uses Meta WhatsApp Cloud API. Get credentials from <strong>Meta Business Suite → WhatsApp → API Setup</strong>.
            </div>
            {field("whatsapp_phone_id", "Phone Number ID", "Enter your Meta Phone Number ID")}
            {field("whatsapp_waba_id", "WhatsApp Business Account ID", "Enter your WABA ID")}
            {field("whatsapp_token", "Access Token", "Enter your permanent access token")}
          </div>
        )}
      </div>

      {/* SMS */}
      <div className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Smartphone size={18} className="text-blue-500" />
          <h2 className="text-[16px] font-extrabold text-[var(--text-strong)]">SMS Provider</h2>
        </div>
        {toggle("sms_enabled", "Enable SMS")}
        {settings.sms_enabled && (
          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-[12px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-wide">Provider</label>
              <select value={settings.sms_provider} onChange={(e) => set("sms_provider", e.target.value)}
                className="w-full h-11 px-3 border border-[var(--border)] rounded-xl text-[14px] bg-white focus:outline-none focus:ring-2 focus:ring-[#262262]/20">
                <option value="arkesel">Arkesel</option>
                <option value="hubtel">Hubtel</option>
                <option value="nsano">Nsano</option>
              </select>
            </div>
            {field("sms_api_key", "API Key", "Enter your SMS provider API key")}
            {field("sms_sender_id", "Sender ID", "Your registered sender ID")}
            {field("sms_sender_name", "Sender Name (display)", "e.g., MYSCHOOL")}
          </div>
        )}
      </div>

      {/* Email */}
      <div className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Mail size={18} className="text-amber-500" />
          <h2 className="text-[16px] font-extrabold text-[var(--text-strong)]">Email</h2>
        </div>
        {toggle("email_enabled", "Enable Email")}
        {settings.email_enabled && (
          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-[12px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-wide">Provider</label>
              <select value={settings.email_provider} onChange={(e) => set("email_provider", e.target.value)}
                className="w-full h-11 px-3 border border-[var(--border)] rounded-xl text-[14px] bg-white focus:outline-none focus:ring-2 focus:ring-[#262262]/20">
                <option value="sendgrid">SendGrid</option>
                <option value="resend">Resend</option>
                <option value="mailgun">Mailgun</option>
              </select>
            </div>
            {field("email_api_key", "API Key", "Enter your email provider API key")}
            {field("email_from", "From Email", "noreply@yourschool.edu.gh")}
            {field("email_from_name", "From Name", "Your School Name")}
          </div>
        )}
      </div>
    </div>
  );
}
