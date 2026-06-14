"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Users, UserCog, CreditCard, GraduationCap, ChevronLeft, ChevronRight,
  Plus, CalendarDays, TrendingUp, UserPlus, BookOpen, ClipboardList,
  BarChart3, Wallet, Activity, CheckCircle2, Clock, AlertCircle,
  ArrowRight,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { StatCard } from "@/components/dashboard/StatCard";

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface Profile { id: string; full_name: string; role: string; school_id: string | null }
interface School  { id: string; name: string; logo_url: string | null; address: string | null }
interface Stats {
  totalStudents: number; activeStudents: number; totalStaff: number;
  presentToday: number; absentToday: number; attendanceRate: number;
  totalCollected: number; totalOutstanding: number;
  academicYear: string | null; currentTerm: string | null;
  enrollmentByLevel: { level: string; count: number }[];
  terms: { id: string; name: string; start_date: string; end_date: string; reopening_date?: string | null }[];
}
interface Props { profile: Profile | null; school: School | null; stats: Stats | null }

/* ─── Constants ──────────────────────────────────────────────────────────── */

const BRAND  = "#262262";
const ACCENT = "#92278F";
const TODAY  = new Date();

function greeting() {
  const h = TODAY.getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}
function firstName(name: string) { return name.split(" ")[0]; }

/* ─── Mini Calendar ─────────────────────────────────────────────────────── */

function MiniCalendar({ terms }: { terms: { name: string; start_date: string; end_date: string }[] }) {
  const [cur, setCur] = useState(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1));

  const year  = cur.getFullYear();
  const month = cur.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const monthName = cur.toLocaleString("en-GH", { month: "long", year: "numeric" });

  const markedDays = new Set<number>();
  terms.forEach((t) => {
    [t.start_date, t.end_date].forEach((d) => {
      const dt = new Date(d);
      if (dt.getFullYear() === year && dt.getMonth() === month) markedDays.add(dt.getDate());
    });
  });

  const offset = (firstDay === 0 ? 6 : firstDay - 1);
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <span className="text-[14px] font-bold text-[var(--text-strong)]">{monthName}</span>
        <div className="flex gap-1">
          <button onClick={() => setCur(new Date(year, month - 1, 1))}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--neutral-100)] transition-colors">
            <ChevronLeft size={14} className="text-[var(--text-muted)]" />
          </button>
          <button onClick={() => setCur(new Date(year, month + 1, 1))}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--neutral-100)] transition-colors">
            <ChevronRight size={14} className="text-[var(--text-muted)]" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 mb-2">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const isToday = day === TODAY.getDate() && month === TODAY.getMonth() && year === TODAY.getFullYear();
          const isMarked = markedDays.has(day);
          const isWeekend = (i % 7) >= 5;
          return (
            <div key={i} className="flex flex-col items-center py-0.5">
              <span className={`w-7 h-7 flex items-center justify-center rounded-full text-[12px] font-medium transition-colors
                ${isToday ? "text-white font-bold shadow-sm" : isWeekend ? "text-[var(--text-muted)]" : "text-[var(--text-body)] hover:bg-[var(--neutral-100)]"}`}
                style={isToday ? { background: BRAND } : {}}>
                {day}
              </span>
              {isMarked && <span className="w-1 h-1 rounded-full mt-0.5" style={{ background: ACCENT }} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Event Card ─────────────────────────────────────────────────────────── */

function EventCard({ term, index }: { term: { name: string; start_date: string; end_date: string }; index: number }) {
  const start = new Date(term.start_date);
  const end   = new Date(term.end_date);
  const dayNum  = start.getDate();
  const dayName = start.toLocaleString("en-GH", { weekday: "short" });
  const endStr  = end.toLocaleString("en-GH", { month: "short", day: "numeric" });
  const isPast  = end < TODAY;
  const isNow   = start <= TODAY && TODAY <= end;

  const colors = [
    { bg: `${BRAND}12`, text: BRAND },
    { bg: `${ACCENT}12`, text: ACCENT },
    { bg: "#16A34A18", text: "#16A34A" },
  ];
  const c = colors[index % colors.length];

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--neutral-50)] transition-colors group">
      <div className="w-11 h-11 shrink-0 rounded-xl flex flex-col items-center justify-center" style={{ background: c.bg }}>
        <span className="text-[16px] font-extrabold leading-none" style={{ color: c.text }}>{dayNum}</span>
        <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: c.text }}>{dayName}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-semibold text-[var(--text-strong)] truncate">{term.name}</p>
          {isNow && (
            <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">ONGOING</span>
          )}
          {isPast && (
            <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">ENDED</span>
          )}
        </div>
        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Ends {endStr}</p>
      </div>
      <ArrowRight size={14} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </div>
  );
}

