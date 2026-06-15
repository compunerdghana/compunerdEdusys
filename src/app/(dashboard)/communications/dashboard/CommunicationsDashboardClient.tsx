"use client";

import Link from "next/link";
import {
  Bell, MessageCircle, Smartphone, Send, FileText, Zap, History,
  Settings2, CheckCircle, XCircle, TrendingUp, AlertTriangle, Mail,
  Users, Megaphone, Clock, ChevronRight, Activity,
} from "lucide-react";

interface RecentLog {
  id: string;
  channel: string;
  message_preview: string | null;
  status: string;
  recipient_count: number | null;
  sent_at: string | null;
  recipient_type: string | null;
}

interface AutomationRule {
  id: string;
  name: string;
  trigger_event: string;
  channel: string;
  is_active: boolean;
}

interface RecentNotif {
  id: string;
  title: string;
  message: string;
  type: string;
  created_at: string;
}

interface Props {
  schoolId: string;
  tableNotReady: boolean;
  stats: {
    todaySent: number;
    deliveryRate: number;
    failed: number;
    unreadNotifications: number;
    templateCount: number;
    smsCredits: number;
    whatsappEnabled: boolean;
    smsEnabled: boolean;
  };
  byChannel: Record<string, number>;
  recentLogs: RecentLog[];
  activeRules: AutomationRule[];
  recentNotifs: RecentNotif[];
  weekTrend: { day: string; count: number }[];
}

const GRADIENT = "linear-gradient(135deg, #262262, #92278F)";

const CHANNEL_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  whatsapp:     { label: "WhatsApp",     color: "#25D366", icon: MessageCircle },
  sms:          { label: "SMS",          color: "#3b82f6", icon: Smartphone },
  email:        { label: "Email",        color: "#f59e0b", icon: Mail },
  notification: { label: "In-App",       color: "#92278F", icon: Bell },
  announcement: { label: "Announcement", color: "#262262", icon: Megaphone },
};

const TYPE_META: Record<string, { color: string; bg: string }> = {
  info:    { color: "#3b82f6", bg: "#eff6ff" },
  success: { color: "#16a34a", bg: "#f0fdf4" },
  warning: { color: "#d97706", bg: "#fffbeb" },
  error:   { color: "#dc2626", bg: "#fef2f2" },
};

const TRIGGER_LABELS: Record<string, string> = {
  student_enrolled:   "Student Enrolled",
  fee_due:            "Fee Due",
  fee_paid:           "Fee Paid",
  attendance_absent:  "Absence Marked",
  exam_scheduled:     "Exam Scheduled",
  result_published:   "Results Published",
  custom:             "Manual Trigger",
};

function timeAgo(iso: string | null) {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    delivered: { label: "Delivered", color: "#16a34a", bg: "#f0fdf4" },
    read:      { label: "Read",      color: "#262262", bg: "#eef2ff" },
    sent:      { label: "Sent",      color: "#3b82f6", bg: "#eff6ff" },
    pending:   { label: "Pending",   color: "#d97706", bg: "#fffbeb" },
    failed:    { label: "Failed",    color: "#dc2626", bg: "#fef2f2" },
  };
  const m = map[status] ?? { label: status, color: "#64748b", bg: "#f1f5f9" };
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ color: m.color, background: m.bg }}>
      {m.label}
    </span>
  );
}

const QUICK_ACTIONS = [
  { href: "/communications/whatsapp",     label: "Send WhatsApp", icon: MessageCircle, color: "#25D366" },
  { href: "/communications/sms",          label: "Send SMS",      icon: Smartphone,    color: "#3b82f6" },
  { href: "/communications/notifications",label: "Notifications", icon: Bell,          color: "#92278F" },
  { href: "/communications/templates",    label: "Templates",     icon: FileText,      color: "#f59e0b" },
  { href: "/communications/automation",   label: "Automation",    icon: Zap,           color: "#8b5cf6" },
  { href: "/communications/logs",         label: "View Logs",     icon: History,       color: "#64748b" },
  { href: "/communications/settings",     label: "Settings",      icon: Settings2,     color: "#374151" },
];

