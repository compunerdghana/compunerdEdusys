"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Zap, CheckCircle2, XCircle, FlaskConical, PackageOpen,
  Code2, School, Tag, BarChart2, Edit2, ToggleLeft, ToggleRight,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface Stats {
  total: number;
  active: number;
  inactive: number;
  beta: number;
  released: number;
  in_development: number;
  schools_using: number;
  categories: number;
}

interface CategoryBar {
  name: string;
  color: string;
  count: number;
}

interface Feature {
  id: string;
  name: string;
  code: string;
  category_name: string;
  category_color: string;
  access_level: string;
  status: string;
  route_path: string;
}

const ACCESS_LEVEL_STYLES: Record<string, string> = {
  public: "bg-slate-50 text-slate-600 border-slate-200",
  subscription: "bg-blue-50 text-blue-700 border-blue-200",
  premium: "bg-amber-50 text-amber-700 border-amber-200",
  enterprise: "bg-violet-50 text-violet-700 border-violet-200",
  beta: "bg-purple-50 text-purple-700 border-purple-200",
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  inactive: "bg-slate-50 text-slate-500 border-slate-200",
  draft: "bg-blue-50 text-blue-700 border-blue-200",
  archived: "bg-stone-50 text-stone-600 border-stone-200",
  beta: "bg-violet-50 text-violet-700 border-violet-200",
};

const MOCK_STATS: Stats = {
  total: 48, active: 34, inactive: 6, beta: 5, released: 28,
  in_development: 8, schools_using: 142, categories: 9,
};

const MOCK_BARS: CategoryBar[] = [
  { name: "Academics", color: "#4f46e5", count: 12 },
  { name: "Finance", color: "#7c3aed", count: 9 },
  { name: "Communication", color: "#0284c7", count: 7 },
  { name: "Students", color: "#059669", count: 6 },
  { name: "Reports", color: "#d97706", count: 5 },
  { name: "Attendance", color: "#dc2626", count: 4 },
  { name: "Admin", color: "#7e22ce", count: 3 },
  { name: "Settings", color: "#475569", count: 2 },
];

const MOCK_FEATURES: Feature[] = [
  { id: "1", name: "Student Management", code: "student_mgmt", category_name: "Students", category_color: "#059669", access_level: "subscription", status: "active", route_path: "/school/students" },
  { id: "2", name: "Fee Collection", code: "fee_collection", category_name: "Finance", category_color: "#7c3aed", access_level: "premium", status: "active", route_path: "/school/finance" },
  { id: "3", name: "SMS Notifications", code: "sms_notify", category_name: "Communication", category_color: "#0284c7", access_level: "enterprise", status: "active", route_path: "/school/comms" },
  { id: "4", name: "AI Report Generator", code: "ai_reports", category_name: "Reports", category_color: "#d97706", access_level: "beta", status: "beta", route_path: "/school/reports/ai" },
  { id: "5", name: "Timetable Builder", code: "timetable", category_name: "Academics", category_color: "#4f46e5", access_level: "subscription", status: "active", route_path: "/school/academics/timetable" },
  { id: "6", name: "E-Learning Portal", code: "elearning", category_name: "Academics", category_color: "#4f46e5", access_level: "premium", status: "draft", route_path: "/school/academics/elearning" },
  { id: "7", name: "Payroll Processing", code: "payroll", category_name: "Finance", category_color: "#7c3aed", access_level: "enterprise", status: "active", route_path: "/school/payroll" },
  { id: "8", name: "Parent Portal", code: "parent_portal", category_name: "Communication", category_color: "#0284c7", access_level: "subscription", status: "inactive", route_path: "/school/parent" },
  { id: "9", name: "Biometric Attendance", code: "biometric", category_name: "Attendance", category_color: "#dc2626", access_level: "premium", status: "active", route_path: "/school/attendance/bio" },
  { id: "10", name: "Analytics Dashboard", code: "analytics", category_name: "Admin", category_color: "#7e22ce", access_level: "enterprise", status: "active", route_path: "/school/admin/analytics" },
];

