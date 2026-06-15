"use client";

import Link from "next/link";
import {
  Building2, Users, GraduationCap, CreditCard, LifeBuoy,
  TrendingUp, Plus, Settings, Zap, Shield, Package, Wallet,
  CheckCircle, AlertCircle, Clock, XCircle,
} from "lucide-react";

interface Stats {
  totalSchools: number;
  activeSchools: number;
  trialSchools: number;
  suspendedSchools: number;
  expiredSchools: number;
  totalStudents: number;
  totalStaff: number;
  monthlyRevenue: number;
  openTickets: number;
  recentSchools: { id: string; name: string; status: string; created_at: string }[];
  recentTickets: { id: string; ticket_number: string; subject: string; priority: string; status: string; created_at: string }[];
  monthlyGrowth: { label: string; count: number }[];
}

const PLATFORM_GRADIENT = "linear-gradient(135deg, #1a0533, #2d1b69, #6b1f8a)";

function StatCard({
  label, value, subLabel, icon: Icon, iconBg, iconColor,
}: {
  label: string; value: string | number; subLabel?: string;
  icon: React.ElementType; iconBg: string; iconColor: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon size={22} className={iconColor} />
      </div>
      <div>
        <p className="text-2xl font-extrabold text-slate-900">{typeof value === "number" ? value.toLocaleString() : value}</p>
        <p className="text-slate-500 text-sm font-semibold">{label}</p>
        {subLabel && <p className="text-slate-400 text-xs font-semibold mt-0.5">{subLabel}</p>}
      </div>
    </div>
  );
}

const statusBadge: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  trial: "bg-blue-100 text-blue-700",
  suspended: "bg-red-100 text-red-700",
  expired: "bg-amber-100 text-amber-700",
  archived: "bg-slate-100 text-slate-500",
};

