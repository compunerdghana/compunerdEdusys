"use client";

import { useState, useEffect } from "react";
import { ScrollText, Search, RefreshCw, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface ActivityLog {
  id: string;
  actor_name: string;
  action: string;
  target_type: string;
  details: Record<string, any>;
  created_at: string;
}

export default function ActivityLogsBoard() {
  const { error: toastError } = useToast();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function loadLogs() {
    setLoading(true);
    try {
      const res = await fetch("/api/school/user-management/activity-logs");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setLogs(data.logs ?? []);
    } catch {
      toastError("Failed to load activity logs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadLogs(); }, []);

  const filtered = logs.filter(log => 
    log.actor_name?.toLowerCase().includes(search.toLowerCase()) ||
    log.action?.toLowerCase().includes(search.toLowerCase()) ||
    JSON.stringify(log.details || {}).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[20px] font-extrabold text-slate-900 leading-tight">Administrative Activity Logs</h1>
        <p className="text-slate-500 text-[12px] font-semibold mt-0.5">Audit actions performed by administrators, registrars and heads in the system.</p>
      </div>

      {/* Toolbar */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search audit trail by actor, action or metadata details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
          />
        </div>
        <button onClick={loadLogs} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-bold border border-[#e0daf0] text-slate-600 hover:bg-slate-50 transition-all bg-white">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#faf9ff] border-b border-[#f0edf8]">
                {["Actor Name", "Action Key", "Target Category", "Operation Details", "Timestamp"].map((h) => (
                  <th key={h} className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5f3fc]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <Loader2 size={24} className="animate-spin text-violet-600 mx-auto" />
                    <p className="text-slate-400 text-[12px] font-semibold mt-2">Loading audit trail...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-slate-400 font-semibold text-[13px]">
                    No activity logs recorded.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900 text-[13px]">{log.actor_name}</td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-mono font-bold text-violet-700 bg-violet-50 border border-violet-100 rounded px-2 py-0.5">{log.action}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-bold text-[12.5px] capitalize">{log.target_type}</td>
                    <td className="px-6 py-4 text-slate-500 font-medium text-[12px] max-w-xs truncate">
                      {JSON.stringify(log.details)}
                    </td>
                    <td className="px-6 py-4 text-slate-400 font-medium text-[11.5px]">{new Date(log.created_at).toLocaleString()}</td>
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