const statCards = (s: Stats) => [
  { label: "Total Features", value: s.total, icon: Zap, color: "indigo", border: "#4f46e5", bg: "#eef2ff", iconColor: "#4f46e5" },
  { label: "Active", value: s.active, icon: CheckCircle2, color: "emerald", border: "#059669", bg: "#ecfdf5", iconColor: "#059669" },
  { label: "Inactive", value: s.inactive, icon: XCircle, color: "slate", border: "#64748b", bg: "#f8fafc", iconColor: "#64748b" },
  { label: "Beta", value: s.beta, icon: FlaskConical, color: "violet", border: "#7c3aed", bg: "#f5f3ff", iconColor: "#7c3aed" },
  { label: "Released", value: s.released, icon: PackageOpen, color: "blue", border: "#0284c7", bg: "#eff6ff", iconColor: "#0284c7" },
  { label: "In Development", value: s.in_development, icon: Code2, color: "amber", border: "#d97706", bg: "#fffbeb", iconColor: "#d97706" },
  { label: "Schools Using", value: s.schools_using, icon: School, color: "cyan", border: "#0891b2", bg: "#ecfeff", iconColor: "#0891b2" },
  { label: "Categories", value: s.categories, icon: Tag, color: "purple", border: "#9333ea", bg: "#faf5ff", iconColor: "#9333ea" },
];

