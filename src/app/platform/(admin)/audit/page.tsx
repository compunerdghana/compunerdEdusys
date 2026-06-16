"use client";

import { useState, useEffect } from "react";
import { Shield, Filter, X } from "lucide-react";

const actionColors: Record<string, string> = {
  create: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  update: "bg-blue-50 text-blue-700 border border-blue-100",
  delete: "bg-red-50 text-red-700 border border-red-100",
  suspend: "bg-red-50 text-red-700 border border-red-100",
  activate: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  login: "bg-violet-50 text-violet-700 border border-violet-100",
  impersonate: "bg-amber-50 text-amber-700 border border-amber-100",
  renew: "bg-cyan-50 text-cyan-700 border border-cyan-100",
  toggle: "bg-indigo-50 text-indigo-700 border border-indigo-100",
};

const actionDotColor: Record<string, string> = {
  create: "bg-emerald-500",
  update: "bg-blue-500",
  delete: "bg-red-500",
  suspend: "bg-red-500",
  activate: "bg-emerald-500",
  login: "bg-violet-500",
  impersonate: "bg-amber-500",
  renew: "bg-cyan-500",
  toggle: "bg-indigo-500",
};

const actionGrad: Record<string, string> = {
  create: "linear-gradient(135deg, #10b981, #059669)",
  update: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
  delete: "linear-gradient(135deg, #ef4444, #b91c1c)",
  suspend: "linear-gradient(135deg, #ef4444, #b91c1c)",
  activate: "linear-gradient(135deg, #10b981, #059669)",
  login: "linear-gradient(135deg, #7c3aed, #4f46e5)",
  impersonate: "linear-gradient(135deg, #f59e0b, #d97706)",
  renew: "linear-gradient(135deg, #06b6d4, #0891b2)",
  toggle: "linear-gradient(135deg, #6366f1, #4338ca)",
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
  const hasFilters = actionFilter !== "all" || schoolSearch || dateFrom || dateTo;

  function initials(name: string) {
    return (name ?? "?").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  }

  const inputClass = "px-3 h-9 rounded-xl border border-[#e0daf0] text-[12px] font-semibold text-slate-700 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-extrabold text-slate-900 leading-tight">Audit Logs</h1>
        <p className="text-slate-500 text-[13px] font-semibold mt-1">Track all administrative actions on the platform.</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] p-5">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={13} className="text-slate-400" />
          <span className="text-[13px] font-bold text-slate-700">Filters</span>
          {hasFilters && (
            <button
              onClick={() => { setActionFilter("all"); setSchoolSearch(""); setDateFrom(""); setDateTo(""); }}
              className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-[11px] font-bold text-slate-600 hover:bg-slate-200 transition-colors"
            >
              <X size={11} />
              Clear
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className={inputClass}
          >
            <option value="all">All Actions</option>
            {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <input
            type="text"
            placeholder="Filter by school…"
            value={schoolSearch}
            onChange={e => setSchoolSearch(e.target.value)}
            className={inputClass}
            style={{ minWidth: 160 }}
          />
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className={inputClass}
          />
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#f0edf8] flex items-center justify-between">
          <h2 className="font-extrabold text-slate-900 text-[15px]">Activity Timeline</h2>
          <span className="text-[12px] font-bold text-slate-400">{filtered.length} entries</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div
              className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: "#e0daf0", borderTopColor: "#7c3aed" }}
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center">
              <Shield size={22} className="text-slate-300" />
            </div>
            <p className="text-slate-400 font-semibold text-[13px]">No audit logs found.</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[52px] top-0 bottom-0 w-px bg-[#f0edf8]" />

            <div className="divide-y divide-[#f5f3fc]">
              {filtered.map(log => (
                <div key={log.id} className="flex items-start gap-4 px-6 py-4 hover:bg-[#faf9ff] transition-colors relative">
                  {/* Actor avatar */}
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-[11px] font-extrabold shrink-0 z-10"
                    style={{ background: actionGrad[log.action] ?? "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
                  >
                    {initials(log.actor_name ?? "SYS")}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-[13px]">{log.actor_name ?? "System"}</span>
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${actionColors[log.action] ?? "bg-slate-50 text-slate-500 border border-slate-100"}`}>
                        {log.action}
                      </span>
                      {log.target && (
                        <span className="text-[13px] font-semibold text-slate-600">
                          on <span className="text-slate-900 font-bold">{log.target}</span>
                        </span>
                      )}
                      {log.school_name && (
                        <span className="text-[11px] font-semibold text-slate-400">({log.school_name})</span>
                      )}
                    </div>
                    <p className="text-[11px] font-semibold text-slate-400 mt-1">
                      {new Date(log.created_at).toLocaleString("en-GH", {
                        day: "numeric", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>

                  {/* Action dot on timeline */}
                  <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${actionDotColor[log.action] ?? "bg-slate-300"}`} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
