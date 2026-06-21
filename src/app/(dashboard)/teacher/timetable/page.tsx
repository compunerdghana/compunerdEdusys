"use client";

import { useState, useEffect } from "react";
import { Clock, Calendar, BookOpen, MapPin, School, Sparkles, FileDown, FileSpreadsheet, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

export default function TimetableView() {
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState<any[]>([]);
  const [schoolInfo, setSchoolInfo] = useState<any>(null);
  const [activeDay, setActiveDay] = useState("Monday");

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  useEffect(() => {
    const supabase = createClient();
    async function loadTimetable() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        // Load school details
        const { data: profile } = await supabase.from("profiles").select("school_id").eq("id", user.id).single();
        if (profile?.school_id) {
          const { data: school } = await supabase.from("schools").select("*").eq("id", profile.school_id).single();
          if (school) setSchoolInfo(school);
        }

        // Load teacher timetable slots
        const { data: slotsData, error } = await supabase
          .from("timetable_slots")
          .select("*, timetable_periods(*), subjects(id, name), classrooms(id, name)")
          .eq("teacher_id", user.id);
          
        if (!error && slotsData) {
          setSlots(slotsData);
        }
      } catch (e) {
        console.error("Failed to load timetable:", e);
      } finally {
        setLoading(false);
      }
    }
    loadTimetable();
  }, []);

  useEffect(() => {
    // Default to today if weekday
    if (typeof window !== "undefined") {
      const todayStr = new Date().toLocaleDateString("en-US", { weekday: "long" });
      if (days.includes(todayStr)) {
        setActiveDay(todayStr);
      }
    }
  }, []);

  // Format period time helper
  function fmt12(t: string) {
    if (!t) return "";
    const [hStr, mStr] = t.split(":");
    const h = parseInt(hStr, 10);
    const m = mStr ?? "00";
    const suffix = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${m} ${suffix}`;
  }

  // Construct timetable data for rendering
  const timetableData = days.map((dayName, index) => {
    const dayNum = index + 1; // 1 = Monday, etc.
    const daySlots = slots
      .filter(s => s.day_of_week === dayNum)
      .map(s => ({
        time: s.timetable_periods ? `${fmt12(s.timetable_periods.start_time)} - ${fmt12(s.timetable_periods.end_time)}` : "N/A",
        subject: s.subjects?.name ?? "N/A",
        classroom: s.classrooms?.name ?? "N/A",
        room: s.timetable_periods?.is_break ? "Break" : "Classroom",
        isBreak: s.timetable_periods?.is_break ?? false,
        sortOrder: s.timetable_periods?.sort_order ?? 0
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder);
      
    return {
      day: dayName,
      slots: daySlots
    };
  });

  const activeDayData = timetableData.find(t => t.day === activeDay) || { day: activeDay, slots: [] };

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

  function exportTimetablePDF() {
    const doc = new jsPDF();
    
    // Draw school header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(38, 34, 98);
    doc.text(schoolInfo?.name?.toUpperCase() ?? "COMPUNERD EDUSYS SCHOOL", 14, 15);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    
    const addressStr = [
      schoolInfo?.address,
      schoolInfo?.city,
      schoolInfo?.region ? `${schoolInfo.region} Region` : null
    ].filter(Boolean).join(", ");
    
    doc.text(addressStr || "Accra, Ghana", 14, 21);
    doc.text(schoolInfo?.phone ? `Tel: ${schoolInfo.phone} | Email: ${schoolInfo.email || ""}` : "Tel: +233 24 123 4567 | Email: info@school.edu.gh", 14, 26);
    doc.text("P.O. Box GP 1234, Accra Central, Ghana", 14, 31);
    
    doc.setDrawColor(228, 226, 236);
    doc.line(14, 34, 196, 34);
    
    // Document Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(38, 34, 98);
    doc.text("TEACHER WEEKLY CLASS TIMETABLE", 14, 42);
    
    doc.setFont("helvetica", "semibold");
    doc.setFontSize(9.5);
    doc.setTextColor(50, 50, 50);
    doc.text(`Generated Date: ${new Date().toLocaleDateString()}`, 14, 48);
    
    let y = 58;
    
    timetableData.forEach((dayData) => {
      // Check if space remains
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      
      // Day Header
      doc.setFillColor(245, 243, 252);
      doc.rect(14, y, 182, 7, "F");
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(38, 34, 98);
      doc.text(dayData.day.toUpperCase(), 16, y + 5);
      
      y += 7;
      
      if (dayData.slots.length === 0) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8.5);
        doc.setTextColor(140, 140, 140);
        doc.text("No classes scheduled", 18, y + 5);
        y += 7;
      } else {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(80, 80, 80);
        
        dayData.slots.forEach((slot) => {
          doc.text(slot.time, 18, y + 5);
          doc.setFont("helvetica", "bold");
          doc.text(slot.subject, 60, y + 5);
          doc.setFont("helvetica", "normal");
          doc.text(`Class: ${slot.classroom}`, 120, y + 5);
          doc.text(`Venue: ${slot.room}`, 160, y + 5);
          
          doc.setDrawColor(248, 246, 253);
          doc.line(14, y + 7, 196, y + 7);
          y += 7;
        });
      }
      y += 3; // spacing between days
    });
    
    doc.save(`teacher_timetable.pdf`);
  }

  function exportTimetableExcel() {
    const data = [
      [schoolInfo?.name?.toUpperCase() ?? "COMPUNERD EDUSYS SCHOOL"],
      [schoolInfo?.address ?? "Accra, Ghana"],
      [`Tel: ${schoolInfo?.phone || ""} | Email: ${schoolInfo?.email || ""}`],
      ["P.O. Box GP 1234, Accra Central, Ghana"],
      [],
      ["TEACHER WEEKLY CLASS TIMETABLE"],
      [`Export Date: ${new Date().toLocaleDateString()}`],
      [],
      ["Day", "Time", "Subject", "Classroom", "Venue"]
    ];
    
    timetableData.forEach((dayData) => {
      if (dayData.slots.length === 0) {
        data.push([dayData.day, "No classes scheduled", "", "", ""]);
      } else {
        dayData.slots.forEach((slot) => {
          data.push([dayData.day, slot.time, slot.subject, slot.classroom, slot.room]);
        });
      }
    });
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Weekly Timetable");
    XLSX.writeFile(wb, `teacher_timetable.xlsx`);
  }

  if (loading) {
    return (
      <div className="py-24 text-center">
        <Loader2 size={32} className="animate-spin text-violet-600 mx-auto" />
        <p className="text-slate-400 text-[13px] font-semibold mt-3">Loading weekly schedules...</p>
      </div>
    );
  }

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
        
        <div className="flex items-center gap-2 flex-wrap">
          {slots.length > 0 && (
            <>
              <button
                onClick={exportTimetablePDF}
                className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-[12px] font-bold shadow-sm transition-all active:scale-98"
              >
                <FileDown size={14} /> PDF
              </button>
              <button
                onClick={exportTimetableExcel}
                className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-[12px] font-bold shadow-sm transition-all active:scale-98"
              >
                <FileSpreadsheet size={14} /> Excel
              </button>
            </>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-[11px] font-bold text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Sync Status: Offline Ready</span>
          </div>
        </div>
      </div>

      {slots.length === 0 ? (
        /* Empty/Fallback State */
        <div className="bg-white rounded-2xl border border-[#e8e4f3] p-12 text-center shadow-sm max-w-xl mx-auto space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 border border-amber-100 flex items-center justify-center mx-auto shadow-inner">
            <Clock size={28} />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-extrabold text-slate-900">No Timetable Configured</h3>
            <p className="text-sm text-slate-500 leading-relaxed max-w-sm mx-auto font-medium">
              Under the school guidelines, the weekly schedule and classroom layouts should be designed or drawn by your school headmaster.
            </p>
          </div>
          <div className="pt-2">
            <span className="inline-block px-4 py-2 bg-slate-50 border border-slate-100 text-slate-600 rounded-xl text-[12.5px] font-bold">
              Please contact your headmaster to configure your timetable.
            </span>
          </div>
        </div>
      ) : (
        /* Timetable Data Display */
        <>
          {/* Tabs */}
          <div className="bg-white/70 backdrop-blur-md p-1.5 rounded-2xl border border-[#e8e4f3] shadow-sm flex flex-wrap gap-1.5">
            {days.map((day) => {
              const isActive = activeDay === day;
              const slotsCount = slots.filter(s => s.day_of_week === (days.indexOf(day) + 1)).length;
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
                              {slot.isBreak ? "Break" : "Core Subject"}
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
        </>
      )}
    </div>
  );
}
