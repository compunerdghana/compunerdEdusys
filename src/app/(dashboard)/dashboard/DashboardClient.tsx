"use client";

import {
  Users, UserCheck, UserX, CreditCard, BookOpen, Calendar,
  UserPlus, ClipboardList, DollarSign, BarChart2, Settings,
  FileText, Bell, GraduationCap, Building2,
} from "lucide-react";
import {
  BarChart, Bar,
  ResponsiveContainer, XAxis, YAxis, Tooltip,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/dashboard/StatCard";
import { HealthScore } from "@/components/dashboard/HealthScore";
import { SyncCenter } from "@/components/dashboard/SyncCenter";
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
  enrollmentByLevel: { level: string; count: number }[];
}

interface Props {
  profile: Profile | null;
  school: School | null;
  stats: Stats | null;
}

const today = new Intl.DateTimeFormat("en-GH", {
  weekday: "long", day: "numeric", month: "long", year: "numeric",
}).format(new Date());

const weeklyAttendance = [
  { day: "Mon", present: 0, absent: 0 },
  { day: "Tue", present: 0, absent: 0 },
  { day: "Wed", present: 0, absent: 0 },
  { day: "Thu", present: 0, absent: 0 },
  { day: "Fri", present: 0, absent: 0 },
];

export function DashboardClient({ profile, school, stats }: Props) {
  const role = profile?.role ?? "teacher";
  const isHeadmaster = role === "headmaster" || role === "owner";
  const isAccountant = role === "accountant";
  const isTeacher = role === "teacher";

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
      <div className="space-y-6">
        <DashboardHeader schoolName="Welcome" userName={profile?.full_name} date={today} />
        <div className="bg-white border border-[var(--border)] rounded-2xl p-6 shadow-sm">
          <p className="text-[15px] text-[var(--text-muted)]">
            Your school is not set up yet. <a href="/settings/school" className="text-[var(--brand)] font-semibold hover:underline">Configure your school profile</a> to get started.
          </p>
        </div>
        <SyncCenter />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <DashboardHeader
        schoolName={school.name}
        userName={profile?.full_name}
        date={today}
        academicYear={stats.academicYear}
        currentTerm={stats.currentTerm}
      />

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

                <Bar dataKey="present" name="Present" fill="var(--green-600)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="absent" name="Absent" fill="var(--red-100)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Enrolment by level */}
          <Card>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-4">Enrolment by level</p>
            {stats.enrollmentByLevel.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] py-4 text-center">No enrolled students yet.</p>
            ) : (
            <ResponsiveContainer width="100%" height={Math.max(160, stats.enrollmentByLevel.length * 44)}>
              <BarChart data={stats.enrollmentByLevel} layout="vertical" barSize={14}>
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                <YAxis type="category" dataKey="level" axisLine={false} tickLine={false} width={70} tick={{ fontSize: 12, fill: "var(--text-muted)" }} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", fontSize: 12 }}
                  cursor={{ fill: "var(--neutral-50)" }}
                />
                <Bar dataKey="count" name="Students" fill="var(--brand)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
            )}
          </Card>

        </div>

        {/* Right col (1/3) */}
        <div className="space-y-6">
          {/* Health score */}
          {isHeadmaster && <HealthScore score={healthScore} breakdown={healthBreakdown} />}

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
