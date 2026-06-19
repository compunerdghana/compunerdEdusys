"use client";

import { useState, useEffect } from "react";
import { BarChart3, Download, FileText, Loader2, Calendar, FileSpreadsheet, CheckCircle2, ChevronRight, Info } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface Classroom {
  id: string;
  name: string;
}

export default function ReportsWorkspaceView() {
  const { success, error: toastError } = useToast();
  
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [reportType, setReportType] = useState("attendance");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    async function loadRoster() {
      try {
        const res = await fetch("/api/teacher/teacher-roster");
        const data = await res.json();
        if (!res.ok) throw new Error();
        setClassrooms(data.classrooms || []);
        if (data.classrooms && data.classrooms.length > 0) {
          setSelectedClassId(data.classrooms[0].id);
        }
      } catch {
        toastError("Failed to fetch classrooms for reporting.");
      } finally {
        setLoading(false);
      }
    }
    loadRoster();
  }, [toastError]);

  const handleExport = (format: "pdf" | "csv") => {
    setGenerating(true);
    setTimeout(() => {
      // Create mock file download trigger
      const selectedClass = classrooms.find(c => c.id === selectedClassId)?.name || "Class";
      const fileName = `${reportType}_report_${selectedClass.replace(/\s+/g, "_")}.${format}`;
      
      const element = document.createElement("a");
      const file = new Blob([`Mock Report Content for ${selectedClass} - Type: ${reportType}`], { type: "text/plain" });
      element.href = URL.createObjectURL(file);
      element.download = fileName;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);

      success(`Successfully exported ${reportType.toUpperCase()} report as ${format.toUpperCase()}!`);
      setGenerating(false);
    }, 1200);
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <Loader2 size={32} className="animate-spin text-violet-600 mx-auto" />
        <p className="text-slate-400 text-[13px] font-semibold mt-3">Loading reporting center...</p>
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
              <BarChart3 size={18} />
            </span>
            <h1 className="text-[20px] font-extrabold text-slate-900 leading-tight">Reports Workspace</h1>
          </div>
          <p className="text-slate-500 text-[12px] font-semibold mt-1">
            Generate, preview, and export classroom rosters, attendance summaries, and continuous assessment reports.
          </p>
        </div>
      </div>

      {/* Grid Configuration Options */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Controls Card */}
        <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-[#e8e4f3] p-5 shadow-sm space-y-4">
          <h3 className="font-extrabold text-slate-900 text-[14px] border-b border-[#f5f3fc] pb-3 flex items-center gap-2">
            <FileText size={16} className="text-violet-600" />
            Report Parameters
          </h3>

          {/* Classroom selection */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Target Classroom</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-[#e0daf0] text-[12.5px] font-semibold text-slate-700 outline-none focus:border-[#7c3aed] bg-white transition-all"
            >
              {classrooms.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Report type selection */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Report Type</label>
            <div className="space-y-2">
              {[
                { id: "attendance", label: "Attendance Summary", desc: "Includes cumulative stats and roll logs" },
                { id: "assessment", label: "Assessment Gradebook", desc: "Includes SBA scores and subject exams" },
                { id: "conduct", label: "Student Conduct Report", desc: "Includes behavior notes and recommendations" }
              ].map(t => (
                <label
                  key={t.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    reportType === t.id
                      ? "bg-violet-50/50 border-violet-200 text-violet-950 font-semibold"
                      : "bg-transparent border-slate-100 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="reportType"
                    checked={reportType === t.id}
                    onChange={() => setReportType(t.id)}
                    className="mt-0.5 text-violet-600 focus:ring-violet-500/20"
                  />
                  <div>
                    <p className="text-[12.5px] font-bold">{t.label}</p>
                    <p className="text-[10.5px] text-slate-400 font-semibold mt-0.5">{t.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Trigger Exports */}
          <div className="space-y-2 pt-2 border-t border-[#f5f3fc]">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Export Actions</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleExport("pdf")}
                disabled={generating || classrooms.length === 0}
                className="h-10 flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100/60 font-bold text-[12px] active:scale-98 transition-all disabled:opacity-50"
              >
                {generating ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                Export PDF
              </button>
              <button
                onClick={() => handleExport("csv")}
                disabled={generating || classrooms.length === 0}
                className="h-10 flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100/60 font-bold text-[12px] active:scale-98 transition-all disabled:opacity-50"
              >
                {generating ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                Export Excel
              </button>
            </div>
          </div>
        </div>

        {/* Live Preview Console */}
        <div className="lg:col-span-2 bg-white/70 backdrop-blur-sm rounded-2xl border border-[#e8e4f3] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#f5f3fc] pb-3">
            <h4 className="font-extrabold text-slate-950 text-[14px]">Document Preview Console</h4>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100/50 px-2.5 py-0.5 rounded-full">
              Ready to Export
            </span>
          </div>

          {/* Dynamic Preview Content */}
          <div className="bg-[#faf9ff] border border-[#f0edf8] rounded-xl p-5 font-mono text-[11px] text-slate-600 leading-relaxed min-h-[300px] overflow-auto whitespace-pre">
            {`========================================================================
                          COMPUNERD EDUSYS - REPORT SHEET
========================================================================
REPORT TYPE : ${reportType.toUpperCase()}
CLASSROOM   : ${classrooms.find(c => c.id === selectedClassId)?.name || "All Assigned"}
DATE RANGE  : Term 2 Cycle - 2026/2027
GENERATED AT: ${new Date().toLocaleString()}
STATUS      : FINAL COMPILATION (Offline Sync Complete)
========================================================================

Student Name          ID          Status/Details          Result Summary
------------------------------------------------------------------------
Kofi Mensah           TCH041      Class SBA: 27/30        A1 Excellent
Ama Serwaah           TCH048      Class SBA: 24/30        B2 Very Good
Kwame Boateng         TCH052      Class SBA: 18/30        B3 Good
Yaa Asantewaa         TCH061      Class SBA: 29/30        A1 Excellent
Abena Osei            TCH073      Class SBA: 14/30        C4 Pass

================----------------------------------------================
SUMMARY METRICS:
Total Roster size: 18 Students
Marking Completed: 100% Complete
Position Rank Calculations: Processed & Logged
========================================================================`}
          </div>

          <div className="flex gap-2 text-slate-400 text-[11px] font-semibold items-center justify-center pt-2">
            <Info size={14} className="text-violet-500" />
            <span>Click export actions on the parameter panel to download compiled files.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
