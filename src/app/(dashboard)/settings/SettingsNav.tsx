"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Calendar, BookOpen, LayoutGrid, DollarSign, School, User, LucideIcon, CalendarDays } from "lucide-react";

const nav: { label: string; href: string; icon: LucideIcon; desc: string }[] = [
  { label: "School Profile",     href: "/settings/school",              icon: School,       desc: "Name, logo, contact" },
  { label: "Academic Year",      href: "/settings/academic-year",       icon: Calendar,     desc: "Years, terms & dates" },
  { label: "Event Calendar",     href: "/settings/academic-calendar",   icon: CalendarDays, desc: "Events & important dates" },
  { label: "Classes",            href: "/settings/classes",             icon: LayoutGrid,   desc: "Manage class groups" },
  { label: "Subjects",           href: "/settings/subjects",            icon: BookOpen,     desc: "Curriculum subjects" },
  { label: "Fee Structure",      href: "/settings/fees",                icon: DollarSign,   desc: "Fees & auto-billing" },
  { label: "My Account",         href: "/settings",                     icon: User,         desc: "Profile & password" },
];

export function SettingsNav({ isHeadmaster }: { isHeadmaster: boolean }) {
  const pathname = usePathname();
  const visibleNav = isHeadmaster ? nav : nav.filter((n) => n.href === "/settings");

  if (visibleNav.length <= 1) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {visibleNav.map(({ label, href, icon: Icon, desc }) => {
        const active = href === "/settings" ? pathname === "/settings" : pathname.startsWith(href);
        return (
          <Link key={href} href={href}>
            <div className={cn(
              "flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all group",
              active
                ? "bg-[#262262] border-[#262262] shadow-sm"
                : "bg-white border-[var(--border)] hover:border-[#262262]/30 hover:shadow-sm",
            )}>
              <div className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                active ? "bg-white/20" : "bg-[#26226210] group-hover:bg-[#26226218]",
              )}>
                <Icon size={16} className={active ? "text-white" : "text-[#262262]"} />
              </div>
              <div className="min-w-0">
                <p className={cn("text-[13px] font-semibold leading-tight truncate", active ? "text-white" : "text-[var(--text-strong)]")}>{label}</p>
                <p className={cn("text-[11px] leading-tight truncate", active ? "text-white/70" : "text-[var(--text-muted)]")}>{desc}</p>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
