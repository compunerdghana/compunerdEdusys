"use client";

import {
  Users, UserCheck, UserX, CreditCard, BookOpen, Calendar,
  UserPlus, ClipboardList, DollarSign, BarChart2, Settings,
  FileText, Bell, GraduationCap, Building2, PlusCircle,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip, Legend,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/dashboard/StatCard";
import { HealthScore } from "@/components/dashboard/HealthScore";
import { SyncCenter } from "@/components/dashboard/SyncCenter";
import { SetupProgress } from "@/components/dashboard/SetupProgress";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { formatCurrency } from "@/lib/utils";

interface Profile {
  id: string;
  full_name: string;
  role: string;
  school_id: string | null;
  username: string;
}

interface School {
  id: string;
  name: string;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
}

interface Stats {
  totalStudents: number;
  activeStudents: number;
  totalStaff: number;
  presentToday: number;
  absentToday: number;
  attendanceRate: number;
  totalCollected: number;
  totalOutstanding: number;
  academicYear: string | null;
  currentTerm: string | null;
}

interface Props {
  profile: Profile | null;
  school: School | null;
  stats: Stats | null;
}

const today = new Intl.DateTimeFormat("en-GH", {
  weekday: "long", day: "numeric", month: "long", year: "numeric",
}).format(new Date());

// Sample chart data — will be replaced by real data when tables are populated
const weeklyAttendance = [
  { day: "Mon", present: 82, absent: 8 },
  { day: "Tue", present: 87, absent: 5 },
  { day: "Wed", present: 79, absent: 11 },
  { day: "Thu", present: 90, absent: 4 },
  { day: "Fri", present: 85, absent: 7 },
];

const enrolmentByLevel = [
  { level: "Day Care", count: 24 },
  { level: "Nursery", count: 38 },
  { level: "KG", count: 56 },
  { level: "Primary", count: 142 },
  { level: "JHS", count: 78 },
];

const genderData = [
  { name: "Male", value: 180, color: "#453a95" },
  { name: "Female", value: 158, color: "#92278f" },
];

const feeCollectionTrend = [
  { month: "Jan", collected: 12400 },
  { month: "Feb", collected: 18200 },
  { month: "Mar", collected: 22800 },
  { month: "Apr", collected: 15600 },
  { month: "May", collected: 27100 },
  { month: "Jun", collected: 19300 },
];

export function DashboardClient({ profile, school, stats }: Props) {
  const role = profile?.role ?? "teacher";
  const isHeadmaster = role === "headmaster" || role === "owner";
  const isAccountant = role === "accountant";
  const isTeacher = role === "teacher";

  // Setup steps (headmaster only)
  const setupSteps = [
    { label: "School profile configured", done: !!school, href: "/settings/school" },
    { label: "Academic year & terms set", done: !!stats?.academicYear, href: "/settings/academic-year" },
    { label: "Classes created", done: false, href: "/settings/classes" },
    { label: "Subjects assigned", done: false, href: "/settings/subjects" },
    { label: "Fee structure defined", done: false, href: "/settings/fees" },
    { label: "First student enrolled", done: (stats?.totalStudents ?? 0) > 0, href: "/students/new" },
  ];

  const setupDone = setupSteps.every((s) => s.done);
  const showSetup = isHeadmaster && !setupDone;

  // Alerts
  const alerts = [];
  if (stats && stats.attendanceRate < 75 && stats.presentToday > 0) {
    alerts.push({
      id: "att-low",
      level: "red" as const,
      title: "Low attendance today",
      message: `Only ${stats.attendanceRate}% of students are present today. Check class registers.`,
    });
  }
  if (stats && stats.totalOutstanding > 5000) {
    alerts.push({
      id: "fees-outstanding",
      level: "yellow" as const,
      title: "Outstanding fees",
      message: `${formatCurrency(stats.totalOutstanding)} in unpaid fees this term.`,
    });
  }

  // Health score
  const healthScore = stats
    ? Math.round(
        (stats.attendanceRate * 0.4) +
        ((stats.totalStudents > 0 ? 100 : 20) * 0.2) +
        ((stats.academicYear ? 100 : 10) * 0.2) +
        (Math.min(100, (stats.totalCollected / Math.max(1, stats.totalCollected + stats.totalOutstanding)) * 100) * 0.2)
      )
    : 20;

  const healthBreakdown = [
    { label: "Attendance", value: stats?.attendanceRate ?? 0, color: "var(--success)" },
    { label: "Enrolment", value: stats ? Math.min(100, stats.totalStudents > 0 ? 80 : 10) : 0, color: "var(--brand)" },
    { label: "Fee collection", value: stats ? Math.round((stats.totalCollected / Math.max(1, stats.totalCollected + stats.totalOutstanding)) * 100) : 0, color: "var(--accent)" },
    { label: "Academic setup", value: stats?.academicYear ? 100 : 0, color: "var(--amber-500)" },
  ];

  // Quick actions by role
  const allActions = [
    { label: "Admit student", href: "/students/new", icon: UserPlus },
    { label: "Take attendance", href: "/attendance", icon: ClipboardList },
    { label: "Record payment", href: "/finance/payments/new", icon: DollarSign },
    { label: "Enter scores", href: "/exams/scores", icon: BarChart2 },
    { label: "View reports", href: "/exams/reports", icon: FileText },
    { label: "Send message", href: "/communications", icon: Bell },
    { label: "Manage staff", href: "/staff", icon: Users },
    { label: "Fee structure", href: "/settings/fees", icon: CreditCard },
    { label: "Academic year", href: "/settings/academic-year", icon: Calendar },
    { label: "Classes", href: "/settings/classes", icon: BookOpen },
    { label: "School settings", href: "/settings/school", icon: Settings },
    { label: "Reports", href: "/reports", icon: GraduationCap },
  ];

  const actions = isHeadmaster
    ? allActions
    : isAccountant
    ? allActions.filter((a) => ["Record payment", "Fee structure", "View reports", "Send message"].includes(a.label))
    : allActions.filter((a) => ["Take attendance", "Enter scores", "View reports"].includes(a.label));

  // No school linked
  if (!school || !stats) {
    return (
      <div className="space-y-6 max-w-4xl">
        <DashboardHeader schoolName="Compunerd EduSys" userName={profile?.full_name} date={today} />
        <SetupProgress
          schoolName=""
          steps={[
            { label: "School profile configured", done: false, href: "/settings/school" },
            { label: "Academic year & terms set", done: false, href: "/settings/academic-year" },
            { label: "Classes created", done: false, href: "/settings/classes" },
            { label: "Fee structure defined", done: false, href: "/settings/fees" },
            { label: "First student enrolled", done: false, href: "/students/new" },
          ]}
        />
        <SyncCenter />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <DashboardHeader
        schoolName={school.name}
        userName={profile?.full_name}
        date={today}
        academicYear={stats.academicYear}
        currentTerm={stats.currentTerm}
      />

      {/* Setup progress banner */}
      {showSetup && (
        <SetupProgress schoolName={school.name} steps={setupSteps} />
      )}

      {/* Alerts */}
      {alerts.length > 0 && <AlertsPanel alerts={alerts} />}

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard
          label="Total students"
          value={stats.totalStudents.toLocaleString()}
          sub={`${stats.activeStudents} active`}
          icon={Users}
          color="brand"
        />
        <StatCard
          label="Present today"
          value={stats.presentToday.toLocaleString()}
          sub={`${stats.attendanceRate}% attendance`}
          icon={UserCheck}
          color="success"
          trend={{ value: stats.attendanceRate - 85, label: "vs avg" }}
        />
        <StatCard
          label="Absent today"
          value={stats.absentToday.toLocaleString()}
          icon={UserX}
          color={stats.absentToday > 10 ? "danger" : "warning"}
        />
        {(isHeadmaster || isAccountant) && (
          <>
            <StatCard
              label="Fees collected"
              value={formatCurrency(stats.totalCollected)}
              icon={DollarSign}
              color="success"
            />
            <StatCard
              label="Outstanding"
              value={formatCurrency(stats.totalOutstanding)}
              icon={CreditCard}
              color={stats.totalOutstanding > 5000 ? "danger" : "warning"}
            />
          </>
        )}
        {isTeacher && (
          <StatCard
            label="Total staff"
            value={stats.totalStaff.toLocaleString()}
            icon={Building2}
            color="info"
          />
        )}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left col (2/3) */}
        <div className="xl:col-span-2 space-y-6">

          {/* Attendance chart */}
          <Card>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-4">Weekly attendance</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyAttendance} barSize={18} barGap={4}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--text-muted)" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", fontSize: 12 }}
                  cursor={{ fill: "var(--neutral-50)" }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="present" name="Present" fill="var(--green-600)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="absent" name="Absent" fill="var(--red-100)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Enrolment by level */}
          <Card>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-4">Enrolment by level</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={enrolmentByLevel} layout="vertical" barSize={14}>
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                <YAxis type="category" dataKey="level" axisLine={false} tickLine={false} width={70} tick={{ fontSize: 12, fill: "var(--text-muted)" }} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", fontSize: 12 }}
                  cursor={{ fill: "var(--neutral-50)" }}
                />
                <Bar dataKey="count" name="Students" fill="var(--brand)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Fee collection trend — accountant/headmaster only */}
          {(isHeadmaster || isAccountant) && (
            <Card>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-4">Fee collection — this year</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={feeCollectionTrend}>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--text-muted)" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--text-muted)" }} tickFormatter={(v) => `GH₵${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", fontSize: 12 }}
                    formatter={(v) => [formatCurrency(Number(v)), "Collected"]}
                  />
                  <Line type="monotone" dataKey="collected" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 4, fill: "var(--accent)" }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>

        {/* Right col (1/3) */}
        <div className="space-y-6">
          {/* Health score */}
          {isHeadmaster && <HealthScore score={healthScore} breakdown={healthBreakdown} />}

          {/* Gender breakdown */}
          <Card>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-4">Gender breakdown</p>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={genderData} cx="50%" cy="50%" innerRadius={32} outerRadius={52} dataKey="value" strokeWidth={0}>
                    {genderData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3 flex-1">
                {genderData.map((g) => (
                  <div key={g.name} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: g.color }} />
                    <span className="text-xs text-[var(--text-muted)] flex-1">{g.name}</span>
                    <span className="text-sm font-bold font-mono text-[var(--text-strong)]">{g.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Sync center */}
          <SyncCenter />

          {/* Quick actions */}
          <QuickActions actions={actions.slice(0, 9)} role={role} />
        </div>
      </div>
    </div>
  );
}

function DashboardHeader({
  schoolName,
  userName,
  date,
  academicYear,
  currentTerm,
}: {
  schoolName: string;
  userName?: string | null;
  date: string;
  academicYear?: string | null;
  currentTerm?: string | null;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <div className="flex items-center gap-2 mb-0.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--gradient-brand)" }}>
            <GraduationCap size={14} className="text-white" />
          </div>
          <h2 className="text-xl font-extrabold text-[var(--text-strong)]">{schoolName}</h2>
        </div>
        <p className="text-sm text-[var(--text-muted)]">
          {date}{academicYear ? ` · ${academicYear}` : ""}{currentTerm ? ` · ${currentTerm}` : ""}
        </p>
      </div>
      {userName && (
        <p className="text-sm text-[var(--text-muted)]">
          Good {getGreeting()}, <span className="font-semibold text-[var(--text-body)]">{firstName(userName)}</span>
        </p>
      )}
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
}

function firstName(name: string) {
  return name.split(" ")[0];
}
