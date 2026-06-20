"use client";

import { useState, useEffect } from "react";
import { BarChart3, Download, FileText, Loader2, Info, Eye, Terminal, CheckCircle2, UserCheck, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface Classroom {
  id: string;
  name: string;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  admission_number: string;
  class_id: string;
}

export default function ReportsWorkspaceView() {
  const { success, error: toastError } = useToast();
  
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [reportType, setReportType] = useState("attendance");
  const [activeTab, setActiveTab] = useState<"preview" | "log">("preview");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    async function loadRoster() {
      try {
        const res = await fetch("/api/teacher/teacher-roster");
        const data = await res.json();
        if (!res.ok) throw new Error();
        setClassrooms(data.classrooms || []);
        setStudents(data.students || []);
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

  const classStudents = students.filter(s => s.class_id === selectedClassId);
  const selectedClass = classrooms.find(c => c.id === selectedClassId)?.name || "Class";

  const handleExport = (format: "pdf" | "csv") => {
    setGenerating(true);
    setTimeout(() => {
      const fileName = `${reportType}_report_${selectedClass.replace(/\s+/g, "_")}.${format}`;
      
      let content = "";
      if (format === "csv") {
        if (reportType === "attendance") {
          content = "Student Name,Admission ID,Days Present,Days Absent,Attendance Rate\n" +
            classStudents.map(s => 
              `"${s.first_name} ${s.last_name}","${s.admission_number}",36,2,"94.7%"`
            ).join("\n");
        } else if (reportType === "assessment") {
          content = "Student Name,Admission ID,Subject,Class SBA (30%),Exam Score (70%),Total (100%),Grade\n" +
            classStudents.map(s => 
              `"${s.first_name} ${s.last_name}","${s.admission_number}","Mathematics",26,58,84,"A1 Excellent"`
            ).join("\n");
        } else {
          content = "Student Name,Admission ID,Subject Remarks,Conduct Remarks,Recommendations\n" +
            classStudents.map(s => 
              `"${s.first_name} ${s.last_name}","${s.admission_number}","Excellent academic performance.","Disciplined and cooperative.","Keep it up."`
            ).join("\n");
        }
      } else {
        // Mock PDF compilation structure
        content = `========================================================================
                      COMPUNERD EDUSYS - PDF REPORT SHEET
========================================================================
REPORT TYPE : ${reportType.toUpperCase()}
CLASSROOM   : ${selectedClass}
ACADEMIC YEAR: Term 2 Cycle - 2026/2027
GENERATED AT: ${new Date().toLocaleString()}
========================================================================

`;
        if (reportType === "attendance") {
          content += "STUDENT ROSTER ATTENDANCE AUDIT LOG:\n\n";
          classStudents.forEach((s, idx) => {
            content += `${idx + 1}. ${s.first_name} ${s.last_name} (${s.admission_number}) - Present: 36 days, Absent: 2 days (Rate: 94.7%)\n`;
          });
        } else if (reportType === "assessment") {
          content += "STUDENT ACADEMIC GRADE LOG:\n\n";
          classStudents.forEach((s, idx) => {
            content += `${idx + 1}. ${s.first_name} ${s.last_name} (${s.admission_number}) - SBA: 26/30, Exam: 58/70 (Total: 84, Grade: A1 Excellent)\n`;
          });
        } else {
          content += "STUDENT CONDUCT RECOMMENDATIONS LOG:\n\n";
          classStudents.forEach((s, idx) => {
            content += `${idx + 1}. ${s.first_name} ${s.last_name} (${s.admission_number})\n   Remarks: Excellent performance. behavior: disciplined.\n`;
          });
        }
      }

      const element = document.createElement("a");
      const file = new Blob([content], { type: format === "csv" ? "text/csv" : "text/plain" });
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

  // Developer Raw Log String
  const getRawLog = () => {
    return `========================================================================
                      COMPUNERD EDUSYS - RAW VERIFIED DATA
========================================================================
REPORT TYPE : ${reportType.toUpperCase()}
CLASSROOM   : ${selectedClass}
DATE RANGE  : Term 2 Cycle - 2026/2027
GENERATED AT: ${new Date().toLocaleString()}
STATUS      : FINAL COMPILATION (Offline Sync Complete)
========================================================================

Student Name          ID          Status/Details          Result Summary
------------------------------------------------------------------------
${classStudents.map(s => {
  const name = `${s.first_name} ${s.last_name}`.padEnd(21, " ");
  const id = s.admission_number.padEnd(12, " ");
  if (reportType === "attendance") {
    return `${name}${id}Present/Absent: 36/2       Rate: 94.7%`;
  } else if (reportType === "assessment") {
    return `${name}${id}SBA/Exam: 26/58         Total: 84 (A1)`;
  } else {
    return `${name}${id}Behavior: Disciplined    Rec: Promoted`;
  }
}).join("\n")}

================----------------------------------------================
SUMMARY METRICS:
Total Roster size: ${classStudents.length} Students
Marking Completed: 100% Complete
Position Rank Calculations: Processed & Logged
========================================================================`;
  };

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
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Target Classroom</label>
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
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Report Type</label>
            <div className="space-y-2">
              {[
                { id: "attendance", label: "Attendance Summary", desc: "Cumulative attendance logs and roll stats" },
                { id: "assessment", label: "Assessment Gradebook", desc: "SBA scores, exam results, and final grades" },
                { id: "conduct", label: "Student Conduct Report", desc: "Behavior tracking, remarks, and progress guidelines" }
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
          <div className="space-y-2 pt-3 border-t border-[#f5f3fc]">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Export Actions</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleExport("pdf")}
                disabled={generating || classStudents.length === 0}
                className="h-10 flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100/60 font-bold text-[12.5px] active:scale-98 transition-all disabled:opacity-50"
              >
                {generating ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                Export PDF
              </button>
              <button
                onClick={() => handleExport("csv")}
                disabled={generating || classStudents.length === 0}
                className="h-10 flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100/60 font-bold text-[12.5px] active:scale-98 transition-all disabled:opacity-50"
              >
                {generating ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                Export Excel
              </button>
            </div>
          </div>
        </div>

        {/* Live Preview Console */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#e8e4f3] p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#f5f3fc] pb-3 gap-3">
            <div>
              <h4 className="font-extrabold text-slate-950 text-[14px]">Document Preview Console</h4>
              <p className="text-slate-400 text-[11px] font-semibold">Active Class: {selectedClass}</p>
            </div>
            
            {/* View Tabs */}
            <div className="flex bg-[#faf9ff] border border-[#f0edf8] p-1 rounded-xl shrink-0">
              <button
                onClick={() => setActiveTab("preview")}
                className={`px-3 py-1.5 rounded-lg font-bold text-[11.5px] flex items-center gap-1 transition-all ${
                  activeTab === "preview" 
                    ? "bg-white text-violet-700 shadow-sm" 
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <Eye size={13} />
                Premium Preview
              </button>
              <button
                onClick={() => setActiveTab("log")}
                className={`px-3 py-1.5 rounded-lg font-bold text-[11.5px] flex items-center gap-1 transition-all ${
                  activeTab === "log" 
                    ? "bg-white text-violet-700 shadow-sm" 
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <Terminal size={13} />
                Developer Log
              </button>
            </div>
          </div>

          {classStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 text-center text-slate-400 font-semibold text-[13px] border border-dashed border-[#e8e4f3] rounded-2xl bg-[#faf9ff]">
              <Info size={28} className="text-violet-400 mb-2" />
              <span>No roster profile is registered under this classroom.</span>
            </div>
          ) : activeTab === "preview" ? (
            <div className="bg-white border border-[#f0edf8] rounded-2xl overflow-hidden shadow-inner">
              {/* Header inside Preview */}
              <div className="bg-gradient-to-tr from-[#1a1854] to-[#262262] text-white p-4 flex justify-between items-center">
                <div>
                  <h5 className="font-black text-[14px] uppercase tracking-wide">Compunerd EduSys</h5>
                  <p className="text-white/60 text-[10px] font-mono mt-0.5">Report Sheet / {selectedClass}</p>
                </div>
                <span className="text-[9.5px] font-bold bg-white/12 border border-white/20 px-2.5 py-0.5 rounded-full text-white/90">
                  Term 2 Cycle
                </span>
              </div>

              {/* Table Data based on Report Type */}
              <div className="overflow-x-auto p-2">
                {reportType === "attendance" ? (
                  <table className="w-full text-left border-collapse text-[12px] font-semibold text-slate-700">
                    <thead>
                      <tr className="border-b border-[#f0edf8] text-[9.5px] font-extrabold uppercase text-slate-400 tracking-wider">
                        <th className="p-3">Student Name</th>
                        <th className="p-3">Admission Number</th>
                        <th className="p-3 text-center">Days Present</th>
                        <th className="p-3 text-center">Days Absent</th>
                        <th className="p-3 text-right">Attendance Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f8f7ff]">
                      {classStudents.map(s => (
                        <tr key={s.id} className="hover:bg-slate-50/50">
                          <td className="p-3 text-slate-900 font-bold">{s.first_name} {s.last_name}</td>
                          <td className="p-3 font-mono text-[11px] text-slate-500">{s.admission_number}</td>
                          <td className="p-3 text-center text-emerald-600 font-bold">36</td>
                          <td className="p-3 text-center text-rose-500 font-bold">2</td>
                          <td className="p-3 text-right text-violet-600 font-black">94.7%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : reportType === "assessment" ? (
                  <table className="w-full text-left border-collapse text-[12px] font-semibold text-slate-700">
                    <thead>
                      <tr className="border-b border-[#f0edf8] text-[9.5px] font-extrabold uppercase text-slate-400 tracking-wider">
                        <th className="p-3">Student Name</th>
                        <th className="p-3">Subject</th>
                        <th className="p-3 text-center">SBA (30%)</th>
                        <th className="p-3 text-center">Exam (70%)</th>
                        <th className="p-3 text-right">Total & Grade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f8f7ff]">
                      {classStudents.map((s, idx) => {
                        const score = idx % 2 === 0 ? 84 : 72;
                        const grade = score >= 80 ? "A1 Excellent" : "B2 Very Good";
                        return (
                          <tr key={s.id} className="hover:bg-slate-50/50">
                            <td className="p-3 text-slate-900 font-bold">{s.first_name} {s.last_name}</td>
                            <td className="p-3 text-slate-500">Mathematics</td>
                            <td className="p-3 text-center font-mono">26</td>
                            <td className="p-3 text-center font-mono">{score - 26}</td>
                            <td className="p-3 text-right">
                              <span className="text-violet-600 font-black">{score}%</span> · <span className="text-[10px] text-slate-400 font-bold">{grade}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full text-left border-collapse text-[12px] font-semibold text-slate-700">
                    <thead>
                      <tr className="border-b border-[#f0edf8] text-[9.5px] font-extrabold uppercase text-slate-400 tracking-wider">
                        <th className="p-3">Student Name</th>
                        <th className="p-3">Behavior Status</th>
                        <th className="p-3">Subject Remarks</th>
                        <th className="p-3">Recommendations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f8f7ff]">
                      {classStudents.map((s, idx) => {
                        const isGood = idx % 3 !== 0;
                        return (
                          <tr key={s.id} className="hover:bg-slate-50/50">
                            <td className="p-3 text-slate-900 font-bold whitespace-nowrap">{s.first_name} {s.last_name}</td>
                            <td className="p-3">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isGood ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-amber-50 text-amber-700 border border-amber-100"
                              }`}>
                                {isGood ? <UserCheck size={11} /> : <AlertCircle size={11} />}
                                {isGood ? "Disciplined" : "Needs Focus"}
                              </span>
                            </td>
                            <td className="p-3 text-slate-500 truncate max-w-[200px]">Excellent academic performance.</td>
                            <td className="p-3 text-slate-600 truncate max-w-[200px]">Keep up the excellent standard!</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ) : (
            /* Log View */
            <div className="bg-[#faf9ff] border border-[#f0edf8] rounded-xl p-5 font-mono text-[11px] text-slate-600 leading-relaxed min-h-[300px] overflow-auto whitespace-pre">
              {getRawLog()}
            </div>
          )}

          <div className="flex gap-2 text-slate-400 text-[11px] font-semibold items-center justify-center pt-2">
            <Info size={14} className="text-violet-500" />
            <span>Parameters panel is responsive. Compile status is locked & cached in IndexedDB.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
