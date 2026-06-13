"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, BookOpen, ClipboardList,
  CreditCard, Calendar, MessageSquare, Settings,
  GraduationCap, BarChart3, ChevronDown, UserCog,
} from "lucide-react";
import { useState } from "react";

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
      { href: "/exams", label: "Exams & reports", icon: GraduationCap },
    ],
  },
  { href: "/finance", label: "Finance", icon: CreditCard },
  { href: "/communications", label: "Communications", icon: MessageSquare },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();
  const academicsActive = ["/academics", "/timetable", "/exams"].some((p) => pathname.startsWith(p));
  const [academicsOpen, setAcademicsOpen] = useState(academicsActive);

  return (
    <aside className="w-64 shrink-0 flex flex-col h-full bg-[var(--brand-ink)] text-white">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--gradient-brand)" }}>
            <GraduationCap size={20} className="text-white" />
          </div>
          <div>
            <p className="text-[15px] font-bold leading-none text-white">Compunerd</p>
            <p className="text-[12px] text-white/60 font-medium mt-0.5">EduSys</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          if ("children" in item) {
            // Group
            return (
              <div key={item.label}>
                <button
                  onClick={() => setAcademicsOpen((v) => !v)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-[10px] text-[15px] font-medium transition-all",
                    academicsActive ? "bg-white/15 text-white" : "text-white/65 hover:text-white hover:bg-white/10",
                  )}
                >
                  <item.icon size={18} strokeWidth={academicsActive ? 2.5 : 2} />
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronDown size={14} className={cn("transition-transform", academicsOpen && "rotate-180")} />
                </button>
                {academicsOpen && (
                  <div className="ml-4 mt-1 space-y-1 border-l border-white/10 pl-3">
                    {item.children.map(({ href, label, icon: Icon }) => {
                      const active = pathname === href || pathname.startsWith(href);
                      return (
                        <Link
                          key={href}
                          href={href}
                          className={cn(
                            "flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-[14px] font-medium transition-all",
                            active ? "bg-white/15 text-white" : "text-white/60 hover:text-white hover:bg-white/10",
                          )}
                        >
                          <Icon size={15} strokeWidth={active ? 2.5 : 2} />
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
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3.5 py-2.5 rounded-[10px] text-[15px] font-medium transition-all",
                active ? "bg-white/15 text-white" : "text-white/65 hover:text-white hover:bg-white/10",
              )}
            >
              <item.icon size={18} strokeWidth={active ? 2.5 : 2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-5 pt-3 border-t border-white/10">
        {(() => {
          const active = pathname.startsWith("/settings");
          return (
            <Link
              href="/settings"
              className={cn(
                "flex items-center gap-3 px-3.5 py-2.5 rounded-[10px] text-[15px] font-medium transition-all",
                active ? "bg-white/15 text-white" : "text-white/65 hover:text-white hover:bg-white/10",
              )}
            >
              <Settings size={18} strokeWidth={active ? 2.5 : 2} />
              Settings
            </Link>
          );
        })()}
      </div>
    </aside>
  );
}