export default function FeaturesDashboard() {
  const { error: toastError } = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [bars, setBars] = useState<CategoryBar[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [sRes, fRes] = await Promise.all([
          fetch("/api/platform/features/stats"),
          fetch("/api/platform/features?limit=10"),
        ]);
        if (sRes.ok) {
          const sd = await sRes.json();
          setStats(sd.stats ?? sd);
          setBars(sd.categories ?? []);
        } else {
          setStats(MOCK_STATS);
          setBars(MOCK_BARS);
        }
        if (fRes.ok) {
          const fd = await fRes.json();
          setFeatures(fd.features ?? fd.data ?? []);
        } else {
          setFeatures(MOCK_FEATURES);
        }
      } catch {
        setStats(MOCK_STATS);
        setBars(MOCK_BARS);
        setFeatures(MOCK_FEATURES);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function toggleFeature(id: string, currentStatus: string) {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    try {
      const res = await fetch(`/api/platform/features?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      setFeatures(prev => prev.map(f => f.id === id ? { ...f, status: newStatus } : f));
    } catch {
      toastError("Failed to toggle feature");
    }
  }

  const displayBars = bars.length ? bars : MOCK_BARS;
  const maxCount = Math.max(...displayBars.map(b => b.count), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold text-slate-900 leading-tight">Features Dashboard</h1>
          <p className="text-slate-500 text-[13px] font-semibold mt-1">
            Overview of platform features, adoption, and status.
          </p>
        </div>
        <Link
          href="/platform/features/list"
          className="flex items-center gap-2 px-4 h-10 rounded-xl text-[13px] font-bold text-white transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
        >
          <BarChart2 size={14} />
          Manage Features
        </Link>
      </div>

      {/* Stat Cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] p-5 h-24 animate-pulse">
              <div className="h-3 bg-slate-100 rounded w-20 mb-3" />
              <div className="h-7 bg-slate-100 rounded w-12" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards(stats ?? MOCK_STATS).map(({ label, value, icon: Icon, border, bg, iconColor }) => (
            <div
              key={label}
              className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] border-l-4 p-5 flex items-center gap-4"
              style={{ borderLeftColor: border }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg }}>
                <Icon size={18} style={{ color: iconColor }} />
              </div>
              <div>
                <p className="text-[22px] font-extrabold text-slate-900 leading-tight">{value.toLocaleString()}</p>
                <p className="text-[11px] font-bold text-slate-500 mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Feature Adoption Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-[#e8e4f3] p-6">
          <h2 className="text-[15px] font-extrabold text-slate-900 mb-5">Features by Category</h2>
          <div className="space-y-3">
            {displayBars.map((bar) => (
              <div key={bar.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] font-bold text-slate-700">{bar.name}</span>
                  <span className="text-[11px] font-bold text-slate-400">{bar.count}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(bar.count / maxCount) * 100}%`,
                      background: bar.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats Column */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] p-6">
            <h2 className="text-[15px] font-extrabold text-slate-900 mb-4">Quick Links</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Subscription Mapping", href: "/platform/features/subscription-mapping", color: "#4f46e5" },
                { label: "School Access Control", href: "/platform/features/school-access", color: "#7c3aed" },
                { label: "Active Rollouts", href: "/platform/features/rollouts", color: "#0284c7" },
                { label: "Beta Program", href: "/platform/features/beta", color: "#9333ea" },
                { label: "Release Management", href: "/platform/features/releases", color: "#d97706" },
                { label: "Feature Requests", href: "/platform/features/requests", color: "#059669" },
              ].map(({ label, href, color }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-2.5 p-3 rounded-xl border border-[#e8e4f3] hover:border-[#c4b8f0] hover:bg-[#faf9ff] transition-all group"
                >
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                  <span className="text-[12px] font-bold text-slate-700 group-hover:text-slate-900">{label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Features Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#f0edf8] flex items-center justify-between">
          <h2 className="text-[15px] font-extrabold text-slate-900">Recent Features</h2>
          <Link href="/platform/features/list" className="text-[12px] font-bold text-violet-600 hover:text-violet-800 transition-colors">
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#faf9ff]">
                <th className="text-left px-6 py-3 text-slate-400 uppercase tracking-widest text-[11px] font-bold">Feature Name</th>
                <th className="text-left px-4 py-3 text-slate-400 uppercase tracking-widest text-[11px] font-bold">Category</th>
                <th className="text-left px-4 py-3 text-slate-400 uppercase tracking-widest text-[11px] font-bold">Access Level</th>
                <th className="text-left px-4 py-3 text-slate-400 uppercase tracking-widest text-[11px] font-bold">Status</th>
                <th className="text-left px-4 py-3 text-slate-400 uppercase tracking-widest text-[11px] font-bold">Route</th>
                <th className="text-right px-6 py-3 text-slate-400 uppercase tracking-widest text-[11px] font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5f3fc]">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-3 bg-slate-100 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : features.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Zap size={28} className="text-slate-300" />
                      <p className="text-slate-400 font-semibold text-[13px]">No features found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                features.map((f) => (
                  <tr key={f.id} className="hover:bg-[#faf9ff] transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: f.category_color + "20" }}>
                          <Zap size={14} style={{ color: f.category_color }} />
                        </div>
                        <p className="text-[13px] font-bold text-slate-900">{f.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full text-[11px] font-bold px-2.5 py-0.5 border"
                        style={{ background: f.category_color + "15", color: f.category_color, borderColor: f.category_color + "40" }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: f.category_color }} />
                        {f.category_name}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`rounded-full text-[11px] font-bold px-2.5 py-0.5 border capitalize ${ACCESS_LEVEL_STYLES[f.access_level] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}>
                        {f.access_level}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`rounded-full text-[11px] font-bold px-2.5 py-0.5 border capitalize ${STATUS_STYLES[f.status] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}>
                        {f.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <code className="text-[11px] font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded">{f.route_path}</code>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/platform/features/list?edit=${f.id}`}
                          className="w-8 h-8 rounded-lg border border-[#e0daf0] flex items-center justify-center text-slate-400 hover:text-violet-600 hover:border-violet-300 transition-all"
                        >
                          <Edit2 size={13} />
                        </Link>
                        <button
                          onClick={() => toggleFeature(f.id, f.status)}
                          className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all ${
                            f.status === "active"
                              ? "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                              : "border-[#e0daf0] text-slate-400 hover:text-slate-600"
                          }`}
                        >
                          {f.status === "active" ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
