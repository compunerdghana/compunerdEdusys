"use client";

import { useState } from "react";
import { Clock, Calendar, BookOpen, MapPin, School, Sparkles } from "lucide-react";

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

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  
  // Default to today if weekday, else Monday
  const getToday = () => {
    if (typeof window !== "undefined") {
      const todayStr = new Date().toLocaleDateString("en-US", { weekday: "long" });
      return days.includes(todayStr) ? todayStr : "Monday";
    }
    return "Monday";
  };

  const [activeDay, setActiveDay] = useState(getToday());

  const activeDayData = timetable.find(t => t.day === activeDay) || { day: activeDay, slots: [] };

  const getSubjectStyles = (subject: string) => {
    const name = subject.toLowerCase();
    if (name.includes("math")) {
      return {
        badge: "bg-indigo-50 border-indigo-200 text-indigo-700",
        icon: "bg-indigo-100 text-indigo-600 border-indigo-200",
        cardBorder: "hover:border-indigo-300",
        accent: "bg-indigo-600",
      };
    }
    if (name.includes("science")) {
      return {
        badge: "bg-emerald-50 border-emerald-200 text-emerald-700",
        icon: "bg-emerald-100 text-emerald-600 border-emerald-200",
        cardBorder: "hover:border-emerald-300",
        accent: "bg-emerald-600",
      };
    }
    if (name.includes("english")) {
      return {
        badge: "bg-amber-50 border-amber-200 text-amber-700",
        icon: "bg-amber-100 text-amber-600 border-amber-200",
        cardBorder: "hover:border-amber-300",
        accent: "bg-amber-600",
      };
    }
    return {
      badge: "bg-violet-50 border-violet-200 text-violet-700",
      icon: "bg-violet-100 text-violet-600 border-violet-200",
      cardBorder: "hover:border-violet-300",
      accent: "bg-violet-600",
    };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white/70 backdrop-blur-md p-6 rounded-2xl border border-[#e8e4f3] shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-violet-50 text-violet-600 border border-violet-100">
              <Calendar size={18} />
            </span>
            <h1 className="text-[20px] font-extrabold text-slate-900 leading-tight">My Timetable</h1>
          </div>
          <p className="text-slate-500 text-[12px] font-semibold mt-1">
            Weekly schedules and classroom allocations. Accessible offline.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-[11px] font-bold text-emerald-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Sync Status: Offline Ready</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white/70 backdrop-blur-md p-1.5 rounded-2xl border border-[#e8e4f3] shadow-sm flex flex-wrap gap-1.5">
        {days.map((day) => {
          const isActive = activeDay === day;
          const slotsCount = timetable.find(t => t.day === day)?.slots.length || 0;
          return (
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              className={`flex-1 min-w-[95px] py-2.5 px-4 rounded-xl text-[12.5px] font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                isActive
                  ? "bg-violet-600 text-white shadow-md shadow-violet-200 border border-violet-600"
                  : "bg-transparent text-slate-600 hover:text-slate-950 hover:bg-slate-50 border border-transparent"
              }`}
            >
              <span>{day.substring(0, 3)}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
              }`}>
                {slotsCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* Timeline Section */}
      <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-[#e8e4f3] p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <Sparkles size={100} className="text-violet-600" />
        </div>

        <h3 className="font-extrabold text-slate-950 text-[14px] border-b border-[#f5f3fc] pb-4 flex items-center gap-2 mb-6">
          <BookOpen size={16} className="text-violet-600" />
          <span>Scheduled Classes for {activeDay}</span>
        </h3>

        {activeDayData.slots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center border border-slate-100 mb-3">
              <Calendar size={20} />
            </div>
            <p className="text-[13px] font-bold text-slate-700">No Classes Scheduled</p>
            <p className="text-[11.5px] text-slate-400 font-semibold mt-0.5">Enjoy your free day or prepare for tomorrow's lessons.</p>
          </div>
        ) : (
          <div className="relative pl-6 sm:pl-8 border-l-2 border-slate-100 space-y-6 ml-3 sm:ml-4">
            {activeDayData.slots.map((slot, idx) => {
              const styles = getSubjectStyles(slot.subject);
              return (
                <div key={idx} className="relative group">
                  {/* Timeline point */}
                  <span className={`absolute -left-[31px] sm:-left-[39px] top-1.5 w-4 h-4 rounded-full border-4 border-white shadow-sm transition-all duration-300 group-hover:scale-125 z-10 ${styles.accent}`} />
                  
                  {/* Glassmorphic Slot Card */}
                  <div className={`p-4 bg-white/90 border border-slate-100 rounded-xl shadow-sm transition-all duration-300 flex flex-col sm:flex-row sm:items-center gap-4 hover:scale-[1.01] hover:shadow-md hover:border-violet-200/80 ${styles.cardBorder}`}>
                    
                    {/* Time Slot badge */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`p-2 rounded-xl flex items-center justify-center border ${styles.icon}`}>
                        <Clock size={16} />
                      </span>
                      <span className="text-[12.5px] font-bold text-slate-700">
                        {slot.time}
                      </span>
                    </div>

                    {/* Subject info */}
                    <div className="flex-1 min-w-0 sm:border-l sm:border-slate-100 sm:pl-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-[14px] font-extrabold text-slate-900 leading-tight">
                          {slot.subject}
                        </h4>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${styles.badge}`}>
                          Core Subject
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-slate-500 font-semibold text-[11.5px]">
                        <span className="flex items-center gap-1">
                          <School size={13} className="text-slate-400" />
                          <span>Class: {slot.classroom}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin size={13} className="text-slate-400" />
                          <span>Venue: {slot.room}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
