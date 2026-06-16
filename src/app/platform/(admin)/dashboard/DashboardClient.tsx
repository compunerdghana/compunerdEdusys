"use client";

import Link from "next/link";
import {
  Building2, Users, GraduationCap, CreditCard, LifeBuoy,
  TrendingUp, Plus, Zap, Shield, Wallet,
  CheckCircle, AlertCircle, Clock, XCircle, ArrowUpRight,
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

function StatCard({
  label, value, subLabel, icon: Icon, accentColor, iconBg, iconColor, trend,
}: {
  label: string;
  value: string | number;
  subLabel?: string;
  icon: React.ElementType;
  accentColor: string;
  iconBg: string;
  iconColor: string;
  trend?: string;
}) {
  return (
    <div className={`bg-white rounded-2xl p-5 shadow-sm border border-[#e8e4f3] border-l-4 ${accentColor} flex items-center gap-4`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon size={20} className={iconColor} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-2xl font-extrabold text-slate-900 leading-tight">
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        <p className="text-slate-500 text-[13px] font-semibold mt-0.5">{label}</p>
        {trend && <p className="text-[11px] font-semibold text-emerald-600 mt-0.5">{trend}</p>}
        {subLabel && <p className="text-slate-400 text-[11px] font-semibold mt-0.5">{subLabel}</p>}
      </div>
    </div>
  );
}

const statusBadge: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  trial: "bg-blue-50 text-blue-700 border border-blue-100",
  suspended: "bg-red-50 text-red-700 border border-red-100",
  expired: "bg-amber-50 text-amber-700 border border-amber-100",
  archived: "bg-slate-50 text-slate-500 border border-slate-100",
};

const priorityBadge: Record<string, string> = {
  low: "bg-slate-50 text-slate-600 border border-slate-100",
  normal: "bg-blue-50 text-blue-700 border border-blue-100",
  high: "bg-orange-50 text-orange-700 border border-orange-100",
  urgent: "bg-red-50 text-red-700 border border-red-100",
};

const ticketStatusBadge: Record<string, string> = {
  open: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  assigned: "bg-purple-50 text-purple-700 border border-purple-100",
  in_progress: "bg-blue-50 text-blue-700 border border-blue-100",
  resolved: "bg-slate-50 text-slate-600 border border-slate-100",
  closed: "bg-gray-50 text-gray-500 border border-gray-100",
};

const quickActions = [
  { label: "Create School", href: "/platform/schools/new", icon: Plus, grad: "from-violet-500 to-purple-700", desc: "Onboard a new school" },
  { label: "Subscriptions", href: "/platform/subscriptions", icon: CreditCard, grad: "from-blue-500 to-blue-700", desc: "Manage billing" },
  { label: "Support Tickets", href: "/platform/support", icon: LifeBuoy, grad: "from-emerald-500 to-teal-700", desc: "Resolve issues" },
  { label: "Platform Users", href: "/platform/users", icon: Users, grad: "from-indigo-500 to-indigo-700", desc: "Admin accounts" },
  { label: "Feature Toggles", href: "/platform/features", icon: Zap, grad: "from-amber-500 to-orange-600", desc: "Module access" },
  { label: "Audit Logs", href: "/platform/audit", icon: Shield, grad: "from-rose-500 to-red-700", desc: "Activity trail" },
];

export function DashboardClient({ stats }: { stats: Stats }) {
  const maxGrowth = Math.max(...stats.monthlyGrowth.map(m => m.count), 1);
  const today = new Date().toLocaleDateString("en-GH", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold text-slate-900 leading-tight">Platform Overview</h1>
          <p className="text-slate-500 text-[13px] font-semibold mt-1">{today}</p>
        </div>
        <Link
          href="/platform/schools/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-bold transition-all shadow-sm"
          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
        >
          <Plus size={15} />
          Create School
        </Link>
      </div>

      {/* Stats grid — row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Schools" value={stats.totalSchools} icon={Building2} accentColor="border-l-violet-500" iconBg="bg-violet-50" iconColor="text-violet-600" trend="All registered" />
        <StatCard label="Active Schools" value={stats.activeSchools} icon={CheckCircle} accentColor="border-l-emerald-500" iconBg="bg-emerald-50" iconColor="text-emerald-600" trend="Paying subscribers" />
        <StatCard label="Total Students" value={stats.totalStudents} icon={GraduationCap} accentColor="border-l-indigo-500" iconBg="bg-indigo-50" iconColor="text-indigo-600" />
        <StatCard
          label="Monthly Revenue"
          value={`GHS ${stats.monthlyRevenue.toLocaleString()}`}
          icon={Wallet}
          accentColor="border-l-amber-500"
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
      </div>

      {/* Stats grid — row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Trial Schools" value={stats.trialSchools} icon={Clock} accentColor="border-l-blue-500" iconBg="bg-blue-50" iconColor="text-blue-600" />
        <StatCard label="Suspended" value={stats.suspendedSchools} icon={AlertCircle} accentColor="border-l-red-500" iconBg="bg-red-50" iconColor="text-red-600" />
        <StatCard label="Total Staff" value={stats.totalStaff} icon={Users} accentColor="border-l-sky-500" iconBg="bg-sky-50" iconColor="text-sky-600" />
        <StatCard label="Open Tickets" value={stats.openTickets} icon={LifeBuoy} accentColor="border-l-rose-500" iconBg="bg-rose-50" iconColor="text-rose-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* School Growth Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-[#e8e4f3]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-violet-50">
              <TrendingUp size={17} className="text-violet-600" />
            </div>
            <div>
              <h2 className="font-extrabold text-slate-900 text-[15px]">School Onboarding</h2>
              <p className="text-slate-400 text-[11px] font-semibold">New schools per month (last 6 months)</p>
            </div>
          </div>
          <div className="flex items-end gap-3 h-36">
            {stats.monthlyGrowth.map(({ label, count }) => (
              <div key={label} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-[11px] font-extrabold text-slate-600">{count}</span>
                <div
                  className="w-full rounded-lg transition-all duration-500"
                  style={{
                    height: `${Math.max((count / maxGrowth) * 100, 4)}%`,
                    background: "linear-gradient(180deg, #7c3aed, #4f46e5)",
                    minHeight: 4,
                  }}
                />
                <span className="text-[10px] font-bold text-slate-400">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e8e4f3]">
          <h2 className="font-extrabold text-slate-900 text-[15px] mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map(({ label, href, icon: Icon, grad, desc }) => (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-2 p-3.5 rounded-xl hover:bg-slate-50 transition-colors border border-[#e8e4f3] text-center group"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br ${grad}`}>
                  <Icon size={15} className="text-white" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-700 group-hover:text-slate-900 transition-colors leading-tight">{label}</p>
                  <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Schools */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#f0edf8] flex items-center justify-between">
            <h2 className="font-extrabold text-slate-900 text-[15px]">Recent Schools</h2>
            <Link href="/platform/schools" className="flex items-center gap-1 text-[12px] font-bold text-violet-600 hover:text-violet-800 transition-colors">
              View all <ArrowUpRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-[#f5f3fc]">
            {stats.recentSchools.length === 0 ? (
              <p className="text-slate-400 text-[13px] font-semibold text-center py-10">No schools yet.</p>
            ) : (
              stats.recentSchools.map(school => (
                <div key={school.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-[#faf9ff] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                      <Building2 size={14} className="text-violet-600" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-[13px]">{school.name}</p>
                      <p className="text-slate-400 text-[11px] font-semibold">
                        {new Date(school.created_at).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${statusBadge[school.status] ?? "bg-slate-50 text-slate-500"}`}>
                      {school.status}
                    </span>
                    <Link href={`/platform/schools/${school.id}`} className="text-[11px] font-bold text-violet-600 hover:underline">View</Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Tickets */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#f0edf8] flex items-center justify-between">
            <h2 className="font-extrabold text-slate-900 text-[15px]">Recent Support Tickets</h2>
            <Link href="/platform/support" className="flex items-center gap-1 text-[12px] font-bold text-violet-600 hover:text-violet-800 transition-colors">
              View all <ArrowUpRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-[#f5f3fc]">
            {stats.recentTickets.length === 0 ? (
              <p className="text-slate-400 text-[13px] font-semibold text-center py-10">No tickets yet.</p>
            ) : (
              stats.recentTickets.map(ticket => (
                <div key={ticket.id} className="px-6 py-3.5 hover:bg-[#faf9ff] transition-colors">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="font-bold text-slate-900 text-[13px] truncate max-w-[200px]">{ticket.subject}</p>
                    <span className="text-[10px] font-extrabold text-slate-400 shrink-0 ml-2 font-mono">#{ticket.ticket_number}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${priorityBadge[ticket.priority] ?? "bg-slate-50 text-slate-500"}`}>
                      {ticket.priority}
                    </span>
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${ticketStatusBadge[ticket.status] ?? "bg-slate-50 text-slate-500"}`}>
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
