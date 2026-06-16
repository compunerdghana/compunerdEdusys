"use client";

import { useState, useEffect, useCallback } from "react";
import { Activity, Search } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface ActivityLog {
  id: string;
  action: string;
  feature_name: string;
  actor_name: string;
  notes: string;
  created_at: string; // ISO string
}

interface GroupedLogs {
  label: string;
  date: string;
  logs: ActivityLog[];
}

const ACTION_COLORS: Record<string, string> = {
  created: "#059669",
  activated: "#0284c7",
  deactivated: "#64748b",
  archived: "#78716c",
  deleted: "#dc2626",
  assigned: "#7c3aed",
  rollout: "#4f46e5",
  beta: "#9333ea",
  updated: "#d97706",
  promoted: "#16a34a",
};

const ACTION_LABELS: Record<string, string> = {
  created: "Created feature",
  activated: "Activated feature",
  deactivated: "Deactivated feature",
  archived: "Archived feature",
  deleted: "Deleted feature",
  assigned: "Assigned to group",
  rollout: "Added to rollout",
  beta: "Added to beta",
  updated: "Updated feature",
  promoted: "Promoted to production",
};

const MOCK_LOGS: ActivityLog[] = [
  { id: "l1", action: "created", feature_name: "AI Report Generator", actor_name: "Jeffrey Baafi", notes: "", created_at: new Date().toISOString() },
  { id: "l2", action: "activated", feature_name: "Fee Collection", actor_name: "Jeffrey Baafi", notes: "", created_at: new Date().toISOString() },
  { id: "l3", action: "beta", feature_name: "WhatsApp Integration", actor_name: "Ama Agyei", notes: "Added to beta with 5 pilot schools", created_at: new Date().toISOString() },
  { id: "l4", action: "rollout", feature_name: "E-Learning Portal", actor_name: "Kofi Mensah", notes: "Northern region rollout", created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: "l5", action: "deactivated", feature_name: "SMS Notifications", actor_name: "Jeffrey Baafi", notes: "Temporary maintenance", created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: "l6", action: "updated", feature_name: "Student Management", actor_name: "Ama Agyei", notes: "Updated access level to subscription", created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: "l7", action: "promoted", feature_name: "Biometric Attendance", actor_name: "Kofi Mensah", notes: "Beta graduation to production", created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: "l8", action: "archived", feature_name: "Legacy Import Tool", actor_name: "Jeffrey Baafi", notes: "Replaced by new bulk import", created_at: new Date(Date.now() - 3 * 86400000).toISOString() },
  { id: "l9", action: "assigned", feature_name: "Payroll Processing", actor_name: "Ama Agyei", notes: "Moved to Finance Tools group", created_at: new Date(Date.now() - 4 * 86400000).toISOString() },
  { id: "l10", action: "created", feature_name: "Parent Mobile App", actor_name: "Jeffrey Baafi", notes: "", created_at: new Date(Date.now() - 5 * 86400000).toISOString() },
];

const ACTION_TYPES = Object.keys(ACTION_LABELS);

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const logDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (logDay.getTime() === today.getTime()) return "Today";
  if (logDay.getTime() === yesterday.getTime()) return "Yesterday";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function groupLogs(logs: ActivityLog[]): GroupedLogs[] {
  const map = new Map<string, ActivityLog[]>();
  for (const log of logs) {
    const d = new Date(log.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(log);
  }
  return Array.from(map.entries()).map(([, logs]) => ({
    label: formatDateLabel(logs[0].created_at),
    date: logs[0].created_at,
    logs,
  }));
}

export default function ActivityLogsPage() {
  const { error: toastError } = useToast();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterAction) params.set("action", filterAction);
      if (filterFrom) params.set("from", filterFrom);
      if (filterTo) params.set("to", filterTo);
      const res = await fetch(`/api/platform/features/activity?${params}`);
      if (res.ok) {
        const d = await res.json();
        setLogs(d.logs ?? d.data ?? []);
      } else {
        setLogs(MOCK_LOGS);
      }
    } catch {
      setLogs(MOCK_LOGS);
    } finally {
      setLoading(false);
    }
  }, [filterAction, filterFrom, filterTo]);

  useEffect(() => { load(); }, [load]);

  const filtered = logs.filter(l => {
    if (search && !l.feature_name.toLowerCase().includes(search.toLowerCase()) && !l.actor_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterAction && l.action !== filterAction) return false;
    return true;
  });

  const grouped = groupLogs(filtered);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-extrabold text-slate-900 leading-tight">Feature Activity Logs</h1>
        <p className="text-slate-500 text-[13px] font-semibold mt-1">Track all changes and actions performed on platform features</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search feature or actor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
          />
        </div>
        <select
          value={filterAction}
          onChange={e => setFilterAction(e.target.value)}
          className="px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
        >
          <option value="">All Actions</option>
          {ACTION_TYPES.map(a => (
            <option key={a} value={a}>{ACTION_LABELS[a]}</option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filterFrom}
            onChange={e => setFilterFrom(e.target.value)}
            className="px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
          />
          <span className="text-slate-400 text-[12px] font-bold">to</span>
          <input
            type="date"
            value={filterTo}
            onChange={e => setFilterTo(e.target.value)}
            className="px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
          />
        </div>
      </div>

      {/* Timeline Feed */}
      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] p-6 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-start gap-4 animate-pulse">
              <div className="w-3 h-3 rounded-full bg-slate-100 shrink-0 mt-1.5" />
              <div className="flex-1">
                <div className="h-3 bg-slate-100 rounded w-48 mb-2" />
                <div className="h-2.5 bg-slate-100 rounded w-32" />
              </div>
              <div className="h-3 bg-slate-100 rounded w-12" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center">
            <Activity size={28} className="text-violet-400" />
          </div>
          <div className="text-center">
            <p className="font-bold text-slate-700 text-[16px]">No activity logs found</p>
            <p className="text-slate-400 text-[13px] font-semibold mt-1">
              {search || filterAction || filterFrom || filterTo
                ? "Try adjusting your filters"
                : "No feature activity has been recorded yet"}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.date}>
              {/* Date header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-[#e8e4f3]" />
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest px-2">{group.label}</span>
                <div className="h-px flex-1 bg-[#e8e4f3]" />
              </div>

              {/* Logs */}
              <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] overflow-hidden">
                <div className="divide-y divide-[#f5f3fc]">
                  {group.logs.map((log) => {
                    const color = ACTION_COLORS[log.action] ?? "#64748b";
                    const label = ACTION_LABELS[log.action] ?? log.action;
                    return (
                      <div key={log.id} className="flex items-start gap-4 px-6 py-4 hover:bg-[#faf9ff] transition-colors">
                        {/* Colored dot */}
                        <div className="shrink-0 mt-1.5">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ background: color }}
                          />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] text-slate-700 leading-snug">
                            <span className="font-bold">{label}</span>
                            {" · "}
                            <span className="text-violet-600 font-bold">{log.feature_name}</span>
                            {" · "}
                            <span className="text-slate-500 font-semibold">{log.actor_name}</span>
                          </p>
                          {log.notes && (
                            <p className="text-[11px] font-semibold text-slate-400 mt-0.5 truncate">{log.notes}</p>
                          )}
                        </div>

                        {/* Time */}
                        <span className="text-[11px] font-bold text-slate-400 shrink-0">{formatTime(log.created_at)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