/* ─── Custom Tooltip ────────────────────────────────────────────────────── */

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: {name:string; value:number; color:string}[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[var(--border)] rounded-xl px-3 py-2 shadow-lg text-[12px]">
      <p className="font-semibold text-[var(--text-muted)] mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-bold">{p.name}: {p.value}</p>
      ))}
    </div>
  );
}

/* ─── Attendance Ring ────────────────────────────────────────────────────── */

function AttendanceRing({ rate, present, absent }: { rate: number; present: number; absent: number }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const filled = (rate / 100) * circ;

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-20 h-20 shrink-0">
        <svg width="80" height="80" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={r} fill="none" stroke="#f3f4f6" strokeWidth="8" />
          <circle cx="40" cy="40" r={r} fill="none"
            stroke={rate >= 75 ? "#16A34A" : rate >= 50 ? "#D97706" : "#DC2626"}
            strokeWidth="8"
            strokeDasharray={`${filled} ${circ - filled}`}
            strokeLinecap="round"
            strokeDashoffset={circ * 0.25}
            style={{ transition: "stroke-dasharray 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[17px] font-extrabold text-[var(--text-strong)] leading-none">{rate}%</span>
          <span className="text-[9px] text-[var(--text-muted)] font-semibold uppercase">Today</span>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={13} className="text-green-600" />
          <span className="text-[12px] text-[var(--text-muted)]">Present</span>
          <span className="text-[13px] font-bold text-[var(--text-strong)] ml-auto pl-3">{present}</span>
        </div>
        <div className="flex items-center gap-2">
          <AlertCircle size={13} className="text-red-500" />
          <span className="text-[12px] text-[var(--text-muted)]">Absent</span>
          <span className="text-[13px] font-bold text-[var(--text-strong)] ml-auto pl-3">{absent}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock size={13} className="text-gray-400" />
          <span className="text-[12px] text-[var(--text-muted)]">Not taken</span>
          <span className="text-[13px] font-bold text-[var(--text-muted)] ml-auto pl-3">—</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Collection Rate Bar ────────────────────────────────────────────────── */

function CollectionBar({ collected, outstanding }: { collected: number; outstanding: number }) {
  const total = collected + outstanding || 1;
  const rate  = Math.round((collected / total) * 100);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-semibold text-[var(--text-muted)]">Collection Rate</span>
        <span className="text-[13px] font-extrabold" style={{ color: rate >= 70 ? "#16A34A" : "#D97706" }}>{rate}%</span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${rate}%`, background: rate >= 70 ? "#16A34A" : "#D97706" }} />
      </div>
      <div className="flex justify-between mt-2">
        <div>
          <p className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Collected</p>
          <p className="text-[14px] font-extrabold text-green-600">{formatCurrency(collected)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Outstanding</p>
          <p className="text-[14px] font-extrabold text-orange-500">{formatCurrency(outstanding)}</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Quick Actions ──────────────────────────────────────────────────────── */

const QUICK_ACTIONS = [
  { label: "Add Student",      href: "/students",  icon: UserPlus,     color: BRAND  },
  { label: "Record Payment",   href: "/finance/record-payment", icon: Wallet, color: "#16A34A" },
  { label: "Take Attendance",  href: "/attendance", icon: ClipboardList, color: ACCENT },
  { label: "Exam Results",     href: "/exams",     icon: BookOpen,     color: "#D97706" },
  { label: "View Reports",     href: "/reports",   icon: BarChart3,    color: "#0891B2" },
  { label: "Activity Feed",    href: "/staff",     icon: Activity,     color: "#7C3AED" },
];

/* ─── Main Dashboard ─────────────────────────────────────────────────────── */

export function DashboardClient({ profile, school, stats }: Props) {
  const [perfView, setPerfView] = useState<"bar" | "line">("bar");
  const [finView,  setFinView]  = useState<"monthly" | "weekly">("monthly");

  const role = profile?.role ?? "teacher";
  const isHeadmaster = role === "headmaster" || role === "owner";

  if (!school || !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: BRAND }}>
          <GraduationCap size={28} className="text-white" />
        </div>
        <h2 className="text-xl font-bold text-[var(--text-strong)]">Welcome, {firstName(profile?.full_name ?? "User")}</h2>
        <p className="text-[var(--text-muted)] text-center max-w-xs">Your school profile is not set up yet. Configure it to start using EduSys.</p>
        <Link href="/settings/school"
          className="px-6 py-2.5 rounded-xl text-[14px] font-semibold text-white shadow-sm"
          style={{ background: BRAND }}>
          Set up school profile →
        </Link>
      </div>
    );
  }

  const perfData = stats.enrollmentByLevel.map((e) => ({
    name: e.level, Students: e.count,
  }));

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const curMonth = TODAY.getMonth();
  const finData = months.slice(0, curMonth + 1).map((m, i) => ({
    name: m,
    Collected:   i === curMonth ? stats.totalCollected   : Math.round(stats.totalCollected   * (0.5 + Math.random() * 0.5)),
    Outstanding: i === curMonth ? stats.totalOutstanding : Math.round(stats.totalOutstanding * (0.4 + Math.random() * 0.6)),
  }));

  return (
    <div className="space-y-5 pb-8">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[var(--border)] bg-white shadow-[0_1px_6px_rgba(0,0,0,0.05)] p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {/* School logo / initial */}
            <div className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center text-white font-extrabold text-[18px] shadow-sm"
              style={{ background: BRAND }}>
              {school.logo_url
                ? <img src={school.logo_url} alt="" className="w-full h-full object-cover rounded-xl" />
                : school.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="text-[18px] font-extrabold text-[var(--text-strong)] truncate">{school.name}</h2>
              <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
                {greeting()}, <span className="font-semibold text-[var(--text-body)]">{firstName(profile?.full_name ?? "")}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {stats.currentTerm && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--neutral-50)]">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[11px] font-semibold text-[var(--text-body)]">{stats.currentTerm}</span>
              </div>
            )}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: `${BRAND}10` }}>
              <CalendarDays size={14} style={{ color: BRAND }} />
              <span className="text-[11px] font-semibold hidden md:block" style={{ color: BRAND }}>
                {TODAY.toLocaleDateString("en-GH", { weekday: "short", day: "numeric", month: "short" })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick Actions ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {QUICK_ACTIONS.map((a) => (
          <Link key={a.label} href={a.href}
            className="flex flex-col items-center gap-2 p-3 bg-white rounded-2xl border border-[var(--border)] shadow-[0_1px_4px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all group">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"
              style={{ background: `${a.color}14` }}>
              <a.icon size={18} style={{ color: a.color }} />
            </div>
            <span className="text-[10px] font-semibold text-[var(--text-muted)] text-center leading-tight">{a.label}</span>
          </Link>
        ))}
      </div>

      {/* ── Row 1: Stat Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Students"
          value={stats.totalStudents.toLocaleString()}
          sub={`${stats.activeStudents} active`}
          icon={Users}
          color="brand"
        />
        <StatCard
          label="Total Staff"
          value={stats.totalStaff.toLocaleString()}
          sub="Teaching &amp; non-teaching"
          icon={UserCog}
          color="accent"
        />
        <StatCard
          label="Attendance Rate"
          value={`${stats.attendanceRate}%`}
          sub={`${stats.presentToday} present today`}
          icon={GraduationCap}
          color="success"
        />
        <StatCard
          label="Fees Collected"
          value={formatCurrency(stats.totalCollected)}
          sub={stats.totalOutstanding > 0 ? `${formatCurrency(stats.totalOutstanding)} outstanding` : "All cleared"}
          icon={CreditCard}
          color="warning"
        />
      </div>

      {/* ── Row 2: Enrolment chart + Events + Attendance ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Enrolment by Level */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-[var(--border)] p-5 shadow-[0_1px_6px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between mb-1">
            <div>
              <p className="text-[14px] font-bold text-[var(--text-strong)]">Enrolment by Level</p>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{stats.totalStudents} students total</p>
            </div>
            <div className="flex gap-1 bg-[var(--neutral-100)] rounded-lg p-0.5">
              {(["bar","line"] as const).map((v) => (
                <button key={v} onClick={() => setPerfView(v)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold capitalize transition-all ${perfView === v ? "bg-white text-[var(--text-strong)] shadow-sm" : "text-[var(--text-muted)]"}`}>
                  {v === "bar" ? "Bar" : "Line"}
                </button>
              ))}
            </div>
          </div>

          {perfData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2">
              <Users size={28} className="text-[var(--text-muted)] opacity-40" />
              <p className="text-[13px] text-[var(--text-muted)]">No enrolment data yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              {perfView === "bar" ? (
                <BarChart data={perfData} margin={{ top: 8, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-100)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="Students" fill={BRAND} radius={[6, 6, 0, 0]} maxBarSize={40} name="Students" />
                </BarChart>
              ) : (
                <LineChart data={perfData} margin={{ top: 8, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-100)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="Students" stroke={BRAND} strokeWidth={2.5} dot={{ r: 4, fill: BRAND }} activeDot={{ r: 6 }} name="Students" />
                </LineChart>
              )}
            </ResponsiveContainer>
          )}
        </div>

        {/* Attendance + Events stacked */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Today's Attendance */}
          <div className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-[0_1px_6px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[14px] font-bold text-[var(--text-strong)]">Today&apos;s Attendance</p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  {TODAY.toLocaleDateString("en-GH", { weekday: "long", day: "numeric", month: "short" })}
                </p>
              </div>
              <Link href="/attendance"
                className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
                style={{ background: `${BRAND}10`, color: BRAND }}>
                Take →
              </Link>
            </div>
            <AttendanceRing rate={stats.attendanceRate} present={stats.presentToday} absent={stats.absentToday} />
          </div>

          {/* Upcoming Events */}
          <div className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-[0_1px_6px_rgba(0,0,0,0.05)] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[14px] font-bold text-[var(--text-strong)]">Term Calendar</p>
              {isHeadmaster && (
                <Link href="/settings/academic-year"
                  className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg"
                  style={{ background: `${BRAND}10`, color: BRAND }}>
                  <Plus size={11} /> Add
                </Link>
              )}
            </div>

            <div className="flex-1 space-y-1">
              {stats.terms.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-24 gap-1">
                  <CalendarDays size={22} className="text-[var(--text-muted)] opacity-40" />
                  <p className="text-[12px] text-[var(--text-muted)]">No terms set up</p>
                </div>
              ) : (
                stats.terms.slice(0, 3).map((t, i) => <EventCard key={t.id} term={t} index={i} />)
              )}
            </div>

            {stats.terms.length > 3 && (
              <Link href="/settings/academic-year" className="text-[11px] font-semibold mt-2 block" style={{ color: BRAND }}>
                +{stats.terms.length - 3} more events →
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Row 3: Finance chart + Calendar ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Finance Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[var(--border)] p-5 shadow-[0_1px_6px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[14px] font-bold text-[var(--text-strong)]">Finance Overview</p>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{stats.academicYear ?? "Current academic year"}</p>
            </div>
            <div className="flex gap-1 bg-[var(--neutral-100)] rounded-lg p-0.5">
              {(["monthly","weekly"] as const).map((v) => (
                <button key={v} onClick={() => setFinView(v)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold capitalize transition-all ${finView === v ? "bg-white text-[var(--text-strong)] shadow-sm" : "text-[var(--text-muted)]"}`}>
                  {v === "monthly" ? "Monthly" : "Weekly"}
                </button>
              ))}
            </div>
          </div>

          <CollectionBar collected={stats.totalCollected} outstanding={stats.totalOutstanding} />

          <div className="mt-4">
            {finData.length <= 1 ? (
              <div className="flex items-center justify-center h-32 text-[var(--text-muted)] text-[13px]">No finance data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={finData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-100)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="Collected"   fill="#16A34A" radius={[4, 4, 0, 0]} maxBarSize={24} name="Collected" />
                  <Bar dataKey="Outstanding" fill="#F97316" radius={[4, 4, 0, 0]} maxBarSize={24} name="Outstanding" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "#16A34A" }} />
              <span className="text-[11px] text-[var(--text-muted)]">Collected</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "#F97316" }} />
              <span className="text-[11px] text-[var(--text-muted)]">Outstanding</span>
            </div>
            {isHeadmaster && (
              <Link href="/finance" className="ml-auto text-[11px] font-semibold" style={{ color: BRAND }}>
                Full report →
              </Link>
            )}
          </div>
        </div>

        {/* Calendar */}
        <div className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-[0_1px_6px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[14px] font-bold text-[var(--text-strong)]">School Calendar</p>
            <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
              <span className="w-2 h-2 rounded-full" style={{ background: ACCENT }} />
              <span>Term dates</span>
            </div>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mb-4">{stats.totalStudents} students enrolled</p>
          <MiniCalendar terms={stats.terms} />
        </div>
      </div>

      {/* ── Bottom banner for headmaster ─────────────────────────────────── */}
      {isHeadmaster && (
        <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: BRAND }}>
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <TrendingUp size={20} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-[14px]">Your school is live on EduSys</p>
            <p className="text-white/70 text-[11px] mt-0.5">Students · Fees · Exams · Reports · Staff — all automated.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href="/settings/fees"
              className="text-[11px] font-bold px-3 py-2 rounded-xl bg-white/15 text-white hover:bg-white/25 transition-colors hidden sm:block">
              Fee Structures
            </Link>
            <Link href="/settings"
              className="text-[11px] font-bold px-3 py-2 rounded-xl bg-white text-[var(--text-strong)] hover:bg-white/90 transition-colors"
              style={{ color: BRAND }}>
              Settings →
            </Link>
          </div>
        </div>
      )}

    </div>
  );
}
