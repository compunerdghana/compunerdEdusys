"use client";

import { Bell, AlertCircle, Calendar } from "lucide-react";

export default function AnnouncementsView() {
  const notices = [
    { title: "Term 2 Mid-term reports submission deadline", date: "2026-06-16", urgency: "urgent", body: "Please ensure all quizzes and scores are entered for Term 2 report cards compilation by the coming Friday." },
    { title: "PTA meeting attendance briefing", date: "2026-06-12", urgency: "info", body: "All class instructors are requested to attend the upcoming PTA general meeting session this Saturday." },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-[20px] font-extrabold text-slate-900 leading-tight">School Noticeboard</h1>
        <p className="text-slate-500 text-[12px] font-semibold mt-0.5">Stay updated with general notices, staff circulars and emergency portal alerts.</p>
      </div>

      <div className="space-y-4">
        {notices.map((note, idx) => (
          <div key={idx} className="bg-white rounded-2xl border border-[#e8e4f3] p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-0.5 rounded border ${
                note.urgency === "urgent" ? "bg-rose-50 text-rose-700 border-rose-100 animate-pulse" : "bg-blue-50 text-blue-700 border-blue-100"
              }`}>
                {note.urgency}
              </span>
              <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1 font-mono">
                <Calendar size={12} />
                {note.date}
              </span>
            </div>

            <div className="space-y-1">
              <h4 className="font-extrabold text-slate-900 text-[14px] leading-tight">{note.title}</h4>
              <p className="text-slate-500 font-semibold text-[12.5px] leading-relaxed">{note.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