export function CommunicationsDashboardClient({
  tableNotReady, stats, byChannel, recentLogs, activeRules, recentNotifs, weekTrend,
}: Props) {
  const total = Object.values(byChannel).reduce((s, v) => s + v, 0) || 1;
  const maxTrend = Math.max(...weekTrend.map(d => d.count), 1);

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold text-[var(--text-strong)]">Communications</h1>
          <p className="text-[14px] text-[var(--text-muted)] mt-0.5">WhatsApp · SMS · In-App Notifications · Automation</p>
        </div>
        <Link href="/communications/whatsapp"
          className="h-10 px-5 rounded-xl text-[13px] font-bold text-white flex items-center gap-2 shadow"
          style={{ background: GRADIENT }}>
          <Send size={14} /> Compose Message
        </Link>
      </div>

      {/* Setup warning */}
      {tableNotReady && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-[13px] font-bold text-amber-800">Database tables not yet set up</p>
            <p className="text-[12px] text-amber-700 mt-0.5">Run <code className="font-mono bg-amber-100 px-1 rounded">supabase/migrations/communication_module.sql</code> in your Supabase SQL editor.</p>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Messages Sent Today", value: stats.todaySent,            suffix: "",  icon: Send,        color: "#262262" },
          { label: "Delivery Rate",        value: stats.deliveryRate,         suffix: "%", icon: TrendingUp,  color: "#16a34a" },
          { label: "Failed Today",         value: stats.failed,               suffix: "",  icon: XCircle,     color: "#dc2626" },
          { label: "Unread Notifications", value: stats.unreadNotifications,  suffix: "",  icon: Bell,        color: "#92278F" },
        ].map(({ label, value, suffix, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide leading-tight">{label}</p>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: color + "18" }}>
                <Icon size={16} style={{ color }} />
              </div>
            </div>
            <p className="text-[32px] font-extrabold leading-none" style={{ color }}>{value}{suffix}</p>
          </div>
        ))}
      </div>

      {/* Row: Channel breakdown + 7-day trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today by channel */}
        <div className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-sm">
          <h2 className="text-[15px] font-extrabold text-[var(--text-strong)] mb-4">Today by Channel</h2>
          {Object.keys(byChannel).length === 0 ? (
            <div className="py-10 text-center">
              <Activity size={28} className="mx-auto mb-2 opacity-20 text-[var(--text-muted)]" />
              <p className="text-[13px] text-[var(--text-muted)]">No messages sent today</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(byChannel).map(([ch, count]) => {
                const meta = CHANNEL_META[ch] ?? { label: ch, color: "#888", icon: Send };
                const Icon = meta.icon;
                return (
                  <div key={ch}>
                    <div className="flex justify-between items-center mb-1.5">
                      <div className="flex items-center gap-2">
                        <Icon size={13} style={{ color: meta.color }} />
                        <span className="text-[13px] font-semibold text-[var(--text-strong)]">{meta.label}</span>
                      </div>
                      <span className="text-[13px] font-bold" style={{ color: meta.color }}>{count}</span>
                    </div>
                    <div className="h-2 bg-[var(--neutral-100)] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${(count / total) * 100}%`, background: meta.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 7-day trend */}
        <div className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-sm">
          <h2 className="text-[15px] font-extrabold text-[var(--text-strong)] mb-4">7-Day Message Volume</h2>
          <div className="flex items-end gap-2 h-[120px]">
            {weekTrend.map(({ day, count }) => (
              <div key={day} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full flex items-end justify-center" style={{ height: "90px" }}>
                  <div
                    className="w-full rounded-t-lg transition-all"
                    style={{
                      height: count === 0 ? "4px" : `${Math.max(8, (count / maxTrend) * 90)}px`,
                      background: count === 0 ? "#e2e8f0" : GRADIENT,
                    }}
                  />
                </div>
                <p className="text-[10px] font-semibold text-[var(--text-muted)]">{day}</p>
                {count > 0 && <p className="text-[10px] font-bold text-[var(--text-strong)]">{count}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row: Recent Activity + Channel Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent activity feed */}
        <div className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-extrabold text-[var(--text-strong)]">Recent Messages</h2>
            <Link href="/communications/logs" className="text-[12px] font-semibold text-[#262262] flex items-center gap-1 hover:underline">
              View all <ChevronRight size={12} />
            </Link>
          </div>
          {recentLogs.length === 0 ? (
            <div className="py-10 text-center">
              <History size={28} className="mx-auto mb-2 opacity-20 text-[var(--text-muted)]" />
              <p className="text-[13px] text-[var(--text-muted)]">No messages sent yet</p>
              <Link href="/communications/whatsapp" className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold text-white" style={{ background: GRADIENT }}>
                <Send size={12} /> Send your first message
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {recentLogs.map((log) => {
                const meta = CHANNEL_META[log.channel] ?? { label: log.channel, color: "#888", icon: Send };
                const Icon = meta.icon;
                return (
                  <div key={log.id} className="py-3 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: meta.color + "18" }}>
                      <Icon size={14} style={{ color: meta.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[12px] font-bold" style={{ color: meta.color }}>{meta.label}</span>
                        {log.recipient_type && (
                          <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                            <Users size={10} /> {log.recipient_type.replace(/_/g, " ")}
                          </span>
                        )}
                        {log.recipient_count && log.recipient_count > 1 && (
                          <span className="text-[10px] text-[var(--text-muted)]">· {log.recipient_count} recipients</span>
                        )}
                      </div>
                      <p className="text-[12px] text-[var(--text-muted)] truncate">{log.message_preview || "—"}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <StatusBadge status={log.status} />
                      <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                        <Clock size={9} /> {timeAgo(log.sent_at)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Channel status + module stats */}
        <div className="flex flex-col gap-4">
          {/* Channel status */}
          <div className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-sm">
            <h2 className="text-[15px] font-extrabold text-[var(--text-strong)] mb-3">Channel Status</h2>
            <div className="space-y-2.5">
              {[
                { label: "WhatsApp Business", enabled: stats.whatsappEnabled, color: "#25D366", icon: MessageCircle },
                { label: "SMS",               enabled: stats.smsEnabled,       color: "#3b82f6", icon: Smartphone },
                { label: "In-App Alerts",     enabled: true,                   color: "#92278F", icon: Bell },
              ].map(({ label, enabled, color, icon: Icon }) => (
                <div key={label} className="flex items-center gap-3 p-2.5 rounded-xl border border-[var(--border)]">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: color + "18" }}>
                    <Icon size={14} style={{ color }} />
                  </div>
                  <span className="flex-1 text-[12px] font-semibold text-[var(--text-strong)]">{label}</span>
                  {enabled
                    ? <span className="flex items-center gap-1 text-[10px] font-bold text-green-600"><CheckCircle size={11} /> Active</span>
                    : <Link href="/communications/settings" className="flex items-center gap-1 text-[10px] font-bold text-amber-600 hover:underline"><XCircle size={11} /> Set up</Link>
                  }
                </div>
              ))}
            </div>
            {stats.smsCredits > 0 && (
              <div className="mt-3 p-2.5 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-[11px] text-blue-800 font-semibold">SMS Credits: <span className="font-extrabold">{stats.smsCredits.toFixed(2)}</span></p>
              </div>
            )}
          </div>

          {/* Module stats */}
          <div className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-sm">
            <h2 className="text-[15px] font-extrabold text-[var(--text-strong)] mb-3">Module Stats</h2>
            <div className="space-y-2.5">
              {[
                { label: "Templates",           value: stats.templateCount,      color: "#f59e0b", href: "/communications/templates" },
                { label: "Active Automation",   value: activeRules.length,       color: "#8b5cf6", href: "/communications/automation" },
                { label: "Unread Notifications",value: stats.unreadNotifications, color: "#92278F", href: "/communications/notifications" },
              ].map(({ label, value, color, href }) => (
                <Link key={label} href={href} className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--neutral-50)] border border-[var(--border)] hover:border-[#262262]/30 transition-colors group">
                  <span className="text-[12px] text-[var(--text-muted)] font-semibold group-hover:text-[var(--text-strong)] transition-colors">{label}</span>
                  <span className="text-[18px] font-extrabold" style={{ color }}>{value}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row: Automation rules + Recent notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active automation rules */}
        <div className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-extrabold text-[var(--text-strong)]">Active Automation Rules</h2>
            <Link href="/communications/automation" className="text-[12px] font-semibold text-[#262262] flex items-center gap-1 hover:underline">
              Manage <ChevronRight size={12} />
            </Link>
          </div>
          {activeRules.length === 0 ? (
            <div className="py-8 text-center">
              <Zap size={26} className="mx-auto mb-2 opacity-20 text-[var(--text-muted)]" />
              <p className="text-[13px] text-[var(--text-muted)]">No automation rules active</p>
              <Link href="/communications/automation" className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold text-white" style={{ background: GRADIENT }}>
                <Zap size={12} /> Create a rule
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {activeRules.map((rule) => {
                const meta = CHANNEL_META[rule.channel] ?? { label: rule.channel, color: "#888", icon: Send };
                const Icon = meta.icon;
                return (
                  <div key={rule.id} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--neutral-50)]">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: meta.color + "18" }}>
                      <Icon size={13} style={{ color: meta.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold text-[var(--text-strong)] truncate">{rule.name}</p>
                      <p className="text-[11px] text-[var(--text-muted)]">{TRIGGER_LABELS[rule.trigger_event] ?? rule.trigger_event} → {meta.label}</p>
                    </div>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 shrink-0"><CheckCircle size={10} /> On</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent unread notifications */}
        <div className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-extrabold text-[var(--text-strong)]">Unread Notifications</h2>
            <Link href="/communications/notifications" className="text-[12px] font-semibold text-[#262262] flex items-center gap-1 hover:underline">
              View all <ChevronRight size={12} />
            </Link>
          </div>
          {recentNotifs.length === 0 ? (
            <div className="py-8 text-center">
              <Bell size={26} className="mx-auto mb-2 opacity-20 text-[var(--text-muted)]" />
              <p className="text-[13px] text-[var(--text-muted)]">All caught up — no unread notifications</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentNotifs.map((n) => {
                const t = TYPE_META[n.type] ?? { color: "#64748b", bg: "#f1f5f9" };
                return (
                  <div key={n.id} className="flex items-start gap-3 p-3 rounded-xl border border-[var(--border)]">
                    <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: t.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold text-[var(--text-strong)] truncate">{n.title}</p>
                      <p className="text-[11px] text-[var(--text-muted)] line-clamp-1">{n.message}</p>
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] shrink-0 mt-0.5">{timeAgo(n.created_at)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-sm">
        <h2 className="text-[15px] font-extrabold text-[var(--text-strong)] mb-4">Quick Actions</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {QUICK_ACTIONS.map(({ href, label, icon: Icon, color }) => (
            <Link key={href} href={href}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-[var(--border)] hover:border-[#262262]/20 hover:bg-[#262262]/5 transition-all group text-center">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-all" style={{ background: color + "18" }}>
                <Icon size={18} style={{ color }} />
              </div>
              <span className="text-[11px] font-semibold text-[var(--text-muted)] group-hover:text-[var(--text-strong)] leading-tight">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
