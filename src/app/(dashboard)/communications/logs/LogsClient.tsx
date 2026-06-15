"use client";

import { useState, useMemo } from "react";
import { History, AlertTriangle, CheckCircle, XCircle, Clock, MessageCircle, Smartphone, Mail, Bell, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

interface Log {
  id: string;
  channel: string;
  recipient_type: string;
  recipient_ref?: string;
  subject?: string;
  body: string;
  status: string;
  provider?: string;
  recipient_count: number;
  error_message?: string;
  sent_at: string;
}

const CHANNEL_ICON: Record<string, React.ReactNode> = {
  whatsapp: <MessageCircle size={14} className="text-[#25D366]" />,
  sms: <Smartphone size={14} className="text-blue-500" />,
  email: <Mail size={14} className="text-amber-500" />,
  notification: <Bell size={14} className="text-purple-500" />,
};

const STATUS_BADGE: Record<string, string> = {
  sent:      "bg-blue-50 text-blue-700 border-blue-200",
  delivered: "bg-green-50 text-green-700 border-green-200",
  read:      "bg-green-100 text-green-800 border-green-300",
  failed:    "bg-red-50 text-red-700 border-red-200",
  pending:   "bg-amber-50 text-amber-700 border-amber-200",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  sent:      <Clock size={12} />,
  delivered: <CheckCircle size={12} />,
  read:      <CheckCircle size={12} />,
  failed:    <XCircle size={12} />,
  pending:   <Clock size={12} />,
};

export function LogsClient({ initialLogs, tableNotReady }: { initialLogs: Log[]; tableNotReady: boolean }) {
  const [channelFilter, setChannelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() =>
    initialLogs.filter((l) => {
      if (channelFilter !== "all" && l.channel !== channelFilter) return false;
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      return true;
    }),
    [initialLogs, channelFilter, statusFilter]);

  const total = initialLogs.length;
  const delivered = initialLogs.filter((l) => l.status === "delivered" || l.status === "read").length;
  const failed = initialLogs.filter((l) => l.status === "failed").length;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[1100px] mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--neutral-100)]">
          <History size={20} className="text-[var(--text-muted)]" />
        </div>
        <div>
          <h1 className="text-[22px] font-extrabold text-[var(--text-strong)]">Communication Logs</h1>
          <p className="text-[14px] text-[var(--text-muted)] mt-0.5">History of all messages sent from this school</p>
        </div>
      </div>

      {tableNotReady && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-[13px] text-amber-800 font-medium">Run <code className="bg-amber-100 px-1 rounded font-mono">communication_module.sql</code> to enable logs.</p>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Sent", value: total, color: "#262262" },
          { label: "Delivered", value: delivered, color: "#16a34a" },
          { label: "Failed", value: failed, color: "#dc2626" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-[var(--border)] p-4 shadow-sm">
            <p className="text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1">{label}</p>
            <p className="text-[26px] font-extrabold" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Filter size={13} className="text-[var(--text-muted)]" />
          <select value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)}
            className="h-9 px-3 pr-8 border border-[var(--border)] rounded-xl text-[12px] font-semibold bg-white text-[var(--text-strong)] focus:outline-none">
            <option value="all">All channels</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="sms">SMS</option>
            <option value="email">Email</option>
            <option value="notification">In-App</option>
          </select>
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 px-3 pr-8 border border-[var(--border)] rounded-xl text-[12px] font-semibold bg-white text-[var(--text-strong)] focus:outline-none">
          <option value="all">All statuses</option>
          <option value="sent">Sent</option>
          <option value="delivered">Delivered</option>
          <option value="read">Read</option>
          <option value="failed">Failed</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <History size={32} className="mx-auto mb-3 opacity-20 text-[var(--text-muted)]" />
            <p className="text-[14px] font-bold text-[var(--text-muted)]">No logs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--neutral-50)]">
                  {["Channel", "Type", "Message", "Status", "Recipients", "Sent At"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] font-extrabold uppercase tracking-wide text-[var(--text-muted)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((log, idx) => (
                  <tr key={log.id} className={cn("border-b border-[var(--border)] hover:bg-[var(--neutral-50)] transition-colors", idx === filtered.length - 1 && "border-0")}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {CHANNEL_ICON[log.channel] ?? <Bell size={14} />}
                        <span className="text-[12px] font-semibold capitalize">{log.channel}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[var(--text-muted)] capitalize">{log.recipient_type?.replace("_", " ")}</td>
                    <td className="px-4 py-3 max-w-[300px]">
                      <p className="text-[12px] text-[var(--text-strong)] line-clamp-2">{log.body}</p>
                      {log.error_message && (
                        <p className="text-[11px] text-red-500 mt-0.5">{log.error_message}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("flex items-center gap-1 w-fit px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize", STATUS_BADGE[log.status] ?? STATUS_BADGE.sent)}>
                        {STATUS_ICON[log.status]} {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[12px] font-bold text-[var(--text-strong)]">{log.recipient_count}</td>
                    <td className="px-4 py-3 text-[11px] text-[var(--text-muted)]">
                      {new Date(log.sent_at).toLocaleString("en-GH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
