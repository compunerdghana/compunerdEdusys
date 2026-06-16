"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Users,
  GraduationCap,
  CreditCard,
  LifeBuoy,
  TrendingUp,
  Plus,
  Zap,
  Shield,
  Wallet,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowUpRight,
  Activity,
  Bug,
  Lightbulb,
  Megaphone,
  UserPlus,
  BarChart3,
  Database,
  Wifi,
  MessageCircle,
  HardDrive,
  RefreshCw,
  DollarSign,
  TrendingDown,
  AlertTriangle,
  XCircle,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface ExpiringSchool {
  id: string;
  name: string;
  expires_at?: string;
}

interface SuspendedSchool {
  id: string;
  name: string;
}

interface TopPayingSchool {
  school_id: string;
  school_name: string;
  total: number;
}

interface RecentPayment {
  id: string;
  school_name: string;
  amount: number;
  created_at: string;
  category: string;
}

interface RecentActivity {
  id: string;
  actor_name: string;
  action: string;
  target_name: string;
  created_at: string;
}

interface RecentSchool {
  id: string;
  name: string;
  status: string;
  created_at: string;
  subscription_status?: string | null;
}

interface RecentTicket {
  id: string;
  ticket_number: string;
  subject: string;
  priority: string;
  status: string;
  created_at: string;
}

interface SystemHealth {
  database: string;
  storage: { used: number; total: number; unit: string };
  api: string;
  sync: string;
  sms: string;
  whatsapp: string;
  backup: string;
}

