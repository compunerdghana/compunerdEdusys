"use client";

import { BarChart3, Award, Star } from "lucide-react";

export default function PerformanceAppraisalsView() {
  const kpis = [
    { name: "Attendance Marking Rate", target: "100%", value: "98.5%", status: "On Track" },
    { name: "Scores Submission Timeliness", target: "Within 5 days", value: "Within 3 days", status: "Excellent" },
    { name: "Syllabus Coverage Speed", target: "80% by mid-term", value: "85%", status: "Ahead of Schedule" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-[20px] font-extrabold text-slate-900 leading-tight">My Performance Appraisals</h1>
        <p className="text-slate-500 text-[12px] font-semibold mt-0.5">Track your key performance indicators (KPIs), supervisor feedback and review targets.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* KPI List */}
        <div className="lg:col-span-2 space-y-4">
          {kpis.map((kpi, idx) => (
            <div key={idx} className="bg-white rounded-2xl border border-[#e8e4f3] p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-slate-900 text-[14px]">{kpi.name}</h4>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  kpi.status === "Excellent" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-blue-50 text-blue-700 border-blue-100"
                }`}>
                  {kpi.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-[12.5px] font-bold text-slate-600 border-t border-[#f5f3fc] pt-3">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Target Goal</span>
                  <p className="text-slate-950 font-extrabold mt-0.5">{kpi.target}</p>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Your Score</span>
                  <p className="text-violet-700 font-extrabold mt-0.5">{kpi.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Appraisal Card */}
        <div className="bg-white rounded-2xl border border-[#e8e4f3] p-5 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mx-auto ring-4 ring-amber-50">
            <Star size={20} className="fill-current" />
          </div>

          <div>
            <h4 className="font-extrabold text-slate-950 text-[14px]">Term 1 Appraisal Rating</h4>
            <p className="text-[24px] font-extrabold text-amber-600 mt-1">4.8 / 5.0</p>
          </div>

          <p className="text-[12px] text-slate-400 font-semibold leading-relaxed">
            "Consistently delivers lessons with high clarity and completes attendance registers timely." - Supervisor Note
          </p>
        </div>
      </div>
    </div>
  );
}
