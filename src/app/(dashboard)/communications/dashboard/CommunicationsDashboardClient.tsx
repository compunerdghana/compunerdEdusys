"use client";

import Link from "next/link";
import {
  Bell, MessageCircle, Smartphone, Send, FileText, Zap, History,
  Settings2, CheckCircle, XCircle, TrendingUp, AlertTriangle,
} from "lucide-react";

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
}

const STAT_CARDS = [
  { label: "Messages Sent Today", key: "todaySent", icon: Send, color: "#262262", bg: "#262262/10" },
  { label: "Delivery Rate", key: "deliveryRate", icon: TrendingUp, color: "#16a34a", bg: "green-50", suffix: "%" },
  { label: "Failed Today", key: "failed", icon: XCircle, color: "#dc2626", bg: "red-50" },
  { label: "Unread Notifications", key: "unreadNotifications", icon: Bell, color: "#92278F", bg: "purple-50" },
];

const QUICK_ACTIONS = [
  { href: "/communications/whatsapp", label: "Send WhatsApp", icon: MessageCircle, color: "#25D366" },
  { href: "/communications/sms", label: "Send SMS", icon: Smartphone, color: "#3b82f6" },
  { href: "/communications/notifications", label: "Notifications", icon: Bell, color: "#92278F" },
  { href: "/communications/templates", label: "Templates", icon: FileText, color: "#f59e0b" },
  { href: "/communications/automation", label: "Automation", icon: Zap, color: "#8b5cf6" },
  { href: "/communications/logs", label: "View Logs", icon: History, color: "#64748b" },
  { href: "/communications/settings", label: "Settings", icon: Settings2, color: "#374151" },
];

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  sms: "SMS",
  email: "Email",
  notification: "In-App",
  announcement: "Announcement",
};

const CHANNEL_COLORS: Record<string, string> = {
  whatsapp: "#25D366",
  sms: "#3b82f6",
  email: "#f59e0b",
  notification: "#92278F",
  announcement: "#262262",
};

export function CommunicationsDashboardClient({ tableNotReady, stats, byChannel }: Props) {
  const total = Object.values(byChannel).reduce((s, v) => s + v, 0) || 1;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold text-[var(--text-strong)]">Communications</h1>
          <p className="text-[14px] text-[var(--text-muted)] mt-0.5">WhatsApp, SMS, In-App Notifications & Automation</p>
        </div>
        <Link href="/communications/whatsapp"
          className="h-10 px-5 rounded-xl text-[13px] font-bold text-white flex items-center gap-2 shadow"
          style={{ background: "linear-gradient(135deg, #262262, #92278F)" }}>
          <Send size={14} /> Compose Message
        </Link>
      </div>

      {/* Table not ready warning */}
      {tableNotReady && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-[13px] font-bold text-amber-800">Database tables not yet set up</p>
            <p className="text-[12px] text-amber-700 mt-0.5">Run <code className="font-mono bg-amber-100 px-1 rounded">supabase/migrations/communication_module.sql</code> in your Supabase SQL editor to enable this module.</p>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map(({ label, key, icon: Icon, color, suffix = "" }) => (
          <div key={key} className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">{label}</p>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: color + "18" }}>
                <Icon size={16} style={{ color }} />
              </div>
            </div>
            <p className="text-[28px] font-extrabold leading-none" style={{ color }}>
              {stats[key as keyof typeof stats] as number}{suffix}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Channel breakdown */}
        <div className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-sm lg:col-span-1">
          <h2 className="text-[15px] font-extrabold text-[var(--text-strong)] mb-4">Today by Channel</h2>
          {Object.keys(byChannel).length === 0 ? (
            <div className="py-8 text-center text-[13px] text-[var(--text-muted)]">No messages sent today</div>
          ) : (
            <div className="space-y-3">
              {Object.entries(byChannel).map(([ch, count]) => (
                <div key={ch}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[13px] font-semibold text-[var(--text-strong)]">{CHANNEL_LABELS[ch] ?? ch}</span>
                    <span className="text-[13px] font-bold text-[var(--text-muted)]">{count}</span>
                  </div>
                  <div className="h-2 bg-[var(--neutral-100)] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${(count / total) * 100}%`, background: CHANNEL_COLORS[ch] ?? "#888" }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Channel status */}
        <div className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-sm">
          <h2 className="text-[15px] font-extrabold text-[var(--text-strong)] mb-4">Channel Status</h2>
          <div className="space-y-3">
            {[
              { label: "WhatsApp Business", enabled: stats.whatsappEnabled, color: "#25D366", icon: MessageCircle },
              { label: "SMS (Arkesel/Hubtel)", enabled: stats.smsEnabled, color: "#3b82f6", icon: Smartphone },
              { label: "In-App Notifications", enabled: true, color: "#92278F", icon: Bell },
            ].map(({ label, enabled, color, icon: Icon }) => (
              <div key={label} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)]">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color + "18" }}>
                  <Icon size={15} style={{ color }} />
                </div>
                <span className="flex-1 text-[13px] font-semibold text-[var(--text-strong)]">{label}</span>
                {enabled
                  ? <span className="flex items-center gap-1 text-[11px] font-bold text-green-600"><CheckCircle size={12} /> Active</span>
                  : <span className="flex items-center gap-1 text-[11px] font-bold text-[var(--text-muted)]"><XCircle size={12} /> Not configured</span>
                }
              </div>
            ))}
          </div>
          {stats.smsCredits > 0 && (
            <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-[12px] text-blue-800 font-semibold">SMS Credits: <span className="font-extrabold">{stats.smsCredits.toFixed(2)}</span></p>
            </div>
          )}
        </div>

        {/* Quick stats / templates */}
        <div className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-sm">
          <h2 className="text-[15px] font-extrabold text-[var(--text-strong)] mb-4">Module Stats</h2>
          <div className="space-y-3">
            {[
              { label: "Templates Available", value: stats.templateCount, color: "#f59e0b" },
              { label: "Unread Notifications", value: stats.unreadNotifications, color: "#92278F" },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between p-3 rounded-xl bg-[var(--neutral-50)] border border-[var(--border)]">
                <span className="text-[13px] text-[var(--text-muted)] font-semibold">{label}</span>
                <span className="text-[20px] font-extrabold" style={{ color }}>{value}</span>
              </div>
            ))}
          </div>
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
