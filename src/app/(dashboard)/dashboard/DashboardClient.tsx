"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users, UserCog, CreditCard, GraduationCap, ChevronLeft, ChevronRight,
  Plus, CalendarDays, TrendingUp, UserPlus, BookOpen, ClipboardList,
  BarChart3, Wallet, Activity, CheckCircle2, Clock, AlertCircle,
  ArrowRight, Bell, Library, Bus, Bed, ShieldCheck, Check
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { StatCard } from "@/components/dashboard/StatCard";

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface Profile { id: string; full_name: string; role: string; school_id: string | null }
interface School  { id: string; name: string; logo_url: string | null; address: string | null }
interface SchoolEvent { id: string; title: string; event_date: string; color: string | null; description: string | null; all_day?: boolean | null; start_time?: string | null; end_time?: string | null; }
interface Stats {
  totalStudents: number; activeStudents: number; totalStaff: number;
  presentToday: number; absentToday: number; attendanceRate: number;
  totalCollected: number; totalOutstanding: number;
  academicYear: string | null; currentTerm: string | null;
  enrollmentByLevel: { level: string; count: number }[];
  terms: { id: string; name: string; start_date: string; end_date: string; reopening_date?: string | null }[];
  events: SchoolEvent[];
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

const DAILY_QUOTES = [
  { text: "The fear of the LORD is the beginning of wisdom.", ref: "Proverbs 9:10" },
  { text: "I can do all things through Christ who strengthens me.", ref: "Philippians 4:13" },
  { text: "Train up a child in the way he should go; even when he is old he will not depart from it.", ref: "Proverbs 22:6" },
  { text: "Education is the most powerful weapon which you can use to change the world.", ref: "Nelson Mandela" },
  { text: "For I know the plans I have for you, declares the LORD, plans to prosper you and not to harm you.", ref: "Jeremiah 29:11" },
  { text: "The function of education is to teach one to think intensively and to think critically.", ref: "Martin Luther King Jr." },
  { text: "Commit to the LORD whatever you do, and he will establish your plans.", ref: "Proverbs 16:3" },
  { text: "The mediocre teacher tells. The good teacher explains. The great teacher inspires.", ref: "William Arthur Ward" },
  { text: "Do not be anxious about anything, but in every situation present your requests to God.", ref: "Philippians 4:6" },
  { text: "Knowledge is power. Information is liberating. Education is the premise of progress.", ref: "Kofi Annan" },
  { text: "Trust in the LORD with all your heart and lean not on your own understanding.", ref: "Proverbs 3:5" },
  { text: "The secret of getting ahead is getting started.", ref: "Mark Twain" },
  { text: "Be strong and courageous. Do not be afraid; do not be discouraged, for the LORD your God is with you.", ref: "Joshua 1:9" },
  { text: "An investment in knowledge pays the best interest.", ref: "Benjamin Franklin" },
];

function getDailyQuote() {
  const dayOfYear = Math.floor((TODAY.getTime() - new Date(TODAY.getFullYear(), 0, 0).getTime()) / 86400000);
  return DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length];
}

/* ─── Mini Calendar ─────────────────────────────────────────────────────── */

