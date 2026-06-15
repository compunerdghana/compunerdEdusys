"use client";

import { useState, useEffect } from "react";
import { Shield, Filter } from "lucide-react";

const PLATFORM_GRADIENT = "linear-gradient(135deg, #1a0533, #2d1b69, #6b1f8a)";

const actionColors: Record<string, string> = {
  create: "bg-emerald-100 text-emerald-700",
  update: "bg-blue-100 text-blue-700",
  delete: "bg-red-100 text-red-700",
  suspend: "bg-red-100 text-red-700",
  activate: "bg-emerald-100 text-emerald-700",
  login: "bg-purple-100 text-purple-700",
  impersonate: "bg-amber-100 text-amber-700",
  renew: "bg-cyan-100 text-cyan-700",
  toggle: "bg-indigo-100 text-indigo-700",
};

const actionDot: Record<string, string> = {
  create: "bg-emerald-500",
  update: "bg-blue-500",
  delete: "bg-red-500",
  suspend: "bg-red-500",
  activate: "bg-emerald-500",
  login: "bg-purple-500",
  impersonate: "bg-amber-500",
  renew: "bg-cyan-500",
  toggle: "bg-indigo-500",
};

interface AuditLog {
  id: string;
  action: string;
  target?: string;
  target_type?: string;
  actor_name?: string;
  actor_id?: string;
  school_id?: string;
  school_name?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [schoolSearch, setSchoolSearch] = useState("");

  useEffect(() => {
    fetch("/api/platform/audit?limit=100")
      .then(r => r.json())
      .then(d => setLogs(d.logs ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = logs.filter(log => {
    if (actionFilter !== "all" && log.action !== actionFilter) return false;
    if (schoolSearch && !log.school_name?.toLowerCase().includes(schoolSearch.toLowerCase())) return false;
    if (dateFrom && new Date(log.created_at) < new Date(dateFrom)) return false;
    if (dateTo && new Date(log.created_at) > new Date(dateTo + "T23:59:59")) return false;
    return true;
  });

  const uniqueActions = Array.from(new Set(logs.map(l => l.action)));

  function initials(name: string) {
    return (name ?? "?").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl px-8 py-6 text-white" style={{ background: PLATFORM_GRADIENT }}>
        <h1 className="text-2xl font-extrabold">Audit Logs</h1>
        <p className="text-white/60 font-semibold mt-1">Track all administrative actions on the platform.</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={14} className="text-slate-400" />
          <span className="text-sm font-bold text-slate-700">Filters</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <select value={actionFilter} onChange={e => setActionFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 outline-none focus:border-purple-400 bg-white">
            <option value="all">All Actions</option>
            {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <input type="text" placeholder="Filter by school…" value={schoolSearch} onChange={e => setSchoolSearch(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-purple-400 transition-colors" />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-purple-400 transition-colors" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-purple-400 transition-colors" />
          {(actionFilter !== "all" || schoolSearch || dateFrom || dateTo) && (
            <button onClick={() => { setActionFilter("all"); setSchoolSearch(""); setDateFrom(""); setDateTo(""); }}
              className="px-3 py-2 rounded-xl bg-slate-100 text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-extrabold text-slate-900">Activity Timeline</h2>
          <span className="text-xs font-bold text-slate-400">{filtered.length} entries</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-purple-300 border-t-purple-700 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <Shield size={28} className="text-slate-300" />
            <p className="text-slate-400 font-semibold">No audit logs found.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filtered.map(log => (
              <div key={log.id} className="flex items-start gap-4 px-6 py-4 hover:bg-slate-50 transition-colors">
                {/* Avatar / actor */}
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-extrabold shrink-0"
                  style={{ background: PLATFORM_GRADIENT }}>
                  {initials(log.actor_name ?? "SYS")}
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 text-sm">{log.actor_name ?? "System"}</span>
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${actionColors[log.action] ?? "bg-slate-100 text-slate-500"}`}>
                      {log.action}
                    </span>
                    {log.target && <span className="text-sm font-semibold text-slate-600">on <span className="text-slate-900">{log.target}</span></span>}
                    {log.school_name && (
                      <span className="text-xs font-semibold text-slate-400">({log.school_name})</span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">
                    {new Date(log.created_at).toLocaleString("en-GH", {
                      day: "numeric", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>
                {/* Action dot */}
                <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${actionDot[log.action] ?? "bg-slate-300"}`} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
