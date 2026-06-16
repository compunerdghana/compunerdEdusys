"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
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
  ChevronDown,
  BarChart2,
  Heart,
  CheckSquare,
  CircleDot,
  Clock,
  AlertTriangle,
  Archive,
  UserCog,
  KeyRound,
  UsersRound,
  ActivitySquare,
  History,
  MonitorSmartphone,
  ShieldAlert,
  ClipboardList,
  ListTodo,
  KanbanSquare,
  UserCheck,
  GraduationCap,
  Rocket,
  BarChart3,
  ScrollText,
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

const usersSubItems = [
  { label: "Dashboard", href: "/platform/users/overview", icon: BarChart2 },
  { label: "All Users", href: "/platform/users", icon: Users },
  { label: "Create User", href: "/platform/users/new", icon: Plus },
  { label: "Roles", href: "/platform/users/roles", icon: UserCog },
  { label: "Permissions", href: "/platform/users/permissions", icon: KeyRound },
  { label: "User Groups", href: "/platform/users/groups", icon: UsersRound },
  { label: "Activity Logs", href: "/platform/users/activity", icon: ActivitySquare },
  { label: "Login History", href: "/platform/users/login-history", icon: History },
  { label: "Active Sessions", href: "/platform/users/sessions", icon: MonitorSmartphone },
  { label: "Security Center", href: "/platform/users/security", icon: ShieldAlert },
];

const onboardingSubItems = [
  { label: "Dashboard", href: "/platform/onboarding", icon: LayoutDashboard },
  { label: "New Registration", href: "/platform/onboarding/new", icon: Plus },
  { label: "Pipeline", href: "/platform/onboarding/pipeline", icon: KanbanSquare },
  { label: "School Profiles", href: "/platform/onboarding/profiles", icon: Building2 },
  { label: "Implementation", href: "/platform/onboarding/assignments", icon: UserCheck },
  { label: "Training", href: "/platform/onboarding/training", icon: GraduationCap },
  { label: "Verification", href: "/platform/onboarding/verification", icon: ShieldCheck },
  { label: "Go-Live", href: "/platform/onboarding/golive", icon: Rocket },
  { label: "Tasks", href: "/platform/onboarding/tasks", icon: ListTodo },
  { label: "Reports", href: "/platform/onboarding/reports", icon: BarChart3 },
  { label: "Activity Logs", href: "/platform/onboarding/activity", icon: ScrollText },
];

const schoolsSubItems = [
  { label: "Dashboard", href: "/platform/schools/overview", icon: BarChart2 },
  { label: "All Schools", href: "/platform/schools", icon: Building2 },
  { label: "Create School", href: "/platform/schools/new", icon: Plus },
  { label: "School Onboarding", href: "/platform/schools/onboarding", icon: CheckSquare },
  { label: "Active", href: "/platform/schools?status=active", icon: CircleDot },
  { label: "Trial", href: "/platform/schools?status=trial", icon: Clock },
  { label: "Expired", href: "/platform/schools?status=expired", icon: AlertTriangle },
  { label: "Suspended", href: "/platform/schools?status=suspended", icon: Archive },
  { label: "School Health", href: "/platform/schools/health", icon: Heart },
];