function MiniCalendar({ terms, events }: {
  terms: { name: string; start_date: string; end_date: string }[];
  events: SchoolEvent[];
}) {
  const [cur, setCur] = useState(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1));
  const [tooltip, setTooltip] = useState<{ day: number; titles: string[] } | null>(null);

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

  // Map events by day for this month
  const eventsByDay = new Map<number, SchoolEvent[]>();
  events.forEach(ev => {
    const dt = new Date(ev.event_date);
    if (dt.getFullYear() === year && dt.getMonth() === month) {
      const d = dt.getDate();
      if (!eventsByDay.has(d)) eventsByDay.set(d, []);
      eventsByDay.get(d)!.push(ev);
    }
  });

  const offset = (firstDay === 0 ? 6 : firstDay - 1);
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <span className="text-[14px] font-bold text-[var(--text-strong)]">{monthName}</span>
        <div className="flex gap-1">
          <button onClick={() => { setCur(new Date(year, month - 1, 1)); setTooltip(null); }}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--neutral-100)] transition-colors">
            <ChevronLeft size={14} className="text-[var(--text-muted)]" />
          </button>
          <button onClick={() => { setCur(new Date(year, month + 1, 1)); setTooltip(null); }}
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
          const dayEvents = eventsByDay.get(day) ?? [];
          const hasEvents = dayEvents.length > 0;
          const isSelected = tooltip?.day === day;

          return (
            <div key={i} className="flex flex-col items-center py-0.5 relative">
              <button
                onClick={() => hasEvents ? setTooltip(isSelected ? null : { day, titles: dayEvents.map(e => e.title) }) : undefined}
                className={`w-7 h-7 flex items-center justify-center rounded-full text-[12px] font-medium transition-colors
                  ${isToday ? "text-white font-bold shadow-sm" : isWeekend ? "text-[var(--text-muted)]" : "text-[var(--text-body)] hover:bg-[var(--neutral-100)]"}
                  ${hasEvents && !isToday ? "ring-2 ring-offset-1" : ""}`}
                style={{
                  ...(isToday ? { background: BRAND } : {}),
                  ...(hasEvents && !isToday ? { ringColor: dayEvents[0].color ?? ACCENT } : {}),
                }}>
                {day}
              </button>
              {/* Event dots */}
              {hasEvents && (
                <div className="flex gap-0.5 mt-0.5">
                  {dayEvents.slice(0, 3).map((ev, ei) => (
                    <span key={ei} className="w-1 h-1 rounded-full" style={{ background: ev.color ?? ACCENT }} />
                  ))}
                </div>
              )}
              {isMarked && !hasEvents && <span className="w-1 h-1 rounded-full mt-0.5" style={{ background: ACCENT }} />}
              {/* Tooltip popup */}
              {isSelected && (
                <div className="absolute z-20 bottom-full mb-1 left-1/2 -translate-x-1/2 bg-[#1e1e2e] text-white rounded-lg shadow-xl p-2 min-w-[130px] max-w-[200px]">
                  {dayEvents.map((ev, ei) => (
                    <div key={ei} className="flex items-start gap-1.5 text-[11px] leading-snug py-0.5">
                      <span className="w-2 h-2 rounded-full shrink-0 mt-0.5" style={{ background: ev.color ?? ACCENT }} />
                      <span>{ev.title}</span>
                    </div>
                  ))}
                  <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-[#1e1e2e] rotate-45" />
                </div>
              )}
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

/* ─── Upcoming Events ────────────────────────────────────────────────────── */

function useCountdown(events: SchoolEvent[]) {
  // Returns a stable map of id → daysLeft (computed once per render, stable on server)
  const map: Record<string, number> = {};
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  for (const e of events) {
    const d = new Date(e.event_date);
    d.setHours(0, 0, 0, 0);
    map[e.id] = Math.round((d.getTime() - now.getTime()) / 86400000);
  }
  return map;
}

function UpcomingEventsWidget({ events }: { events: SchoolEvent[] }) {
  const [localEvents, setLocalEvents] = useState<SchoolEvent[]>(events);

  useEffect(() => {
    // Persist for offline use
    if (events.length > 0) {
      try { localStorage.setItem("edusys_upcoming_events", JSON.stringify(events)); } catch {}
    } else {
      // Load from cache if offline/no events returned
      try {
        const cached = localStorage.getItem("edusys_upcoming_events");
        if (cached) setLocalEvents(JSON.parse(cached));
      } catch {}
    }
  }, [events]);

  const days = useCountdown(localEvents);

  if (localEvents.length === 0) return null;

  // Urgent: within 7 days
  const urgent = events.filter((e) => (days[e.id] ?? 99) <= 7);

  return (
    <div className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-[0_1px_6px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell size={15} style={{ color: ACCENT }} />
          <p className="text-[14px] font-bold text-[var(--text-strong)]">Upcoming Events</p>
          {urgent.length > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: "#DC2626" }}>
              {urgent.length} soon
            </span>
          )}
        </div>
        <a href="/settings/academic-calendar" className="text-[11px] font-semibold" style={{ color: BRAND }}>
          Manage →
        </a>
      </div>

      <div className="space-y-2">
        {localEvents.slice(0, 5).map((ev) => {
          const d = days[ev.id] ?? 0;
          const isToday = d === 0;
          const isTomorrow = d === 1;
          const isSoon = d <= 7;
          const dotColor = ev.color ?? ACCENT;

          let countdown = `In ${d} days`;
          if (isToday) countdown = "Today";
          else if (isTomorrow) countdown = "Tomorrow";
          else if (d < 0) countdown = "Past";

          return (
            <div key={ev.id} className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${isSoon ? "bg-orange-50 border border-orange-100" : "hover:bg-[var(--neutral-50)]"}`}>
              <div className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5" style={{ background: dotColor }} />
              <div className="flex-1 min-w-0">
                <p className={`text-[15px] font-bold truncate ${isSoon ? "text-orange-900" : "text-[var(--text-strong)]"}`}>{ev.title}</p>
                <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
                  {new Date(ev.event_date).toLocaleDateString("en-GH", { weekday: "short", day: "numeric", month: "short" })}
                  {!ev.all_day && ev.start_time && <> · {ev.start_time}{ev.end_time ? `–${ev.end_time}` : ""}</>}
                  {ev.all_day && <> · All day</>}
                </p>
              </div>
              <span className={`text-[12px] font-bold px-2 py-1 rounded-lg shrink-0 ${
                isToday ? "bg-red-100 text-red-700" :
                isTomorrow ? "bg-orange-100 text-orange-700" :
                isSoon ? "bg-yellow-100 text-yellow-700" :
                "bg-gray-100 text-gray-500"
              }`}>
                {countdown}
              </span>
            </div>
          );
        })}
      </div>

      {localEvents.length > 5 && (
        <p className="text-[11px] text-[var(--text-muted)] mt-3 text-center">+{localEvents.length - 5} more upcoming events</p>
      )}
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
  const [perfView, setPerfView] = useState<"bar" | "line">("line");
  const [finView,  setFinView]  = useState<"monthly" | "weekly">("monthly");

  const role = profile?.role ?? "teacher";
  const isHeadmaster = role === "headmaster" || role === "owner" || role === "super_admin";

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

  // 1. Enrollment trend data (Sept - June)
  const enrollmentTrendData = [
    { name: "Sept", Students: 500 },
    { name: "Oct", Students: 620 },
    { name: "Nov", Students: 750 },
    { name: "Dec", Students: 820 },
    { name: "Jan", Students: 980 },
    { name: "Feb", Students: 1100 },
    { name: "Mar", Students: 1190 },
    { name: "Apr", Students: 1250 },
    { name: "May", Students: 1320 },
    { name: "June", Students: 1400 }
  ];

  // 2. Fee collection data (Collected: 72%, Outstanding: 11%, Pending: 17%)
  const feeCollectionData = [
    { name: "Collected", value: 72, color: "#16A34A" },
    { name: "Outstanding", value: 11, color: "#DC2626" },
    { name: "Pending", value: 17, color: "#F59E0B" }
  ];

  // 3. Top performing classes data
  const topPerformingClasses = [
    { class: "Form 3 Science A", avg: "84%", students: 42, growth: "+6%" },
    { class: "Form 2 Gold", avg: "78%", students: 38, growth: "+4%" },
    { class: "Form 1A", avg: "74%", students: 35, growth: "+3%" },
    { class: "Form 4 General Arts", avg: "72%", students: 40, growth: "+2%" },
    { class: "Form 2 Green", avg: "70%", students: 36, growth: "+1%" }
  ];

  // 4. Recent activities data
  const recentActivities = [
    {
      id: "act-1",
      title: "New student admission",
      desc: "Ama Serwaa Mensah registered for JHS 1",
      time: "10m ago",
      icon: UserPlus,
      color: "#92278F",
      bg: "#f5e8f5"
    },
    {
      id: "act-2",
      title: "Fee payment received",
      desc: "GHS 1,200 received from Kofi Asante",
      time: "25m ago",
      icon: CreditCard,
      color: "#16A34A",
      bg: "#e8faf3"
    },
    {
      id: "act-3",
      title: "Attendance marked",
      desc: "Form 2 Science attendance marked (94% present)",
      time: "1h ago",
      icon: CheckCircle2,
      color: "#262262",
      bg: "#eeedf8"
    },
    {
      id: "act-4",
      title: "Teacher added",
      desc: "Mr. Daniel Owusu registered under Mathematics Dept",
      time: "2h ago",
      icon: UserCog,
      color: "#0ea99a",
      bg: "#e8faf8"
    },
    {
      id: "act-5",
      title: "Exam created",
      desc: "End of Term Exams scheduled for JHS 3",
      time: "3h ago",
      icon: BookOpen,
      color: "#F4901F",
      bg: "#fef3e6"
    }
  ];

  // 5. Secondary KPI cards data
  const secondaryKPIs = [
    { label: "Total classes", value: "48", icon: BookOpen, color: "#262262", bg: "#eeedf8" },
    { label: "Total subjects", value: "32", icon: ClipboardList, color: "#92278F", bg: "#f5e8f5" },
    { label: "Library books", value: "2,350", icon: Library, color: "#16A34A", bg: "#e8faf3" },
    { label: "Hostel occupancy", value: "78%", sub: "372/480 beds", icon: Bed, color: "#F4901F", bg: "#fef3e6" },
    { label: "Transport routes", value: "15", icon: Bus, color: "#0ea99a", bg: "#e8faf8" }
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* School Header Banner */}
      <div className="rounded-2xl border border-[#e8e4f3] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center text-white font-extrabold text-[18px] shadow-sm"
              style={{ background: "linear-gradient(135deg, #262262, #92278F)" }}>
              {school.logo_url
                ? <img src={school.logo_url} alt="" className="w-full h-full object-cover rounded-2xl" />
                : school.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="text-[18px] font-extrabold text-[#1a1854] truncate">{school.name}</h2>
              <p className="text-[12.5px] text-slate-500 mt-0.5 font-medium">
                {greeting()}, <span className="font-bold text-[#92278F]">{firstName(profile?.full_name ?? "")}</span>! Ready to manage your academic day.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {stats.currentTerm && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#e8e4f3] bg-slate-50">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[11.5px] font-bold text-slate-700">{stats.currentTerm}</span>
              </div>
            )}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#e8e4f3] bg-[#eeedf8] text-[#262262]">
              <CalendarDays size={14} />
              <span className="text-[11.5px] font-bold">
                {TODAY.toLocaleDateString("en-GH", { weekday: "short", day: "numeric", month: "short" })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main KPI Cards Grid (5 Columns) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          label="Total students"
          value="1,248"
          sub="Active enrolment"
          icon={Users}
          color="brand"
          trend={{ value: 8.5, label: "from last term" }}
        />
        <StatCard
          label="Total teachers"
          value="86"
          sub="Full-time faculty"
          icon={UserCog}
          color="accent"
          trend={{ value: 4.2, label: "new recruitment" }}
        />
        <StatCard
          label="Attendance today"
          value="92%"
          sub="921 present today"
          icon={GraduationCap}
          color="success"
          trend={{ value: 3.7, label: "vs yesterday" }}
        />
        <StatCard
          label="Total revenue"
          value="GHS 125,300"
          sub="Collected fees"
          icon={CreditCard}
          color="info"
          trend={{ value: 12.6, label: "this term" }}
        />
        <StatCard
          label="Outstanding fees"
          value="GHS 18,650"
          sub="Pending collections"
          icon={CreditCard}
          color="warning"
          trend={{ value: -5.3, label: "reduction" }}
        />
      </div>

      {/* Two Column Layout: Left (Main Content) & Right (Side widgets) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (Main Content) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Student Enrollment Trend Line Chart */}
            <div className="bg-white rounded-2xl border border-[#e8e4f3] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] flex flex-col justify-between">
              <div className="mb-4">
                <h3 className="text-[14px] font-extrabold text-[#1a1854]">Student enrollment trend</h3>
                <p className="text-[11px] text-slate-400 font-medium">Sept - June student population growth</p>
              </div>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={enrollmentTrendData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1ecfb" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#7c6f9e", fontWeight: "600" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#7c6f9e", fontWeight: "600" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line type="monotone" dataKey="Students" stroke="#262262" strokeWidth={3} dot={{ r: 4, fill: "#92278F", stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 6 }} name="Students" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Fee Collection Overview Donut Chart */}
            <div className="bg-white rounded-2xl border border-[#e8e4f3] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] flex flex-col justify-between">
              <div className="mb-4">
                <h3 className="text-[14px] font-extrabold text-[#1a1854]">Fee collection overview</h3>
                <p className="text-[11px] text-slate-400 font-medium">Collected vs outstanding vs pending breakdown</p>
              </div>
              <div className="relative flex items-center justify-center h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={feeCollectionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={78}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {feeCollectionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value}%`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-[22px] font-extrabold text-[#1a1854] leading-none">72%</span>
                  <span className="text-[9px] text-[#92278F] font-extrabold uppercase tracking-wider mt-1">Collected</span>
                </div>
              </div>
              
              <div className="flex items-center justify-center gap-4 text-[11px] font-semibold mt-2 border-t border-slate-50 pt-2">
                {feeCollectionData.map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                    <span className="text-slate-500">{d.name} ({d.value}%)</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Leaderboard Table & Fee Report Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Top Performing Classes Table */}
            <div className="bg-white rounded-2xl border border-[#e8e4f3] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] flex flex-col justify-between">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-[14px] font-extrabold text-[#1a1854]">Top performing classes</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Ranked by average term score leaderboard</p>
                </div>
                <span className="px-2 py-0.5 bg-[#f5e8f5] text-[#92278F] text-[10px] font-bold rounded-lg uppercase tracking-wider">Top 5</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-[12px]">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                      <th className="pb-2">Class</th>
                      <th className="pb-2 text-center">Avg score</th>
                      <th className="pb-2 text-center">Students</th>
                      <th className="pb-2 text-right">Growth</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                    {topPerformingClasses.map((item, i) => (
                      <tr key={item.class} className="hover:bg-slate-50/55 transition-colors">
                        <td className="py-2.5 flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            i === 0 ? "bg-amber-100 text-amber-800" :
                            i === 1 ? "bg-slate-200 text-slate-800" :
                            i === 2 ? "bg-orange-100 text-orange-800" :
                            "bg-slate-50 text-slate-500"
                          }`}>
                            {i + 1}
                          </span>
                          <span className="font-bold text-slate-800">{item.class}</span>
                        </td>
                        <td className="py-2.5 text-center font-bold text-slate-800">{item.avg}</td>
                        <td className="py-2.5 text-center text-slate-500">{item.students}</td>
                        <td className="py-2.5 text-right text-emerald-600 font-bold">{item.growth}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Fee Collection Report Summary Progress Card */}
            <div className="bg-white rounded-2xl border border-[#e8e4f3] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] flex flex-col justify-between">
              <div className="mb-4">
                <h3 className="text-[14px] font-extrabold text-[#1a1854]">Fee collection rate</h3>
                <p className="text-[11px] text-slate-400 font-medium">Academic term fee collection status report</p>
              </div>

              <div className="space-y-4 my-auto">
                <div className="bg-slate-50 rounded-xl p-4 border border-[#e8e4f3]">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Overall target progress</span>
                    <span className="text-[16px] font-extrabold text-emerald-600">72% collected</span>
                  </div>
                  <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-[#16A34A] rounded-full transition-all duration-1000" style={{ width: "72%" }} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#e8faf3] rounded-xl p-3 border border-emerald-100">
                    <p className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider">Collected amount</p>
                    <p className="text-[16px] font-extrabold text-emerald-700 mt-1">GHS 125,300</p>
                  </div>
                  <div className="bg-[#fef3e6] rounded-xl p-3 border border-orange-100">
                    <p className="text-[10px] text-orange-800 font-bold uppercase tracking-wider">Arrears amount</p>
                    <p className="text-[16px] font-extrabold text-orange-700 mt-1">GHS 18,650</p>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 font-medium leading-relaxed mt-2 border-t border-slate-50 pt-2">
                Fees collection is on track. Follow-up notifications have been automatically generated for outstanding accounts.
              </div>
            </div>

          </div>

          {/* School Term Calendar / Events */}
          <div className="bg-white rounded-2xl border border-[#e8e4f3] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[14px] font-extrabold text-[#1a1854]">Term calendar</h3>
                <p className="text-[11px] text-slate-400 font-medium">Important dates and academic terms tracking</p>
              </div>
              <Link href="/academic-calendar" className="text-[11.5px] font-bold text-[#92278F] hover:underline flex items-center gap-0.5">
                <Plus size={12} /> View all
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {stats.terms.length === 0 ? (
                <div className="sm:col-span-3 flex flex-col items-center justify-center py-6 gap-2">
                  <CalendarDays size={24} className="text-slate-300" />
                  <p className="text-[12.5px] text-slate-400 font-medium">No active academic terms configured</p>
                </div>
              ) : (
                stats.terms.slice(0, 3).map((t, i) => (
                  <Link key={t.id} href="/academic-calendar" className="block hover:-translate-y-0.5 transition-transform">
                    <EventCard term={t} index={i} />
                  </Link>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Right Column (Side Widgets) */}
        <div className="space-y-6">
          
          {/* Quick Actions (Dense Card) */}
          <div className="bg-white rounded-2xl border border-[#e8e4f3] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <h3 className="text-[14px] font-extrabold text-[#1a1854] mb-3">Quick actions</h3>
            <div className="grid grid-cols-3 gap-2">
              {QUICK_ACTIONS.map((a) => (
                <Link key={a.label} href={a.href}
                  className="flex flex-col items-center gap-1.5 p-2.5 bg-slate-50 hover:bg-[#eeedf8] rounded-xl border border-slate-100 hover:border-[#d9d2eb] transition-all group text-center">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform"
                    style={{ background: `${a.color}15` }}>
                    <a.icon size={15} style={{ color: a.color }} />
                  </div>
                  <span className="text-[9.5px] font-extrabold text-slate-600 group-hover:text-[#262262] leading-tight">{a.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Activities (Mock Listing) */}
          <div className="bg-white rounded-2xl border border-[#e8e4f3] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-extrabold text-[#1a1854]">Recent activities</h3>
              <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
            </div>
            <div className="space-y-3.5">
              {recentActivities.map((act) => (
                <div key={act.id} className="flex items-start gap-3 group">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: act.bg }}>
                    <act.icon size={14} style={{ color: act.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-extrabold text-[#1a1854] group-hover:text-[#92278F] transition-colors leading-tight">
                      {act.title}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 font-medium leading-snug truncate">
                      {act.desc}
                    </p>
                  </div>
                  <span className="text-[9.5px] font-bold text-slate-400 shrink-0">{act.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* System Status / Overview */}
          <div className="bg-white rounded-2xl border border-[#e8e4f3] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-extrabold text-[#1a1854]">System status</h3>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-extrabold border border-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Operational
              </div>
            </div>
            
            <div className="space-y-3 pt-1">
              <div className="flex justify-between items-center text-[12px] font-medium text-slate-600">
                <span className="text-slate-400 font-semibold">Last backup</span>
                <span className="font-bold text-[#1a1854]">Today, 02:30 AM</span>
              </div>
              <div className="flex justify-between items-center text-[12px] font-medium text-slate-600">
                <span className="text-slate-400 font-semibold">Active users online</span>
                <span className="font-bold text-[#1a1854]">12 users</span>
              </div>
              
              <div className="pt-1 border-t border-slate-50">
                <div className="flex justify-between text-[10.5px] text-slate-400 font-semibold mb-1.5">
                  <span>Cloud storage</span>
                  <span className="font-extrabold text-[#1a1854]">124GB / 200GB (62%)</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-600 rounded-full" style={{ width: "62%" }} />
                </div>
              </div>
            </div>
          </div>

          {/* Secondary KPI Cards */}
          <div className="bg-white rounded-2xl border border-[#e8e4f3] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <h3 className="text-[14px] font-extrabold text-[#1a1854] mb-3">Secondary stats</h3>
            <div className="space-y-2.5">
              {secondaryKPIs.map((kpi) => (
                <div key={kpi.label} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-xl hover:border-[#d9d2eb] hover:bg-slate-100/50 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: kpi.bg }}>
                      <kpi.icon size={13} style={{ color: kpi.color }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11.5px] font-bold text-slate-700 leading-tight">{kpi.label}</p>
                      {kpi.sub && <p className="text-[9.5px] text-slate-400 font-semibold mt-0.5">{kpi.sub}</p>}
                    </div>
                  </div>
                  <span className="text-[14px] font-extrabold text-[#1a1854] shrink-0 pl-3">{kpi.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive School Mini Calendar */}
          <div className="bg-white rounded-2xl border border-[#e8e4f3] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[14px] font-extrabold text-[#1a1854]">School calendar</h3>
              <div className="flex items-center gap-1.5 text-[9.5px] text-[#92278F] font-bold bg-[#f5e8f5] px-2 py-0.5 rounded-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-[#92278F]" />
                <span>Term dates</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 font-semibold mb-4">Select marked dates to view scheduled events</p>
            <MiniCalendar terms={stats.terms} events={stats.events ?? []} />
          </div>

        </div>

      </div>

      {/* Bottom Live Banner (Headmaster specific) */}
      {isHeadmaster && (
        <div className="rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-[#1a1854] to-[#2e1a6b] shadow-lg border border-[#3d1f6e] text-white">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <TrendingUp size={20} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-extrabold text-[14.5px] text-white leading-tight">Your school is live on EduSys</p>
              <p className="text-white/70 text-[11px] mt-0.5 font-medium">All modules (Students, Fees, Exams, Reports, and Staff) are fully automated and synchronized.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <Link href="/settings/fees"
              className="text-[11px] font-extrabold px-3.5 py-2 rounded-xl bg-white/15 text-white hover:bg-white/25 transition-all text-center">
              Fee structures
            </Link>
            <Link href="/settings"
              className="text-[11px] font-extrabold px-3.5 py-2 rounded-xl bg-white text-[#1a1854] hover:bg-white/90 transition-all text-center">
              Settings →
            </Link>
          </div>
        </div>
      )}

    </div>
  );
}
