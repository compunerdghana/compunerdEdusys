"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  LayoutDashboard, UserCheck, ShieldAlert, GraduationCap,
  Calendar, BookOpen, Clock, AlertCircle, CheckSquare,
  Users2, MessageSquare, Plus, ArrowRight, ClipboardList,
  FileSpreadsheet, Send, CalendarClock, UserCog, Loader2,
  Sparkles, Quote
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface Stats {
  assignedClassesCount: number;
  assignedSubjectsCount: number;
  totalStudentsCount: number;
  attendanceRate: number;
  assignmentCompletionRate: number;
  performanceIndex: number;
}

interface TeacherInfo {
  teacher_id: string;
  department: string;
  qualification: string;
  specialization: string;
}

const quotes = [
  { text: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King" },
  { text: "For I know the plans I have for you, plans to prosper you and not to harm you, plans to give you hope and a future.", author: "Jeremiah 29:11" },
  { text: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" },
  { text: "Teaching is the greatest act of optimism.", author: "Colleen Wilcox" },
  { text: "The mind is not a vessel to be filled, but a fire to be kindled.", author: "Plutarch" },
  { text: "Commit your actions to the Lord, and your plans will succeed.", author: "Proverbs 16:3" },
  { text: "I can do all things through Christ who strengthens me.", author: "Philippians 4:13" },
  { text: "Trust in the Lord with all your heart, and do not lean on your own understanding.", author: "Proverbs 3:5" },
  { text: "Do not be conformed to this world, but be transformed by the renewal of your mind.", author: "Romans 12:2" },
  { text: "It is the supreme art of the teacher to awaken joy in creative expression and knowledge.", author: "Albert Einstein" },
  { text: "The influence of a great teacher can never be erased.", author: "Unknown" },
  { text: "Be strong and courageous. Do not be frightened, and do not be dismayed, for the Lord your God is with you wherever you go.", author: "Joshua 1:9" },
  { text: "Whatever you do, work heartily, as for the Lord and not for men.", author: "Colossians 3:23" },
  { text: "The fear of the Lord is the beginning of knowledge.", author: "Proverbs 1:7" },
  { text: "Ask, and it will be given to you; seek, and you will find; knock, and it will be opened to you.", author: "Matthew 7:7" }
];

export default function TeacherDashboard() {
  const { error: toastError } = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [teacher, setTeacher] = useState<TeacherInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeQuote, setActiveQuote] = useState(quotes[0]);

  useEffect(() => {
    // Select quote statically based on the day of the month
    const idx = new Date().getDate() % quotes.length;
    setActiveQuote(quotes[idx]);

    async function loadStats() {
      try {
        const res = await fetch("/api/teacher/dashboard-stats");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed");
        setStats(data.stats);
        setTeacher(data.teacher);
      } catch (err) {
        toastError("Failed to load dashboard metrics.");
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [toastError]);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <Loader2 size={32} className="animate-spin text-violet-600 mx-auto" />
        <p className="text-slate-400 text-[13px] font-semibold mt-3">Preparing teacher workspace...</p>
      </div>
    );
  }

  const statCards = [
    { label: "Classes Assigned", value: stats?.assignedClassesCount || 0, icon: Users2, color: "text-violet-600 bg-violet-50" },
    { label: "Subjects Assigned", value: stats?.assignedSubjectsCount || 0, icon: BookOpen, color: "text-indigo-600 bg-indigo-50" },
    { label: "Total Students", value: stats?.totalStudentsCount || 0, icon: GraduationCap, color: "text-blue-600 bg-blue-50" },
    { label: "Attendance Rate", value: `${stats?.attendanceRate || 95}%`, icon: UserCheck, color: "text-emerald-600 bg-emerald-50" },
    { label: "Pending Scores", value: "8", icon: FileSpreadsheet, color: "text-amber-600 bg-amber-50" },
    { label: "Pending Assignments", value: "3", icon: CheckSquare, color: "text-rose-600 bg-rose-50" },
  ];

  const quickActions = [
    { label: "Take Attendance", href: "/teacher/attendance", icon: ClipboardList, color: "from-violet-500 to-indigo-600 text-white" },
    { label: "Enter Scores", href: "/teacher/academics", icon: FileSpreadsheet, color: "from-blue-500 to-cyan-600 text-white" },
    { label: "View Timetable", href: "/teacher/timetable", icon: CalendarClock, color: "from-emerald-500 to-teal-600 text-white" },
    { label: "Create Assignment", href: "/teacher/assignments", icon: Plus, color: "from-amber-500 to-orange-600 text-white" },
    { label: "Send Message", href: "/teacher/communication", icon: Send, color: "from-pink-500 to-rose-600 text-white" },
    { label: "Apply Leave", href: "/teacher/leave", icon: Calendar, color: "from-purple-500 to-fuchsia-600 text-white" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Card & Motivational Quote */}
      <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-[#e8e4f3] p-6 shadow-sm flex flex-col md:flex-row gap-6 items-center relative overflow-hidden transition-all hover:border-violet-200">
        <div className="absolute top-0 right-0 p-6 opacity-[0.06] pointer-events-none text-violet-700">
          <Sparkles size={140} />
        </div>

        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-extrabold flex items-center justify-center text-3xl shadow-inner shrink-0">
          TE
        </div>

        <div className="text-center md:text-left flex-1 min-w-0">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-violet-600 bg-violet-50 border border-violet-100/50 px-2.5 py-0.5 rounded-full">
            Active Workspace
          </span>
          <h2 className="text-[20px] font-extrabold text-slate-900 mt-2 leading-tight">Welcome to your Workspace!</h2>
          <p className="text-slate-400 font-semibold text-[11.5px] font-mono mt-1">
            Teacher ID: {teacher?.teacher_id || "TCH-ACTIVE"} · Dept: {teacher?.department || "Languages"}
          </p>

          {/* Quote Section */}
          <div className="mt-4 pt-3 border-t border-[#f5f3fc] flex gap-2.5 items-start text-left text-[12.5px] text-slate-500 font-semibold max-w-2xl italic">
            <Quote size={16} className="text-violet-400 shrink-0 mt-0.5" />
            <div>
              <p>"{activeQuote.text}"</p>
              <span className="text-[11px] font-bold text-slate-400 not-italic block mt-1">— {activeQuote.author}</span>
            </div>
          </div>
        </div>

        <div className="bg-[#faf9ff] rounded-xl p-4 border border-[#f0edf8] text-center shrink-0 w-full md:w-auto">
          <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Current Academic Cycle</p>
          <p className="text-[14px] font-black text-violet-950 mt-1">Term 2 · 2026/2027</p>
        </div>
      </div>

      {/* Activities & Notifications Dashboard Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Activities */}
        <div className="lg:col-span-2 bg-white/70 backdrop-blur-sm rounded-2xl border border-[#e8e4f3] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#f5f3fc] pb-3">
            <h4 className="font-extrabold text-slate-950 text-[14px]">Today's Activities</h4>
            <span className="text-[11px] font-bold text-slate-400">{new Date().toDateString()}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3.5 p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
              <span className="p-2.5 rounded-lg bg-violet-50 border border-violet-100 text-violet-600">
                <Clock size={16} />
              </span>
              <div>
                <p className="text-[12.5px] font-bold text-slate-800">Lessons Today</p>
                <p className="text-[11px] font-semibold text-slate-400 mt-0.5">3 Periods (08:30 - 14:00)</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
              <span className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600">
                <Calendar size={16} />
              </span>
              <div>
                <p className="text-[12.5px] font-bold text-slate-800">Upcoming Exams</p>
                <p className="text-[11px] font-semibold text-emerald-600 mt-0.5">Mid-term revision tests</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
              <span className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600">
                <Users2 size={16} />
              </span>
              <div>
                <p className="text-[12.5px] font-bold text-slate-800">Academic Meetings</p>
                <p className="text-[11px] font-semibold text-indigo-600 mt-0.5">PTA Review scheduled at 15:30</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
              <span className="p-2.5 rounded-lg bg-amber-50 border border-amber-100 text-amber-600">
                <CheckSquare size={16} />
              </span>
              <div>
                <p className="text-[12.5px] font-bold text-slate-800">Deadlines & Tasks</p>
                <p className="text-[11px] font-semibold text-slate-400 mt-0.5">1 grading report card due Monday</p>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications and Announcements */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-[#e8e4f3] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#f5f3fc] pb-3">
            <h4 className="font-extrabold text-slate-950 text-[14px]">Workspace Notifications</h4>
            <span className="text-[10px] font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">3 New</span>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-[#faf9ff] border border-[#f0edf8] rounded-xl flex items-start gap-2.5">
              <span className="w-2 h-2 rounded-full bg-violet-600 shrink-0 mt-1.5" />
              <div>
                <p className="text-[12px] font-bold text-slate-800">New Message</p>
                <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Parent message received regarding JHS 1 Mathematics.</p>
              </div>
            </div>

            <div className="p-3 bg-[#faf9ff] border border-[#f0edf8] rounded-xl flex items-start gap-2.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-1.5" />
              <div>
                <p className="text-[12px] font-bold text-slate-800">School Announcement</p>
                <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Staff payroll templates update notice from Admin office.</p>
              </div>
            </div>

            <div className="p-3 bg-[#faf9ff] border border-[#f0edf8] rounded-xl flex items-start gap-2.5">
              <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
              <div>
                <p className="text-[12px] font-bold text-slate-800">Assignment Alert</p>
                <p className="text-[11px] text-slate-500 font-semibold mt-0.5">14 students submitted Science Homework 2 draft.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Statistics Grid */}
      <div className="space-y-3">
        <h3 className="text-[12px] font-bold uppercase tracking-widest text-slate-400">Quick Statistics</h3>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          {statCards.map((c) => (
            <div key={c.label} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-[#e8e4f3] p-4 flex flex-col gap-3 shadow-sm hover:border-violet-200 transition-all hover:scale-[1.01]">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${c.color}`}>
                <c.icon size={15} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none">{c.label}</p>
                <p className="text-[18px] font-black text-slate-900 mt-1">{c.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="space-y-3">
        <h3 className="text-[12px] font-bold uppercase tracking-widest text-slate-400">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {quickActions.map((act) => (
            <Link
              key={act.label}
              href={act.href}
              className={`rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-3 bg-gradient-to-br hover:scale-[1.03] hover:shadow-md active:scale-98 transition-all border border-black/5 shadow-sm cursor-pointer ${act.color}`}
            >
              <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center shadow-inner">
                <act.icon size={18} />
              </div>
              <span className="text-[12.5px] font-bold leading-tight">{act.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
