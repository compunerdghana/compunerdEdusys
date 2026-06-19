"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, User, BookOpen, ClipboardList,
  GraduationCap, Calendar, Clock, Inbox, Users,
  HeartHandshake, Smile, FileSpreadsheet, CheckSquare,
  Users2, Bell, ScrollText, BarChart3, Settings, LogOut, Wallet, FileText, MessagesSquare,
  ChevronLeft, ChevronRight, UserCog
} from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface TeacherNavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  feature?: string;
}

const teacherNavItems: TeacherNavItem[] = [
  { href: "/teacher",                   label: "Dashboard",       icon: LayoutDashboard },
  { href: "/teacher/classes",           label: "My Classes",      icon: Users2 },
  { href: "/teacher/students",          label: "Students",        icon: GraduationCap },
  { href: "/teacher/attendance",        label: "Attendance",      icon: ClipboardList },
  { href: "/teacher/academics",         label: "Academics",       icon: BookOpen },
  { href: "/teacher/assignments",       label: "Assignments",     icon: Inbox },
  { href: "/teacher/lesson-notes",      label: "Lesson Notes",    icon: ScrollText },
  { href: "/teacher/communication",     label: "Communication",   icon: MessagesSquare },
  { href: "/teacher/timetable",         label: "Timetable",       icon: Clock },
  { href: "/teacher/tasks",             label: "Tasks",           icon: CheckSquare },
  { href: "/teacher/meetings",          label: "Meetings",        icon: Users },
  { href: "/teacher/leave",             label: "Leave Management",icon: Calendar },
  { href: "/teacher/reports",           label: "Reports",         icon: BarChart3 },
  { href: "/teacher/documents",         label: "Documents",       icon: FileText },
  { href: "/teacher/settings",          label: "Profile & Settings", icon: Settings },
];

interface Props {
  userName?: string;
  schoolName?: string;
  schoolLogo?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function TeacherSidebar({ userName = "Teacher", schoolName, schoolLogo, collapsed = false, onToggleCollapse }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [features, setFeatures] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/school/user-management/current-permissions")
      .then((r) => r.json())
      .then((data) => {
        if (data.features) setFeatures(data.features);
      })
      .catch(() => {});
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const initials = userName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const brandName = schoolName ?? "Compunerd EduSys";

  return (
    <aside
      className="flex flex-col h-full text-white overflow-hidden shrink-0 border-r border-white/5 transition-all duration-300"
      style={{
        background: "linear-gradient(180deg, #1a1854 0%, #2e1a6b 40%, #6b1f8a 80%, #92278F 100%)",
        width: collapsed ? "80px" : "256px"
      }}
    >
      {/* Brand Header */}
      <div className={cn(
        "h-16 flex items-center border-b border-white/10 shrink-0 gap-3 transition-all duration-300",
        collapsed ? "justify-center px-2" : "px-6"
      )}>
        {schoolLogo ? (
          <div className="w-8 h-8 rounded-lg overflow-hidden bg-white/10 flex items-center justify-center shrink-0 ring-2 ring-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={schoolLogo} alt={brandName} className="w-full h-full object-contain p-0.5" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0 ring-2 ring-white/10">
            <GraduationCap size={16} className="text-white" />
          </div>
        )}
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-[12px] font-extrabold truncate leading-none uppercase tracking-wider">{brandName}</p>
            <span className="text-[9px] text-white/50 font-bold tracking-widest uppercase mt-0.5 inline-block">Teacher OS</span>
          </div>
        )}
      </div>

      {/* Nav List */}
      <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5 scrollbar-hide">
        {teacherNavItems.map((item) => {
          if (item.feature && !features.includes(item.feature)) return null;

          const active = pathname === item.href || (item.href !== "/teacher" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center rounded-xl text-[12px] font-semibold transition-all hover:bg-white/10",
                collapsed ? "justify-center px-0 w-10 h-10 mx-auto" : "gap-3 px-3.5 py-2.5",
                active
                  ? "bg-white/15 border border-white/10 text-white font-bold shadow-md shadow-black/10"
                  : "text-white/70 hover:text-white"
              )}
            >
              <item.icon
                size={14}
                className={cn("shrink-0 transition-transform duration-200", active ? "text-white scale-110" : "text-white/50")}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle Button (Desktop Only) */}
      <div className="hidden md:flex items-center justify-center py-2.5 border-t border-white/10 bg-black/5">
        <button
          onClick={onToggleCollapse}
          className={cn(
            "p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2",
            collapsed ? "w-10 h-10" : "w-full mx-4"
          )}
          title={collapsed ? "Expand Workspace" : "Collapse Workspace"}
        >
          {collapsed ? (
            <ChevronRight size={14} />
          ) : (
            <>
              <ChevronLeft size={14} />
              <span className="text-[10px] font-extrabold uppercase tracking-wider">Collapse Workspace</span>
            </>
          )}
        </button>
      </div>

      {/* User Session Footer */}
      <div className={cn(
        "p-4 border-t border-white/10 shrink-0 bg-black/10 flex items-center justify-between gap-3",
        collapsed ? "justify-center p-2" : "p-4"
      )}>
        <Link href="/teacher/settings" className="flex items-center gap-2.5 min-w-0 hover:opacity-90">
          <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center font-extrabold text-[11px] ring-2 ring-white/10 shrink-0 shadow-inner">
            {initials}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-[11.5px] font-extrabold text-white leading-none truncate">{userName}</p>
              <span className="text-[9px] text-white/50 font-bold uppercase mt-0.5 inline-block truncate">Teacher</span>
            </div>
          )}
        </Link>
        {!collapsed && (
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            title="Sign Out"
          >
            <LogOut size={14} />
          </button>
        )}
      </div>
    </aside>
  );
}
