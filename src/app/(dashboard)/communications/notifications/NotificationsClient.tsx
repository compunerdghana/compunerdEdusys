"use client";

import { useState, useMemo } from "react";
import {
  Bell, Check, CheckCircle, AlertTriangle, AlertCircle, Info, X, Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface Notification {
  id: string;
  title: string;
  body?: string;
  type: string;
  category: string;
  link?: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  recipient_id: string;
}

interface Props {
  schoolId: string;
  userId: string;
  initialNotifications: Notification[];
  tableNotReady: boolean;
  userRole: string;
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  success: <CheckCircle size={16} className="text-green-600" />,
  warning: <AlertTriangle size={16} className="text-amber-500" />,
  danger:  <AlertCircle size={16} className="text-red-500" />,
  urgent:  <AlertCircle size={16} className="text-red-600" />,
  info:    <Info size={16} className="text-blue-500" />,
};

const TYPE_BADGE: Record<string, string> = {
  success: "bg-green-50 text-green-700 border-green-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  danger:  "bg-red-50 text-red-700 border-red-200",
  urgent:  "bg-red-100 text-red-800 border-red-300",
  info:    "bg-blue-50 text-blue-700 border-blue-200",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(dateStr).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" });
}

export function NotificationsClient({ userId, initialNotifications, tableNotReady }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [deleting, setDeleting] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (filter === "unread" && n.is_read) return false;
      if (filter === "read" && !n.is_read) return false;
      if (typeFilter !== "all" && n.type !== typeFilter) return false;
      if (n.recipient_id !== userId) return false;
      return true;
    });
  }, [notifications, filter, typeFilter, userId]);

  const unreadCount = notifications.filter((n) => n.recipient_id === userId && !n.is_read).length;

  async function markRead(id: string) {
    const supabase = createClient();
    await supabase.from("notifications").update({ is_read: true, read_at: new Date().toISOString() }).eq("id", id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
  }

  async function markAllRead() {
    const ids = notifications.filter((n) => !n.is_read && n.recipient_id === userId).map((n) => n.id);
    if (!ids.length) return;
    const supabase = createClient();
    await supabase.from("notifications").update({ is_read: true, read_at: new Date().toISOString() }).in("id", ids);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  async function dismiss(id: string) {
    setDeleting(id);
    const supabase = createClient();
    await supabase.from("notifications").delete().eq("id", id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setDeleting(null);
  }

  async function dismissAll() {
    const mine = notifications.filter((n) => n.recipient_id === userId && n.is_read);
    const ids = mine.map((n) => n.id);
    if (!ids.length) return;
    const supabase = createClient();
    await supabase.from("notifications").delete().in("id", ids);
    setNotifications((prev) => prev.filter((n) => !ids.includes(n.id)));
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[900px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold text-[var(--text-strong)]">Notifications</h1>
          <p className="text-[14px] text-[var(--text-muted)] mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}` : "All caught up"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button onClick={markAllRead}
              className="h-9 px-4 rounded-xl text-[12px] font-bold border border-[var(--border)] flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[#262262] hover:border-[#262262]/30 transition-colors">
              <Check size={13} /> Mark all read
            </button>
          )}
          <button onClick={dismissAll}
            className="h-9 px-4 rounded-xl text-[12px] font-bold border border-[var(--border)] flex items-center gap-1.5 text-[var(--text-muted)] hover:text-red-600 hover:border-red-200 transition-colors">
            <X size={13} /> Clear read
          </button>
        </div>
      </div>

      {tableNotReady && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-[13px] text-amber-800 font-medium">
            Run <code className="font-mono bg-amber-100 px-1 rounded">supabase/migrations/communication_module.sql</code> to enable notifications.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 p-1 bg-[var(--neutral-100)] rounded-xl">
          {(["all", "unread", "read"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn("px-3 py-1.5 rounded-lg text-[12px] font-semibold capitalize transition-all",
                filter === f ? "bg-white shadow text-[var(--text-strong)]" : "text-[var(--text-muted)] hover:text-[var(--text-strong)]")}>
              {f} {f === "unread" && unreadCount > 0 && `(${unreadCount})`}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <Filter size={13} className="text-[var(--text-muted)]" />
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 px-3 pr-8 border border-[var(--border)] rounded-xl text-[12px] font-semibold bg-white text-[var(--text-strong)] focus:outline-none focus:ring-2 focus:ring-[#262262]/20">
            <option value="all">All types</option>
            <option value="info">Info</option>
            <option value="success">Success</option>
            <option value="warning">Warning</option>
            <option value="danger">Danger</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <Bell size={36} className="mx-auto mb-3 opacity-20 text-[var(--text-muted)]" />
            <p className="text-[15px] font-bold text-[var(--text-muted)]">No notifications found</p>
            <p className="text-[13px] text-[var(--text-muted)] mt-1">Adjust the filter above</p>
          </div>
        ) : (
          filtered.map((n, idx) => (
            <div key={n.id}
              className={cn(
                "flex items-start gap-4 px-5 py-4 transition-colors cursor-pointer group",
                idx < filtered.length - 1 && "border-b border-[var(--border)]",
                !n.is_read ? "bg-blue-50/40" : "hover:bg-[var(--neutral-50)]",
              )}
              onClick={() => { markRead(n.id); if (n.link) window.location.href = n.link; }}>
              <div className="mt-0.5 shrink-0">{TYPE_ICON[n.type] ?? TYPE_ICON.info}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <p className={cn("text-[14px] leading-tight", !n.is_read ? "font-bold text-[var(--text-strong)]" : "font-semibold text-[var(--text-strong)]")}>
                    {n.title}
                  </p>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize", TYPE_BADGE[n.type] ?? TYPE_BADGE.info)}>
                      {n.type}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); dismiss(n.id); }}
                      disabled={deleting === n.id}
                      className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded flex items-center justify-center text-[var(--text-muted)] hover:text-red-500 transition-all">
                      <X size={13} />
                    </button>
                  </div>
                </div>
                {n.body && <p className="text-[13px] text-[var(--text-muted)] mt-1">{n.body}</p>}
                <div className="flex items-center gap-3 mt-1.5">
                  <p className="text-[11px] text-[var(--text-muted)]">{timeAgo(n.created_at)}</p>
                  {n.category && n.category !== "general" && (
                    <span className="text-[10px] font-semibold text-[var(--text-muted)] bg-[var(--neutral-100)] px-2 py-0.5 rounded-full capitalize">{n.category}</span>
                  )}
                  {!n.is_read && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
