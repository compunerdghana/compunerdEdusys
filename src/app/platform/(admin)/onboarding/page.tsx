"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ClipboardList, AlertCircle, Settings, GraduationCap, Rocket,
  Activity, CheckCircle2, Clock, ArrowRight, Eye, TrendingUp,
  Building2, User, Calendar, ChevronRight,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface Stats {
  total: number;
  pendingVerification: number;
  pendingSetup: number;
  inTraining: number;
  readyForGoLive: number;
  activeImplementations: number;
  completed: number;
  delayed: number;
}

interface OnboardingRecord {
  id: string;
  school_name: string;
  school_code: string;
  stage: string;
  assigned_officer: string;
  progress: number;
  go_live_date: string | null;
  created_at: string;
}

const STAGE_COLORS: Record<string, string> = {
  lead: "bg-slate-100 text-slate-700 border-slate-200",
  registered: "bg-blue-100 text-blue-700 border-blue-200",
  verified: "bg-cyan-100 text-cyan-700 border-cyan-200",
  setup: "bg-violet-100 text-violet-700 border-violet-200",
  training: "bg-purple-100 text-purple-700 border-purple-200",
  testing: "bg-orange-100 text-orange-700 border-orange-200",
  "go-live ready": "bg-amber-100 text-amber-700 border-amber-200",
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const FUNNEL_STAGES = [
  { key: "lead", label: "Lead", color: "#6366f1" },
  { key: "registered", label: "Registered", color: "#8b5cf6" },
  { key: "verified", label: "Verified", color: "#a855f7" },
  { key: "setup", label: "Setup", color: "#3b82f6" },
  { key: "training", label: "Training", color: "#06b6d4" },
  { key: "testing", label: "Testing", color: "#f59e0b" },
  { key: "go-live ready", label: "Go-Live Ready", color: "#10b981" },
  { key: "active", label: "Active", color: "#22c55e" },
];

const STAT_CARDS = [
  { key: "total", label: "Total Onboarding", color: "#4f46e5", bg: "border-l-indigo-500", icon: ClipboardList, iconBg: "bg-indigo-100", iconColor: "text-indigo-600" },
  { key: "pendingVerification", label: "Pending Verification", color: "#d97706", bg: "border-l-amber-500", icon: AlertCircle, iconBg: "bg-amber-100", iconColor: "text-amber-600" },
  { key: "pendingSetup", label: "Pending Setup", color: "#2563eb", bg: "border-l-blue-500", icon: Settings, iconBg: "bg-blue-100", iconColor: "text-blue-600" },
  { key: "inTraining", label: "In Training", color: "#7c3aed", bg: "border-l-violet-500", icon: GraduationCap, iconBg: "bg-violet-100", iconColor: "text-violet-600" },
  { key: "readyForGoLive", label: "Ready for Go-Live", color: "#059669", bg: "border-l-emerald-500", icon: Rocket, iconBg: "bg-emerald-100", iconColor: "text-emerald-600" },
  { key: "activeImplementations", label: "Active Implementations", color: "#ea580c", bg: "border-l-orange-500", icon: Activity, iconBg: "bg-orange-100", iconColor: "text-orange-600" },
  { key: "completed", label: "Completed", color: "#16a34a", bg: "border-l-green-500", icon: CheckCircle2, iconBg: "bg-green-100", iconColor: "text-green-600" },
  { key: "delayed", label: "Delayed", color: "#dc2626", bg: "border-l-red-500", icon: Clock, iconBg: "bg-red-100", iconColor: "text-red-600" },
];

function SkeletonRow() {
  return (
    <tr>
      {[1, 2, 3, 4, 5, 6].map(i => (
        <td key={i} className="px-5 py-3.5">
          <div className="h-4 bg-slate-100 rounded animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

export default function OnboardingDashboardPage() {
  const { error: toastError } = useToast();
  const [stats, setStats] = useState<Stats>({
    total: 0, pendingVerification: 0, pendingSetup: 0, inTraining: 0,
    readyForGoLive: 0, activeImplementations: 0, completed: 0, delayed: 0,
  });
  const [records, setRecords] = useState<OnboardingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [funnelCounts, setFunnelCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, listRes] = await Promise.all([
          fetch("/api/platform/onboarding/stats"),
          fetch("/api/platform/onboarding?limit=10"),
        ]);
        if (statsRes.ok) {
          const s = await statsRes.json();
          setStats(s.stats ?? s);
        }
        if (listRes.ok) {
          const d = await listRes.json();
          const list: OnboardingRecord[] = d.onboardings ?? d.data ?? d ?? [];
          setRecords(list);
          const counts: Record<string, number> = {};
          list.forEach(r => {
            const s = (r.stage || "").toLowerCase();
            counts[s] = (counts[s] || 0) + 1;
          });
          setFunnelCounts(counts);
        }
      } catch {
        toastError("Failed to load onboarding data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [toastError]);

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[26px] font-extrabold text-slate-900">School Onboarding</h1>
            <p className="text-[13px] text-slate-500 mt-0.5">Track and manage all school onboarding activities</p>
          </div>
          <Link
            href="/platform/onboarding/new"
            className="inline-flex items-center gap-2 px-5 h-10 rounded-xl text-[13px] font-bold text-white transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
          >
            <ClipboardList size={15} />
            Register New School
          </Link>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-4 gap-4">
          {STAT_CARDS.map(({ key, label, bg, icon: Icon, iconBg, iconColor }) => (
            <div key={key} className={`bg-white rounded-2xl shadow-sm border border-[#e8e4f3] border-l-4 ${bg} p-5 flex items-center gap-4`}>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
                <Icon size={20} className={iconColor} />
              </div>
              <div>
                <p className="text-[26px] font-extrabold text-slate-900 leading-none">
                  {loading ? <span className="inline-block w-8 h-7 bg-slate-100 rounded animate-pulse" /> : (stats as unknown as Record<string, number>)[key] ?? 0}
                </p>
                <p className="text-[12px] font-semibold text-slate-500 mt-1">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Funnel */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] p-6">
          <h2 className="text-[18px] font-extrabold text-slate-900 mb-6">Onboarding Funnel</h2>
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {FUNNEL_STAGES.map((stage, i) => (
              <div key={stage.key} className="flex items-center shrink-0">
                <div className="flex flex-col items-center gap-2 min-w-[100px]">
                  <div
                    className="w-full rounded-xl px-3 py-3 text-center"
                    style={{ background: `${stage.color}18`, border: `1.5px solid ${stage.color}40` }}
                  >
                    <p className="text-[11px] font-extrabold uppercase tracking-wide" style={{ color: stage.color }}>
                      {stage.label}
                    </p>
                    <p className="text-[22px] font-extrabold mt-1" style={{ color: stage.color }}>
                      {loading ? "—" : (funnelCounts[(stage.key)] ?? 0)}
                    </p>
                  </div>
                </div>
                {i < FUNNEL_STAGES.length - 1 && (
                  <ChevronRight size={16} className="text-slate-300 mx-1 shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Recent Onboardings */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3]">
          <div className="px-6 py-4 border-b border-[#e8e4f3] flex items-center justify-between">
            <h2 className="text-[18px] font-extrabold text-slate-900">Recent Onboardings</h2>
            <Link href="/platform/onboarding/profiles" className="text-[12px] font-bold text-indigo-600 hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#faf9ff]">
                  {["School", "Stage", "Assigned Officer", "Progress", "Go-Live Date", "Actions"].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-slate-400 uppercase tracking-widest text-[11px] font-bold first:rounded-tl-none last:rounded-tr-none">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0edf8]">
                {loading ? (
                  [1, 2, 3].map(i => <SkeletonRow key={i} />)
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center">
                      <ClipboardList size={32} className="text-slate-200 mx-auto mb-3" />
                      <p className="text-[13px] font-semibold text-slate-400">No onboarding records yet</p>
                      <p className="text-[12px] text-slate-300 mt-1">Register a school to begin the onboarding process</p>
                    </td>
                  </tr>
                ) : (
                  records.map(rec => (
                    <tr key={rec.id} className="hover:bg-[#faf9ff] transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[11px] font-extrabold shrink-0"
                            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
                            {rec.school_name?.slice(0, 2).toUpperCase() ?? "SC"}
                          </div>
                          <div>
                            <p className="text-[13px] font-bold text-slate-800">{rec.school_name}</p>
                            <p className="text-[11px] text-slate-400 font-semibold">{rec.school_code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`rounded-full text-[11px] font-bold px-2.5 py-0.5 border ${STAGE_COLORS[(rec.stage ?? "").toLowerCase()] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}>
                          {rec.stage ?? "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center">
                            <User size={11} className="text-violet-600" />
                          </div>
                          <span className="text-[13px] font-semibold text-slate-700">{rec.assigned_officer ?? "Unassigned"}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-2 rounded-full transition-all"
                              style={{ width: `${rec.progress ?? 0}%`, background: "linear-gradient(90deg,#4f46e5,#7c3aed)" }}
                            />
                          </div>
                          <span className="text-[11px] font-bold text-slate-500">{rec.progress ?? 0}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {rec.go_live_date ? (
                          <div className="flex items-center gap-1.5">
                            <Calendar size={12} className="text-slate-400" />
                            <span className="text-[12px] font-semibold text-slate-600">
                              {new Date(rec.go_live_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[12px] text-slate-300 font-semibold">Not set</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/platform/onboarding/profiles?view=${rec.id}`}
                          className="inline-flex items-center gap-1.5 px-3 h-7 rounded-lg text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 transition-colors"
                        >
                          <Eye size={11} />
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { href: "/platform/onboarding/pipeline", label: "Pipeline View", desc: "Kanban board overview", icon: TrendingUp, color: "text-indigo-600", bg: "bg-indigo-50" },
            { href: "/platform/onboarding/verification", label: "Verification Queue", desc: "Review pending verifications", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
            { href: "/platform/onboarding/tasks", label: "Onboarding Tasks", desc: "Manage all tasks", icon: ClipboardList, color: "text-violet-600", bg: "bg-violet-50" },
            { href: "/platform/onboarding/reports", label: "Reports", desc: "Analytics & insights", icon: Activity, color: "text-blue-600", bg: "bg-blue-50" },
          ].map(({ href, label, desc, icon: Icon, color, bg }) => (
            <Link key={href} href={href}
              className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] p-5 hover:shadow-md transition-all group flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg} group-hover:scale-110 transition-transform`}>
                <Icon size={18} className={color} />
              </div>
              <div>
                <p className="text-[13px] font-extrabold text-slate-800">{label}</p>
                <p className="text-[11px] text-slate-400 font-semibold">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