export interface DashboardStats {
  totalSchools: number;
  activeSchools: number;
  trialSchools: number;
  expiredSchools: number;
  suspendedSchools: number;
  archivedSchools: number;
  schoolsThisMonth: number;
  schoolsLastMonth: number;
  totalStudents: number;
  totalStaff: number;
  totalParents: number;
  revenueToday: number;
  revenueThisMonth: number;
  revenueThisYear: number;
  revenueLastMonth: number;
  totalRevenue: number;
  totalExpenses: number;
  profit: number;
  pendingRenewals: number;
  openTickets: number;
  highPriorityTickets: number;
  bugReports: number;
  featureRequests: number;
  schoolGrowth: { month: string; count: number }[];
  revenueGrowth: { month: string; amount: number }[];
  studentGrowth: { month: string; count: number }[];
  expiringIn7: ExpiringSchool[];
  expiringIn15: ExpiringSchool[];
  expiringIn30: ExpiringSchool[];
  suspendedSchools_list: SuspendedSchool[];
  topPayingSchools: TopPayingSchool[];
  recentPayments: RecentPayment[];
  recentActivities: RecentActivity[];
  recentSchools: RecentSchool[];
  recentTickets: RecentTicket[];
  systemHealth: SystemHealth;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatCurrency = (amount: number) =>
  `GHS ${Number(amount || 0).toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

// ── Badge maps ────────────────────────────────────────────────────────────────

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

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  accentColor,
  iconBg,
  iconColor,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accentColor: string;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div
      className={`bg-white rounded-2xl border border-[#e8e4f3] shadow-sm p-5 flex items-center gap-4 border-l-4 ${accentColor}`}
    >
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}
      >
        <Icon size={20} className={iconColor} />
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-slate-400 uppercase tracking-wide leading-none">
          {label}
        </p>
        <p className="text-[28px] font-extrabold text-slate-900 leading-none mt-1">
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h2 className="text-[18px] font-extrabold text-slate-900">{title}</h2>
        {subtitle && (
          <p className="text-[12px] text-slate-400 font-semibold mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

function HealthDot({ status }: { status: string }) {
  const color =
    status === "healthy"
      ? "bg-emerald-500"
      : status === "warning"
        ? "bg-amber-500"
        : "bg-red-500";
  const label =
    status === "healthy" ? "Healthy" : status === "warning" ? "Warning" : "Down";
  const textColor =
    status === "healthy"
      ? "text-emerald-700 bg-emerald-50 border-emerald-100"
      : status === "warning"
        ? "text-amber-700 bg-amber-50 border-amber-100"
        : "text-red-700 bg-red-50 border-red-100";
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${textColor}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function DashboardClient({ stats }: { stats: DashboardStats }) {
  const router = useRouter();

  const today = new Date().toLocaleDateString("en-GH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Chart max values
  const maxSchoolGrowth = Math.max(...(stats.schoolGrowth ?? []).map((m) => m.count), 1);
  const maxRevenueGrowth = Math.max(...(stats.revenueGrowth ?? []).map((m) => m.amount), 1);

  // Quick actions config
  const quickActions = [
    {
      label: "Create School",
      href: "/platform/schools/new",
      icon: Plus,
      grad: "from-violet-500 to-purple-700",
      desc: "Onboard a new school",
    },
    {
      label: "New Subscription",
      href: "/platform/subscriptions/new",
      icon: DollarSign,
      grad: "from-blue-500 to-blue-700",
      desc: "Create subscription",
    },
    {
      label: "Announcement",
      href: "/platform/announcements/new",
      icon: Megaphone,
      grad: "from-emerald-500 to-teal-700",
      desc: "Broadcast message",
    },
    {
      label: "Add User",
      href: "/platform/users/new",
      icon: UserPlus,
      grad: "from-indigo-500 to-indigo-700",
      desc: "Platform admin",
    },
    {
      label: "Login As School",
      href: "/platform/schools",
      icon: Shield,
      grad: "from-rose-500 to-red-700",
      desc: "Impersonate school",
    },
    {
      label: "Reports",
      href: "/platform/reports",
      icon: BarChart3,
      grad: "from-amber-500 to-orange-600",
      desc: "Analytics & exports",
    },
  ];

  return (
    <div className="space-y-6 pb-10">
      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[26px] font-extrabold text-slate-900 leading-tight">
            Executive Command Center
          </h1>
          <p className="text-slate-500 text-[13px] font-semibold mt-1">{today}</p>
        </div>
        <button
          onClick={() => router.refresh()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-bold transition-all shadow-sm hover:opacity-90 active:scale-95"
          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* ── Row 1: KPI cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Schools"
          value={stats.totalSchools}
          sub={`+${stats.schoolsThisMonth} this month`}
          icon={Building2}
          accentColor="border-l-indigo-500"
          iconBg="bg-indigo-50"
          iconColor="text-indigo-600"
        />
        <KpiCard
          label="Active Schools"
          value={stats.activeSchools}
          sub="Paying subscribers"
          icon={CheckCircle}
          accentColor="border-l-emerald-500"
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <KpiCard
          label="Total Students"
          value={stats.totalStudents}
          sub="Across all schools"
          icon={GraduationCap}
          accentColor="border-l-blue-500"
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <KpiCard
          label="MRR"
          value={formatCurrency(stats.revenueThisMonth)}
          sub={`Last month: ${formatCurrency(stats.revenueLastMonth)}`}
          icon={Wallet}
          accentColor="border-l-violet-500"
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
        />
      </div>

      {/* ── Row 2: KPI cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Trial Schools"
          value={stats.trialSchools}
          sub={`${stats.pendingRenewals} renewals due`}
          icon={Clock}
          accentColor="border-l-sky-500"
          iconBg="bg-sky-50"
          iconColor="text-sky-600"
        />
        <KpiCard
          label="Expired Schools"
          value={stats.expiredSchools}
          sub={`${stats.suspendedSchools} suspended`}
          icon={XCircle}
          accentColor="border-l-amber-500"
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <KpiCard
          label="Total Staff"
          value={stats.totalStaff}
          sub={`${stats.totalParents} parents`}
          icon={Users}
          accentColor="border-l-teal-500"
          iconBg="bg-teal-50"
          iconColor="text-teal-600"
        />
        <KpiCard
          label="Open Tickets"
          value={stats.openTickets}
          sub={`${stats.highPriorityTickets} high priority`}
          icon={LifeBuoy}
          accentColor="border-l-rose-500"
          iconBg="bg-rose-50"
          iconColor="text-rose-600"
        />
      </div>

      {/* ── Row 3: School Growth + Revenue Snapshot ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* School Growth Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-[#e8e4f3]">
          <SectionHeader
            title="School Onboarding"
            subtitle="New schools per month — last 6 months"
          />
          <div className="flex items-end gap-3 h-32 mt-4">
            {(stats.schoolGrowth ?? []).map((m) => (
              <div key={m.month} className="flex flex-col items-center gap-1 flex-1">
                <span className="text-[10px] font-bold text-slate-600">{m.count}</span>
                <div
                  className="w-full rounded-t-lg transition-all duration-500"
                  style={{
                    height: `${Math.max((m.count / maxSchoolGrowth) * 100, 4)}%`,
                    background: "linear-gradient(to top, #4f46e5, #7c3aed)",
                    minHeight: 4,
                  }}
                />
                <span className="text-[10px] text-slate-400">{m.month}</span>
              </div>
            ))}
          </div>

          {/* Revenue bar chart below */}
          <div className="mt-6 pt-5 border-t border-[#f0edf8]">
            <p className="text-[12px] font-extrabold text-slate-500 uppercase tracking-wide mb-3">
              Monthly Revenue (GHS)
            </p>
            <div className="flex items-end gap-3 h-20">
              {(stats.revenueGrowth ?? []).map((m) => (
                <div key={m.month} className="flex flex-col items-center gap-1 flex-1">
                  <span className="text-[9px] font-bold text-slate-500">
                    {m.amount >= 1000
                      ? `${(m.amount / 1000).toFixed(1)}k`
                      : m.amount}
                  </span>
                  <div
                    className="w-full rounded-t-md transition-all duration-500"
                    style={{
                      height: `${Math.max((m.amount / maxRevenueGrowth) * 100, 4)}%`,
                      background: "linear-gradient(to top, #059669, #10b981)",
                      minHeight: 4,
                    }}
                  />
                  <span className="text-[9px] text-slate-400">{m.month}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Revenue Snapshot */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e8e4f3]">
          <SectionHeader title="Revenue Snapshot" subtitle="Financial overview" />
          <div className="space-y-3 mt-1">
            {[
              { label: "Today", value: stats.revenueToday, icon: TrendingUp, color: "text-emerald-600" },
              { label: "This Month", value: stats.revenueThisMonth, icon: TrendingUp, color: "text-emerald-600" },
              { label: "This Year", value: stats.revenueThisYear, icon: TrendingUp, color: "text-emerald-600" },
              { label: "Total Revenue", value: stats.totalRevenue, icon: TrendingUp, color: "text-indigo-600" },
              { label: "Total Expenses", value: stats.totalExpenses, icon: TrendingDown, color: "text-red-500" },
              { label: "Net Profit", value: stats.profit, icon: DollarSign, color: stats.profit >= 0 ? "text-emerald-600" : "text-red-500" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div
                key={label}
                className="flex items-center justify-between py-2 border-b border-[#f5f3fc] last:border-0"
              >
                <div className="flex items-center gap-2">
                  <Icon size={13} className={color} />
                  <span className="text-[12px] font-semibold text-slate-500">{label}</span>
                </div>
                <span className={`text-[13px] font-extrabold ${color}`}>
                  {formatCurrency(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 4: Schools Needing Attention + System Health ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Schools Needing Attention */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e8e4f3]">
          <SectionHeader
            title="Schools Needing Attention"
            subtitle="Expiring subscriptions & suspensions"
          />
          <div className="space-y-4">
            {/* Expiring in 7 */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-100">
                  {stats.expiringIn7?.length ?? 0} expiring in 7 days
                </span>
              </div>
              {(stats.expiringIn7?.length ?? 0) === 0 ? (
                <p className="text-[11px] text-slate-400 ml-2">None — all clear</p>
              ) : (
                <div className="space-y-1">
                  {(stats.expiringIn7 ?? []).map((s) => (
                    <div key={s.id} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-red-50">
                      <span className="text-[12px] font-semibold text-slate-700">{s.name}</span>
                      {s.expires_at && (
                        <span className="text-[10px] text-red-600 font-bold">
                          {new Date(s.expires_at).toLocaleDateString("en-GH", { day: "numeric", month: "short" })}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Expiring in 15 */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                  {stats.expiringIn15?.length ?? 0} expiring in 15 days
                </span>
              </div>
              {(stats.expiringIn15?.length ?? 0) === 0 ? (
                <p className="text-[11px] text-slate-400 ml-2">None — all clear</p>
              ) : (
                <div className="space-y-1">
                  {(stats.expiringIn15 ?? []).map((s) => (
                    <div key={s.id} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-amber-50">
                      <span className="text-[12px] font-semibold text-slate-700">{s.name}</span>
                      {s.expires_at && (
                        <span className="text-[10px] text-amber-600 font-bold">
                          {new Date(s.expires_at).toLocaleDateString("en-GH", { day: "numeric", month: "short" })}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Expiring in 30 */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-100">
                  {stats.expiringIn30?.length ?? 0} expiring in 30 days
                </span>
              </div>
              {(stats.expiringIn30?.length ?? 0) === 0 ? (
                <p className="text-[11px] text-slate-400 ml-2">None — all clear</p>
              ) : (
                <div className="space-y-1">
                  {(stats.expiringIn30 ?? []).map((s) => (
                    <div key={s.id} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-orange-50">
                      <span className="text-[12px] font-semibold text-slate-700">{s.name}</span>
                      {s.expires_at && (
                        <span className="text-[10px] text-orange-600 font-bold">
                          {new Date(s.expires_at).toLocaleDateString("en-GH", { day: "numeric", month: "short" })}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Suspended */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  {stats.suspendedSchools_list?.length ?? 0} suspended
                </span>
              </div>
              {(stats.suspendedSchools_list?.length ?? 0) === 0 ? (
                <p className="text-[11px] text-slate-400 ml-2">No suspended schools</p>
              ) : (
                <div className="space-y-1">
                  {(stats.suspendedSchools_list ?? []).map((s) => (
                    <div key={s.id} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-50">
                      <span className="text-[12px] font-semibold text-slate-700">{s.name}</span>
                      <Link
                        href={`/platform/schools/${s.id}`}
                        className="text-[10px] font-bold text-indigo-600 hover:underline"
                      >
                        View
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e8e4f3]">
          <SectionHeader title="System Health" subtitle="Real-time service status" />
          <div className="grid grid-cols-1 gap-3 mt-1">
            {[
              { label: "Database", icon: Database, status: stats.systemHealth?.database ?? "healthy" },
              { label: "API", icon: Wifi, status: stats.systemHealth?.api ?? "healthy" },
              { label: "Offline Sync", icon: RefreshCw, status: stats.systemHealth?.sync ?? "healthy" },
              { label: "SMS Gateway", icon: MessageCircle, status: stats.systemHealth?.sms ?? "healthy" },
              { label: "WhatsApp", icon: MessageCircle, status: stats.systemHealth?.whatsapp ?? "healthy" },
              { label: "Backup", icon: HardDrive, status: stats.systemHealth?.backup ?? "healthy" },
            ].map(({ label, icon: Icon, status }) => (
              <div
                key={label}
                className="flex items-center justify-between p-3 rounded-xl bg-[#faf9ff] border border-[#f0edf8]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <Icon size={14} className="text-indigo-600" />
                  </div>
                  <span className="text-[13px] font-semibold text-slate-700">{label}</span>
                </div>
                <HealthDot status={status} />
              </div>
            ))}

            {/* Storage progress */}
            <div className="p-3 rounded-xl bg-[#faf9ff] border border-[#f0edf8]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <HardDrive size={14} className="text-indigo-600" />
                  </div>
                  <span className="text-[13px] font-semibold text-slate-700">Storage</span>
                </div>
                <span className="text-[11px] font-bold text-slate-500">
                  {stats.systemHealth?.storage?.used ?? 0}{" "}
                  / {stats.systemHealth?.storage?.total ?? 10}{" "}
                  {stats.systemHealth?.storage?.unit ?? "GB"}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
                  style={{
                    width: `${Math.min(
                      ((stats.systemHealth?.storage?.used ?? 0) /
                        (stats.systemHealth?.storage?.total ?? 10)) *
                        100,
                      100,
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 5: Recent Activities + Support Summary ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#f0edf8] flex items-center justify-between">
            <div>
              <h2 className="text-[18px] font-extrabold text-slate-900">Recent Activities</h2>
              <p className="text-[12px] text-slate-400 font-semibold mt-0.5">
                Platform audit log
              </p>
            </div>
            <Link
              href="/platform/audit"
              className="flex items-center gap-1 text-[12px] font-bold text-violet-600 hover:text-violet-800"
            >
              View all <ArrowUpRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-[#f5f3fc]">
            {(stats.recentActivities?.length ?? 0) === 0 ? (
              <div className="px-6 py-10 text-center">
                <Activity size={24} className="text-slate-200 mx-auto mb-2" />
                <p className="text-slate-400 text-[13px] font-semibold">
                  No recent activities
                </p>
              </div>
            ) : (
              (stats.recentActivities ?? []).map((a) => (
                <div key={a.id} className="flex items-start gap-3 px-6 py-3.5 hover:bg-[#faf9ff] transition-colors">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-[10px] font-extrabold"
                    style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
                  >
                    {initials(a.actor_name ?? "?")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold text-slate-700 leading-snug">
                      <span className="font-extrabold text-slate-900">{a.actor_name}</span>{" "}
                      {a.action}{" "}
                      {a.target_name && (
                        <span className="font-bold text-indigo-700">{a.target_name}</span>
                      )}
                    </p>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                      {timeAgo(a.created_at)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Support Summary */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e8e4f3]">
          <SectionHeader
            title="Support Summary"
            subtitle="Ticket breakdown"
            action={
              <Link
                href="/platform/support"
                className="flex items-center gap-1 text-[12px] font-bold text-violet-600 hover:text-violet-800"
              >
                View all <ArrowUpRight size={12} />
              </Link>
            }
          />
          <div className="grid grid-cols-2 gap-4 mt-2">
            {[
              {
                label: "Open Tickets",
                value: stats.openTickets,
                icon: LifeBuoy,
                color: "text-indigo-600",
                bg: "bg-indigo-50",
              },
              {
                label: "High Priority",
                value: stats.highPriorityTickets,
                icon: AlertTriangle,
                color: "text-rose-600",
                bg: "bg-rose-50",
              },
              {
                label: "Bug Reports",
                value: stats.bugReports,
                icon: Bug,
                color: "text-amber-600",
                bg: "bg-amber-50",
              },
              {
                label: "Feature Requests",
                value: stats.featureRequests,
                icon: Lightbulb,
                color: "text-emerald-600",
                bg: "bg-emerald-50",
              },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div
                key={label}
                className="p-4 rounded-xl bg-[#faf9ff] border border-[#f0edf8] flex flex-col gap-2"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${bg}`}>
                  <Icon size={16} className={color} />
                </div>
                <p className="text-[24px] font-extrabold text-slate-900 leading-none">
                  {value ?? 0}
                </p>
                <p className="text-[11px] font-semibold text-slate-400">{label}</p>
              </div>
            ))}
          </div>

          {/* Recent Tickets mini list */}
          <div className="mt-5 pt-5 border-t border-[#f0edf8]">
            <p className="text-[12px] font-extrabold text-slate-500 uppercase tracking-wide mb-3">
              Latest Tickets
            </p>
            <div className="space-y-2">
              {(stats.recentTickets?.length ?? 0) === 0 ? (
                <p className="text-slate-400 text-[12px] font-semibold">No tickets yet.</p>
              ) : (
                (stats.recentTickets ?? []).slice(0, 5).map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-2 py-2 border-b border-[#f5f3fc] last:border-0"
                  >
                    <span
                      className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-full shrink-0 ${priorityBadge[t.priority] ?? "bg-slate-50 text-slate-500"}`}
                    >
                      {t.priority}
                    </span>
                    <p className="text-[12px] font-semibold text-slate-700 truncate flex-1">
                      {t.subject}
                    </p>
                    <span
                      className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-full shrink-0 ${ticketStatusBadge[t.status] ?? "bg-slate-50 text-slate-500"}`}
                    >
                      {t.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 6: Top Paying Schools + Recent Payments ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Paying Schools */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#f0edf8]">
            <h2 className="text-[18px] font-extrabold text-slate-900">Top Paying Schools</h2>
            <p className="text-[12px] text-slate-400 font-semibold mt-0.5">
              By total lifetime revenue
            </p>
          </div>
          <div className="divide-y divide-[#f5f3fc]">
            {(stats.topPayingSchools?.length ?? 0) === 0 ? (
              <div className="px-6 py-10 text-center">
                <DollarSign size={24} className="text-slate-200 mx-auto mb-2" />
                <p className="text-slate-400 text-[13px] font-semibold">
                  No payment data yet
                </p>
              </div>
            ) : (
              (stats.topPayingSchools ?? []).map((s, idx) => (
                <div
                  key={s.school_id}
                  className="flex items-center gap-4 px-6 py-3.5 hover:bg-[#faf9ff] transition-colors"
                >
                  <span className="text-[12px] font-extrabold text-slate-300 w-5 shrink-0">
                    {idx + 1}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                    <Building2 size={14} className="text-indigo-600" />
                  </div>
                  <p className="text-[13px] font-bold text-slate-900 flex-1 truncate">
                    {s.school_name}
                  </p>
                  <span className="text-[13px] font-extrabold text-emerald-700 shrink-0">
                    {formatCurrency(s.total)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Payments */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#f0edf8]">
            <h2 className="text-[18px] font-extrabold text-slate-900">Recent Payments</h2>
            <p className="text-[12px] text-slate-400 font-semibold mt-0.5">
              Latest transactions
            </p>
          </div>
          <div className="divide-y divide-[#f5f3fc]">
            {(stats.recentPayments?.length ?? 0) === 0 ? (
              <div className="px-6 py-10 text-center">
                <CreditCard size={24} className="text-slate-200 mx-auto mb-2" />
                <p className="text-slate-400 text-[13px] font-semibold">
                  No payments yet
                </p>
              </div>
            ) : (
              (stats.recentPayments ?? []).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-6 py-3.5 hover:bg-[#faf9ff] transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                    <CreditCard size={14} className="text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-slate-900 truncate">
                      {p.school_name}
                    </p>
                    <p className="text-[10px] text-slate-400 font-semibold">
                      {p.category} · {timeAgo(p.created_at)}
                    </p>
                  </div>
                  <span className="text-[13px] font-extrabold text-emerald-700 shrink-0">
                    {formatCurrency(p.amount)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Row 7: Quick Actions ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e8e4f3]">
        <SectionHeader title="Quick Actions" subtitle="Jump to common tasks" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickActions.map(({ label, href, icon: Icon, grad, desc }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-[#faf9ff] transition-colors border border-[#e8e4f3] text-center group"
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${grad} group-hover:scale-105 transition-transform`}
              >
                <Icon size={16} className="text-white" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-700 group-hover:text-slate-900 transition-colors leading-tight">
                  {label}
                </p>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{desc}</p>
              </div>
              <ArrowUpRight
                size={11}
                className="text-slate-300 group-hover:text-indigo-400 transition-colors"
              />
            </Link>
          ))}
        </div>
      </div>

      {/* ── Row 8: Recent Schools Table ───────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#f0edf8] flex items-center justify-between">
          <div>
            <h2 className="text-[18px] font-extrabold text-slate-900">Recent Schools</h2>
            <p className="text-[12px] text-slate-400 font-semibold mt-0.5">
              Latest onboarded schools
            </p>
          </div>
          <Link
            href="/platform/schools"
            className="flex items-center gap-1 text-[12px] font-bold text-violet-600 hover:text-violet-800"
          >
            View all <ArrowUpRight size={12} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#faf9ff] border-b border-[#f0edf8]">
                {["School", "Status", "Plan", "Created", "Actions"].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-3 text-left text-[11px] font-extrabold text-slate-400 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5f3fc]">
              {(stats.recentSchools?.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center">
                    <Building2 size={24} className="text-slate-200 mx-auto mb-2" />
                    <p className="text-slate-400 text-[13px] font-semibold">
                      No schools yet
                    </p>
                  </td>
                </tr>
              ) : (
                (stats.recentSchools ?? []).map((school) => (
                  <tr
                    key={school.id}
                    className="hover:bg-[#faf9ff] transition-colors"
                  >
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                          <Building2 size={13} className="text-indigo-600" />
                        </div>
                        <p className="text-[13px] font-bold text-slate-900">{school.name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${statusBadge[school.status] ?? "bg-slate-50 text-slate-500 border border-slate-100"}`}
                      >
                        {school.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      {school.subscription_status ? (
                        <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-100">
                          {school.subscription_status}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-300 font-semibold">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5">
                      <p className="text-[12px] text-slate-500 font-semibold">
                        {new Date(school.created_at).toLocaleDateString("en-GH", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </td>
                    <td className="px-6 py-3.5">
                      <Link
                        href={`/platform/schools/${school.id}`}
                        className="flex items-center gap-1 text-[12px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                      >
                        View <ArrowUpRight size={11} />
                      </Link>
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
