"use client";

import { useEffect, useState } from "react";
import { ScrollText, Search, X, Calendar } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface ActivityLog {
  id: string;
  action: string;
  school_name: string;
  actor_name: string;
  timestamp: string;
  action_type: string;
  notes?: string;
}

const ACTION_COLORS: Record<string, string> = {
  registration: "#4f46e5",
  verification: "#0891b2",
  approval: "#059669",
  stage_change: "#7c3aed",
  assignment: "#d97706",
  training: "#ea580c",
  golive: "#16a34a",
  rejection: "#dc2626",
  note: "#64748b",
  task: "#0284c7",
};

function getActionColor(actionType: string): string {
  return ACTION_COLORS[actionType] ?? "#64748b";
}

function groupByDate(logs: ActivityLog[]): Record<string, ActivityLog[]> {
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now.getTime() - 86400000).toDateString();
  const groups: Record<string, ActivityLog[]> = {};

  logs.forEach(log => {
    const d = new Date(log.timestamp);
    const ds = d.toDateString();
    const key = ds === today ? "Today" : ds === yesterday ? "Yesterday" : d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
    if (!groups[key]) groups[key] = [];
    groups[key].push(log);
  });

  return groups;
}

function formatTime(ts: string) {
  try {
    return new Date(ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

export default function ActivityPage() {
  const { error: toastError } = useToast();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [school, setSchool] = useState("");
  const [action, setAction] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    fetch("/api/platform/onboarding/activity")
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setLogs(d.logs ?? d.data ?? []))
      .catch(() => {
        // graceful empty state
        setLogs([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = logs.filter(log => {
    const matchSchool = !school || log.school_name?.toLowerCase().includes(school.toLowerCase());
    const matchAction = !action || log.action_type === action || log.action?.toLowerCase().includes(action.toLowerCase());
    const matchFrom = !dateFrom || new Date(log.timestamp) >= new Date(dateFrom);
    const matchTo = !dateTo || new Date(log.timestamp) <= new Date(dateTo + "T23:59:59");
    return matchSchool && matchAction && matchFrom && matchTo;
  });

  const grouped = groupByDate(filtered);
  const actionTypes = [...new Set(logs.map(l => l.action_type).filter(Boolean))];
  const hasFilters = school || action || dateFrom || dateTo;

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[26px] font-extrabold text-slate-900">Onboarding Activity Logs</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            {loading ? "Loading…" : `${filtered.length} activity records`}
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] p-5 mb-6">
          <div className="grid grid-cols-4 gap-3">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full pl-8 pr-3 h-9 rounded-xl border border-[#e0daf0] text-[12px] font-semibold text-slate-700 outline-none focus:border-[#7c3aed] transition-all bg-white"
                placeholder="Filter by school..."
                value={school} onChange={e => setSchool(e.target.value)} />
            </div>
            <select className="px-3 h-9 rounded-xl border border-[#e0daf0] text-[12px] font-semibold text-slate-700 bg-white outline-none focus:border-[#7c3aed] transition-all"
              value={action} onChange={e => setAction(e.target.value)}>
              <option value="">All Actions</option>
              {actionTypes.map(a => <option key={a} value={a}>{a.replace(/_/g, " ")}</option>)}
            </select>
            <div className="relative">
              <Calendar size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="date" className="w-full pl-8 pr-3 h-9 rounded-xl border border-[#e0daf0] text-[12px] font-semibold text-slate-700 bg-white outline-none focus:border-[#7c3aed] transition-all"
                value={dateFrom} onChange={e => setDateFrom(e.target.value)} placeholder="From" />
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Calendar size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="date" className="w-full pl-8 pr-3 h-9 rounded-xl border border-[#e0daf0] text-[12px] font-semibold text-slate-700 bg-white outline-none focus:border-[#7c3aed] transition-all"
                  value={dateTo} onChange={e => setDateTo(e.target.value)} placeholder="To" />
              </div>
              {hasFilters && (
                <button onClick={() => { setSchool(""); setAction(""); setDateFrom(""); setDateTo(""); }}
                  className="w-9 h-9 rounded-xl border border-[#e0daf0] flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-[#f8f7ff] transition-all shrink-0">
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        {loading ? (
          <div className="space-y-6">
            {[1, 2].map(g => (
              <div key={g}>
                <div className="h-4 w-20 bg-slate-100 rounded animate-pulse mb-4" />
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-4 animate-pulse">
                      <div className="w-3 h-3 rounded-full bg-slate-100 mt-1.5 shrink-0" />
                      <div className="flex-1 bg-white rounded-2xl border border-[#e8e4f3] p-4 space-y-2">
                        <div className="h-4 bg-slate-100 rounded w-2/3" />
                        <div className="h-3 bg-slate-100 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] py-16 text-center">
            <ScrollText size={40} className="text-slate-200 mx-auto mb-4" />
            <p className="text-[15px] font-extrabold text-slate-400 mb-1">No activity logs found</p>
            <p className="text-[13px] text-slate-300">
              {hasFilters ? "Try adjusting your filters" : "Activity will appear here as onboarding actions are taken"}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([date, items]) => (
              <div key={date}>
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-[13px] font-extrabold text-slate-500 uppercase tracking-widest">{date}</h3>
                  <div className="flex-1 h-px bg-[#e8e4f3]" />
                  <span className="text-[11px] font-bold text-slate-400 bg-[#f0edf8] px-2 py-0.5 rounded-full">{items.length}</span>
                </div>
                <div className="relative pl-5 space-y-0">
                  {/* Timeline line */}
                  <div className="absolute left-[5px] top-2 bottom-2 w-px bg-[#e8e4f3]" />
                  {items.map((log, idx) => {
                    const color = getActionColor(log.action_type);
                    return (
                      <div key={log.id} className={`flex gap-4 ${idx < items.length - 1 ? "pb-4" : ""}`}>
                        {/* Dot */}
                        <div
                          className="w-3 h-3 rounded-full shrink-0 mt-3 border-2 border-white shadow"
                          style={{ background: color, zIndex: 1 }}
                        />
                        {/* Card */}
                        <div className="flex-1 bg-white rounded-2xl border border-[#e8e4f3] px-5 py-4 hover:shadow-sm transition-shadow">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[13px] font-extrabold text-slate-900">{log.action}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[12px] font-bold" style={{ color }}>{log.school_name ?? "—"}</span>
                                {log.actor_name && (
                                  <>
                                    <span className="text-slate-300">·</span>
                                    <span className="text-[12px] font-semibold text-slate-400">by {log.actor_name}</span>
                                  </>
                                )}
                              </div>
                              {log.notes && (
                                <p className="text-[11px] text-slate-400 font-semibold mt-1.5 italic">{log.notes}</p>
                              )}
                            </div>
                            <span className="text-[11px] font-bold text-slate-300 shrink-0 mt-0.5">{formatTime(log.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
