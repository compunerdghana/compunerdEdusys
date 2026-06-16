"use client";

import Link from "next/link";
import {
  Users,
  UserCheck,
  UserX,
  Lock,
  MonitorSmartphone,
  AlertTriangle,
  UserCog,
  KeyRound,
} from "lucide-react";

interface Stat {
  label: string;
  value: number;
  icon: React.ElementType;
  accent: string;
  iconBg: string;
  iconColor: string;
  href?: string;
}

interface PlatformUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  status?: string;
  last_sign_in_at?: string;
}

interface Props {
  stats: {
    total: number;
    active: number;
    inactive: number;
    locked: number;
    activeSessions: number;
    failedLoginsToday: number;
    rolesCreated: number;
    permissions: number;
  };
  recentUsers: PlatformUser[];
}

const roleBadge: Record<string, string> = {
  super_admin: "bg-violet-100 text-violet-800 border-violet-200",
  platform_manager: "bg-blue-100 text-blue-800 border-blue-200",
  finance_officer: "bg-emerald-100 text-emerald-800 border-emerald-200",
  support_officer: "bg-cyan-100 text-cyan-800 border-cyan-200",
  sales_officer: "bg-amber-100 text-amber-800 border-amber-200",
  implementation_officer: "bg-purple-100 text-purple-800 border-purple-200",
  read_only_auditor: "bg-slate-100 text-slate-700 border-slate-200",
  manager: "bg-blue-100 text-blue-800 border-blue-200",
  support: "bg-cyan-100 text-cyan-800 border-cyan-200",
  sales: "bg-amber-100 text-amber-800 border-amber-200",
  finance: "bg-emerald-100 text-emerald-800 border-emerald-200",
  implementation: "bg-purple-100 text-purple-800 border-purple-200",
};

const statusBadge: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  inactive: "bg-slate-50 text-slate-600 border-slate-200",
  suspended: "bg-red-50 text-red-700 border-red-200",
  locked: "bg-amber-50 text-amber-700 border-amber-200",
};

function initials(name: string) {
  return (name ?? "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export function UsersOverviewClient({ stats, recentUsers }: Props) {
  const row1: Stat[] = [
    { label: "Total Users", value: stats.total, icon: Users, accent: "#6366f1", iconBg: "bg-indigo-50", iconColor: "text-indigo-600", href: "/platform/users" },
    { label: "Active", value: stats.active, icon: UserCheck, accent: "#10b981", iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
    { label: "Inactive", value: stats.inactive, icon: UserX, accent: "#94a3b8", iconBg: "bg-slate-50", iconColor: "text-slate-500" },
    { label: "Locked", value: stats.locked, icon: Lock, accent: "#f59e0b", iconBg: "bg-amber-50", iconColor: "text-amber-600" },
  ];

  const row2: Stat[] = [
    { label: "Active Sessions", value: stats.activeSessions, icon: MonitorSmartphone, accent: "#06b6d4", iconBg: "bg-cyan-50", iconColor: "text-cyan-600", href: "/platform/users/sessions" },
    { label: "Failed Logins Today", value: stats.failedLoginsToday, icon: AlertTriangle, accent: "#ef4444", iconBg: "bg-red-50", iconColor: "text-red-600", href: "/platform/users/security" },
    { label: "Roles Created", value: stats.rolesCreated, icon: UserCog, accent: "#8b5cf6", iconBg: "bg-violet-50", iconColor: "text-violet-600", href: "/platform/users/roles" },
    { label: "Permissions", value: stats.permissions, icon: KeyRound, accent: "#7c3aed", iconBg: "bg-purple-50", iconColor: "text-purple-600", href: "/platform/users/permissions" },
  ];

  function StatCard({ s }: { s: Stat }) {
    const Icon = s.icon;
    const inner = (
      <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] flex items-center gap-4 p-5 border-l-4 hover:shadow-md transition-shadow" style={{ borderLeftColor: s.accent }}>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${s.iconBg}`}>
          <Icon size={20} className={s.iconColor} />
        </div>
        <div>
          <p className="text-[26px] font-extrabold text-slate-900 leading-none">{s.value.toLocaleString()}</p>
          <p className="text-[13px] font-semibold text-slate-500 mt-0.5">{s.label}</p>
        </div>
      </div>
    );
    if (s.href) return <Link href={s.href} className="block">{inner}</Link>;
    return inner;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-extrabold text-slate-900 leading-tight">Users Dashboard</h1>
          <p className="text-slate-500 text-[14px] font-semibold mt-1">Platform user activity and access overview</p>
        </div>
        <Link
          href="/platform/users/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-bold transition-all shadow-sm"
          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
        >
          <Users size={15} />
          Add User
        </Link>
      </div>

      {/* Row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {row1.map((s) => <StatCard key={s.label} s={s} />)}
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {row2.map((s) => <StatCard key={s.label} s={s} />)}
      </div>

      {/* Recent Users table */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#f0edf8]">
          <h2 className="text-[15px] font-extrabold text-slate-800">Recent Users</h2>
          <p className="text-[13px] text-slate-400 font-semibold mt-0.5">Latest platform user accounts</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#faf9ff] border-b border-[#f0edf8]">
                {["User", "Email", "Role", "Status", "Last Login"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5f3fc]">
              {recentUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-semibold text-[13px]">No users found.</td>
                </tr>
              ) : recentUsers.map((u) => (
                <tr key={u.id} className="hover:bg-[#faf9ff] transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-[11px] font-extrabold shrink-0"
                        style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
                      >
                        {initials(u.full_name)}
                      </div>
                      <Link href={`/platform/users/${u.id}`} className="font-bold text-slate-900 text-[13px] hover:text-violet-700 transition-colors">{u.full_name}</Link>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 font-semibold text-[13px]">{u.email}</td>
                  <td className="px-5 py-3.5">
                    <span className={`rounded-full text-[11px] font-bold px-2.5 py-0.5 border ${roleBadge[u.role] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
                      {(u.role ?? "—").replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`rounded-full text-[11px] font-bold px-2.5 py-0.5 border ${statusBadge[u.status ?? "active"] ?? "bg-slate-50 text-slate-500 border-slate-100"}`}>
                      {u.status ?? "active"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-400 font-semibold text-[12px]">
                    {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : "Never"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
