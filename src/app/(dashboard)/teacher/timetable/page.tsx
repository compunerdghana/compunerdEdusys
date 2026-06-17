"use client";

import { useState } from "react";
import { Clock, Calendar, BookOpen, AlertCircle } from "lucide-react";

export default function TimetableView() {
  const timetable = [
    { day: "Monday", slots: [
      { time: "08:30 - 09:30", subject: "Mathematics", classroom: "JHS 1", room: "Room A3" },
      { time: "10:30 - 11:30", subject: "Integrated Science", classroom: "Primary 6", room: "Lab B" },
    ]},
    { day: "Tuesday", slots: [
      { time: "09:00 - 10:00", subject: "English Language", classroom: "JHS 2", room: "Room A4" },
      { time: "11:30 - 12:30", subject: "Mathematics", classroom: "JHS 1", room: "Room A3" },
    ]},
    { day: "Wednesday", slots: [
      { time: "08:30 - 09:30", subject: "Integrated Science", classroom: "Primary 6", room: "Lab B" },
      { time: "13:00 - 14:00", subject: "English Language", classroom: "JHS 2", room: "Room A4" },
    ]},
    { day: "Thursday", slots: [
      { time: "10:30 - 11:30", subject: "Mathematics", classroom: "JHS 1", room: "Room A3" },
    ]},
    { day: "Friday", slots: [
      { time: "09:00 - 10:00", subject: "Integrated Science", classroom: "Primary 6", room: "Lab B" },
    ]},
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-[20px] font-extrabold text-slate-900 leading-tight">My Timetable</h1>
        <p className="text-slate-500 text-[12px] font-semibold mt-0.5">Weekly schedules and classroom allocations. Accessible offline.</p>
      </div>

      <div className="space-y-4">
        {timetable.map(dayInfo => (
          <div key={dayInfo.day} className="bg-white rounded-2xl border border-[#e8e4f3] p-5 shadow-sm space-y-3">
            <h3 className="font-extrabold text-slate-950 text-[14px] border-b border-[#f5f3fc] pb-2 flex items-center gap-2">
              <Calendar size={15} className="text-violet-600" />
              {dayInfo.day}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {dayInfo.slots.map((slot, idx) => (
                <div key={idx} className="flex items-center gap-3.5 p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                    <Clock size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-bold text-slate-800">{slot.subject} ({slot.classroom})</p>
                    <p className="text-[11px] font-semibold text-slate-400 mt-0.5">{slot.time} · {slot.room}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
