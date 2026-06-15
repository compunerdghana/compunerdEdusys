"use client";

import { useState } from "react";
import { Zap, Plus, AlertTriangle, ChevronDown, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SlidePanel } from "@/components/ui/SlidePanel";

interface Rule {
  id: string;
  name: string;
  description?: string;
  trigger_event: string;
  channel: string;
  recipient_type: string;
  is_active: boolean;
  delay_minutes: number;
  created_at: string;
  communication_templates?: { name: string } | null;
}

interface Template { id: string; name: string; channel: string; }

interface Props {
  schoolId: string;
  userId: string;
  tableNotReady: boolean;
  initialRules: Rule[];
  templates: Template[];
}

const TRIGGER_EVENTS = [
  { value: "student_absent", label: "Student Marked Absent" },
  { value: "fee_payment_received", label: "Fee Payment Received" },
  { value: "fee_overdue", label: "Fee Overdue" },
  { value: "report_card_published", label: "Report Card Published" },
  { value: "staff_leave_approved", label: "Staff Leave Approved" },
  { value: "expense_approved", label: "Expense Approved" },
  { value: "student_enrolled", label: "New Student Enrolled" },
  { value: "exam_score_entered", label: "Exam Score Entered" },
];

const CHANNEL_COLORS: Record<string, string> = {
  whatsapp: "#25D366", sms: "#3b82f6", email: "#f59e0b", notification: "#92278F", all: "#262262",
};

