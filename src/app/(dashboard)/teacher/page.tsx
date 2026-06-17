"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  LayoutDashboard, UserCheck, ShieldAlert, GraduationCap,
  Calendar, BookOpen, Clock, AlertCircle, CheckSquare,
  Users2, MessageSquare, Plus, ArrowRight, ClipboardList,
  FileSpreadsheet, Send, CalendarClock, UserCog, Loader2
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

export default function TeacherDashboard() {
  const { error: toastError } = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [teacher, setTeacher] = useState<TeacherInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
        <p className="text-slate-400 text-[13px] font-semibold mt-3">Preparing teacher dashboard...</p>
      </div>
    );
  }

  const welcomeName = "Teacher Workspace";
  const brandName = "Compunerd EduSys";

  const statCards = [
    { label: "Assigned Classes", value: stats?.assignedClassesCount || 0, icon: Users2, color: "text-violet-600 bg-violet-50" },
    { label: "Assigned Subjects", value: stats?.assignedSubjectsCount || 0, icon: BookOpen, color: "text-indigo-600 bg-indigo-50" },
    { label: "Total Students", value: stats?.totalStudentsCount || 0, icon: GraduationCap, color: "text-blue-600 bg-blue-50" },
    { label: "Attendance Completion", value: `${stats?.attendanceRate || 0}%`, icon: UserCheck, color: "text-emerald-600 bg-emerald-50" },
    { label: "Assignment Completion", value: `${stats?.assignmentCompletionRate || 0}%`, icon: CheckSquare, color: "text-amber-600 bg-amber-50" },
    { label: "Performance Index", value: `${stats?.performanceIndex || 0}/100`, icon: ShieldAlert, color: "text-rose-600 bg-rose-50" },
  ];

  const quickActions = [
    { label: "Take Attendance", href: "/teacher/attendance", icon: ClipboardList, color: "from-violet-500 to-indigo-600 text-white" },
    { label: "Enter Scores", href: "/teacher/scores", icon: FileSpreadsheet, color: "from-blue-500 to-cyan-600 text-white" },
    { label: "View Timetable", href: "/teacher/timetable", icon: CalendarClock, color: "from-emerald-500 to-teal-600 text-white" },
    { label: "Create Assignment", href: "/teacher/assignments", icon: Plus, color: "from-amber-500 to-orange-600 text-white" },
    { label: "Send Message", href: "/teacher/communication", icon: Send, color: "from-pink-500 to-rose-600 text-white" },
    { label: "View Leave Status", href: "/teacher/leave", icon: Calendar, color: "from-purple-500 to-fuchsia-600 text-white" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Section */}
      <div className="bg-white rounded-2xl border border-[#e8e4f3] p-6 shadow-sm flex flex-col md:flex-row gap-5 items-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-extrabold flex items-center justify-center text-3xl shadow-inner shrink-0">
          TE
        </div>
        <div className="text-center md:text-left flex-1 space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-violet-600 bg-violet-50 border border-violet-100/50 px-2.5 py-0.5 rounded-full">
            Active Workspace
          </span>
          <h2 className="text-[20px] font-extrabold text-slate-900 mt-1 leading-tight">Welcome, Educator!</h2>
          <p className="text-slate-400 font-semibold text-[11.5px] font-mono leading-none">
            Teacher ID: {teacher?.teacher_id || "TCH-PENDING"} · Dept: {teacher?.department || "Academic"}
          </p>
        </div>
        <div className="bg-[#faf9ff] rounded-xl p-3 border border-[#f0edf8] text-center shrink-0">
          <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Current Academic Term</p>
          <p className="text-[13px] font-extrabold text-violet-950 mt-0.5">Term 2 · 2026/2027</p>
        </div>
      </div>

      {/* Grid Quick Actions */}
      <div>
        <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-400 mb-3.5">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {quickActions.map((act) => (
            <Link
              key={act.label}
              href={act.href}
              className={`rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-3 bg-gradient-to-br hover:scale-102 hover:shadow-md transition-all border border-black/5 shadow-sm cursor-pointer ${act.color}`}
            >
              <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
                <act.icon size={18} />
              </div>
              <span className="text-[12px] font-bold leading-tight">{act.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Grid Counts */}
      <div>
        <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-400 mb-3.5">Quick Statistics</h3>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          {statCards.map((c) => (
            <div key={c.label} className="bg-white rounded-2xl border border-[#e8e4f3] p-4 flex flex-col gap-2 shadow-sm">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${c.color}`}>
                <c.icon size={15} />
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400 leading-none">{c.label}</p>
                <p className="text-[18px] font-extrabold text-slate-900 mt-1">{c.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Double Column split: Today's Summary & Sync engine */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Today's schedule */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-[#e8e4f3] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#f5f3fc] pb-3">
            <h4 className="font-extrabold text-slate-950 text-[14px]">Today's Summary</h4>
            <span className="text-[11px] font-bold text-slate-400">{new Date().toDateString()}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
              <Clock size={16} className="text-violet-500 shrink-0" />
              <div>
                <p className="text-[12px] font-bold text-slate-800">Classes Scheduled Today</p>
                <p className="text-[11px] font-semibold text-slate-400 mt-0.5">3 Periods (08:30 - 14:00)</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
              <ClipboardList size={16} className="text-amber-500 shrink-0" />
              <div>
                <p className="text-[12px] font-bold text-slate-800">Attendance Submissions</p>
                <p className="text-[11px] font-semibold text-amber-600 mt-0.5">2 Classes Pending Marking</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
              <FileSpreadsheet size={16} className="text-blue-500 shrink-0" />
              <div>
                <p className="text-[12px] font-bold text-slate-800">Assignments & Grading</p>
                <p className="text-[11px] font-semibold text-slate-400 mt-0.5">1 Homework Pending Scores</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
              <Users2 size={16} className="text-indigo-500 shrink-0" />
              <div>
                <p className="text-[12px] font-bold text-slate-800">Scheduled Meetings</p>
                <p className="text-[11px] font-semibold text-indigo-600 mt-0.5">PTA Meeting scheduled for 15:30</p>
              </div>
            </div>
          </div>
        </div>

        {/* Timetable quick look */}
        <div className="bg-white rounded-2xl border border-[#e8e4f3] p-5 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <h4 className="font-extrabold text-slate-950 text-[14px] border-b border-[#f5f3fc] pb-3">Academic Shortcuts</h4>
            <ul className="space-y-2.5">
              <li className="text-[12px] font-bold text-slate-700 flex items-center justify-between">
                <span>Mathematics (JHS 1)</span>
                <span className="text-[11px] text-slate-400 font-semibold font-mono">09:00 - 10:00</span>
              </li>
              <li className="text-[12px] font-bold text-slate-700 flex items-center justify-between">
                <span>Integrated Science (Primary 6)</span>
                <span className="text-[11px] text-slate-400 font-semibold font-mono">11:30 - 12:30</span>
              </li>
              <li className="text-[12px] font-bold text-slate-700 flex items-center justify-between">
                <span>English Language (JHS 2)</span>
                <span className="text-[11px] text-slate-400 font-semibold font-mono">13:00 - 14:00</span>
              </li>
            </ul>
          </div>

          <Link href="/teacher/timetable" className="flex items-center justify-center gap-1.5 mt-5 text-[12px] font-bold text-violet-600 hover:text-violet-800 hover:underline">
            View Complete Timetable
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}
