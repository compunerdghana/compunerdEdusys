"use client";

import { useState, useEffect, useCallback } from "react";
import { BarChart2, Phone, MessageSquare, Mail, Bell, TrendingUp, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";

interface ChannelStat { sent: number; delivered: number; read: number; failed: number; rate: number; }
interface ReportData {
  channelStats: Record<string, ChannelStat>;
  campaigns: {
    id: string; name: string; type: string; status: string;
    total_recipients: number; sent_count: number; delivered_count: number; failed_count: number;
  }[];
  monthlyTrend: { month: string; total: number; delivered: number; rate: number; whatsapp: number; sms: number; email: number }[];
}

const channelConfig = [
  { key: "whatsapp", label: "WhatsApp", icon: Phone, color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
  { key: "sms", label: "SMS", icon: MessageSquare, color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
  { key: "email", label: "Email", icon: Mail, color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  { key: "notification", label: "Notification", icon: Bell, color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
];

export default function DeliveryReportsPage() {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetch("/api/platform/communication/reports").then(r => r.json()).catch(() => null);
    setReport(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold text-slate-900 leading-tight flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#0f766e,#0d9488)" }}>
              <BarChart2 size={16} className="text-white" />
            </div>
            Delivery Reports
          </h1>
          <p className="text-slate-500 text-[13px] font-semibold mt-1 ml-12">Delivery success rates and performance analytics.</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-bold border border-[#e0daf0] text-slate-600 hover:bg-slate-50 transition-all">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Channel Breakdown Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {channelConfig.map(ch => {
          const stat = report?.channelStats?.[ch.key];
          const Icon = ch.icon;
          return (
            <div key={ch.key} className="bg-white rounded-2xl border border-[#e8e4f3] shadow-sm p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: ch.bg }}>
                  <Icon size={16} style={{ color: ch.color }} />
                </div>
                <span className="font-extrabold text-slate-800 text-[13px]">{ch.label}</span>
              </div>
              {loading ? (
                <div className="h-20 flex items-center justify-center">
                  <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#e0daf0", borderTopColor: ch.color }} />
                </div>
              ) : (
                <>
                  <div className="space-y-2 mb-3">
                    {[
                      { label: "Sent", value: stat?.sent ?? 0, color: "#64748b" },
                      { label: "Delivered", value: stat?.delivered ?? 0, color: ch.color },
                      { label: "Failed", value: stat?.failed ?? 0, color: "#ef4444" },
                    ].map(row => (
                      <div key={row.label} className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-500 font-semibold">{row.label}</span>
                        <span className="text-[13px] font-extrabold" style={{ color: row.color }}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mb-2">
                    <div className="h-full rounded-full transition-all" style={{ width: `${stat?.rate ?? 0}%`, background: ch.color }} />
                  </div>
                  <p className="text-[12px] font-extrabold text-center" style={{ color: ch.color }}>{stat?.rate ?? 0}% delivery rate</p>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Monthly trend */}
        <div className="bg-white rounded-2xl border border-[#e8e4f3] shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}>
              <TrendingUp size={16} className="text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-[14px]">Monthly Volume Trend</h3>
              <p className="text-[11px] text-slate-400 font-semibold">Last 6 months by channel</p>
            </div>
          </div>
          {loading ? (
            <div className="h-52 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#e0daf0", borderTopColor: "#7c3aed" }} />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={report?.monthlyTrend ?? []} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0edf8" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="whatsapp" fill="#22c55e" name="WhatsApp" radius={[3, 3, 0, 0]} />
                <Bar dataKey="sms" fill="#3b82f6" name="SMS" radius={[3, 3, 0, 0]} />
                <Bar dataKey="email" fill="#f59e0b" name="Email" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Delivery rate trend */}
        <div className="bg-white rounded-2xl border border-[#e8e4f3] shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#0f766e,#0d9488)" }}>
              <CheckCircle2 size={16} className="text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-[14px]">Delivery Rate Trend</h3>
              <p className="text-[11px] text-slate-400 font-semibold">Monthly success percentage</p>
            </div>
          </div>
          {loading ? (
            <div className="h-52 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#e0daf0", borderTopColor: "#0d9488" }} />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={report?.monthlyTrend ?? []} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0edf8" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} unit="%" />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} formatter={(v) => [`${v}%`, "Delivery Rate"]} />
                <Line type="monotone" dataKey="rate" stroke="#0d9488" strokeWidth={2.5} dot={{ r: 4 }} name="Delivery Rate" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Campaign Performance Table */}
      {(report?.campaigns ?? []).length > 0 && (
        <div className="bg-white rounded-2xl border border-[#e8e4f3] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#f0edf8]">
            <h3 className="font-extrabold text-slate-900 text-[14px]">Campaign Performance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#faf9ff]">
                  {["Campaign", "Type", "Recipients", "Sent", "Delivered", "Failed", "Rate"].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[11px] font-extrabold text-slate-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f8f6ff]">
                {(report?.campaigns ?? []).map(camp => {
                  const rate = camp.total_recipients > 0 ? Math.round((camp.sent_count / camp.total_recipients) * 100) : 0;
                  return (
                    <tr key={camp.id} className="hover:bg-[#faf9ff] transition-colors">
                      <td className="px-5 py-3.5"><p className="font-bold text-slate-800 text-[13px]">{camp.name}</p></td>
                      <td className="px-5 py-3.5">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-100">{camp.type}</span>
                      </td>
                      <td className="px-5 py-3.5 text-[13px] font-bold text-slate-700">{camp.total_recipients}</td>
                      <td className="px-5 py-3.5 text-[13px] font-bold text-blue-600">{camp.sent_count}</td>
                      <td className="px-5 py-3.5 text-[13px] font-bold text-emerald-600">{camp.delivered_count}</td>
                      <td className="px-5 py-3.5 text-[13px] font-bold text-red-500">{camp.failed_count}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${rate}%`, background: rate >= 70 ? "#22c55e" : rate >= 40 ? "#f59e0b" : "#ef4444" }} />
                          </div>
                          <span className="text-[12px] font-extrabold text-slate-700">{rate}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
