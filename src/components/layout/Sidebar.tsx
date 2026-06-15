"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, BookOpen, ClipboardList,
  CreditCard, MessageSquare, Settings,
  GraduationCap, BarChart3, ChevronDown, UserCog, LogOut, CalendarClock,
  Wallet, Receipt, PiggyBank, Building2, TrendingUp, DollarSign,
  Calendar, Award, ArrowRightLeft, UserMinus, Dumbbell,
  Bell, Send, Smartphone, FileText, Zap, History, Settings2, MessageCircle, BadgeDollarSign,
  AlertCircle, UserCheck,
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const navItems = [
  { href: "/dashboard",      label: "Dashboard",     icon: LayoutDashboard },
  { href: "/students",       label: "Students",       icon: Users },
  {
    label: "Staff",
    icon: UserCog,
    children: [
      { href: "/staff/dashboard",   label: "Dashboard",   icon: LayoutDashboard },
      { href: "/staff",             label: "All Staff",   icon: Users },
      { href: "/staff/attendance",  label: "Attendance",  icon: ClipboardList },
      { href: "/staff/leave",       label: "Leave",       icon: Calendar },
      { href: "/staff/training",    label: "Training",    icon: Dumbbell },
      { href: "/staff/promotions",  label: "Promotions",  icon: Award },
      { href: "/staff/transfers",   label: "Transfers",   icon: ArrowRightLeft },
      { href: "/staff/exits",       label: "Exits",       icon: UserMinus },
    ],
  },
  {
    label: "Academics",
    icon: BookOpen,
    children: [
      { href: "/academics",         label: "Academics",     icon: BookOpen },
      { href: "/attendance",        label: "Attendance",    icon: ClipboardList },
      { href: "/timetable",         label: "Timetable",     icon: CalendarClock },
      { href: "/exams",             label: "Enter Scores",  icon: GraduationCap },
      { href: "/exams/report-card", label: "Report Cards",  icon: GraduationCap },
    ],
  },
  {
    label: "Finance",
    icon: CreditCard,
    children: [
      { href: "/finance",              label: "Overview",     icon: Wallet },
      { href: "/finance/expenses",     label: "Expenses",     icon: Receipt },
      { href: "/finance/income",       label: "Income",       icon: TrendingUp },
      { href: "/finance/budget",       label: "Budget",       icon: PiggyBank },
      { href: "/finance/petty-cash",   label: "Petty Cash",   icon: DollarSign },
      { href: "/finance/payroll",       label: "Payroll",      icon: BadgeDollarSign },
      { href: "/finance/bank-accounts",label: "Bank Accounts",icon: Building2 },
    ],
  },
  {
    label: "Communications",
    icon: MessageSquare,
    children: [
      { href: "/communications/dashboard",     label: "Dashboard",    icon: LayoutDashboard },
      { href: "/communications",               label: "Compose",      icon: Send },
      { href: "/communications/whatsapp",      label: "WhatsApp",     icon: MessageCircle },
      { href: "/communications/sms",           label: "SMS Center",   icon: Smartphone },
      { href: "/communications/notifications", label: "Notifications",icon: Bell },
      { href: "/communications/templates",     label: "Templates",    icon: FileText },
      { href: "/communications/automation",    label: "Automation",   icon: Zap },
      { href: "/communications/logs",          label: "Logs",         icon: History },
      { href: "/communications/settings",      label: "Settings",     icon: Settings2 },
    ],
  },
  {
    label: "Reports",
    icon: BarChart3,
    children: [
      { href: "/reports",                    label: "Dashboard",       icon: LayoutDashboard },
      { href: "/reports?tab=students",       label: "Student Reports", icon: Users },
      { href: "/reports?tab=attendance",     label: "Attendance",      icon: CalendarClock },
      { href: "/reports?tab=finance",        label: "Fee Collection",  icon: CreditCard },
      { href: "/reports?tab=outstanding",    label: "Outstanding Fees",icon: AlertCircle },
      { href: "/reports?tab=staff",          label: "Staff Reports",   icon: UserCheck },
      { href: "/reports?tab=payroll",        label: "Payroll Report",  icon: BadgeDollarSign },
      { href: "/reports?tab=exams",          label: "Exam Results",    icon: GraduationCap },
      { href: "/reports?tab=analytics",      label: "Analytics",       icon: TrendingUp },
      { href: "/reports?tab=comms",          label: "Communications",  icon: MessageSquare },
      { href: "/reports?tab=reportcards",    label: "Report Cards",    icon: FileText },
    ],
  },
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

  // Generic open state per group label
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>(() => ({
    Academics: ["/academics", "/timetable", "/exams", "/attendance"].some((p) => pathname.startsWith(p)),
    Finance: pathname.startsWith("/finance"),
    Staff: pathname.startsWith("/staff"),
    Communications: pathname.startsWith("/communications"),
    Reports: pathname.startsWith("/reports"),
  }));

  function toggleMenu(label: string) {
    setOpenMenus(prev => ({ ...prev, [label]: !prev[label] }));
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const initials = userName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <aside className="w-64 shrink-0 flex flex-col h-full overflow-hidden"
      style={{ background: "linear-gradient(160deg, #1a1854 0%, #2e1a6b 40%, #6b1f8a 80%, #92278F 100%)" }}>

      {/* School branding */}
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center gap-3 px-2">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden shadow-lg shadow-black/20"
            style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}>
            {schoolLogo
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={schoolLogo} alt="Logo" className="w-full h-full object-contain" />
              : <GraduationCap size={22} className="text-white" />
            }
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-extrabold leading-tight text-white truncate">
              {schoolName ?? "Compunerd"}
            </p>
            <p className="text-[11px] text-white/50 font-medium">{schoolName ? "School Portal" : "EduSys"}</p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-white/10" />

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5 scrollbar-hide">
        <p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-white/30 px-3 mb-2">Navigation</p>

        {navItems.map((item) => {
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
                    {(item.children ?? []).map(({ href, label, icon: Icon }) => {
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

          const active = pathname === item.href || (item.href !== "/dashboard" && item.href !== "/attendance" && pathname.startsWith(item.href + "/"));
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

        <Link href="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-semibold transition-all group",
            pathname.startsWith("/settings")
              ? "bg-white text-[#262262] shadow-md shadow-black/10"
              : "text-white/65 hover:text-white hover:bg-white/10",
          )}>
          <span className={cn(
            "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
            pathname.startsWith("/settings") ? "bg-[#262262]/10" : "bg-white/8 group-hover:bg-white/15",
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
            <p className="text-[10px] text-white/45 capitalize truncate">{userRole?.replace("_", " ")}</p>
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
