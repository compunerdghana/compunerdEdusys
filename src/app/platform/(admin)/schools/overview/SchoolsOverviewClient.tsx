"use client";

import Link from "next/link";
import {
  Building2,
  CheckCircle,
  Clock,
  AlertTriangle,
  Ban,
  Archive,
  GraduationCap,
  Users,
  UserCheck,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Activity,
  Calendar,
  Power,
  Download,
  Plus,
} from "lucide-react";

interface Stats {
  total: number;
  active: number;
  trial: number;
  expired: number;
  suspended: number;
  archived: number;
  students: number;
  staff: number;
  parents: number;
  monthlyRevenue: number;
  annualRevenue: number;
  outstandingRenewals: number;
  activeToday: number;
  activeThisWeek: number;
  inactiveSchools: number;
}

function fmt(n: number) {
  return n.toLocaleString();
}

function fmtGHS(n: number) {
  return `GHS ${n.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent: string;
  iconBg: string;
  iconColor: string;
  href?: string;
}

function StatCard({ label, value, icon: Icon, accent, iconBg, iconColor, href }: StatCardProps) {
  const inner = (
    <div className={`bg-white rounded-2xl shadow-sm border border-[#e8e4f3] p-5 border-l-4 flex items-center gap-4 ${href ? "hover:shadow-md transition-shadow cursor-pointer" : ""}`} style={{ borderLeftColor: accent }}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0`} style={{ background: iconBg }}>
        <Icon size={20} style={{ color: iconColor }} />
      </div>
      <div>
        <p className="text-[13px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-[26px] font-extrabold text-slate-900 leading-tight">{typeof value === "number" ? fmt(value) : value}</p>
      </div>
    </div>
  );

  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}

export function SchoolsOverviewClient({ stats }: { stats: Stats }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[24px] font-extrabold text-slate-900 leading-tight">Schools Management</h1>
          <p className="text-slate-500 text-[15px] font-semibold mt-1">Overview of all schools on the CompunerdEduSys platform</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#e0daf0] text-slate-700 text-[13px] font-bold hover:bg-slate-50 transition-all">
            <Download size={14} />
            Export
          </button>
          <Link
            href="/platform/schools/new"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-bold transition-all shadow-sm"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
          >
            <Plus size={15} />
            Create School
          </Link>
        </div>
      </div>

      {/* Row 1: Schools Overview */}
      <div>
        <h2 className="text-[13px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Schools Overview</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard label="Total" value={stats.total} icon={Building2} accent="#6366f1" iconBg="#eef2ff" iconColor="#4f46e5" href="/platform/schools" />
          <StatCard label="Active" value={stats.active} icon={CheckCircle} accent="#10b981" iconBg="#ecfdf5" iconColor="#059669" href="/platform/schools?status=active" />
          <StatCard label="Trial" value={stats.trial} icon={Clock} accent="#3b82f6" iconBg="#eff6ff" iconColor="#2563eb" href="/platform/schools?status=trial" />
          <StatCard label="Expired" value={stats.expired} icon={AlertTriangle} accent="#f59e0b" iconBg="#fffbeb" iconColor="#d97706" href="/platform/schools?status=expired" />
          <StatCard label="Suspended" value={stats.suspended} icon={Ban} accent="#ef4444" iconBg="#fef2f2" iconColor="#dc2626" href="/platform/schools?status=suspended" />
          <StatCard label="Archived" value={stats.archived} icon={Archive} accent="#94a3b8" iconBg="#f8fafc" iconColor="#64748b" href="/platform/schools?status=archived" />
        </div>
      </div>

      {/* Row 2: User Statistics */}
      <div>
        <h2 className="text-[13px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">User Statistics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Total Students" value={stats.students} icon={GraduationCap} accent="#8b5cf6" iconBg="#f5f3ff" iconColor="#7c3aed" />
          <StatCard label="Total Staff" value={stats.staff} icon={Users} accent="#06b6d4" iconBg="#ecfeff" iconColor="#0891b2" />
          <StatCard label="Total Parents" value={stats.parents} icon={UserCheck} accent="#10b981" iconBg="#ecfdf5" iconColor="#059669" />
        </div>
      </div>

      {/* Row 3: Business Stats */}
      <div>
        <h2 className="text-[13px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Business Statistics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Monthly Revenue" value={fmtGHS(stats.monthlyRevenue)} icon={DollarSign} accent="#10b981" iconBg="#ecfdf5" iconColor="#059669" />
          <StatCard label="Annual Revenue" value={fmtGHS(stats.annualRevenue)} icon={TrendingUp} accent="#6366f1" iconBg="#eef2ff" iconColor="#4f46e5" />
          <StatCard label="Outstanding Renewals" value={stats.outstandingRenewals} icon={RefreshCw} accent="#f59e0b" iconBg="#fffbeb" iconColor="#d97706" />
        </div>
      </div>

      {/* Row 4: Activity */}
      <div>
        <h2 className="text-[13px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Activity</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Active Today" value={stats.activeToday} icon={Activity} accent="#10b981" iconBg="#ecfdf5" iconColor="#059669" />
          <StatCard label="Active This Week" value={stats.activeThisWeek} icon={Calendar} accent="#3b82f6" iconBg="#eff6ff" iconColor="#2563eb" />
          <StatCard label="Inactive Schools" value={stats.inactiveSchools} icon={Power} accent="#ef4444" iconBg="#fef2f2" iconColor="#dc2626" />
        </div>
      </div>
    </div>
  );
}
