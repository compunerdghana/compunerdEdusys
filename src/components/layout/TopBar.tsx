"use client";

import { Bell, Menu, Check, AlertCircle, Info, CheckCircle, AlertTriangle, X, ChevronDown } from "lucide-react";
import { getInitials } from "@/lib/utils";
import Link from "next/link";
import { useEffect, useState, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface TopBarProps {
  userName?: string;
  schoolName?: string;
  onMenuClick?: () => void;
}

interface Notification {
  id: string;
  title: string;
  body?: string;
  type: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  success: <CheckCircle size={14} className="text-green-600 shrink-0" />,
  warning: <AlertTriangle size={14} className="text-amber-500 shrink-0" />,
  danger:  <AlertCircle size={14} className="text-red-500 shrink-0" />,
  urgent:  <AlertCircle size={14} className="text-red-600 shrink-0" />,
  info:    <Info size={14} className="text-blue-500 shrink-0" />,
};

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "notif-1",
    title: "New Admission: Ama Serwaa Mensah registered for JHS 1",
    body: "System registered a new student profile and assigned to JHS 1 Class.",
    type: "success",
    is_read: false,
    created_at: new Date(Date.now() - 10 * 60000).toISOString(),
  },
  {
    id: "notif-2",
    title: "Fee Payment: GHS 1,200 received from Kofi Asante",
    body: "Receipt #REC-2026-9884 generated for academic fees term 1.",
    type: "info",
    is_read: false,
    created_at: new Date(Date.now() - 25 * 60000).toISOString(),
  },
  {
    id: "notif-3",
    title: "Attendance Alert: Form 2 Science attendance marked (94%)",
    body: "42 students present, 3 absent. Automated digest sent to administration.",
    type: "success",
    is_read: false,
    created_at: new Date(Date.now() - 60 * 60000).toISOString(),
  },
  {
    id: "notif-4",
    title: "Teacher Added: Mr. Daniel Owusu registered",
    body: "Assigned as subject teacher for JHS 2 and JHS 3 Mathematics.",
    type: "info",
    is_read: false,
    created_at: new Date(Date.now() - 120 * 60000).toISOString(),
  },
  {
    id: "notif-5",
    title: "Exam Created: End of Term Exams scheduled for JHS 3",
    body: "Mathematics and Integrated Science examinations set for next week.",
    type: "warning",
    is_read: false,
    created_at: new Date(Date.now() - 180 * 60000).toISOString(),
  },
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function TopBar({ userName = "Admin", schoolName, onMenuClick }: TopBarProps) {
  const pathname = usePathname() || "";
  const isTeacher = pathname.startsWith("/teacher");
  const settingsHref = isTeacher ? "/teacher/settings" : "/settings";
  const notificationsHref = isTeacher ? "/teacher/announcements" : "/communications/notifications";

  const [displayName, setDisplayName] = useState(userName);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotif, setLoadingNotif] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setDisplayName(userName); }, [userName]);

  useEffect(() => {
    function onNameChange(e: Event) {
      const name = (e as CustomEvent<string>).detail;
      if (name) setDisplayName(name);
    }
    window.addEventListener("user:namechange", onNameChange);
    return () => window.removeEventListener("user:namechange", onNameChange);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        bellRef.current && !bellRef.current.contains(e.target as Node)
      ) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchNotifications = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("notifications")
      .select("id, title, body, type, link, is_read, created_at")
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      setNotifications(MOCK_NOTIFICATIONS);
      setUnreadCount(MOCK_NOTIFICATIONS.filter((n) => !n.is_read).length);
      return;
    }
    const list = (data && data.length > 0) ? data : MOCK_NOTIFICATIONS;
    setNotifications(list);
    setUnreadCount(list.filter((n) => !n.is_read).length);
  }, []);

  // Fetch on mount + every 60s
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Listen for new notification events (fired by other modules)
  useEffect(() => {
    function onNewNotif() { fetchNotifications(); }
    window.addEventListener("notification:new", onNewNotif);
    return () => window.removeEventListener("notification:new", onNewNotif);
  }, [fetchNotifications]);

  async function markAllRead() {
    const unread = notifications.filter((n) => !n.is_read);
    if (unread.length === 0) return;
    const supabase = createClient();
    await supabase.from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .in("id", unread.map((n) => n.id));
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }

  async function markRead(id: string) {
    const supabase = createClient();
    await supabase.from("notifications").update({ is_read: true, read_at: new Date().toISOString() }).eq("id", id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  async function dismissNotif(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    const supabase = createClient();
    await supabase.from("notifications").delete().eq("id", id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  function toggleBell() {
    if (!notifOpen) {
      setLoadingNotif(true);
      fetchNotifications().finally(() => setLoadingNotif(false));
    }
    setNotifOpen((o) => !o);
  }

  const isDashboard = pathname === "/dashboard" || pathname === "/";
  const pageTitle = isDashboard
    ? "Dashboard"
    : pathname.split("/").filter(Boolean).pop()?.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "Dashboard";

  const profileName = !isTeacher && displayName === "Admin" ? "Admin User" : displayName;
  const profileSub = !isTeacher ? "Super Admin" : (schoolName || "Educator");
  const greeting = `Welcome back, ${profileName.split(" ")[0]} 👋`;

  return (
    <header className="h-[60px] bg-white border-b border-[#e8e4f3] flex items-center px-4 md:px-6 gap-4 shrink-0">
      {/* Hamburger — mobile only */}
      <button onClick={onMenuClick}
        className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--neutral-100)] transition-colors shrink-0">
        <Menu size={20} />
      </button>

      {/* Dashboard Title & Personalized Greeting */}
      <div className="hidden sm:block">
        <h1 className="text-[16px] font-extrabold text-[#1a1854] leading-tight">{pageTitle}</h1>
        <p className="text-[11.5px] text-[#92278F] font-bold">{greeting}</p>
      </div>

      <div className="flex-1" />

      {/* Academic Year Selector */}
      <div className="hidden md:block relative">
        <select className="appearance-none bg-[#f8f7ff] border border-[#e8e4f3] text-[#1a1854] text-[12.5px] font-bold py-1.5 pl-3 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#92278F] cursor-pointer transition-all hover:bg-[#f3f0fa] hover:border-[#d9d2eb]">
          <option value="2024-2025">2024/2025 Academic Year</option>
          <option value="2023-2024">2023/2024 Academic Year</option>
          <option value="2022-2023">2022/2023 Academic Year</option>
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-[#1a1854]/60">
          <ChevronDown size={12} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <div className="relative">
          <button ref={bellRef} onClick={toggleBell}
            className={cn(
              "relative w-9 h-9 rounded-xl flex items-center justify-center transition-colors",
              notifOpen ? "bg-[#262262]/10 text-[#262262]" : "text-[var(--text-muted)] hover:bg-[var(--neutral-100)]",
            )}>
            <Bell size={17} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-extrabold flex items-center justify-center px-1 leading-none">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {notifOpen && (
            <div ref={dropdownRef}
              className="absolute right-0 top-full mt-2 w-[380px] bg-white rounded-2xl border border-[var(--border)] shadow-[0_8px_32px_rgba(0,0,0,0.12)] z-50 overflow-hidden">

              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <h3 className="text-[14px] font-extrabold text-[var(--text-strong)]">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">{unreadCount}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button onClick={markAllRead}
                      className="text-[11px] font-semibold text-[#262262] hover:underline flex items-center gap-1">
                      <Check size={11} /> Mark all read
                    </button>
                  )}
                  <Link href={notificationsHref}
                    className="text-[11px] font-semibold text-[var(--text-muted)] hover:text-[#262262]"
                    onClick={() => setNotifOpen(false)}>
                    See all
                  </Link>
                </div>
              </div>

              {/* List */}
              <div className="max-h-[420px] overflow-y-auto">
                {loadingNotif ? (
                  <div className="py-8 text-center text-[13px] text-[var(--text-muted)]">Loading…</div>
                ) : notifications.length === 0 ? (
                  <div className="py-12 text-center">
                    <Bell size={28} className="mx-auto mb-2 opacity-20 text-[var(--text-muted)]" />
                    <p className="text-[13px] text-[var(--text-muted)]">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id}
                      className={cn(
                        "flex items-start gap-3 px-4 py-3 border-b border-[var(--border)] last:border-0 transition-colors cursor-pointer group",
                        !n.is_read ? "bg-blue-50/50" : "hover:bg-[var(--neutral-50)]",
                      )}
                      onClick={() => { markRead(n.id); if (n.link) window.location.href = n.link; }}>
                      <div className="mt-0.5 shrink-0">{TYPE_ICON[n.type] ?? TYPE_ICON.info}</div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-[13px] leading-tight", !n.is_read ? "font-bold text-[var(--text-strong)]" : "font-semibold text-[var(--text-strong)]")}>
                          {n.title}
                        </p>
                        {n.body && <p className="text-[12px] text-[var(--text-muted)] mt-0.5 line-clamp-2">{n.body}</p>}
                        <p className="text-[11px] text-[var(--text-muted)] mt-1">{timeAgo(n.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!n.is_read && (
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                        )}
                        <button onClick={(e) => dismissNotif(n.id, e)}
                          className="w-5 h-5 rounded flex items-center justify-center text-[var(--text-muted)] hover:text-red-500 transition-colors">
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 border-t border-[var(--border)] bg-[var(--neutral-50)]">
                <Link href={notificationsHref}
                  className="text-[12px] font-semibold text-[#262262] hover:underline"
                  onClick={() => setNotifOpen(false)}>
                  View all notifications →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-[var(--border)] mx-1" />

        {/* User avatar — links to personal settings */}
        <Link href={settingsHref} className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 ring-2 ring-transparent hover:ring-[#262262]/30 transition-all"
            style={{ background: "linear-gradient(135deg, #262262, #92278F)" }}>
            {getInitials(profileName)}
          </div>
          <div className="hidden md:block">
            <p className="text-[13px] font-bold text-[var(--text-strong)] leading-tight">{profileName}</p>
            <p className="text-[11px] text-[var(--text-muted)] leading-tight truncate max-w-[120px]">{profileSub}</p>
          </div>
        </Link>
      </div>
    </header>
  );
}
