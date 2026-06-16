"use client";

import { useState, useEffect, useCallback } from "react";
import { Settings, Save, Loader2, Eye, EyeOff, RefreshCw, Zap, Plus, Trash2, Toggle } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface ChannelSetting {
  channel: string;
  provider: string;
  api_key?: string;
  api_secret?: string;
  sender_id?: string;
  extra_config?: Record<string, string>;
  is_active: boolean;
}

interface AutomationRule {
  id: string;
  name: string;
  trigger_event: string;
  channels: string[];
  is_active: boolean;
  run_count: number;
  last_run_at?: string;
}

const inputCls = "w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white";

const triggerLabel: Record<string, string> = {
  trial_expiring_7d: "Trial Expiring — 7 Days",
  trial_expiring_3d: "Trial Expiring — 3 Days",
  trial_expiring_1d: "Trial Expiring — 1 Day",
  subscription_expiring_30d: "Subscription Expiring — 30 Days",
  subscription_expiring_7d: "Subscription Expiring — 7 Days",
  subscription_expiring_3d: "Subscription Expiring — 3 Days",
  subscription_expired: "Subscription Expired",
  school_created: "School Created (Welcome)",
  payment_received: "Payment Received",
  payment_failed: "Payment Failed",
};

const channelColor: Record<string, string> = {
  whatsapp: "#22c55e", sms: "#3b82f6", email: "#f59e0b", notification: "#8b5cf6",
};

