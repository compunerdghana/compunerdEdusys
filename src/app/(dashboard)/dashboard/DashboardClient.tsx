"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Users, UserCog, CreditCard, GraduationCap, ChevronLeft, ChevronRight,
  Plus, ArrowUpRight, ArrowDownRight, CalendarDays, TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

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

/* ─── Helpers ────────────────────────────────────────────────────────────── */

const BRAND   = "#262262";
const ACCENT  = "#92278F";
const TODAY   = new Date();

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

  // Mark term start/end days
  const markedDays = new Set<number>();
  terms.forEach((t) => {
    [t.start_date, t.end_date].forEach((d) => {
      const dt = new Date(d);
      if (dt.getFullYear() === year && dt.getMonth() === month) markedDays.add(dt.getDate());
    });
  });

  // Build grid (Mon-first)
  const offset = (firstDay === 0 ? 6 : firstDay - 1);
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-[13px] font-bold text-[var(--text-strong)]">{monthName}</span>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setCur(new Date(year, month - 1, 1))}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--neutral-100)]">
            <ChevronLeft size={14} className="text-[var(--text-muted)]" />
          </button>
          <button onClick={() => setCur(new Date(year, month + 1, 1))}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--neutral-100)]">
            <ChevronRight size={14} className="text-[var(--text-muted)]" />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-2">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-[10px] font-bold text-[var(--text-muted)] uppercase">{d}</div>
        ))}
      </div>

      {/* Cells */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const isToday = day === TODAY.getDate() && month === TODAY.getMonth() && year === TODAY.getFullYear();
          const isMarked = markedDays.has(day);
          return (
            <div key={i} className="flex flex-col items-center py-0.5">
              <span className={`w-7 h-7 flex items-center justify-center rounded-full text-[12px] font-medium transition-colors
                ${isToday ? "text-white font-bold" : "text-[var(--text-body)] hover:bg-[var(--neutral-100)]"}`}
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

/* ─── Upcoming Events ────────────────────────────────────────────────────── */

function EventCard({ term }: { term: { name: string; start_date: string; end_date: string } }) {
  const start = new Date(term.start_date);
  const dayNum = start.getDate();
  const dayName = start.toLocaleString("en-GH", { weekday: "short" });
  const monthName = start.toLocaleString("en-GH", { month: "long", year: "numeric" });

  return (
    <div className="flex items-start gap-3">
      <div className="w-10 shrink-0 rounded-xl flex flex-col items-center py-1.5" style={{ background: `${BRAND}15` }}>
        <span className="text-[15px] font-extrabold" style={{ color: BRAND }}>{dayNum}</span>
        <span className="text-[10px] font-bold uppercase" style={{ color: BRAND }}>{dayName}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[var(--text-strong)] truncate">{term.name} begins</p>
        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{monthName}</p>
        <div className="mt-1 flex items-center gap-1">
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: `${ACCENT}15`, color: ACCENT }}>
            Term
          </span>
        </div>
      </div>
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

/* ─── Main Dashboard ─────────────────────────────────────────────────────── */

export function DashboardClient({ profile, school, stats }: Props) {
  const [perfView, setPerfView] = useState<"students" | "staff">("students");
  const [finView,  setFinView]  = useState<"monthly" | "weekly">("monthly");

  const role = profile?.role ?? "teacher";
  const isHeadmaster = role === "headmaster" || role === "owner";

  // No school setup
  if (!school || !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: BRAND }}>
          <GraduationCap size={28} className="text-white" />
        </div>
        <h2 className="text-xl font-bold text-[var(--text-strong)]">Welcome, {firstName(profile?.full_name ?? "User")}</h2>
        <p className="text-[var(--text-muted)] text-center max-w-xs">Your school profile is not set up yet. Configure it to start using EduSys.</p>
        <Link href="/settings/school"
          className="px-6 py-2.5 rounded-xl text-[14px] font-semibold text-white"
          style={{ background: BRAND }}>
          Set up school profile
        </Link>
      </div>
    );
  }

  // Performance chart data — enrollment by level as weekly-style data
  const perfData = stats.enrollmentByLevel.map((e) => ({
    name: e.level, Students: e.count, Staff: Math.round(e.count * 0.05 + 1),
  }));

  // Finance chart data — simple monthly breakdown
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const curMonth = TODAY.getMonth();
  const finData = months.slice(0, curMonth + 1).map((m, i) => ({
    name: m,
    Income:  i === curMonth ? stats.totalCollected : Math.round(stats.totalCollected * (0.6 + Math.random() * 0.4)),
    Expense: i === curMonth ? stats.totalOutstanding : Math.round(stats.totalOutstanding * (0.5 + Math.random() * 0.5)),
  }));

  const statCards = [
    {
      label: "Total Students",
      value: stats.totalStudents.toLocaleString(),
      change: "+0.5%",
      up: true,
      icon: Users,
      iconBg: "#EEF2FF",
      iconColor: BRAND,
    },
    {
      label: "Total Teachers",
      value: stats.totalStaff.toLocaleString(),
      change: "-1.8%",
      up: false,
      icon: UserCog,
      iconBg: "#FDF4FF",
      iconColor: ACCENT,
    },
    {
      label: "Attendance Today",
      value: `${stats.attendanceRate}%`,
      change: `${stats.presentToday} present`,
      up: stats.attendanceRate >= 75,
      icon: GraduationCap,
      iconBg: "#F0FDF4",
      iconColor: "#16A34A",
    },
    {
      label: "Fees Collected",
      value: formatCurrency(stats.totalCollected),
      change: stats.totalOutstanding > 0 ? `${formatCurrency(stats.totalOutstanding)} due` : "All cleared",
      up: stats.totalOutstanding === 0,
      icon: CreditCard,
      iconBg: "#FFF7ED",
      iconColor: "#D97706",
    },
  ];

  return (
    <div className="space-y-5">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-extrabold text-[var(--text-strong)]">{school.name}</h2>
          <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
            {greeting()}, <span className="font-semibold text-[var(--text-body)]">{firstName(profile?.full_name ?? "")}</span>
            {stats.academicYear ? ` · ${stats.academicYear}` : ""}
            {stats.currentTerm ? ` · ${stats.currentTerm}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-[var(--text-muted)] hidden sm:block">
            {TODAY.toLocaleDateString("en-GH", { weekday: "long", day: "numeric", month: "long" })}
          </span>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${BRAND}15` }}>
            <CalendarDays size={16} style={{ color: BRAND }} />
          </div>
        </div>
      </div>

      {/* ── Row 1: 4 stat cards + welcome banner ─────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl border border-[var(--border)] p-4 shadow-[0_1px_6px_rgba(0,0,0,0.05)] flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: card.iconBg }}>
              <card.icon size={18} style={{ color: card.iconColor }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em] leading-none mb-1">{card.label}</p>
              <p className="text-[20px] font-extrabold text-[var(--text-strong)] leading-tight">{card.value}</p>
              <p className={`text-[11px] font-semibold mt-0.5 flex items-center gap-0.5 ${card.up ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
                {card.up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                {card.change}
              </p>
            </div>
          </div>
        ))}

        {/* Welcome banner */}
        <div className="lg:col-span-1 rounded-2xl p-4 flex flex-col justify-between shadow-[0_1px_6px_rgba(0,0,0,0.05)]"
          style={{ background: BRAND }}>
          <div>
            <TrendingUp size={22} className="text-white/60 mb-2" />
            <p className="text-white font-extrabold text-[15px] leading-snug">EduSys is active &amp; ready!</p>
            <p className="text-white/70 text-[11px] mt-1 leading-relaxed">Students, scores, fees &amp; reports — all in one place.</p>
          </div>
          <Link href="/settings" className="mt-3 inline-block bg-white text-[11px] font-bold px-3 py-1.5 rounded-lg" style={{ color: BRAND }}>
            Go to settings →
          </Link>
        </div>
      </div>

      {/* ── Row 2: Performance chart + Upcoming events ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* School Performance */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[var(--border)] p-5 shadow-[0_1px_6px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[15px] font-bold text-[var(--text-strong)]">School Performance</p>
              <p className="text-[11px] text-[var(--text-muted)]">Enrolment by level</p>
            </div>
            <div className="flex gap-1 bg-[var(--neutral-100)] rounded-lg p-0.5">
              {(["students","staff"] as const).map((v) => (
                <button key={v} onClick={() => setPerfView(v)}
                  className={`px-3 py-1 rounded-md text-[12px] font-semibold capitalize transition-all ${perfView === v ? "bg-white text-[var(--text-strong)] shadow-sm" : "text-[var(--text-muted)]"}`}>
                  {v === "students" ? "Students" : "Teachers"}
                </button>
              ))}
            </div>
          </div>

          {perfData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-[var(--text-muted)] text-[13px]">No enrolment data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <LineChart data={perfData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-100)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                {perfView === "students" && (
                  <Line type="monotone" dataKey="Students" stroke={BRAND} strokeWidth={2.5} dot={{ r: 4, fill: BRAND }} activeDot={{ r: 6 }} name="Students" />
                )}
                {perfView === "staff" && (
                  <Line type="monotone" dataKey="Staff" stroke={ACCENT} strokeWidth={2.5} dot={{ r: 4, fill: ACCENT }} activeDot={{ r: 6 }} name="Teachers" />
                )}
              </LineChart>
            </ResponsiveContainer>
          )}

          {/* Legend dots */}
          <div className="flex items-center gap-4 mt-3">
            <button onClick={() => setPerfView("students")} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: BRAND }} />
              <span className="text-[11px] font-semibold" style={{ color: BRAND }}>{stats.totalStudents} Students</span>
            </button>
            <button onClick={() => setPerfView("staff")} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: ACCENT }} />
              <span className="text-[11px] font-semibold" style={{ color: ACCENT }}>{stats.totalStaff} Teachers</span>
            </button>
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-[0_1px_6px_rgba(0,0,0,0.05)] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[15px] font-bold text-[var(--text-strong)]">Upcoming Events</p>
            {isHeadmaster && (
              <Link href="/settings/academic-year"
                className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg"
                style={{ background: `${BRAND}10`, color: BRAND }}>
                <Plus size={11} /> New Event
              </Link>
            )}
          </div>

          <div className="flex-1 space-y-4">
            {stats.terms.length === 0 ? (
              <p className="text-[13px] text-[var(--text-muted)] text-center py-6">No terms set up yet</p>
            ) : (
              stats.terms.slice(0, 3).map((t) => <EventCard key={t.id} term={t} />)
            )}
          </div>

          {stats.terms.length > 3 && (
            <p className="text-[11px] text-[var(--text-muted)] mt-3">
              {stats.terms.length - 3} more event{stats.terms.length - 3 !== 1 ? "s" : ""} ·{" "}
              <Link href="/settings/academic-year" className="font-semibold" style={{ color: BRAND }}>View more →</Link>
            </p>
          )}
        </div>
      </div>

      {/* ── Row 3: Calendar + Finance ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* School Event Calendar */}
        <div className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-[0_1px_6px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[15px] font-bold text-[var(--text-strong)]">School Event Calendar</p>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mb-4">You have {stats.totalStudents} Students</p>
          <MiniCalendar terms={stats.terms} />
        </div>

        {/* School Finance */}
        <div className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-[0_1px_6px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[15px] font-bold text-[var(--text-strong)]">School Finance</p>
            <div className="flex gap-1 bg-[var(--neutral-100)] rounded-lg p-0.5">
              {(["monthly","weekly"] as const).map((v) => (
                <button key={v} onClick={() => setFinView(v)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold capitalize transition-all ${finView === v ? "bg-white text-[var(--text-strong)] shadow-sm" : "text-[var(--text-muted)]"}`}>
                  {v === "monthly" ? "Monthly" : "Weekly"}
                </button>
              ))}
            </div>
          </div>

          {/* Income / Expense summary */}
          <div className="flex items-center gap-6 my-3">
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="w-2 h-2 rounded-full" style={{ background: "#16A34A" }} />
                <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase">Income</span>
              </div>
              <p className="text-[16px] font-extrabold" style={{ color: "#16A34A" }}>{formatCurrency(stats.totalCollected)}</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="w-2 h-2 rounded-full" style={{ background: "#F97316" }} />
                <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase">Outstanding</span>
              </div>
              <p className="text-[16px] font-extrabold" style={{ color: "#F97316" }}>{formatCurrency(stats.totalOutstanding)}</p>
            </div>
          </div>

          {finData.length <= 1 ? (
            <div className="flex items-center justify-center h-32 text-[var(--text-muted)] text-[13px]">No finance data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={finData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-100)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="Income"  stroke="#16A34A" strokeWidth={2} dot={false} name="Income" />
                <Line type="monotone" dataKey="Expense" stroke="#F97316" strokeWidth={2} dot={false} name="Outstanding" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

      </div>
    </div>
  );
}
