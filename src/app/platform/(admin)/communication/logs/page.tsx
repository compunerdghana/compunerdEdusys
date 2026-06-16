"use client";

import { useState, useEffect, useCallback } from "react";
import { ScrollText, Search, Download, RefreshCw, Filter } from "lucide-react";

interface Log {
  id: string;
  channel: string;
  sender_name?: string;
  school_name?: string;
  recipient: string;
  message_preview: string;
  status: string;
  created_at: string;
}

const channelColor: Record<string, string> = {
  whatsapp: "#22c55e", sms: "#3b82f6", email: "#f59e0b", notification: "#8b5cf6",
};

const statusStyle: Record<string, string> = {
  sent: "bg-blue-50 text-blue-700 border border-blue-100",
  delivered: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  read: "bg-violet-50 text-violet-700 border border-violet-100",
  failed: "bg-red-50 text-red-700 border border-red-100",
  pending: "bg-slate-50 text-slate-500 border border-slate-100",
};

export default function CommunicationLogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [fetching, setFetching] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const load = useCallback(async () => {
    setFetching(true);
    const params = new URLSearchParams({ page: String(page), limit: "30" });
    if (channelFilter) params.set("channel", channelFilter);
    if (statusFilter) params.set("status", statusFilter);
    if (search) params.set("school", search);

    const data = await fetch(`/api/platform/communication/logs?${params}`).then(r => r.json()).catch(() => ({ logs: [], total: 0 }));
    setLogs(data.logs ?? []);
    setTotal(data.total ?? 0);
    setFetching(false);
  }, [page, channelFilter, statusFilter, search]);

  useEffect(() => { load(); }, [load]);

  function exportCSV() {
    const headers = ["Date", "Channel", "School", "Recipient", "Message", "Status"];
    const rows = logs.map(l => [
      new Date(l.created_at).toLocaleString("en-GH"),
      l.channel, l.school_name ?? "", l.recipient,
      `"${(l.message_preview ?? "").replace(/"/g, '""')}"`, l.status,
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `communication-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  const totalPages = Math.ceil(total / 30);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold text-slate-900 leading-tight flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#0ea5e9,#0284c7)" }}>
              <ScrollText size={16} className="text-white" />
            </div>
            Communication Logs
          </h1>
          <p className="text-slate-500 text-[13px] font-semibold mt-1 ml-12">Full history of all platform-wide communications.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-bold border border-[#e0daf0] text-slate-600 hover:bg-slate-50 transition-all">
            <RefreshCw size={13} className={fetching ? "animate-spin" : ""} />
          </button>
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold border border-[#e0daf0] text-slate-700 hover:bg-slate-50 transition-all">
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search school…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-700 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white" />
        </div>
        <select value={channelFilter} onChange={e => { setChannelFilter(e.target.value); setPage(1); }}
          className="h-10 px-4 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-700 outline-none focus:border-[#7c3aed] bg-white">
          <option value="">All Channels</option>
          {["whatsapp", "sms", "email", "notification"].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-10 px-4 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-700 outline-none focus:border-[#7c3aed] bg-white">
          <option value="">All Statuses</option>
          {["sent", "delivered", "read", "failed", "pending"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#e8e4f3] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#f0edf8] flex items-center justify-between">
          <h3 className="font-extrabold text-slate-900 text-[14px]">
            {total.toLocaleString()} log{total !== 1 ? "s" : ""}
          </h3>
          <span className="text-[12px] text-slate-400 font-semibold">Page {page} of {totalPages || 1}</span>
        </div>

        {fetching ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#e0daf0", borderTopColor: "#0ea5e9" }} />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "rgba(14,165,233,0.1)" }}>
              <ScrollText size={20} style={{ color: "#0ea5e9" }} />
            </div>
            <p className="text-slate-500 font-semibold text-[13px]">No communication logs found.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#faf9ff]">
                    {["Date & Time", "Channel", "School", "Recipient", "Message Preview", "Status"].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-[11px] font-extrabold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f8f6ff]">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-[#faf9ff] transition-colors">
                      <td className="px-5 py-3.5 text-[11px] text-slate-400 font-semibold whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString("en-GH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full"
                          style={{ background: `${channelColor[log.channel] ?? "#6366f1"}20`, color: channelColor[log.channel] ?? "#6366f1" }}>
                          {log.channel}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-[12px] font-bold text-slate-800 whitespace-nowrap">{log.school_name ?? "—"}</p>
                      </td>
                      <td className="px-5 py-3.5 text-[12px] text-slate-500 font-semibold whitespace-nowrap">{log.recipient}</td>
                      <td className="px-5 py-3.5 max-w-[280px]">
                        <p className="text-[12px] text-slate-400 font-semibold truncate">{log.message_preview}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${statusStyle[log.status] ?? "bg-slate-50 text-slate-500"}`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-[#f0edf8]">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  className="px-4 py-2 rounded-xl text-[12px] font-bold border border-[#e0daf0] text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-all">
                  ← Previous
                </button>
                <span className="text-[12px] text-slate-400 font-semibold">Page {page} of {totalPages}</span>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                  className="px-4 py-2 rounded-xl text-[12px] font-bold border border-[#e0daf0] text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-all">
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