const priorityBadge: Record<string, string> = {
  low: "bg-slate-100 text-slate-600",
  normal: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

const ticketStatusBadge: Record<string, string> = {
  open: "bg-emerald-100 text-emerald-700",
  assigned: "bg-purple-100 text-purple-700",
  in_progress: "bg-blue-100 text-blue-700",
  resolved: "bg-slate-100 text-slate-600",
  closed: "bg-gray-100 text-gray-500",
};

const quickActions = [
  { label: "Create School", href: "/platform/schools/new", icon: Plus, color: "bg-purple-100 text-purple-700" },
  { label: "Subscriptions", href: "/platform/subscriptions", icon: CreditCard, color: "bg-blue-100 text-blue-700" },
  { label: "Support Tickets", href: "/platform/support", icon: LifeBuoy, color: "bg-emerald-100 text-emerald-700" },
  { label: "Platform Users", href: "/platform/users", icon: Users, color: "bg-indigo-100 text-indigo-700" },
  { label: "Feature Toggles", href: "/platform/features", icon: Zap, color: "bg-amber-100 text-amber-700" },
  { label: "Audit Logs", href: "/platform/audit", icon: Shield, color: "bg-red-100 text-red-700" },
];

export function DashboardClient({ stats }: { stats: Stats }) {
  const maxGrowth = Math.max(...stats.monthlyGrowth.map(m => m.count), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className="rounded-2xl px-8 py-6 text-white"
        style={{ background: PLATFORM_GRADIENT }}
      >
        <h1 className="text-2xl font-extrabold">Platform Dashboard</h1>
        <p className="text-white/60 font-semibold mt-1">
          Welcome back — here&apos;s an overview of the CompunerdEduSys platform.
        </p>
      </div>

      {/* Stats grid — row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Schools" value={stats.totalSchools} icon={Building2} iconBg="bg-purple-100" iconColor="text-purple-700" />
        <StatCard label="Active Schools" value={stats.activeSchools} icon={CheckCircle} iconBg="bg-emerald-100" iconColor="text-emerald-700" />
        <StatCard label="Trial Schools" value={stats.trialSchools} icon={Clock} iconBg="bg-blue-100" iconColor="text-blue-700" />
        <StatCard
          label="Suspended / Expired"
          value={stats.suspendedSchools + stats.expiredSchools}
          icon={AlertCircle}
          iconBg="bg-red-100"
          iconColor="text-red-600"
        />
      </div>

      {/* Stats grid — row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Students" value={stats.totalStudents} icon={GraduationCap} iconBg="bg-indigo-100" iconColor="text-indigo-700" />
        <StatCard label="Total Staff" value={stats.totalStaff} icon={Users} iconBg="bg-sky-100" iconColor="text-sky-700" />
        <StatCard
          label="Monthly Revenue"
          value={`GHS ${stats.monthlyRevenue.toLocaleString()}`}
          icon={Wallet}
          iconBg="bg-amber-100"
          iconColor="text-amber-700"
        />
        <StatCard label="Open Tickets" value={stats.openTickets} icon={LifeBuoy} iconBg="bg-rose-100" iconColor="text-rose-700" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* School Growth Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-purple-100">
              <TrendingUp size={18} className="text-purple-700" />
            </div>
            <div>
              <h2 className="font-extrabold text-slate-900">School Onboarding</h2>
              <p className="text-slate-400 text-xs font-semibold">Last 6 months</p>
            </div>
          </div>
          <div className="flex items-end gap-3 h-36">
            {stats.monthlyGrowth.map(({ label, count }) => (
              <div key={label} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-xs font-bold text-slate-600">{count}</span>
                <div
                  className="w-full rounded-lg transition-all duration-500"
                  style={{
                    height: `${Math.max((count / maxGrowth) * 100, 4)}%`,
                    background: "linear-gradient(180deg, #6b1f8a, #2d1b69)",
                    minHeight: "4px",
                  }}
                />
                <span className="text-[10px] font-bold text-slate-400">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h2 className="font-extrabold text-slate-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map(({ label, href, icon: Icon, color }) => (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-slate-50 transition-colors border border-slate-100 text-center group"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
                  <Icon size={16} />
                </div>
                <span className="text-[11px] font-bold text-slate-600 group-hover:text-slate-900 transition-colors leading-tight">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Schools */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-extrabold text-slate-900">Recent Schools</h2>
            <Link href="/platform/schools" className="text-xs font-bold text-purple-700 hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {stats.recentSchools.length === 0 ? (
              <p className="text-slate-400 text-sm font-semibold text-center py-8">No schools yet.</p>
            ) : (
              stats.recentSchools.map(school => (
                <div key={school.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{school.name}</p>
                    <p className="text-slate-400 text-xs font-semibold">
                      {new Date(school.created_at).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${statusBadge[school.status] ?? "bg-slate-100 text-slate-500"}`}>
                      {school.status}
                    </span>
                    <Link href={`/platform/schools/${school.id}`} className="text-xs font-bold text-purple-700 hover:underline">View</Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Tickets */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-extrabold text-slate-900">Recent Support Tickets</h2>
            <Link href="/platform/support" className="text-xs font-bold text-purple-700 hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {stats.recentTickets.length === 0 ? (
              <p className="text-slate-400 text-sm font-semibold text-center py-8">No tickets yet.</p>
            ) : (
              stats.recentTickets.map(ticket => (
                <div key={ticket.id} className="px-6 py-3.5 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-bold text-slate-900 text-sm truncate max-w-[200px]">{ticket.subject}</p>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 shrink-0 ml-2">
                      #{ticket.ticket_number}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${priorityBadge[ticket.priority] ?? "bg-slate-100 text-slate-500"}`}>
                      {ticket.priority}
                    </span>
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${ticketStatusBadge[ticket.status] ?? "bg-slate-100 text-slate-500"}`}>
                      {ticket.status}
                    </span>
                    <span className="text-slate-400 text-[10px] font-semibold ml-auto">
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
