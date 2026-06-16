"use client";

import { useState, useEffect, useCallback } from "react";
import { ScrollText, RefreshCw, Loader2, Search } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface AuditLog {
  id: string;
  actor_name: string;
  action: string;
  target_type: string;
  details: any;
  ip_address?: string;
  device?: string;
  created_at: string;
}

const inputClass =
  "w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white";

export default function SchoolAuditLogsPage() {
  const { error: toastError } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      let url = "/api/school/user-management/audit-logs?limit=100";
      if (actionFilter) url += `&action=${actionFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setLogs(data.logs ?? []);
    } catch {
      toastError("Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  }, [actionFilter, toastError]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const filtered = logs.filter((log) => {
    const q = search.toLowerCase();
    if (q) {
      const matchActor = log.actor_name?.toLowerCase().includes(q);
      const matchAction = log.action?.toLowerCase().includes(q);
      const matchTarget = log.target_type?.toLowerCase().includes(q);
      const matchDetails = JSON.stringify(log.details).toLowerCase().includes(q);
      return matchActor || matchAction || matchTarget || matchDetails;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold text-slate-900 leading-tight flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white bg-violet-600 shadow-md">
              <ScrollText size={16} />
            </div>
            School Activity Audit Logs
          </h1>
          <p className="text-slate-500 text-[13px] font-semibold mt-1">
            Track user account creation, roles modification, logins, and settings updates in your tenant.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search logs by actor, action, details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputClass} pl-9`}
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="h-10 px-3 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-700 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 bg-white"
        >
          <option value="">All Actions</option>
          <option value="user.create">User Registration</option>
          <option value="user.update">User Profile Update</option>
          <option value="user.suspend">User Suspension</option>
          <option value="user.password_reset">Password Reset</option>
          <option value="role.create">Role Creation</option>
          <option value="role.delete">Role Deletion</option>
          <option value="role.permissions_update">Permissions Config</option>
        </select>
        <button onClick={loadLogs} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-bold border border-[#e0daf0] text-slate-600 hover:bg-slate-50 transition-all bg-white">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 size={24} className="animate-spin text-violet-600 mx-auto" />
            <p className="text-slate-400 text-[12px] font-semibold mt-2">Loading audit trail...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400 font-semibold text-[13px]">
            No audit records match the selected parameters.
          </div>
        ) : (
          <div className="divide-y divide-[#f5f3fc]">
            {filtered.map((log) => (
              <div key={log.id} className="p-5 hover:bg-[#faf9ff]/20 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-[13px] text-slate-900">{log.actor_name || "System"}</span>
                    <span className="text-[11px] font-semibold text-slate-400">performed</span>
                    <span className="text-[11px] font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-100">
                      {log.action}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400">on target</span>
                    <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 uppercase">
                      {log.target_type}
                    </span>
                  </div>
                  <p className="text-[12px] text-slate-500 font-semibold leading-relaxed">
                    Details: <code className="bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5 text-slate-600 font-mono text-[11px]">{JSON.stringify(log.details)}</code>
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-[12px] font-bold text-slate-700">
                    {new Date(log.created_at).toLocaleDateString()} &middot; {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    IP: {log.ip_address || "127.0.0.1"} &middot; {log.device || "Browser"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
