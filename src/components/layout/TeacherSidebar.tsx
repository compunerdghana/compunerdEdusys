"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, User, BookOpen, ClipboardList,
  GraduationCap, Calendar, Clock, Inbox, Users,
  HeartHandshake, Smile, FileSpreadsheet, CheckSquare,
  Users2, Bell, ScrollText, BarChart3, Settings, LogOut, Wallet, FileText, MessagesSquare
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
  { href: "/teacher/profile",           label: "My Profile",      icon: User },
  { href: "/teacher/classes",           label: "My Classes",      icon: Users2 },
  { href: "/teacher/subjects",          label: "My Subjects",     icon: BookOpen },
  { href: "/teacher/attendance",        label: "Attendance",      icon: ClipboardList },
  { href: "/teacher/scores",            label: "Assessments",     icon: FileSpreadsheet },
  { href: "/teacher/exams",             label: "Exam Center",     icon: GraduationCap },
  { href: "/teacher/report-cards",      label: "Report Remarks",  icon: ScrollText },
  { href: "/teacher/assignments",        label: "Assignments",     icon: Inbox },
  { href: "/teacher/lesson-notes",      label: "Lesson Notes",    icon: ScrollText },
  { href: "/teacher/resources",         label: "Resources",       icon: BookOpen },
  { href: "/teacher/timetable",         label: "Timetable",       icon: Clock },
  { href: "/teacher/communication",     label: "Communications",  icon: MessagesSquare },
  { href: "/teacher/parent-engagement", label: "Parent Portal",   icon: HeartHandshake },
  { href: "/teacher/behaviour",         label: "Student Conduct", icon: Smile },
  { href: "/teacher/staff-attendance",  label: "Clock In/Out",    icon: ClipboardList },
  { href: "/teacher/leave",             label: "Leave Manager",   icon: Calendar },
  { href: "/teacher/payroll",           label: "My Payroll",      icon: Wallet, feature: "payroll" },
  { href: "/teacher/tasks",             label: "Tasks List",      icon: CheckSquare },
  { href: "/teacher/meetings",          label: "Meetings Desk",   icon: Users },
  { href: "/teacher/announcements",     label: "Announcements",   icon: Bell },
  { href: "/teacher/documents",         label: "School Policies", icon: FileText },
  { href: "/teacher/performance",       label: "My Appraisals",   icon: BarChart3 },
  { href: "/teacher/settings",          label: "Settings",        icon: Settings },
];

interface Props {
  userName?: string;
  schoolName?: string;
  schoolLogo?: string;
}

export function TeacherSidebar({ userName = "Teacher", schoolName, schoolLogo }: Props) {
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
      className="w-64 flex flex-col h-full text-white overflow-hidden shrink-0 border-r border-white/5"
      style={{
        background: "linear-gradient(180deg, #1a1854 0%, #2e1a6b 40%, #6b1f8a 80%, #92278F 100%)",
      }}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-white/10 shrink-0 gap-3">
        {schoolLogo ? (
          <div className="w-8 h-8 rounded-lg overflow-hidden bg-white/10 flex items-center justify-center ring-2 ring-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={schoolLogo} alt={brandName} className="w-full h-full object-contain p-0.5" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center ring-2 ring-white/10">
            <GraduationCap size={16} className="text-white" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-[12px] font-extrabold truncate leading-none uppercase tracking-wider">{brandName}</p>
          <span className="text-[9px] text-white/50 font-bold tracking-widest uppercase mt-0.5 inline-block">Teacher OS</span>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5 scrollbar-hide">
        {teacherNavItems.map((item) => {
          // If the item needs a specific feature that is disabled, filter it out
          if (item.feature && !features.includes(item.feature)) return null;

          const active = pathname === item.href || (item.href !== "/teacher" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[12px] font-semibold transition-all hover:bg-white/10",
                active
                  ? "bg-white/15 border border-white/10 text-white font-bold shadow-md shadow-black/10"
                  : "text-white/70 hover:text-white"
              )}
            >
              <item.icon
                size={14}
                className={cn("shrink-0 transition-transform duration-200", active ? "text-white scale-110" : "text-white/50")}
              />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Session Footer */}
      <div className="p-4 border-t border-white/10 shrink-0 bg-black/10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center font-extrabold text-[11px] ring-2 ring-white/10 shrink-0 shadow-inner">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-[11.5px] font-extrabold text-white leading-none truncate">{userName}</p>
            <span className="text-[9px] text-white/50 font-bold uppercase mt-0.5 inline-block truncate">Teacher</span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          title="Sign Out"
        >
          <LogOut size={14} />
        </button>
      </div>
    </aside>
  );
}
