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
  AlertCircle, UserCheck, Shield, ScrollText,
} from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface NavItemChild {
  href: string;
  label: string;
  icon: React.ElementType;
  feature?: string;
  permission?: string;
}

interface NavItemGroup {
  label: string;
  icon: React.ElementType;
  feature?: string;
  permission?: string;
  children: NavItemChild[];
}

interface NavItemSingle {
  href: string;
  label: string;
  icon: React.ElementType;
  feature?: string;
  permission?: string;
}

type NavItem = NavItemSingle | NavItemGroup;

const navItems: NavItem[] = [
  { href: "/dashboard",      label: "Dashboard",     icon: LayoutDashboard, permission: "dashboard.view" },
  { href: "/students",       label: "Students",       icon: Users, feature: "students", permission: "students.view" },
  {
    label: "Staff",
    icon: UserCog,
    children: [
      { href: "/staff/dashboard",   label: "Dashboard",   icon: LayoutDashboard, permission: "staff.view" },
      { href: "/staff",             label: "All Staff",   icon: Users, permission: "staff.view" },
      { href: "/staff/attendance",  label: "Attendance",  icon: ClipboardList, feature: "attendance", permission: "staff.attendance.record" },
      { href: "/staff/leave",       label: "Leave",       icon: Calendar, feature: "payroll", permission: "staff.leave.manage" },
      { href: "/staff/training",    label: "Training",    icon: Dumbbell, feature: "payroll", permission: "staff.training.manage" },
      { href: "/staff/promotions",  label: "Promotions",  icon: Award, feature: "payroll", permission: "staff.edit" },
      { href: "/staff/transfers",   label: "Transfers",   icon: ArrowRightLeft, feature: "payroll", permission: "staff.edit" },
      { href: "/staff/exits",       label: "Exits",       icon: UserMinus, feature: "payroll", permission: "staff.edit" },
    ],
  },
  {
    label: "Academics",
    icon: BookOpen,
    children: [
      { href: "/academics",         label: "Academics",     icon: BookOpen, permission: "academics.manage" },
      { href: "/attendance",        label: "Attendance",    icon: ClipboardList, feature: "attendance", permission: "attendance.record" },
      { href: "/timetable",         label: "Timetable",     icon: CalendarClock, permission: "timetable.manage" },
      { href: "/exams",             label: "Enter Scores",  icon: GraduationCap, feature: "exams", permission: "exams.enter" },
      { href: "/exams/report-card", label: "Report Cards",  icon: GraduationCap, feature: "report_cards", permission: "reports.generate" },
    ],
  },
  {
    label: "Finance",
    icon: CreditCard,
    feature: "finance",
    children: [
      { href: "/finance",              label: "Overview",     icon: Wallet, permission: "finance.view" },
      { href: "/finance/expenses",     label: "Expenses",     icon: Receipt, permission: "finance.expenses.manage" },
      { href: "/finance/income",       label: "Income",       icon: TrendingUp, permission: "finance.view" },
      { href: "/finance/budget",       label: "Budget",       icon: PiggyBank, permission: "finance.manage" },
      { href: "/finance/petty-cash",   label: "Petty Cash",   icon: DollarSign, permission: "finance.expenses.manage" },
      { href: "/finance/payroll",       label: "Payroll",      icon: BadgeDollarSign, feature: "payroll", permission: "finance.payroll.manage" },
      { href: "/finance/bank-accounts",label: "Bank Accounts",icon: Building2, permission: "finance.manage" },
    ],
  },
  {
    label: "Communications",
    icon: MessageSquare,
    feature: "communications",
    children: [
      { href: "/communications/dashboard",     label: "Dashboard",    icon: LayoutDashboard, permission: "communication.send" },
      { href: "/communications",               label: "Compose",      icon: Send, permission: "communication.send" },
      { href: "/communications/whatsapp",      label: "WhatsApp",     icon: MessageCircle, permission: "communication.whatsapp.manage" },
      { href: "/communications/sms",           label: "SMS Center",   icon: Smartphone, permission: "communication.sms.manage" },
      { href: "/communications/notifications", label: "Notifications",icon: Bell, permission: "communication.send" },
      { href: "/communications/templates",     label: "Templates",    icon: FileText, permission: "communication.send" },
      { href: "/communications/automation",    label: "Automation",   icon: Zap, permission: "communication.settings.manage" },
      { href: "/communications/logs",          label: "Logs",         icon: History, permission: "communication.send" },
      { href: "/communications/settings",      label: "Settings",     icon: Settings2, permission: "communication.settings.manage" },
    ],
  },
  {
    label: "Reports",
    icon: BarChart3,
    children: [
      { href: "/reports",                    label: "Dashboard",       icon: LayoutDashboard, permission: "reports.generate" },
      { href: "/reports?tab=students",       label: "Student Reports", icon: Users, permission: "reports.generate" },
      { href: "/reports?tab=attendance",     label: "Attendance",      icon: CalendarClock, permission: "reports.generate" },
      { href: "/reports?tab=finance",        label: "Fee Collection",  icon: CreditCard, feature: "finance", permission: "reports.generate" },
      { href: "/reports?tab=outstanding",    label: "Outstanding Fees",icon: AlertCircle, feature: "finance", permission: "reports.generate" },
      { href: "/reports?tab=staff",          label: "Staff Reports",   icon: UserCheck, permission: "reports.generate" },
      { href: "/reports?tab=payroll",        label: "Payroll Report",  icon: BadgeDollarSign, feature: "payroll", permission: "reports.generate" },
      { href: "/reports?tab=exams",          label: "Exam Results",    icon: GraduationCap, feature: "exams", permission: "reports.generate" },
      { href: "/reports?tab=analytics",      label: "Analytics",       icon: TrendingUp, permission: "reports.generate" },
      { href: "/reports?tab=comms",          label: "Communications",  icon: MessageSquare, feature: "communications", permission: "reports.generate" },
      { href: "/reports?tab=reportcards",    label: "Report Cards",    icon: FileText, feature: "report_cards", permission: "reports.generate" },
    ],
  },
  {
    label: "User Management",
    icon: UserCheck,
    children: [
      { href: "/user-management",             label: "Dashboard",       icon: LayoutDashboard, permission: "users.manage" },
      { href: "/user-management/users",       label: "All Users",       icon: Users, permission: "users.manage" },
      { href: "/user-management/students",     label: "Students",        icon: GraduationCap, permission: "students.view" },
      { href: "/user-management/parents",      label: "Parents",         icon: Users, permission: "users.manage" },
      { href: "/user-management/teachers",     label: "Teachers",        icon: UserCog, permission: "users.manage" },
      { href: "/user-management/staff",        label: "Staff Directory", icon: UserCheck, permission: "staff.view" },
      { href: "/user-management/roles",        label: "User Roles",      icon: Shield, permission: "roles.manage" },
      { href: "/user-management/permissions",  label: "Permissions",     icon: ScrollText, permission: "roles.manage" },
      { href: "/user-management/features",     label: "Feature Access",  icon: Zap, permission: "school.settings.manage" },
      { href: "/user-management/groups",       label: "User Groups",     icon: UserCog, permission: "users.manage" },
      { href: "/user-management/parent-ward",  label: "Parent-Ward Links",icon: ArrowRightLeft, permission: "users.manage" },
      { href: "/user-management/login-history",label: "Login History",   icon: History, permission: "audit.view" },
      { href: "/user-management/activity-logs",label: "Activity Logs",   icon: ScrollText, permission: "audit.view" },
      { href: "/user-management/archived",     label: "Archived Users",  icon: UserMinus, permission: "users.manage" },
    ],
  }
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

  const [userContext, setUserContext] = useState<{ permissions: string[]; features: string[]; role?: string } | null>(null);

  // Generic open state per group label
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>(() => ({
    Academics: ["/academics", "/timetable", "/exams", "/attendance"].some((p) => pathname.startsWith(p)),
    Finance: pathname.startsWith("/finance"),
    Staff: pathname.startsWith("/staff"),
    Communications: pathname.startsWith("/communications"),
    Reports: pathname.startsWith("/reports"),
    "User Management": pathname.startsWith("/user-management"),
  }));

  useEffect(() => {
    fetch("/api/school/user-management/current-permissions")
      .then((r) => r.json())
      .then((data) => setUserContext(data))
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

  // Helper to filter nav items dynamically
  function isVisible(item: NavItemChild | NavItemSingle | NavItemGroup): boolean {
    if (!userContext) return true; // show everything during initial loading or bypass
    if (userContext.role === "super_admin") return true;

    // Check high level feature toggle
    if (item.feature) {
      // Find matching school feature key (e.g. communications, finance)
      const isFeatureEnabled = userContext.features.includes(item.feature);
      if (!isFeatureEnabled) return false;
    }

    // Check specific permission
    if (item.permission) {
      const isAdminRole =
        userContext.role === "admin" ||
        userContext.role === "owner" ||
        userContext.role === "school_owner" ||
        userContext.role === "school_admin";

      if (!isAdminRole) {
        const hasPerm = userContext.permissions.includes(item.permission);
        if (!hasPerm) return false;
      }
    }

    // For groups, check if any child is visible
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
                                ? "bg-white text-black shadow-sm font-semibold"
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
                  ? "bg-white text-black shadow-md"
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
              ? "bg-white text-black shadow-md"
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
