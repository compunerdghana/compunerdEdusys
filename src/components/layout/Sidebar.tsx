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
  Library, Bus, Bed, Package, Mail, ArrowRight, Home, HelpCircle,
  UserPlus, CheckCircle2, Clock,
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
  {
    label: "Academic",
    icon: BookOpen,
    children: [
      { href: "/academics",         label: "Curriculum",       icon: BookOpen, permission: "academics.manage" },
      { href: "/settings/subjects", label: "Subjects",         icon: ScrollText, permission: "academics.manage" },
      { href: "/academics/syllabus",label: "Syllabus",         icon: FileText, permission: "academics.manage" },
      { href: "/academics/departments", label: "Departments",  icon: Home, permission: "academics.manage" },
      { href: "/academics/programs",label: "Programs",         icon: Award, permission: "academics.manage" },
      { href: "/timetable",         label: "Class Schedules",  icon: CalendarClock, permission: "timetable.manage" },
      { href: "/timetable/teachers",label: "Teacher Schedules",icon: UserCog, permission: "timetable.manage" },
      { href: "/timetable/rooms",   label: "Room Allocations", icon: Building2, permission: "timetable.manage" },
      { href: "/academic-calendar", label: "Terms",            icon: Calendar, permission: "timetable.manage" },
      { href: "/academic-calendar/semesters", label: "Semesters", icon: Calendar, permission: "timetable.manage" },
      { href: "/settings/academic-calendar",  label: "Events",  icon: Bell, permission: "timetable.manage" },
    ],
  },
  {
    label: "Admissions",
    icon: UserPlus || UserCog,
    children: [
      { href: "/admissions/new",              label: "New Applications", icon: FileText, permission: "students.view" },
      { href: "/admissions/online",           label: "Online Admissions",icon: Zap, permission: "students.view" },
      { href: "/admissions/reviews",          label: "Application Reviews",icon: UserCheck, permission: "students.view" },
      { href: "/admissions/acceptance",       label: "Acceptance",       icon: CheckCircle2, permission: "students.view" },
      { href: "/admissions/rejection",        label: "Rejection",        icon: AlertCircle, permission: "students.view" },
      { href: "/admissions/waiting-list",     label: "Waiting List",     icon: Clock, permission: "students.view" },
      { href: "/admissions/registration",     label: "Registration",     icon: FileText, permission: "students.view" },
      { href: "/admissions/placement",        label: "Placement",        icon: TrendingUp, permission: "students.view" },
      { href: "/admissions/class-assignment", label: "Class Assignment", icon: ArrowRightLeft, permission: "students.view" },
    ],
  },
  {
    label: "Students",
    icon: Users,
    children: [
      { href: "/students",                    label: "Student Profiles", icon: Users, permission: "students.view" },
      { href: "/students/medical",            label: "Medical Records",  icon: AlertCircle, permission: "students.view" },
      { href: "/students/guardians",          label: "Guardian Details", icon: Users, permission: "students.view" },
      { href: "/students/documents",          label: "Documents",        icon: FileText, permission: "students.view" },
      { href: "/students/promotion",          label: "Next Class Promotion",icon: TrendingUp, permission: "students.view" },
      { href: "/students/graduation",         label: "Graduation",       icon: GraduationCap, permission: "students.view" },
      { href: "/students/behaviour",          label: "Behaviour Tracking",icon: UserCheck, permission: "students.view" },
      { href: "/students/punishments",        label: "Punishments",      icon: AlertCircle, permission: "students.view" },
      { href: "/students/rewards",            label: "Rewards",          icon: Award, permission: "students.view" },
    ],
  },
  {
    label: "Teachers",
    icon: UserCog,
    children: [
      { href: "/user-management/teachers",    label: "Teacher Profiles", icon: UserCog, permission: "staff.view" },
      { href: "/teachers/qualifications",     label: "Qualifications",   icon: FileText, permission: "staff.view" },
      { href: "/staff/attendance",            label: "Attendance",       icon: ClipboardList, permission: "staff.view" },
      { href: "/teachers/workload",           label: "Workload Allocation",icon: History, permission: "staff.view" },
      { href: "/staff/performance",           label: "Performance Evaluation",icon: TrendingUp, permission: "staff.view" },
    ],
  },
  {
    label: "Attendance",
    icon: ClipboardList,
    children: [
      { href: "/attendance",                  label: "Daily Attendance",  icon: ClipboardList, permission: "attendance.record" },
      { href: "/attendance/class",            label: "Class Attendance",  icon: ClipboardList, permission: "attendance.record" },
      { href: "/staff/attendance?type=teacher",label: "Teacher Attendance",icon: ClipboardList, permission: "staff.attendance.record" },
      { href: "/staff/attendance?type=non-teaching",label: "Staff Attendance",icon: ClipboardList, permission: "staff.attendance.record" },
    ],
  },
  {
    label: "Examinations",
    icon: Award,
    children: [
      { href: "/exams",                       label: "Exams",            icon: Award, permission: "exams.enter" },
      { href: "/exams/quizzes",               label: "Quizzes",          icon: ScrollText, permission: "exams.enter" },
      { href: "/exams/assignments",           label: "Assignments",      icon: ClipboardList, permission: "exams.enter" },
      { href: "/exams/grading",               label: "Grading",          icon: GraduationCap, permission: "exams.enter" },
      { href: "/exams/results",               label: "Result Computation",icon: BarChart3, permission: "exams.enter" },
      { href: "/exams/transcripts",           label: "Transcripts",      icon: FileText, permission: "reports.generate" },
    ],
  },
  {
    label: "Fees",
    icon: BadgeDollarSign,
    children: [
      { href: "/settings/fees",               label: "Fee Structures",   icon: BadgeDollarSign, permission: "finance.view" },
      { href: "/fees/billing",                label: "Billing",          icon: Wallet, permission: "finance.view" },
      { href: "/fees/invoices",               label: "Invoices",         icon: Receipt, permission: "finance.view" },
      { href: "/fees/receipts",               label: "Receipts",         icon: Receipt, permission: "finance.view" },
      { href: "/fees/discounts",              label: "Discounts",        icon: DollarSign, permission: "finance.view" },
      { href: "/fees/scholarships",           label: "Scholarships",     icon: Award, permission: "finance.view" },
    ],
  },
  {
    label: "Finance",
    icon: Wallet,
    children: [
      { href: "/finance/income",              label: "Income",           icon: TrendingUp, permission: "finance.view" },
      { href: "/finance/expenses",             label: "Expenses",         icon: Receipt, permission: "finance.expenses.manage" },
      { href: "/finance/payroll",              label: "Payroll",          icon: BadgeDollarSign, permission: "finance.payroll.manage" },
      { href: "/finance/budget",               label: "Budgeting",        icon: PiggyBank, permission: "finance.manage" },
      { href: "/finance/accounting",           label: "Accounting",       icon: Wallet, permission: "finance.manage" },
    ],
  },
  {
    label: "Communication",
    icon: MessageSquare,
    children: [
      { href: "/communications/sms",           label: "SMS Center",       icon: Smartphone, permission: "communication.sms.manage" },
      { href: "/communications/compose",      label: "Email Compose",    icon: Send, permission: "communication.send" },
      { href: "/communications/notifications", label: "Push Notifications",icon: Bell, permission: "communication.send" },
      { href: "/communications/parent",       label: "Parent Messaging", icon: MessageCircle, permission: "communication.send" },
    ],
  },
  {
    label: "Human Resources",
    icon: Shield,
    children: [
      { href: "/staff",                       label: "Staff Records",    icon: Users, permission: "staff.view" },
      { href: "/staff/leave",                 label: "Leave Management", icon: Calendar, permission: "staff.leave.manage" },
      { href: "/staff/recruitment",           label: "Recruitment",      icon: UserPlus || UserCog, permission: "staff.edit" },
      { href: "/finance/payroll",              label: "Payroll",          icon: BadgeDollarSign, permission: "finance.payroll.manage" },
    ],
  },
  {
    label: "Library",
    icon: Library,
    children: [
      { href: "/library/books",               label: "Books",            icon: Library, permission: "dashboard.view" },
      { href: "/library/borrowing",           label: "Borrowing",        icon: ArrowRightLeft, permission: "dashboard.view" },
      { href: "/library/returns",             label: "Returns",          icon: CheckCircle2, permission: "dashboard.view" },
      { href: "/library/fines",               label: "Fines",            icon: AlertCircle, permission: "dashboard.view" },
    ],
  },
  {
    label: "Transport",
    icon: Bus,
    children: [
      { href: "/transport/buses",             label: "Buses",            icon: Bus, permission: "dashboard.view" },
      { href: "/transport/drivers",           label: "Drivers",          icon: Users, permission: "dashboard.view" },
      { href: "/transport/routes",            label: "Routes",           icon: History, permission: "dashboard.view" },
      { href: "/transport/tracking",          label: "Tracking",         icon: Zap, permission: "dashboard.view" },
    ],
  },
  {
    label: "Hostel",
    icon: Building2,
    children: [
      { href: "/hostel/rooms",                label: "Rooms",            icon: Home, permission: "dashboard.view" },
      { href: "/hostel/occupancy",            label: "Occupancy",        icon: TrendingUp, permission: "dashboard.view" },
      { href: "/hostel/beds",                 label: "Bed Allocations",  icon: Bed, permission: "dashboard.view" },
    ],
  },
  {
    label: "Inventory",
    icon: Package,
    children: [
      { href: "/inventory/assets",            label: "Assets",           icon: Settings2, permission: "dashboard.view" },
      { href: "/inventory/stock",             label: "Stock",            icon: Package, permission: "dashboard.view" },
      { href: "/inventory/procurement",       label: "Procurement",      icon: Wallet, permission: "dashboard.view" },
    ],
  },
  {
    label: "Reports",
    icon: BarChart3,
    children: [
      { href: "/reports?tab=exams",           label: "Academic Reports", icon: BarChart3, permission: "reports.generate" },
      { href: "/reports?tab=finance",        label: "Financial Reports",icon: BarChart3, permission: "reports.generate" },
      { href: "/reports?tab=attendance",     label: "Attendance Reports",icon: BarChart3, permission: "reports.generate" },
    ],
  },
  {
    label: "Settings",
    icon: Settings,
    children: [
      { href: "/settings/school",             label: "School Setup",     icon: Home, permission: "school.settings.manage" },
      { href: "/user-management/permissions",  label: "User Permissions", icon: ScrollText, permission: "school.settings.manage" },
      { href: "/settings/integrations",       label: "Integrations",     icon: Zap, permission: "school.settings.manage" },
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
    Academic: pathname.startsWith("/academics") || pathname.startsWith("/timetable") || pathname.startsWith("/academic-calendar"),
    Admissions: pathname.startsWith("/admissions"),
    Students: pathname.startsWith("/students"),
    Teachers: pathname.startsWith("/teachers") || pathname.startsWith("/user-management/teachers"),
    Attendance: pathname.startsWith("/attendance"),
    Examinations: pathname.startsWith("/exams"),
    Fees: pathname.startsWith("/fees") || pathname.startsWith("/settings/fees"),
    Finance: pathname.startsWith("/finance"),
    Communication: pathname.startsWith("/communications"),
    "Human Resources": pathname.startsWith("/staff"),
    Library: pathname.startsWith("/library"),
    Transport: pathname.startsWith("/transport"),
    Hostel: pathname.startsWith("/hostel"),
    Inventory: pathname.startsWith("/inventory"),
    Reports: pathname.startsWith("/reports"),
    Settings: pathname.startsWith("/settings") || pathname.startsWith("/user-management/permissions"),
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

        <Link href="/settings/school"
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

      {/* Support section */}
      <div className="px-4 py-3 mx-3 my-2 rounded-2xl bg-white/8 border border-white/12 text-white">
        <div className="flex items-center gap-2">
          <HelpCircle size={14} className="text-white/70" />
          <p className="text-[10px] uppercase font-bold tracking-widest text-white/50">Need Help?</p>
        </div>
        <p className="text-[12.5px] font-bold text-white mt-1">Contact Support</p>
        <p className="text-[10px] text-white/50 mt-1 leading-snug">Technical support, tickets, and live chat are available 24/7.</p>
        <a href="mailto:support@compunerd.com.gh" className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white bg-white/15 px-3 py-1.5 rounded-lg mt-3.5 hover:bg-white/25 transition-all">
          Get Help <ArrowRight size={11} />
        </a>
      </div>

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
