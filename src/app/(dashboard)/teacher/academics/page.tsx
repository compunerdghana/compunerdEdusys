"use client";

import Link from "next/link";
import { BookOpen, FileSpreadsheet, GraduationCap, ScrollText, Sparkles, HelpCircle, Info, ArrowRight } from "lucide-react";

export default function AcademicsHubView() {
  const hubs = [
    {
      title: "Subject Management",
      description: "View and organize your assigned subjects, student lists, curriculum guides and lesson notes mapping.",
      href: "/teacher/subjects",
      icon: BookOpen,
      color: "bg-indigo-50 border-indigo-100 text-indigo-700 hover:border-indigo-300",
      iconBg: "bg-indigo-100 text-indigo-700",
      action: "Configure Curriculum"
    },
    {
      title: "Assessments & Scores Entry",
      description: "Enter scores for class SBA activities (30% weight) and term exams (70% weight). Automatic grading calculations.",
      href: "/teacher/scores",
      icon: FileSpreadsheet,
      color: "bg-emerald-50 border-emerald-100 text-emerald-700 hover:border-emerald-300",
      iconBg: "bg-emerald-100 text-emerald-700",
      action: "Enter Term Grades"
    },
    {
      title: "Exam Center",
      description: "Manage test setups, print assessment rosters, schedule midterm tests and coordinate exam schedules.",
      href: "/teacher/exams",
      icon: GraduationCap,
      color: "bg-blue-50 border-blue-100 text-blue-700 hover:border-blue-300",
      iconBg: "bg-blue-100 text-blue-700",
      action: "Manage Exam Papers"
    },
    {
      title: "Report Cards & Remarks",
      description: "Contribute directly to end-of-term student reports. Input academic remarks and behavior recommendations.",
      href: "/teacher/report-cards",
      icon: ScrollText,
      color: "bg-amber-50 border-amber-100 text-amber-700 hover:border-amber-300",
      iconBg: "bg-amber-100 text-amber-700",
      action: "Write Student Remarks"
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white/70 backdrop-blur-md p-6 rounded-2xl border border-[#e8e4f3] shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-violet-50 text-violet-600 border border-violet-100">
              <BookOpen size={18} />
            </span>
            <h1 className="text-[20px] font-extrabold text-slate-900 leading-tight">Academic Hub</h1>
          </div>
          <p className="text-slate-500 text-[12px] font-semibold mt-1">
            Primary workspace for subject configurations, continuous assessments, gradebooks and report remarks.
          </p>
        </div>
      </div>

      {/* Ranks and grading scale explanation */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-[#e8e4f3] p-5 shadow-sm space-y-4">
        <h4 className="font-extrabold text-slate-950 text-[14px] border-b border-[#f5f3fc] pb-3 flex items-center gap-2">
          <Info size={16} className="text-violet-600" />
          <span>Ghana Education Service (GES) Standard Scheme</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[12.5px] text-slate-600 font-semibold">
          <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">SBA Weight</p>
            <p className="text-[15px] font-extrabold text-slate-900 mt-1">30% Class Score</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Quizzes, classroom activities, projects, and workbooks.</p>
          </div>
          <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Exam Weight</p>
            <p className="text-[15px] font-extrabold text-slate-900 mt-1">70% End-of-Term Test</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Summative examinations conducted at term end.</p>
          </div>
          <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Grading Key</p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {[
                { label: "A1", desc: "Excellent" },
                { label: "B2", desc: "Very Good" },
                { label: "B3", desc: "Good" },
                { label: "C4-D7", desc: "Credit/Pass" },
                { label: "F9", desc: "Fail" }
              ].map(g => (
                <span key={g.label} className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-extrabold" title={g.desc}>
                  {g.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Hub Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {hubs.map((hub) => (
          <div
            key={hub.title}
            className={`p-6 rounded-2xl border transition-all duration-300 flex flex-col justify-between hover:scale-[1.01] hover:shadow-md ${hub.color}`}
          >
            <div>
              <div className="flex items-center gap-3">
                <span className={`p-2.5 rounded-xl flex items-center justify-center shrink-0 border ${hub.iconBg}`}>
                  <hub.icon size={20} />
                </span>
                <h3 className="font-extrabold text-[15px] text-slate-900 leading-tight">{hub.title}</h3>
              </div>
              <p className="text-slate-600 text-[12.5px] font-semibold mt-4 leading-relaxed">
                {hub.description}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-black/5 flex">
              <Link
                href={hub.href}
                className="inline-flex items-center gap-1.5 text-[12.5px] font-extrabold text-slate-800 hover:gap-2.5 transition-all"
              >
                <span>{hub.action}</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
