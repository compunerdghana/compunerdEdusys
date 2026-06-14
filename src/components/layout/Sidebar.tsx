"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, BookOpen, ClipboardList,
  CreditCard, Calendar, MessageSquare, Settings,
  GraduationCap, BarChart3, ChevronDown, UserCog, LogOut,
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/students", label: "Students", icon: Users },
  { href: "/staff", label: "Staff", icon: UserCog },
  { href: "/attendance", label: "Attendance", icon: ClipboardList },
  {
    label: "Academics",
    icon: BookOpen,
    children: [
      { href: "/academics", label: "Academics", icon: BookOpen },
      { href: "/timetable", label: "Timetable", icon: Calendar },
      { href: "/exams", label: "Enter Scores", icon: GraduationCap },
      { href: "/exams/report-card", label: "Report Cards", icon: GraduationCap },
    ],
  },
  { href: "/finance", label: "Finance", icon: CreditCard },
  { href: "/communications", label: "Communications", icon: MessageSquare },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

interface SidebarProps {
  userName?: string;
  userRole?: string;
  schoolName?: string;
  schoolLogo?: string;
}

export function Sidebar({ userName = "Admin", userRole = "admin", schoolName, schoolLogo }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const academicsActive = ["/academics", "/timetable", "/exams"].some((p) => pathname.startsWith(p));
  const [academicsOpen, setAcademicsOpen] = useState(academicsActive);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="w-64 shrink-0 flex flex-col h-full" style={{ background: "linear-gradient(180deg, #262262 0%, #3d1f6e 50%, #92278F 100%)" }}>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 bg-white/20 backdrop-blur-sm overflow-hidden">
            {schoolLogo
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={schoolLogo} alt="Logo" className="w-full h-full object-contain" />
              : <GraduationCap size={20} className="text-white" />
            }
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-bold leading-none text-white truncate">{schoolName ?? "Compunerd"}</p>
            <p className="text-[11px] text-white/60 font-medium mt-0.5">{schoolName ? "School" : "EduSys"}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/40 px-3 mb-3">Main Menu</p>
        <div className="space-y-1">
          {navItems.map((item) => {
            if ("children" in item) {
              return (
                <div key={item.label}>
                  <button
                    onClick={() => setAcademicsOpen((v) => !v)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-[14px] font-medium transition-all",
                      academicsActive
                        ? "bg-white text-[#262262]"
                        : "text-white/75 hover:text-white hover:bg-white/10",
                    )}
                  >
                    <span className={cn(
                      "w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-all",
                      academicsActive ? "bg-[#262262]/10" : "bg-white/10",
                    )}>
                      <item.icon size={15} />
                    </span>
                    <span className="flex-1 text-left">{item.label}</span>
                    <ChevronDown size={13} className={cn("transition-transform opacity-60", academicsOpen && "rotate-180")} />
                  </button>
                  {academicsOpen && (
                    <div className="ml-4 mt-1 space-y-1 border-l-2 border-white/10 pl-3">
                      {(item.children ?? []).map(({ href, label, icon: Icon }) => {
                        const active = pathname === href || pathname.startsWith(href);
                        return (
                          <Link key={href} href={href}
                            className={cn(
                              "flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all",
                              active ? "bg-white/20 text-white" : "text-white/60 hover:text-white hover:bg-white/10",
                            )}>
                            <Icon size={14} />
                            {label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-2xl text-[14px] font-medium transition-all",
                  active
                    ? "bg-white text-[#262262] shadow-lg shadow-black/10"
                    : "text-white/75 hover:text-white hover:bg-white/10",
                )}>
                <span className={cn(
                  "w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-all",
                  active ? "bg-[#262262]/10" : "bg-white/10",
                )}>
                  <item.icon size={15} />
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>

        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/40 px-3 mb-3 mt-6">Account</p>
        <Link href="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-2xl text-[14px] font-medium transition-all",
            pathname.startsWith("/settings")
              ? "bg-white text-[#262262] shadow-lg shadow-black/10"
              : "text-white/75 hover:text-white hover:bg-white/10",
          )}>
          <span className={cn(
            "w-7 h-7 rounded-xl flex items-center justify-center shrink-0",
            pathname.startsWith("/settings") ? "bg-[#262262]/10" : "bg-white/10",
          )}>
            <Settings size={15} />
          </span>
          Settings
        </Link>
      </nav>

      {/* User + logout */}
      <div className="px-3 pb-5 pt-3 border-t border-white/10">
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
            {userName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-white truncate">{userName}</p>
            <p className="text-[11px] text-white/50 capitalize truncate">{userRole?.replace("_", " ")}</p>
          </div>
          <button onClick={handleLogout} title="Logout"
            className="w-7 h-7 flex items-center justify-center rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-all">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
