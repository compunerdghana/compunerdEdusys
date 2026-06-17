"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Users, UserCheck, ShieldAlert, GraduationCap, UserCog, History, Loader2, ArrowRight } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface Stats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  teacherCount: number;
  studentCount: number;
  parentCount: number;
  staffCount: number;
}

interface RecentUser {
  id: string;
  full_name: string;
  role: string;
  created_at: string;
  is_active: boolean;
}

interface LoginRecord {
  id: string;
  username: string;
  status: string;
  ip_address: string;
  browser: string;
  device: string;
  created_at: string;
  profile?: { full_name: string; role: string };
}

export default function UserManagementDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [logins, setLogins] = useState<LoginRecord[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [statsRes, loginsRes] = await Promise.all([
          fetch("/api/school/user-management/stats").then(r => r.json()),
          fetch("/api/school/user-management/login-history").then(r => r.json())
        ]);
        setStats(statsRes.stats);
        setRecentUsers(statsRes.recent || []);
        setChartData(statsRes.chartData || []);
        setLogins((loginsRes.history || []).slice(0, 5));
      } catch (err) {
        console.error("Failed to load statistics:", err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <Loader2 size={32} className="animate-spin text-violet-600 mx-auto" />
        <p className="text-slate-400 text-[13px] font-semibold mt-3">Computing dashboard statistics...</p>
      </div>
    );
  }

  const statCards = [
    { label: "Total Accounts", value: stats?.totalUsers || 0, icon: Users, color: "text-violet-600 bg-violet-50" },
    { label: "Active Users", value: stats?.activeUsers || 0, icon: UserCheck, color: "text-emerald-600 bg-emerald-50" },
    { label: "Suspended Accounts", value: stats?.suspendedUsers || 0, icon: ShieldAlert, color: "text-rose-600 bg-rose-50" },
    { label: "Total Students", value: stats?.studentCount || 0, icon: GraduationCap, color: "text-blue-600 bg-blue-50" },
    { label: "Total Parents", value: stats?.parentCount || 0, icon: Users, color: "text-indigo-600 bg-indigo-50" },
    { label: "Total Teachers", value: stats?.teacherCount || 0, icon: UserCog, color: "text-amber-600 bg-amber-50" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[20px] font-extrabold text-slate-900 leading-tight">
          User Management Dashboard
        </h1>
        <p className="text-slate-500 text-[12px] font-semibold mt-0.5">
          Access control, directories, login sessions, and permission override setups.
        </p>
      </div>

      {/* Grid Counts */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((c) => (
          <div key={c.label} className="bg-white rounded-2xl border border-[#e8e4f3] p-4 flex flex-col gap-2 shadow-sm">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${c.color}`}>
              <c.icon size={15} />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">{c.label}</p>
              <h3 className="text-[18px] font-black text-slate-900 mt-0.5">{c.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Graphs & Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Card */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#e8e4f3] shadow-sm p-6 space-y-4">
          <div>
            <h3 className="font-extrabold text-slate-900 text-[14px]">Active User Sessions</h3>
            <p className="text-[11px] text-slate-400 font-semibold">Weekly login trends of active vs suspended users</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f0f6" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} style={{ fontSize: 10, fontWeight: "bold", fill: "#94a3b8" }} />
                <YAxis tickLine={false} axisLine={false} style={{ fontSize: 10, fontWeight: "bold", fill: "#94a3b8" }} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="active" stackId="a" fill="#7c3aed" radius={[2, 2, 0, 0]} barSize={24} />
                <Bar dataKey="suspended" stackId="a" fill="#fda4af" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recently Added */}
        <div className="bg-white rounded-2xl border border-[#e8e4f3] shadow-sm p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-[14px]">Recently Added Users</h3>
              <p className="text-[11px] text-slate-400 font-semibold">Newest accounts created in the portal</p>
            </div>
            
            <div className="space-y-3">
              {recentUsers.slice(0, 4).map((u) => {
                const initials = u.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
                return (
                  <div key={u.id} className="flex items-center justify-between p-3 rounded-xl bg-[#faf9ff] border border-[#f0edf8]">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-violet-600 text-white flex items-center justify-center text-[10px] font-extrabold shrink-0 shadow-sm">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[12px] font-bold text-slate-900 truncate leading-snug">{u.full_name}</p>
                        <p className="text-[10px] text-slate-400 font-semibold capitalize">{u.role.replace("_", " ")}</p>
                      </div>
                    </div>
                    <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border shrink-0 ${
                      u.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-red-50 text-red-700 border-red-100"
                    }`}>
                      {u.is_active ? "Active" : "Banned"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <Link href="/user-management/users" className="mt-4 w-full py-2 flex items-center justify-center gap-1.5 rounded-xl border border-[#e0daf0] text-[12px] font-bold text-slate-600 hover:bg-slate-50 transition-all">
            Browse Directory <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {/* Logins history */}
      <div className="bg-white rounded-2xl border border-[#e8e4f3] shadow-sm p-6 space-y-4">
        <div>
          <h3 className="font-extrabold text-slate-900 text-[14px]">Recent Portal Sign-ins</h3>
          <p className="text-[11px] text-slate-400 font-semibold">Latest logging actions monitored in the portal</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#faf9ff] border-b border-[#f0edf8]">
                {["User", "Status", "IP Address", "Device / Browser", "Time"].map((h) => (
                  <th key={h} className="px-4 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5f3fc]">
              {logins.map((log) => {
                const browserLabel = log.browser || "Unknown";
                const deviceLabel = log.device || "Unknown";
                return (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="text-[12.5px] font-bold text-slate-900">{log.profile?.full_name || log.username}</p>
                      <p className="text-[10px] text-slate-400 font-semibold capitalize">{log.profile?.role?.replace("_", " ") || "User"}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${
                        log.status === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-red-50 text-red-700 border-red-100"
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 font-mono text-[11.5px] font-semibold">{log.ip_address}</td>
                    <td className="px-4 py-3.5 text-slate-500 font-semibold text-[11px]">{deviceLabel} / {browserLabel}</td>
                    <td className="px-4 py-3.5 text-slate-400 font-medium text-[11px]">{new Date(log.created_at).toLocaleTimeString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