export default function CommunicationSettingsPage() {
  const { success, error: toastError } = useToast();
  const [settings, setSettings] = useState<ChannelSetting[]>([]);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [forms, setForms] = useState<Record<string, Record<string, string>>>({});
  const [newRule, setNewRule] = useState({ name: "", trigger_event: "trial_expiring_7d", channels: [] as string[], message_body: "" });

  const load = useCallback(async () => {
    setFetching(true);
    const [s, r] = await Promise.all([
      fetch("/api/platform/communication/settings").then(d => d.json()).catch(() => ({ settings: [] })),
      fetch("/api/platform/communication/automation").then(d => d.json()).catch(() => ({ rules: [] })),
    ]);
    setSettings(s.settings ?? []);
    setRules(r.rules ?? []);
    // Init forms
    const init: Record<string, Record<string, string>> = {};
    for (const cfg of s.settings ?? []) {
      init[cfg.channel] = {
        provider: cfg.provider ?? "",
        api_key: cfg.api_key ?? "",
        api_secret: cfg.api_secret ?? "",
        sender_id: cfg.sender_id ?? "",
        is_active: cfg.is_active ? "true" : "false",
        ...(cfg.extra_config ?? {}),
      };
    }
    setForms(init);
    setFetching(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function setField(channel: string, key: string, value: string) {
    setForms(f => ({ ...f, [channel]: { ...(f[channel] ?? {}), [key]: value } }));
  }

  async function saveChannel(channel: string) {
    setLoading(channel);
    try {
      const f = forms[channel] ?? {};
      const res = await fetch("/api/platform/communication/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          provider: f.provider,
          api_key: f.api_key || null,
          api_secret: f.api_secret || null,
          sender_id: f.sender_id || null,
          is_active: f.is_active === "true",
          extra_config: channel === "email" ? { host: f.host, port: f.port, from_name: f.from_name, from_email: f.from_email } : {},
        }),
      });
      if (!res.ok) throw new Error();
      success(`${channel.charAt(0).toUpperCase() + channel.slice(1)} settings saved.`);
      load();
    } catch {
      toastError("Failed to save settings.");
    } finally {
      setLoading(null);
    }
  }

  async function toggleRule(id: string, is_active: boolean) {
    await fetch("/api/platform/communication/automation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_active: !is_active }),
    });
    setRules(prev => prev.map(r => r.id === id ? { ...r, is_active: !is_active } : r));
  }

  async function createRule() {
    if (!newRule.name || !newRule.trigger_event) { toastError("Name and trigger are required."); return; }
    if (newRule.channels.length === 0) { toastError("Select at least one channel."); return; }
    const res = await fetch("/api/platform/communication/automation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newRule),
    });
    if (res.ok) { success("Automation rule created."); setNewRule({ name: "", trigger_event: "trial_expiring_7d", channels: [], message_body: "" }); load(); }
    else toastError("Failed to create rule.");
  }

  const toggleRuleChannel = (ch: string) => setNewRule(r => ({
    ...r, channels: r.channels.includes(ch) ? r.channels.filter(c => c !== ch) : [...r.channels, ch],
  }));

  const channelConfigs = [
    {
      key: "whatsapp", label: "WhatsApp", color: "#22c55e",
      fields: [
        { key: "provider", label: "Provider", placeholder: "meta", type: "text" },
        { key: "sender_id", label: "Phone Number ID", placeholder: "1234567890", type: "text" },
        { key: "api_key", label: "Access Token", placeholder: "EAAxxxxx…", type: "password" },
      ],
    },
    {
      key: "sms", label: "SMS", color: "#3b82f6",
      fields: [
        { key: "provider", label: "Provider", placeholder: "arkesel / hubtel / nsano", type: "select", options: ["arkesel", "hubtel", "nsano"] },
        { key: "sender_id", label: "Sender ID", placeholder: "EduSys", type: "text" },
        { key: "api_key", label: "API Key", placeholder: "Your SMS API key", type: "password" },
      ],
    },
    {
      key: "email", label: "Email", color: "#f59e0b",
      fields: [
        { key: "provider", label: "Provider", placeholder: "smtp / resend", type: "select", options: ["smtp", "resend"] },
        { key: "from_name", label: "From Name", placeholder: "CompunerdEduSys", type: "text" },
        { key: "from_email", label: "From Email", placeholder: "noreply@compunerd.com", type: "text" },
        { key: "api_key", label: "API Key / SMTP User", placeholder: "API key or SMTP username", type: "password" },
        { key: "api_secret", label: "SMTP Password", placeholder: "SMTP password (if using SMTP)", type: "password" },
        { key: "host", label: "SMTP Host", placeholder: "smtp.gmail.com", type: "text" },
        { key: "port", label: "SMTP Port", placeholder: "587", type: "text" },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold text-slate-900 leading-tight flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#374151,#1f2937)" }}>
              <Settings size={16} className="text-white" />
            </div>
            Communication Settings
          </h1>
          <p className="text-slate-500 text-[13px] font-semibold mt-1 ml-12">Configure API credentials and automation rules.</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-bold border border-[#e0daf0] text-slate-600 hover:bg-slate-50 transition-all">
          <RefreshCw size={13} className={fetching ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Channel Settings */}
      {channelConfigs.map(cfg => {
        const f = forms[cfg.key] ?? {};
        return (
          <div key={cfg.key} className="bg-white rounded-2xl border border-[#e8e4f3] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#f0edf8] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${cfg.color}20` }}>
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: cfg.color }} />
                </div>
                <h3 className="font-extrabold text-slate-900 text-[14px]">{cfg.label} Settings</h3>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-[12px] font-bold text-slate-500">Active</span>
                <div
                  onClick={() => setField(cfg.key, "is_active", f.is_active === "true" ? "false" : "true")}
                  className={`w-10 h-5.5 rounded-full transition-all relative cursor-pointer ${f.is_active === "true" ? "bg-emerald-500" : "bg-slate-200"}`}
                  style={{ width: 40, height: 22 }}
                >
                  <div className={`absolute top-0.5 w-[18px] h-[18px] rounded-full bg-white shadow transition-all ${f.is_active === "true" ? "translate-x-[19px]" : "translate-x-0.5"}`} />
                </div>
              </label>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cfg.fields.map(field => (
                  <div key={field.key}>
                    <label className="block text-[12px] font-bold text-slate-700 mb-1.5">{field.label}</label>
                    {field.type === "select" ? (
                      <select value={f[field.key] ?? ""} onChange={e => setField(cfg.key, field.key, e.target.value)} className={inputCls}>
                        {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : field.type === "password" ? (
                      <div className="relative">
                        <input
                          type={showKeys[`${cfg.key}_${field.key}`] ? "text" : "password"}
                          value={f[field.key] ?? ""}
                          onChange={e => setField(cfg.key, field.key, e.target.value)}
                          placeholder={field.placeholder}
                          className={`${inputCls} pr-10`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowKeys(s => ({ ...s, [`${cfg.key}_${field.key}`]: !s[`${cfg.key}_${field.key}`] }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showKeys[`${cfg.key}_${field.key}`] ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    ) : (
                      <input type="text" value={f[field.key] ?? ""} onChange={e => setField(cfg.key, field.key, e.target.value)} placeholder={field.placeholder} className={inputCls} />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-5">
                <button
                  onClick={() => saveChannel(cfg.key)}
                  disabled={loading === cfg.key}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-[13px] font-bold disabled:opacity-60 shadow-sm"
                  style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}
                >
                  {loading === cfg.key ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : <><Save size={13} /> Save {cfg.label} Settings</>}
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {/* Automation Rules */}
      <div className="bg-white rounded-2xl border border-[#e8e4f3] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#f0edf8] flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(99,102,241,0.1)" }}>
            <Zap size={14} style={{ color: "#6366f1" }} />
          </div>
          <h3 className="font-extrabold text-slate-900 text-[14px]">Automation Rules</h3>
        </div>
        <div className="p-6 space-y-4">
          {/* Existing rules */}
          {rules.length > 0 && (
            <div className="space-y-3 mb-6">
              {rules.map(rule => (
                <div key={rule.id} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${rule.is_active ? "border-emerald-100 bg-emerald-50/40" : "border-slate-200 bg-slate-50"}`}>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 text-[13px]">{rule.name}</p>
                    <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                      Trigger: <span className="text-slate-600">{triggerLabel[rule.trigger_event] ?? rule.trigger_event}</span>
                      {" · "}Channels: {rule.channels.map(ch => <span key={ch} className="font-bold" style={{ color: channelColor[ch] }}>{ch} </span>)}
                    </p>
                    {rule.run_count > 0 && (
                      <p className="text-[10px] text-slate-400 mt-0.5">Run {rule.run_count} times · Last: {rule.last_run_at ? new Date(rule.last_run_at).toLocaleDateString() : "Never"}</p>
                    )}
                  </div>
                  <button
                    onClick={() => toggleRule(rule.id, rule.is_active)}
                    className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all ${rule.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}
                  >
                    {rule.is_active ? "Active" : "Inactive"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Create new rule */}
          <div className="border border-dashed border-violet-200 rounded-xl p-5 space-y-4">
            <p className="text-[13px] font-extrabold text-violet-700 flex items-center gap-2"><Plus size={14} /> New Automation Rule</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Rule Name</label>
                <input type="text" value={newRule.name} onChange={e => setNewRule(r => ({ ...r, name: e.target.value }))} placeholder="e.g. Trial 7-Day WhatsApp" className={inputCls} />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Trigger Event</label>
                <select value={newRule.trigger_event} onChange={e => setNewRule(r => ({ ...r, trigger_event: e.target.value }))} className={inputCls}>
                  {Object.entries(triggerLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-bold text-slate-700 mb-2">Channels</label>
              <div className="flex gap-2">
                {["whatsapp", "sms", "email"].map(ch => (
                  <button key={ch} type="button" onClick={() => toggleRuleChannel(ch)}
                    className="px-3 py-1.5 rounded-xl text-[12px] font-bold border transition-all capitalize"
                    style={newRule.channels.includes(ch)
                      ? { background: `${channelColor[ch]}20`, color: channelColor[ch], borderColor: channelColor[ch] }
                      : { background: "#faf9ff", color: "#94a3b8", borderColor: "#e0daf0" }}>
                    {ch}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Message Body</label>
              <textarea value={newRule.message_body} onChange={e => setNewRule(r => ({ ...r, message_body: e.target.value }))}
                placeholder="Dear {school_name}, your trial expires in 7 days…" rows={3}
                className="w-full px-4 py-3 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all resize-none bg-white" />
            </div>
            <button onClick={createRule}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-bold"
              style={{ background: "linear-gradient(135deg,#6366f1,#4338ca)" }}>
              <Plus size={13} /> Create Rule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
