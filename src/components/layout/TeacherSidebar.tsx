"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users2, GraduationCap, ClipboardList, BookOpen,
  Inbox, ScrollText, MessagesSquare, Clock, CheckSquare, Users,
  Calendar, BarChart3, FileText, Settings, LogOut, ChevronDown
} from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface NavItemChild {
  href: string;
  label: string;
  icon: React.ElementType;
  feature?: string;
}

interface NavItemGroup {
  label: string;
  icon: React.ElementType;
  feature?: string;
  children: NavItemChild[];
}

interface NavItemSingle {
  href: string;
  label: string;
  icon: React.ElementType;
  feature?: string;
}

type NavItem = NavItemSingle | NavItemGroup;

const teacherNavItems: NavItem[] = [
  { href: "/teacher", label: "Dashboard", icon: LayoutDashboard },
  {
    label: "Academics",
    icon: BookOpen,
    children: [
      { href: "/teacher/academics", label: "Academics Hub", icon: BookOpen },
      { href: "/teacher/classes", label: "My Classes", icon: Users2 },
      { href: "/teacher/timetable", label: "Timetable", icon: Clock },
      { href: "/teacher/assignments", label: "Assignments", icon: Inbox },
      { href: "/teacher/lesson-notes", label: "Lesson Notes", icon: ScrollText },
    ]
  },
  {
    label: "Students & Attendance",
    icon: GraduationCap,
    children: [
      { href: "/teacher/students", label: "Student Directory", icon: GraduationCap },
      { href: "/teacher/attendance", label: "Attendance Record", icon: ClipboardList },
    ]
  },
  {
    label: "Work & Tools",
    icon: CheckSquare,
    children: [
      { href: "/teacher/communication", label: "Communication", icon: MessagesSquare },
      { href: "/teacher/tasks", label: "Tasks & Activities", icon: CheckSquare },
      { href: "/teacher/meetings", label: "Staff Meetings", icon: Users },
      { href: "/teacher/leave", label: "Leave Requests", icon: Calendar },
      { href: "/teacher/reports", label: "Class Reports", icon: BarChart3 },
      { href: "/teacher/documents", label: "Documents Hub", icon: FileText },
    ]
  }
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

  // Track open menus based on pathname
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>(() => ({
    Academics: ["/teacher/academics", "/teacher/classes", "/teacher/timetable", "/teacher/assignments", "/teacher/lesson-notes"].some((p) => pathname === p || pathname.startsWith(p + "/")),
    "Students & Attendance": ["/teacher/students", "/teacher/attendance"].some((p) => pathname === p || pathname.startsWith(p + "/")),
    "Work & Tools": ["/teacher/communication", "/teacher/tasks", "/teacher/meetings", "/teacher/leave", "/teacher/reports", "/teacher/documents"].some((p) => pathname === p || pathname.startsWith(p + "/")),
  }));

  useEffect(() => {
    fetch("/api/school/user-management/current-permissions")
      .then((r) => r.json())
      .then((data) => {
        if (data.features) setFeatures(data.features);
      })
      .catch(() => {});
  }, []);

  function toggleMenu(label: string) {
    setOpenMenus(prev => ({ ...prev, [label]: !prev[label] }));
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const initials = userName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const brandName = schoolName ?? "Compunerd";

  function isVisible(item: NavItemChild | NavItemSingle | NavItemGroup): boolean {
    if (item.feature) {
      const isFeatureEnabled = features.includes(item.feature);
      if (!isFeatureEnabled) return false;
    }
    if ("children" in item) {
      return item.children.some((child) => isVisible(child));
    }
    return true;
  }

  return (
    <aside className="w-[260px] shrink-0 flex flex-col h-full overflow-hidden"
      style={{ background: "linear-gradient(180deg, #1a1854 0%, #2e1a6b 40%, #6b1f8a 80%, #92278F 100%)" }}>

      {/* School branding */}
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center gap-3 px-2">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden shadow-lg shadow-black/20"
            style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}>
            {schoolLogo
              ? <img src={schoolLogo} alt="Logo" className="w-full h-full object-contain" />
              : <GraduationCap size={22} className="text-white" />
            }
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-extrabold leading-tight text-white truncate">
              {brandName}
            </p>
            <p className="text-[11px] text-white/50 font-medium">Teacher Portal</p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-white/10" />

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5 scrollbar-hide">
        <p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-white/30 px-3 mb-2">Navigation</p>

        {teacherNavItems.map((item) => {
          if (!isVisible(item)) return null;

          if ("children" in item) {
            const childPaths = (item.children ?? []).map(c => c.href);
            const groupActive = childPaths.some(p => pathname === p || pathname.startsWith(p + "/"));
            const isOpen = openMenus[item.label] ?? groupActive;
            return (
              <div key={item.label}>
                <button
                  onClick={() => toggleMenu(item.label)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-semibold transition-all",
                    groupActive
                      ? "bg-white/15 text-white"
                      : "text-white/65 hover:text-white hover:bg-white/8",
                  )}
                >
                  <span className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all",
                    groupActive ? "bg-white/20 shadow-sm" : "bg-white/8",
                  )}>
                    <item.icon size={15} />
                  </span>
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronDown size={13} className={cn("transition-transform opacity-50", isOpen && "rotate-180")} />
                </button>
                {isOpen && (
                  <div className="ml-4 mt-1 space-y-0.5 border-l border-white/10 pl-3">
                    {(item.children ?? [])
                      .filter((child) => isVisible(child))
                      .map(({ href, label, icon: Icon }) => {
                        const active = pathname === href || pathname.startsWith(href + "/");
                        return (
                          <Link key={href} href={href}
                            className={cn(
                              "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12.5px] font-medium transition-all",
                              active
                                ? "bg-white/20 text-white font-semibold"
                                : "text-white/55 hover:text-white hover:bg-white/10",
                            )}>
                            <Icon size={13} className="shrink-0" />
                            {label}
                          </Link>
                        );
                      })}
                  </div>
                )}
              </div>
            );
          }

          const active = pathname === item.href || (item.href !== "/teacher" && pathname.startsWith(item.href + "/"));
          return (
            <Link key={item.href} href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-semibold transition-all group",
                active
                  ? "bg-white text-[#262262] shadow-md shadow-black/10"
                  : "text-white/65 hover:text-white hover:bg-white/10",
              )}>
              <span className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all",
                active ? "bg-[#262262]/10" : "bg-white/8 group-hover:bg-white/15",
              )}>
                <item.icon size={15} />
              </span>
              {item.label}
            </Link>
          );
        })}

        <div className="h-3" />
        <div className="mx-1 h-px bg-white/10 mb-3" />
        <p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-white/30 px-3 mb-2">Account</p>

        <Link href="/teacher/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-semibold transition-all group",
            pathname.startsWith("/teacher/settings")
              ? "bg-white text-[#262262] shadow-md shadow-black/10"
              : "text-white/65 hover:text-white hover:bg-white/10",
          )}>
          <span className={cn(
            "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
            pathname.startsWith("/teacher/settings") ? "bg-[#262262]/10" : "bg-white/8 group-hover:bg-white/15",
          )}>
            <Settings size={15} />
          </span>
          Settings
        </Link>
      </nav>

      {/* User footer */}
      <div className="mx-4 h-px bg-white/10" />
      <div className="px-3 py-4">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[12px] font-extrabold text-white shrink-0 shadow-inner"
            style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0.1))" }}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-white truncate leading-tight">{userName}</p>
            <p className="text-[10px] text-white/45 capitalize truncate">Teacher</p>
          </div>
          <button onClick={handleLogout} title="Sign out"
            className="w-8 h-8 flex items-center justify-center rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
