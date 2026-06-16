"use client";

import { useState, useEffect } from "react";
import {
  MessageSquare, Phone, Mail, Bell, Target, TrendingUp,
  CheckCircle2, XCircle, BarChart2, Activity, RefreshCw,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";

interface StatsData {
  whatsappToday: number;
  smsToday: number;
  emailToday: number;
  notificationsToday: number;
  activeCampaigns: number;
  deliveryRate: number;
  trend: { date: string; whatsapp: number; sms: number; email: number; notification: number }[];
  recentLogs: {
    id: string;
    channel: string;
    school_name: string;
    recipient: string;
    status: string;
    message_preview: string;
    created_at: string;
  }[];
}

const channelColor: Record<string, string> = {
  whatsapp: "#22c55e",
  sms: "#3b82f6",
  email: "#f59e0b",
  notification: "#8b5cf6",
};

const channelIcon: Record<string, React.ElementType> = {
  whatsapp: Phone,
  sms: MessageSquare,
  email: Mail,
  notification: Bell,
};

const statusStyle: Record<string, string> = {
  sent: "bg-blue-50 text-blue-700 border border-blue-100",
  delivered: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  read: "bg-violet-50 text-violet-700 border border-violet-100",
  failed: "bg-red-50 text-red-700 border border-red-100",
  pending: "bg-slate-50 text-slate-500 border border-slate-200",
};

export default function CommunicationDashboardPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/platform/communication/stats");
      const d = await res.json();
      setStats(d);
    } catch {
      // use empty state
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const cards = [
    { label: "WhatsApp Sent Today", value: stats?.whatsappToday ?? 0, icon: Phone, color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
    { label: "SMS Sent Today", value: stats?.smsToday ?? 0, icon: MessageSquare, color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
    { label: "Emails Sent Today", value: stats?.emailToday ?? 0, icon: Mail, color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
    { label: "Notifications Sent", value: stats?.notificationsToday ?? 0, icon: Bell, color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
    { label: "Active Campaigns", value: stats?.activeCampaigns ?? 0, icon: Target, color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
    { label: "Delivery Rate", value: `${stats?.deliveryRate ?? 0}%`, icon: TrendingUp, color: "#0ea5e9", bg: "rgba(14,165,233,0.1)" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold text-slate-900 leading-tight">Communication Dashboard</h1>
          <p className="text-slate-500 text-[13px] font-semibold mt-1">
            Overview of all communication channels and activity.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold border border-[#e0daf0] text-slate-600 hover:bg-violet-50 transition-all"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-2xl border border-[#e8e4f3] shadow-sm p-5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ background: card.bg }}
              >
                <Icon size={18} style={{ color: card.color }} />
              </div>
              <p className="text-[24px] font-extrabold text-slate-900 leading-none">{card.value}</p>
              <p className="text-[11px] font-semibold text-slate-400 mt-1.5 leading-tight">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* 7-Day Message Trend */}
        <div className="bg-white rounded-2xl border border-[#e8e4f3] shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}>
              <Activity size={16} className="text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-[14px]">7-Day Message Volume</h3>
              <p className="text-[11px] text-slate-400 font-semibold">Messages sent per channel</p>
            </div>
          </div>
          {loading ? (
            <div className="h-52 flex items-center justify-center">
              <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#e0daf0", borderTopColor: "#7c3aed" }} />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={stats?.trend ?? []} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0edf8" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e0daf0", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="whatsapp" stroke="#22c55e" fill="rgba(34,197,94,0.08)" strokeWidth={2} name="WhatsApp" />
                <Area type="monotone" dataKey="sms" stroke="#3b82f6" fill="rgba(59,130,246,0.08)" strokeWidth={2} name="SMS" />
                <Area type="monotone" dataKey="email" stroke="#f59e0b" fill="rgba(245,158,11,0.08)" strokeWidth={2} name="Email" />
                <Area type="monotone" dataKey="notification" stroke="#8b5cf6" fill="rgba(139,92,246,0.08)" strokeWidth={2} name="Notification" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Channel Breakdown Bar */}
        <div className="bg-white rounded-2xl border border-[#e8e4f3] shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}>
              <BarChart2 size={16} className="text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-[14px]">Channel Comparison</h3>
              <p className="text-[11px] text-slate-400 font-semibold">Volume per day by channel</p>
            </div>
          </div>
          {loading ? (
            <div className="h-52 flex items-center justify-center">
              <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#e0daf0", borderTopColor: "#7c3aed" }} />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats?.trend ?? []} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0edf8" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e0daf0", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="whatsapp" fill="#22c55e" name="WhatsApp" radius={[4, 4, 0, 0]} />
                <Bar dataKey="sms" fill="#3b82f6" name="SMS" radius={[4, 4, 0, 0]} />
                <Bar dataKey="email" fill="#f59e0b" name="Email" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent Communication Logs */}
      <div className="bg-white rounded-2xl border border-[#e8e4f3] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#f0edf8] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}>
              <Activity size={14} className="text-white" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-[14px]">Recent Activity</h3>
          </div>
          <a href="/platform/communication/logs" className="text-[12px] font-bold text-violet-600 hover:text-violet-800 transition-colors">
            View All Logs →
          </a>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#e0daf0", borderTopColor: "#7c3aed" }} />
          </div>
        ) : (stats?.recentLogs ?? []).length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center">
              <MessageSquare size={20} className="text-violet-400" />
            </div>
            <p className="text-slate-500 font-semibold text-[13px]">No communication logs yet.</p>
            <p className="text-slate-400 text-[12px]">Send your first message to see activity here.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#f8f6ff]">
            {(stats?.recentLogs ?? []).map((log) => {
              const Icon = channelIcon[log.channel] ?? MessageSquare;
              return (
                <div key={log.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-[#faf9ff] transition-colors">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${channelColor[log.channel] ?? "#6366f1"}20` }}
                  >
                    <Icon size={13} style={{ color: channelColor[log.channel] ?? "#6366f1" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-800 text-[12px] truncate">{log.school_name ?? log.recipient}</p>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">{log.channel}</span>
                    </div>
                    <p className="text-slate-400 text-[11px] font-semibold truncate mt-0.5">{log.message_preview}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${statusStyle[log.status] ?? "bg-slate-50 text-slate-500"}`}>
                      {log.status}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString("en-GH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Action Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Send WhatsApp", href: "/platform/communication/whatsapp", icon: Phone, color: "#22c55e" },
          { label: "Send SMS", href: "/platform/communication/sms", icon: MessageSquare, color: "#3b82f6" },
          { label: "Send Email", href: "/platform/communication/email", icon: Mail, color: "#f59e0b" },
          { label: "New Campaign", href: "/platform/communication/campaigns", icon: Target, color: "#ef4444" },
        ].map((q) => {
          const Icon = q.icon;
          return (
            <a
              key={q.href}
              href={q.href}
              className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-[#e8e4f3] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${q.color}20` }}>
                <Icon size={16} style={{ color: q.color }} />
              </div>
              <span className="font-bold text-slate-700 text-[13px] group-hover:text-slate-900 transition-colors">{q.label}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
