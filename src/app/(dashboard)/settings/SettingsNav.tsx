"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Calendar, BookOpen, LayoutGrid, DollarSign, School, User, LucideIcon } from "lucide-react";

const nav: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "School profile", href: "/settings/school", icon: School },
  { label: "Academic year", href: "/settings/academic-year", icon: Calendar },
  { label: "Classes", href: "/settings/classes", icon: LayoutGrid },
  { label: "Subjects", href: "/settings/subjects", icon: BookOpen },
  { label: "Fee structure", href: "/settings/fees", icon: DollarSign },
  { label: "My account", href: "/settings", icon: User },
];

export function SettingsNav({ isHeadmaster }: { isHeadmaster: boolean }) {
  const pathname = usePathname();
  const visibleNav = isHeadmaster ? nav : nav.filter((n) => n.href === "/settings");

  if (visibleNav.length <= 1) return null;

  return (
    <div className="flex flex-wrap gap-2 border-b border-[var(--border)] pb-4">
      {visibleNav.map(({ label, href, icon: Icon }) => {
        const active = href === "/settings" ? pathname === "/settings" : pathname.startsWith(href);
        return (
          <Link key={href} href={href}>
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-[15px] font-medium transition-all",
              active
                ? "bg-[var(--brand)] text-white"
                : "text-[var(--text-muted)] hover:bg-[var(--brand-subtle)] hover:text-[var(--brand)]",
            )}>
              <Icon size={14} />
              {label}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
