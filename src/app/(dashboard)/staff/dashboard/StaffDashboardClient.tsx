"use client";

import Link from "next/link";
import {
  Users, UserCog, ClipboardList, UserCheck, UserX, Calendar,
  UserPlus, BarChart2, PlusCircle, Award, ArrowRightLeft, UserMinus,
  TrendingUp, Dumbbell,
} from "lucide-react";

const GRADIENT = "linear-gradient(135deg, #262262, #92278F)";
const BRAND = "#262262";

interface Totals {
  total: number; academic: number; admin: number; support: number;
  present: number; absent: number; onLeave: number; newThisMonth: number;
  male: number; female: number;
}

interface Props {
  schoolId: string;
  role: string;
  totals: Totals;
  deptDistribution: Record<string, number>;
  roleDistribution: Record<string, number>;
  tableNotReady: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  headmaster: "Headmaster", teacher: "Teacher", accountant: "Accountant",
  secretary: "Secretary", receptionist: "Receptionist", owner: "Owner", admin: "Admin",
};

export function StaffDashboardClient({ role, totals, deptDistribution, roleDistribution, tableNotReady }: Props) {
  const isAdmin = ["owner", "headmaster", "accountant"].includes(role);

  const summaryCards = [
    { label: "Total Staff",            value: totals.total,        sub: "All employees",        icon: Users,        bg: "#EEF2FF", color: BRAND },
    { label: "Academic Staff",         value: totals.academic,     sub: "Teachers & heads",     icon: UserCog,      bg: "#F5F3FF", color: "#7C3AED" },
    { label: "Administrative",         value: totals.admin,        sub: "Admin & accounts",     icon: ClipboardList,bg: "#FDF4FF", color: "#92278F" },
    { label: "Support Staff",          value: totals.support,      sub: "Support & services",   icon: BarChart2,    bg: "#FFF7ED", color: "#C2410C" },
    { label: "Present Today",          value: totals.present,      sub: "Marked attendance",    icon: UserCheck,    bg: "#F0FDF4", color: "#16A34A" },
    { label: "Absent Today",           value: totals.absent,       sub: "Not in yet",           icon: UserX,        bg: "#FEF2F2", color: "#DC2626" },
    { label: "On Leave",               value: totals.onLeave,      sub: "Approved leave",       icon: Calendar,     bg: "#FFFBEB", color: "#D97706" },
    { label: "New This Month",         value: totals.newThisMonth, sub: "Recent additions",     icon: UserPlus,     bg: "#EFF6FF", color: "#2563EB" },
  ];

  const quickActions = [
    { label: "Add Staff",         href: "/staff/new",          icon: PlusCircle,     color: BRAND },
    { label: "Record Attendance", href: "/staff/attendance",   icon: ClipboardList,  color: "#16A34A" },
    { label: "Manage Leave",      href: "/staff/leave",        icon: Calendar,       color: "#D97706" },
    { label: "Log Training",      href: "/staff/training",     icon: Dumbbell,       color: "#7C3AED" },
    { label: "Promotions",        href: "/staff/promotions",   icon: Award,          color: "#0284C7" },
    { label: "Transfers",         href: "/staff/transfers",    icon: ArrowRightLeft, color: "#92278F" },
    { label: "Performance",       href: "/staff/performance",  icon: TrendingUp,     color: "#C2410C" },
    { label: "Exit Management",   href: "/staff/exits",        icon: UserMinus,      color: "#DC2626" },
  ];

  const maxDept = Math.max(...Object.values(deptDistribution), 1);
  const maxRole = Math.max(...Object.values(roleDistribution), 1);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[22px] font-extrabold text-[var(--text-strong)]">Staff Dashboard</h2>
          <p className="text-[14px] text-[var(--text-muted)] mt-0.5">Staff lifecycle overview for your school</p>
        </div>
        {isAdmin && (
          <Link href="/staff/new"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-bold text-white shadow-sm hover:opacity-90 transition-opacity"
            style={{ background: GRADIENT }}>
            <PlusCircle size={16} /> Add Staff
          </Link>
        )}
      </div>

      {tableNotReady && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <p className="font-bold text-amber-800 text-[15px]">Staff Details Setup Required</p>
          <p className="text-[13px] text-amber-700 mt-1">Run the staff lifecycle SQL migration in Supabase to enable all features.</p>
          <p className="text-[12px] font-mono text-amber-600 mt-2 bg-amber-100 rounded-lg px-3 py-2">supabase/migrations/staff_lifecycle.sql</p>
        </div>
      )}

      {/* Summary Cards — 4 per row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((c) => (
          <div key={c.label} className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-[0_1px_6px_rgba(0,0,0,0.05)] flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: c.bg }}>
              <c.icon size={22} style={{ color: c.color }} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide leading-tight">{c.label}</p>
              <p className="text-[26px] font-extrabold text-[var(--text-strong)] leading-tight">{c.value}</p>
              <p className="text-[11px] text-[var(--text-muted)]">{c.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[0_1px_6px_rgba(0,0,0,0.05)] p-5">
        <h3 className="text-[14px] font-bold text-[var(--text-strong)] mb-4">Quick Actions</h3>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
          {quickActions.map((a) => (
            <Link key={a.label} href={a.href}
              className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-[var(--neutral-50)] transition-colors group text-center">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105"
                style={{ background: a.color + "18" }}>
                <a.icon size={22} style={{ color: a.color }} />
              </div>
              <span className="text-[11px] font-semibold text-[var(--text-muted)] leading-tight">{a.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Gender Distribution */}
        <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[0_1px_6px_rgba(0,0,0,0.05)] p-5">
          <h3 className="text-[14px] font-bold text-[var(--text-strong)] mb-4">Gender Distribution</h3>
          {totals.total === 0 ? (
            <p className="text-[13px] text-[var(--text-muted)] text-center py-6">No data yet</p>
          ) : (
            <div className="space-y-3">
              {[
                { label: "Male",    count: totals.male,   color: "#3B82F6", bg: "#EFF6FF" },
                { label: "Female",  count: totals.female, color: "#EC4899", bg: "#FDF2F8" },
                { label: "Unknown", count: Math.max(0, totals.total - totals.male - totals.female), color: "#9CA3AF", bg: "#F9FAFB" },
              ].filter(r => r.count > 0).map((r) => (
                <div key={r.label}>
                  <div className="flex justify-between text-[12px] mb-1">
                    <span className="font-semibold text-[var(--text-strong)]">{r.label}</span>
                    <span className="text-[var(--text-muted)]">{r.count} ({totals.total > 0 ? Math.round((r.count / totals.total) * 100) : 0}%)</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.round((r.count / totals.total) * 100)}%`, background: r.color }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Department Distribution */}
        <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[0_1px_6px_rgba(0,0,0,0.05)] p-5">
          <h3 className="text-[14px] font-bold text-[var(--text-strong)] mb-4">By Department</h3>
          {Object.keys(deptDistribution).length === 0 ? (
            <p className="text-[13px] text-[var(--text-muted)] text-center py-6">No department data</p>
          ) : (
            <div className="space-y-2.5 max-h-[200px] overflow-y-auto">
              {Object.entries(deptDistribution).sort(([, a], [, b]) => b - a).map(([dept, count]) => (
                <div key={dept}>
                  <div className="flex justify-between text-[12px] mb-1">
                    <span className="font-semibold text-[var(--text-strong)] truncate mr-2">{dept}</span>
                    <span className="text-[var(--text-muted)] shrink-0">{count}</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.round((count / maxDept) * 100)}%`, background: GRADIENT }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Role Distribution */}
        <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[0_1px_6px_rgba(0,0,0,0.05)] p-5">
          <h3 className="text-[14px] font-bold text-[var(--text-strong)] mb-4">By Role</h3>
          {Object.keys(roleDistribution).length === 0 ? (
            <p className="text-[13px] text-[var(--text-muted)] text-center py-6">No role data</p>
          ) : (
            <div className="space-y-2.5 max-h-[200px] overflow-y-auto">
              {Object.entries(roleDistribution).sort(([, a], [, b]) => b - a).map(([r, count]) => (
                <div key={r}>
                  <div className="flex justify-between text-[12px] mb-1">
                    <span className="font-semibold text-[var(--text-strong)] truncate mr-2">{ROLE_LABELS[r] ?? r}</span>
                    <span className="text-[var(--text-muted)] shrink-0">{count}</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.round((count / maxRole) * 100)}%`, background: "#7C3AED" }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Staff Navigation Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "All Staff",        href: "/staff",              icon: Users,         desc: "View all staff members",     color: BRAND },
          { label: "Leave Requests",   href: "/staff/leave",        icon: Calendar,      desc: "Approve & track leave",      color: "#D97706" },
          { label: "Training Log",     href: "/staff/training",     icon: Dumbbell,      desc: "Workshops & certifications", color: "#7C3AED" },
          { label: "Exits & Clearance",href: "/staff/exits",        icon: UserMinus,     desc: "Resignation & retirement",   color: "#DC2626" },
        ].map((card) => (
          <Link key={card.label} href={card.href}
            className="bg-white rounded-2xl border border-[var(--border)] shadow-[0_1px_6px_rgba(0,0,0,0.05)] p-5 hover:shadow-md transition-all group">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: card.color + "18" }}>
              <card.icon size={20} style={{ color: card.color }} />
            </div>
            <p className="text-[14px] font-bold text-[var(--text-strong)] group-hover:text-[#262262]">{card.label}</p>
            <p className="text-[12px] text-[var(--text-muted)] mt-0.5">{card.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