const navigation: NavGroup[] = [
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
  const searchParams = useSearchParams();

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const isSchoolsActive = pathname.startsWith("/platform/schools");
  const isUsersActive = pathname.startsWith("/platform/users");
  const isOnboardingActive = pathname.startsWith("/platform/onboarding");

  function isSubItemActive(href: string) {
    if (href.includes("?")) {
      const [base, qs] = href.split("?");
      const param = new URLSearchParams(qs);
      const statusVal = param.get("status");
      return pathname === base && searchParams.get("status") === statusVal;
    }
    if (href === "/platform/schools") {
      return pathname === "/platform/schools" && !searchParams.get("status");
    }
    if (href === "/platform/users") {
      return pathname === "/platform/users";
    }
    return pathname === href || pathname.startsWith(href + "/");
  }

  function isNavActive(href: string) {
    if (href === "/platform/dashboard") return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #1a0d35 0%, #0f0a1e 100%)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Brand */}
      <div className="px-5 py-5 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)", boxShadow: "0 0 0 1px rgba(255,255,255,0.15)" }}
          >
            <ShieldCheck size={17} className="text-white" />
          </div>
          <div>
            <p className="text-white font-extrabold text-[13px] leading-tight tracking-tight">CompunerdEduSys</p>
            <span
              className="inline-block mt-0.5 text-[9px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded"
              style={{ background: "rgba(124,58,237,0.3)", color: "#a78bfa" }}
            >
              Platform Admin
            </span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {/* Overview */}
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-widest px-3 mb-2" style={{ color: "rgba(255,255,255,0.25)" }}>
            Overview
          </p>
          <div className="space-y-0.5">
            {(() => {
              const active = pathname === "/platform/dashboard";
              return (
                <Link
                  href="/platform/dashboard"
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-150",
                    active ? "bg-white/10 text-white" : "text-white/50 hover:text-white hover:bg-white/5",
                  )}
                >
                  <LayoutDashboard size={15} className={cn("shrink-0", active ? "text-white" : "text-white/40")} />
                  Dashboard
                  {active && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }} />
                  )}
                </Link>
              );
            })()}
          </div>
        </div>

        {/* Schools expandable section */}
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-widest px-3 mb-2" style={{ color: "rgba(255,255,255,0.25)" }}>
            Schools
          </p>
          <div className="space-y-0.5">
            <div
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold",
                isSchoolsActive ? "bg-white/10 text-white" : "text-white/50",
              )}
            >
              <Building2 size={15} className={cn("shrink-0", isSchoolsActive ? "text-white" : "text-white/40")} />
              <span className="flex-1">Schools</span>
              <ChevronDown
                size={13}
                className={cn(
                  "shrink-0 transition-transform duration-200",
                  isSchoolsActive ? "text-white" : "text-white/30 -rotate-90",
                )}
              />
            </div>

            {isSchoolsActive && (
              <div className="ml-3 pl-3 border-l border-white/10 space-y-0.5 mt-0.5">
                {schoolsSubItems.map(({ label, href, icon: Icon }) => {
                  const active = isSubItemActive(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all duration-150",
                        active ? "bg-white/10 text-white" : "text-white/40 hover:text-white/80 hover:bg-white/5",
                      )}
                    >
                      <Icon size={12} className={cn("shrink-0", active ? "text-violet-400" : "text-white/30")} />
                      {label}
                      {active && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }} />
                      )}
                    </Link>
                  );
                })}
              </div>
            )}

            {!isSchoolsActive && (
              <Link
                href="/platform/schools"
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-semibold text-white/30 hover:text-white/60 hover:bg-white/5 transition-all ml-3 pl-3 border-l border-white/10"
              >
                <Building2 size={12} className="text-white/20 shrink-0" />
                All Schools
              </Link>
            )}
          </div>
        </div>

        {/* Onboarding expandable section */}
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-widest px-3 mb-2" style={{ color: "rgba(255,255,255,0.25)" }}>
            Onboarding
          </p>
          <div className="space-y-0.5">
            <div
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold",
                isOnboardingActive ? "bg-white/10 text-white" : "text-white/50",
              )}
            >
              <ClipboardList size={15} className={cn("shrink-0", isOnboardingActive ? "text-white" : "text-white/40")} />
              <span className="flex-1">Onboarding</span>
              <ChevronDown
                size={13}
                className={cn(
                  "shrink-0 transition-transform duration-200",
                  isOnboardingActive ? "text-white" : "text-white/30 -rotate-90",
                )}
              />
            </div>

            {isOnboardingActive && (
              <div className="ml-3 pl-3 border-l border-white/10 space-y-0.5 mt-0.5">
                {onboardingSubItems.map(({ label, href, icon: Icon }) => {
                  const active = isSubItemActive(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all duration-150",
                        active ? "bg-white/10 text-white" : "text-white/40 hover:text-white/80 hover:bg-white/5",
                      )}
                    >
                      <Icon size={12} className={cn("shrink-0", active ? "text-violet-400" : "text-white/30")} />
                      {label}
                      {active && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }} />
                      )}
                    </Link>
                  );
                })}
              </div>
            )}

            {!isOnboardingActive && (
              <Link
                href="/platform/onboarding"
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-semibold text-white/30 hover:text-white/60 hover:bg-white/5 transition-all ml-3 pl-3 border-l border-white/10"
              >
                <ClipboardList size={12} className="text-white/20 shrink-0" />
                Onboarding Dashboard
              </Link>
            )}
          </div>
        </div>

        {/* Platform section — with Users expandable */}
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-widest px-3 mb-2" style={{ color: "rgba(255,255,255,0.25)" }}>
            Platform
          </p>
          <div className="space-y-0.5">
            {/* Users expandable */}
            <div
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold",
                isUsersActive ? "bg-white/10 text-white" : "text-white/50",
              )}
            >
              <Users size={15} className={cn("shrink-0", isUsersActive ? "text-white" : "text-white/40")} />
              <span className="flex-1">Users</span>
              <ChevronDown
                size={13}
                className={cn(
                  "shrink-0 transition-transform duration-200",
                  isUsersActive ? "text-white" : "text-white/30 -rotate-90",
                )}
              />
            </div>

            {isUsersActive && (
              <div className="ml-3 pl-3 border-l border-white/10 space-y-0.5 mt-0.5">
                {usersSubItems.map(({ label, href, icon: Icon }) => {
                  const active = isSubItemActive(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all duration-150",
                        active ? "bg-white/10 text-white" : "text-white/40 hover:text-white/80 hover:bg-white/5",
                      )}
                    >
                      <Icon size={12} className={cn("shrink-0", active ? "text-violet-400" : "text-white/30")} />
                      {label}
                      {active && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }} />
                      )}
                    </Link>
                  );
                })}
              </div>
            )}

            {!isUsersActive && (
              <Link
                href="/platform/users"
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-semibold text-white/30 hover:text-white/60 hover:bg-white/5 transition-all ml-3 pl-3 border-l border-white/10"
              >
                <Users size={12} className="text-white/20 shrink-0" />
                All Users
              </Link>
            )}

            {/* Features */}
            {[
              { label: "Features", href: "/platform/features", icon: Zap },
              { label: "Announcements", href: "/platform/announcements", icon: Megaphone },
            ].map(({ label, href, icon: Icon }) => {
              const active = isNavActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-150",
                    active ? "bg-white/10 text-white" : "text-white/50 hover:text-white hover:bg-white/5",
                  )}
                >
                  <Icon size={15} className={cn("shrink-0 transition-colors", active ? "text-white" : "text-white/40")} />
                  {label}
                  {active && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }} />
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Remaining groups (skip Platform since handled above) */}
        {navigation.filter(g => g.group !== "Platform").map(({ group, items }) => (
          <div key={group}>
            <p className="text-[10px] font-extrabold uppercase tracking-widest px-3 mb-2" style={{ color: "rgba(255,255,255,0.25)" }}>
              {group}
            </p>
            <div className="space-y-0.5">
              {items.map(({ label, href, icon: Icon }) => {
                const active = isNavActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-150",
                      active ? "bg-white/10 text-white" : "text-white/50 hover:text-white hover:bg-white/5",
                    )}
                  >
                    <Icon size={15} className={cn("shrink-0 transition-colors", active ? "text-white" : "text-white/40")} />
                    {label}
                    {active && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }} />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom user block */}
      <div className="shrink-0 px-3 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1.5"
          style={{ background: "rgba(255,255,255,0.05)" }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-extrabold shrink-0"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-[13px] font-bold truncate leading-tight">{userName}</p>
            <p className="text-[10px] font-semibold capitalize truncate" style={{ color: "rgba(255,255,255,0.35)" }}>
              {userRole.replace("_", " ")}
            </p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-semibold transition-all duration-150"
          style={{ color: "rgba(255,255,255,0.4)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.8)";
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.4)";
            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
          }}
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </div>
  );
}
