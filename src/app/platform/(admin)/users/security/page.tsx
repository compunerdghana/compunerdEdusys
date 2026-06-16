"use client";

import { useState, useEffect } from "react";
import { ShieldAlert, Lock, AlertTriangle, Eye, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface SecurityStats {
  failedLoginsToday: number;
  lockedAccounts: number;
  activeSecurityEvents: number;
  suspiciousActivities: number;
}

interface SecurityEvent {
  id: string;
  severity: "low" | "medium" | "high" | "critical";
  event_type: string;
  description: string;
  user?: string;
  created_at: string;
  resolved?: boolean;
}

interface HourlyCount {
  hour: number;
  count: number;
}

const severityBadge: Record<string, string> = {
  low: "bg-blue-50 text-blue-700 border-blue-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  high: "bg-orange-50 text-orange-700 border-orange-200",
  critical: "bg-red-50 text-red-700 border-red-200",
};

export default function SecurityCenterPage() {
  const { success, error: toastError } = useToast();
  const [stats, setStats] = useState<SecurityStats>({
    failedLoginsToday: 0,
    lockedAccounts: 0,
    activeSecurityEvents: 0,
    suspiciousActivities: 0,
  });
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [hourly, setHourly] = useState<HourlyCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/platform/security")
      .then((r) => r.json())
      .then((d) => {
        setStats(d.stats ?? {
          failedLoginsToday: 0,
          lockedAccounts: 0,
          activeSecurityEvents: 0,
          suspiciousActivities: 0,
        });
        setEvents(d.events ?? []);
        setHourly(d.hourly ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleResolve(eventId: string) {
    setResolving(eventId);
    try {
      const res = await fetch(`/api/platform/security/events/${eventId}/resolve`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to resolve event");
      setEvents((prev) => prev.map((e) => e.id === eventId ? { ...e, resolved: true } : e));
      success("Event resolved.");
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Failed to resolve event");
    } finally {
      setResolving(null);
    }
  }

  const maxHourly = Math.max(...hourly.map((h) => h.count), 1);

  const summaryCards = [
    {
      label: "Failed Logins Today",
      value: stats.failedLoginsToday,
      icon: AlertTriangle,
      accent: "#ef4444",
      iconBg: "bg-red-50",
      iconColor: "text-red-500",
    },
    {
      label: "Locked Accounts",
      value: stats.lockedAccounts,
      icon: Lock,
      accent: "#f59e0b",
      iconBg: "bg-amber-50",
      iconColor: "text-amber-500",
    },
    {
      label: "Active Security Events",
      value: stats.activeSecurityEvents,
      icon: ShieldAlert,
      accent: "#f97316",
      iconBg: "bg-orange-50",
      iconColor: "text-orange-500",
    },
    {
      label: "Suspicious Activities",
      value: stats.suspiciousActivities,
      icon: Eye,
      accent: "#dc2626",
      iconBg: "bg-red-50",
      iconColor: "text-red-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[26px] font-extrabold text-slate-900 leading-tight">Security Center</h1>
        <p className="text-slate-500 text-[14px] font-semibold mt-1">
          Monitor threats and security events across the platform
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] flex items-center gap-4 p-5 border-l-4"
              style={{ borderLeftColor: card.accent }}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${card.iconBg}`}>
                <Icon size={20} className={card.iconColor} />
              </div>
              <div>
                <p className="text-[26px] font-extrabold text-slate-900 leading-none">{card.value}</p>
                <p className="text-[12px] font-semibold text-slate-500 mt-0.5">{card.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Security Events */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#f0edf8]">
          <h2 className="text-[15px] font-extrabold text-slate-800">Security Events</h2>
          <p className="text-[12px] text-slate-400 font-semibold mt-0.5">Recent alerts and anomalies</p>
        </div>
        {loading ? (
          <div className="py-12 text-center text-slate-400 font-semibold text-[13px]">Loading…</div>
        ) : events.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 size={22} className="text-emerald-500" />
            </div>
            <p className="text-slate-400 font-semibold text-[13px]">No active security events.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#f5f3fc]">
            {events.map((event) => (
              <div key={event.id} className={`flex items-start gap-4 px-6 py-4 hover:bg-[#faf9ff] transition-colors ${event.resolved ? "opacity-50" : ""}`}>
                <span
                  className={`rounded-full text-[11px] font-bold px-2.5 py-0.5 border shrink-0 mt-0.5 ${severityBadge[event.severity] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}
                >
                  {event.severity}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-bold text-slate-900 text-[13px]">{event.event_type}</p>
                  </div>
                  <p className="text-[12px] text-slate-500 font-semibold">{event.description}</p>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400 font-semibold">
                    {event.user && <span>{event.user}</span>}
                    <span>{new Date(event.created_at).toLocaleString()}</span>
                  </div>
                </div>
                {!event.resolved && (
                  <button
                    onClick={() => handleResolve(event.id)}
                    disabled={resolving === event.id}
                    className="shrink-0 px-3 py-1.5 rounded-lg text-emerald-700 font-bold text-[11px] bg-emerald-50 hover:bg-emerald-100 transition-colors disabled:opacity-60"
                  >
                    {resolving === event.id ? "…" : "Resolve"}
                  </button>
                )}
                {event.resolved && (
                  <span className="shrink-0 text-[11px] font-bold text-slate-400">Resolved</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Failed Logins Chart — last 24h */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] p-6">
        <h2 className="text-[15px] font-extrabold text-slate-800 mb-1">Failed Login Attempts</h2>
        <p className="text-[12px] text-slate-400 font-semibold mb-6">Last 24 hours by hour</p>

        {hourly.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-slate-300 font-semibold text-[13px]">
            No data available
          </div>
        ) : (
          <div className="flex items-end gap-1.5 h-40">
            {Array.from({ length: 24 }, (_, i) => {
              const entry = hourly.find((h) => h.hour === i);
              const count = entry?.count ?? 0;
              const pct = (count / maxHourly) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="relative w-full flex items-end" style={{ height: "120px" }}>
                    <div
                      className="w-full rounded-t-md transition-all"
                      style={{
                        height: `${Math.max(pct, count > 0 ? 4 : 0)}%`,
                        background: count > 5
                          ? "linear-gradient(to top, #dc2626, #f87171)"
                          : "linear-gradient(to top, #7c3aed, #a78bfa)",
                        minHeight: count > 0 ? "4px" : "0",
                      }}
                      title={`${i}:00 — ${count} failed logins`}
                    />
                  </div>
                  {i % 4 === 0 && (
                    <span className="text-[9px] font-bold text-slate-300">{i}h</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