export function AutomationClient({ schoolId, userId, tableNotReady, initialRules, templates }: Props) {
  const [rules, setRules] = useState<Rule[]>(initialRules);
  const [panelOpen, setPanelOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", trigger_event: "student_absent",
    channel: "whatsapp", template_id: "", recipient_type: "parent", delay_minutes: 0,
  });

  async function toggleRule(id: string, is_active: boolean) {
    await fetch("/api/admin/communication/automation", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_active: !is_active }),
    });
    setRules((prev) => prev.map((r) => r.id === id ? { ...r, is_active: !is_active } : r));
  }

  async function deleteRule(id: string) {
    if (!confirm("Delete this automation rule?")) return;
    await fetch("/api/admin/communication/automation", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
    });
    setRules((prev) => prev.filter((r) => r.id !== id));
  }

  async function save() {
    if (!form.name || !form.trigger_event || !form.channel) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/communication/automation", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          school_id: schoolId,
          name: form.name,
          description: form.description || null,
          trigger_event: form.trigger_event,
          channel: form.channel,
          template_id: form.template_id || null,
          recipient_type: form.recipient_type,
          delay_minutes: form.delay_minutes,
          created_by: userId,
        }),
      });
      const json = await res.json();
      if (json.data) {
        setRules((prev) => [json.data, ...prev]);
        setPanelOpen(false);
        setForm({ name: "", description: "", trigger_event: "student_absent", channel: "whatsapp", template_id: "", recipient_type: "parent", delay_minutes: 0 });
      }
    } finally {
      setSaving(false);
    }
  }

  const filtered = templates.filter((t) => form.channel === "all" || t.channel === form.channel);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[1000px] mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-50">
            <Zap size={20} className="text-purple-500" />
          </div>
          <div>
            <h1 className="text-[22px] font-extrabold text-[var(--text-strong)]">Automation Rules</h1>
            <p className="text-[14px] text-[var(--text-muted)] mt-0.5">Trigger messages automatically based on school events</p>
          </div>
        </div>
        <button onClick={() => setPanelOpen(true)} disabled={tableNotReady}
          className="h-10 px-5 rounded-xl text-[13px] font-bold text-white flex items-center gap-2 shadow disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #262262, #92278F)" }}>
          <Plus size={15} /> New Rule
        </button>
      </div>

      {tableNotReady && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-[13px] text-amber-800 font-medium">Run <code className="bg-amber-100 px-1 rounded font-mono">communication_module.sql</code> to enable automation.</p>
        </div>
      )}

      <div className="space-y-3">
        {rules.length === 0 && !tableNotReady && (
          <div className="bg-white rounded-2xl border border-[var(--border)] py-16 text-center shadow-sm">
            <Zap size={32} className="mx-auto mb-3 opacity-20 text-[var(--text-muted)]" />
            <p className="text-[14px] font-bold text-[var(--text-muted)]">No automation rules yet</p>
            <p className="text-[13px] text-[var(--text-muted)] mt-1">Create your first rule to automate messages</p>
          </div>
        )}

        {rules.map((rule) => (
          <div key={rule.id} className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: (CHANNEL_COLORS[rule.channel] ?? "#888") + "18" }}>
                  <Zap size={15} style={{ color: CHANNEL_COLORS[rule.channel] ?? "#888" }} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-[14px] font-bold text-[var(--text-strong)]">{rule.name}</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize border" style={{ color: CHANNEL_COLORS[rule.channel], background: CHANNEL_COLORS[rule.channel] + "12", borderColor: CHANNEL_COLORS[rule.channel] + "30" }}>
                      {rule.channel}
                    </span>
                  </div>
                  <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
                    <span className="font-semibold text-[var(--text-strong)]">When:</span>{" "}
                    {TRIGGER_EVENTS.find((e) => e.value === rule.trigger_event)?.label ?? rule.trigger_event}
                    {rule.delay_minutes > 0 && ` · Delay: ${rule.delay_minutes} min`}
                  </p>
                  {rule.description && <p className="text-[12px] text-[var(--text-muted)] mt-1">{rule.description}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleRule(rule.id, rule.is_active)}
                  className={cn("relative w-11 h-6 rounded-full transition-colors focus:outline-none", rule.is_active ? "bg-green-500" : "bg-[var(--neutral-200)]")}>
                  <div className={cn("absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform", rule.is_active && "translate-x-5")} />
                </button>
                <button onClick={() => deleteRule(rule.id)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <SlidePanel open={panelOpen} onClose={() => setPanelOpen(false)}
        title="New Automation Rule" subtitle="Trigger a message when a school event occurs">
        <div className="space-y-4">
          <div>
            <label className="block text-[12px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-wide">Rule Name *</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full h-11 px-3 border border-[var(--border)] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#262262]/20"
              placeholder="e.g., Absent → Parent WhatsApp" />
          </div>
          <div>
            <label className="block text-[12px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-wide">Trigger Event *</label>
            <div className="relative">
              <select value={form.trigger_event} onChange={(e) => setForm((f) => ({ ...f, trigger_event: e.target.value }))}
                className="w-full h-11 px-3 pr-8 border border-[var(--border)] rounded-xl text-[14px] bg-white focus:outline-none focus:ring-2 focus:ring-[#262262]/20 appearance-none">
                {TRIGGER_EVENTS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-wide">Channel *</label>
              <div className="relative">
                <select value={form.channel} onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value, template_id: "" }))}
                  className="w-full h-11 px-3 pr-8 border border-[var(--border)] rounded-xl text-[14px] bg-white focus:outline-none focus:ring-2 focus:ring-[#262262]/20 appearance-none">
                  <option value="whatsapp">WhatsApp</option>
                  <option value="sms">SMS</option>
                  <option value="notification">In-App</option>
                  <option value="all">All channels</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-wide">Send To</label>
              <div className="relative">
                <select value={form.recipient_type} onChange={(e) => setForm((f) => ({ ...f, recipient_type: e.target.value }))}
                  className="w-full h-11 px-3 pr-8 border border-[var(--border)] rounded-xl text-[14px] bg-white focus:outline-none focus:ring-2 focus:ring-[#262262]/20 appearance-none">
                  <option value="parent">Parent</option>
                  <option value="staff">Staff</option>
                  <option value="headmaster">Headmaster</option>
                  <option value="owner">Owner</option>
                  <option value="self">Triggering user</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-wide">Template (optional)</label>
            <div className="relative">
              <select value={form.template_id} onChange={(e) => setForm((f) => ({ ...f, template_id: e.target.value }))}
                className="w-full h-11 px-3 pr-8 border border-[var(--border)] rounded-xl text-[14px] bg-white focus:outline-none focus:ring-2 focus:ring-[#262262]/20 appearance-none">
                <option value="">No template (custom message)</option>
                {filtered.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-wide">Delay (minutes)</label>
            <input type="number" min={0} value={form.delay_minutes} onChange={(e) => setForm((f) => ({ ...f, delay_minutes: parseInt(e.target.value) || 0 }))}
              className="w-full h-11 px-3 border border-[var(--border)] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#262262]/20"
              placeholder="0 = immediately" />
          </div>
          <div>
            <label className="block text-[12px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-wide">Description (optional)</label>
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2}
              className="w-full px-3 py-2.5 border border-[var(--border)] rounded-xl text-[14px] resize-none focus:outline-none focus:ring-2 focus:ring-[#262262]/20"
              placeholder="What does this rule do?" />
          </div>
          <button onClick={save} disabled={saving || !form.name || !form.trigger_event}
            className="w-full h-11 rounded-xl text-[14px] font-bold text-white disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #262262, #92278F)" }}>
            {saving ? "Saving…" : "Create Rule"}
          </button>
        </div>
      </SlidePanel>
    </div>
  );
}
