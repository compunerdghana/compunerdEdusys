"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, BookOpen, ClipboardList,
  CreditCard, Calendar, MessageSquare, Settings,
  GraduationCap, BarChart3, Building2,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/students", label: "Students", icon: Users },
  { href: "/attendance", label: "Attendance", icon: ClipboardList },
  { href: "/academics", label: "Academics", icon: BookOpen },
  { href: "/exams", label: "Exams & reports", icon: GraduationCap },
  { href: "/finance", label: "Finance", icon: CreditCard },
  { href: "/timetable", label: "Timetable", icon: Calendar },
  { href: "/communications", label: "Communications", icon: MessageSquare },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

const bottomItems = [
  { href: "/school-settings", label: "School settings", icon: Building2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 flex flex-col h-full bg-[var(--brand-ink)] text-white">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--gradient-brand)" }}>
            <GraduationCap size={16} className="text-white" />
          </div>
          <div>
            <p className="text-[13px] font-bold leading-none text-white">Compunerd</p>
            <p className="text-[11px] text-white/60 font-medium mt-0.5">EduSys</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-sm font-medium transition-all",
                active
                  ? "bg-white/15 text-white"
                  : "text-white/60 hover:text-white hover:bg-white/8",
              )}
            >
              <Icon size={16} strokeWidth={active ? 2.5 : 2} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 pt-2 border-t border-white/10 space-y-0.5">
        {bottomItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-sm font-medium transition-all",
                active ? "bg-white/15 text-white" : "text-white/60 hover:text-white hover:bg-white/8",
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
