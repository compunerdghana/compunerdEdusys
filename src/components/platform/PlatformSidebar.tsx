"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Plus,
  CreditCard,
  Package,
  Users,
  Zap,
  Megaphone,
  Wallet,
  LifeBuoy,
  Shield,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const navigation: NavGroup[] = [
  {
    group: "Overview",
    items: [
      { label: "Dashboard", href: "/platform/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    group: "Schools",
    items: [
      { label: "All Schools", href: "/platform/schools", icon: Building2 },
      { label: "Create School", href: "/platform/schools/new", icon: Plus },
    ],
  },
  {
    group: "Subscriptions",
    items: [
      { label: "Subscriptions", href: "/platform/subscriptions", icon: CreditCard },
      { label: "Plans", href: "/platform/subscriptions/plans", icon: Package },
    ],
  },
  {
    group: "Platform",
    items: [
      { label: "Platform Users", href: "/platform/users", icon: Users },
      { label: "Features", href: "/platform/features", icon: Zap },
      { label: "Announcements", href: "/platform/announcements", icon: Megaphone },
    ],
  },
  {
    group: "Finance",
    items: [
      { label: "Platform Wallet", href: "/platform/wallet", icon: Wallet },
    ],
  },
  {
    group: "Support",
    items: [
      { label: "Support Tickets", href: "/platform/support", icon: LifeBuoy },
      { label: "Audit Logs", href: "/platform/audit", icon: Shield },
    ],
  },
];

interface PlatformSidebarProps {
  userName: string;
  userRole: string;
  onLogout: () => void;
}

export function PlatformSidebar({ userName, userRole, onLogout }: PlatformSidebarProps) {
  const pathname = usePathname();

  const initials = userName
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  function isActive(href: string) {
    if (href === "/platform/dashboard") return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{ background: "linear-gradient(180deg, #1a0533 0%, #2d1b69 60%, #1a0533 100%)", borderRight: "1px solid rgba(255,255,255,0.08)" }}
    >
      {/* Brand */}
      <div className="px-5 py-5 shrink-0 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #6b1f8a, #2d1b69)", border: "1px solid rgba(255,255,255,0.2)" }}
          >
            <ShieldCheck size={18} className="text-white" />
          </div>
          <div>
            <p className="text-white font-extrabold text-sm leading-tight">CompunerdEduSys</p>
            <p className="text-white/40 text-[10px] font-semibold uppercase tracking-wider">Platform Admin</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {navigation.map(({ group, items }) => (
          <div key={group}>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest px-3 mb-1.5">
              {group}
            </p>
            <div className="space-y-0.5">
              {items.map(({ label, href, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all",
                      active
                        ? "bg-white/15 text-white font-bold"
                        : "text-white/60 hover:text-white hover:bg-white/8 font-semibold",
                    )}
                  >
                    <Icon size={16} className={active ? "text-white" : "text-white/50"} />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom user block */}
      <div className="shrink-0 px-3 py-4 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-2"
          style={{ background: "rgba(255,255,255,0.06)" }}>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-extrabold shrink-0"
            style={{ background: "linear-gradient(135deg, #2d1b69, #6b1f8a)" }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-sm font-bold truncate leading-tight">{userName}</p>
            <p className="text-white/40 text-[10px] font-semibold capitalize truncate">{userRole.replace("_", " ")}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-all text-sm font-semibold"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </div>
  );
}
