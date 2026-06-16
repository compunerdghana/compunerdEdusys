"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, ActivitySquare } from "lucide-react";

interface AuditLog {
  id: string;
  actor_name?: string;
  actor_email?: string;
  action: string;
  module?: string;
  target?: string;
  ip_address?: string;
  created_at: string;
}

const actionColors: Record<string, string> = {
  create: "bg-emerald-50 text-emerald-700 border-emerald-200",
  edit: "bg-blue-50 text-blue-700 border-blue-200",
  update: "bg-blue-50 text-blue-700 border-blue-200",
  delete: "bg-red-50 text-red-700 border-red-200",
  view: "bg-slate-50 text-slate-600 border-slate-200",
  suspend: "bg-amber-50 text-amber-700 border-amber-200",
  lock: "bg-amber-50 text-amber-700 border-amber-200",
  login: "bg-violet-50 text-violet-700 border-violet-200",
  logout: "bg-slate-50 text-slate-500 border-slate-200",
};

function initials(name?: string) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    fetch("/api/platform/audit?limit=100")
      .then((r) => r.json())
      .then((d) => setLogs(Array.isArray(d) ? d : (d.data ?? [])))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, []);

  const modules = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => { if (l.module) set.add(l.module); });
    return Array.from(set).sort();
  }, [logs]);

  const actions = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => { if (l.action) set.add(l.action.toLowerCase()); });
    return Array.from(set).sort();
  }, [logs]);

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      const q = search.toLowerCase();
      if (q) {
        const hay = `${l.actor_name} ${l.actor_email} ${l.action} ${l.module} ${l.target}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (moduleFilter && l.module !== moduleFilter) return false;
      if (actionFilter && l.action?.toLowerCase() !== actionFilter) return false;
      if (dateFrom && new Date(l.created_at) < new Date(dateFrom)) return false;
      if (dateTo && new Date(l.created_at) > new Date(dateTo + "T23:59:59")) return false;
      return true;
    });
  }, [logs, search, moduleFilter, actionFilter, dateFrom, dateTo]);

  const inputClass =
    "h-10 px-3 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-700 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 bg-white transition-all";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[26px] font-extrabold text-slate-900 leading-tight">User Activity Logs</h1>
        <p className="text-slate-500 text-[14px] font-semibold mt-1">
          Audit trail of all platform actions
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search actor, module, target…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputClass} pl-9 w-full`}
          />
        </div>
        <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} className={inputClass}>
          <option value="">All Modules</option>
          {modules.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className={inputClass}>
          <option value="">All Actions</option>
          {actions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className={inputClass}
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className={inputClass}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#faf9ff] border-b border-[#f0edf8]">
                {["Actor", "Action", "Module", "Target", "Date / Time", "IP Address"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5f3fc]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400 font-semibold text-[13px]">
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center">
                        <ActivitySquare size={22} className="text-violet-400" />
                      </div>
                      <p className="text-slate-400 font-semibold text-[13px]">No activity logs found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-[#faf9ff] transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-extrabold shrink-0"
                          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
                        >
                          {initials(log.actor_name)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-[13px]">{log.actor_name ?? "System"}</p>
                          {log.actor_email && (
                            <p className="text-slate-400 font-semibold text-[11px]">{log.actor_email}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`rounded-full text-[11px] font-bold px-2.5 py-0.5 border ${actionColors[log.action?.toLowerCase()] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 font-semibold text-[13px]">{log.module ?? "—"}</td>
                    <td className="px-4 py-3.5 text-slate-400 font-semibold text-[13px] max-w-[180px] truncate">
                      {log.target ?? "—"}
                    </td>
                    <td className="px-4 py-3.5 text-slate-400 font-semibold text-[12px] whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 text-slate-400 font-semibold text-[12px]">
                      {log.ip_address ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
