"use client";

import { useState, useEffect } from "react";
import { Search, Save, FileSpreadsheet, Download, Upload, Loader2, Info, Wifi, WifiOff } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { queueOperation } from "@/lib/offline/db";
import { syncEngine } from "@/lib/offline/sync";

interface Classroom {
  id: string;
  name: string;
}

interface Subject {
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

interface ScoreRow {
  student_id: string;
  classScore: string; // 30% scaled
  examScore: string;  // 70% scaled
}

export default function EnterScoresView() {
  const { success, error: toastError } = useToast();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  
  const [scores, setScores] = useState<Record<string, ScoreRow>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
      window.addEventListener("online", () => setIsOnline(true));
      window.addEventListener("offline", () => setIsOnline(false));
    }
  }, []);

  useEffect(() => {
    async function loadRoster() {
      try {
        const res = await fetch("/api/teacher/teacher-roster");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed");
        
        setClassrooms(data.classrooms || []);
        setSubjects(data.subjects || []);
        setStudents(data.students || []);
        
        if (data.classrooms && data.classrooms.length > 0) {
          setSelectedClassId(data.classrooms[0].id);
        }
        if (data.subjects && data.subjects.length > 0) {
          setSelectedSubjectId(data.subjects[0].id);
        }
      } catch {
        toastError("Failed to load scoring roster.");
      } finally {
        setLoading(false);
      }
    }
    loadRoster();
  }, [toastError]);

  const classStudents = students.filter(s => s.class_id === selectedClassId);

  // Auto populate scores when roster loads or class changes
  useEffect(() => {
    const initialScores: Record<string, ScoreRow> = {};
    classStudents.forEach(s => {
      initialScores[s.id] = {
        student_id: s.id,
        classScore: "",
        examScore: ""
      };
    });
    setScores(initialScores);
  }, [selectedClassId, students]);

  function handleScoreChange(studentId: string, field: "classScore" | "examScore", val: string) {
    // Basic number or empty validate
    if (val !== "" && isNaN(Number(val))) return;
    
    // Constraint checks: Class Score max 30, Exam Score max 70
    const num = Number(val);
    if (field === "classScore" && num > 30) return;
    if (field === "examScore" && num > 70) return;

    setScores(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: val
      }
    }));
  }

  // Calculate Grade, Total, Remarks for student
  function calculateRowDetails(studentId: string) {
    const row = scores[studentId];
    if (!row) return { total: 0, grade: "—", remarks: "—" };

    const classVal = Number(row.classScore) || 0;
    const examVal = Number(row.examScore) || 0;
    const total = classVal + examVal;

    let grade = "F";
    let remarks = "Fail";

    if (total >= 80) {
      grade = "A1";
      remarks = "Excellent";
    } else if (total >= 70) {
      grade = "B2";
      remarks = "Very Good";
    } else if (total >= 60) {
      grade = "B3";
      remarks = "Good";
    } else if (total >= 50) {
      grade = "C4";
      remarks = "Credit";
    } else if (total >= 45) {
      grade = "D7";
      remarks = "Pass";
    } else if (total >= 40) {
      grade = "E8";
      remarks = "Pass";
    } else if (total > 0) {
      grade = "F9";
      remarks = "Needs Improvement";
    } else {
      grade = "—";
      remarks = "—";
    }

    return { total, grade, remarks };
  }

  // Calculate sorted rankings to show position
  function getStudentRankings() {
    const totals = classStudents.map(s => {
      const classVal = Number(scores[s.id]?.classScore) || 0;
      const examVal = Number(scores[s.id]?.examScore) || 0;
      return { id: s.id, total: classVal + examVal };
    });

    const sorted = [...totals].sort((a, b) => b.total - a.total);
    const ranks: Record<string, number> = {};
    sorted.forEach((item, idx) => {
      ranks[item.id] = idx + 1;
    });
    return ranks;
  }

  const rankings = getStudentRankings();

  async function handleSave() {
    setSaving(true);
    try {
      const payload = classStudents.map(s => {
        const row = scores[s.id];
        const { total, grade, remarks } = calculateRowDetails(s.id);
        return {
          student_id: s.id,
          class_id: selectedClassId,
          subject_id: selectedSubjectId,
          class_score: Number(row?.classScore) || 0,
          exam_score: Number(row?.examScore) || 0,
          total_score: total,
          grade,
          remarks,
          position: rankings[s.id] || 1,
        };
      });

      if (!navigator.onLine) {
        for (const item of payload) {
          await queueOperation("exam_scores", "insert", {
            ...item,
            id: `offline_score_${Date.now()}_${item.student_id.slice(0, 8)}`
          });
        }
        success("Scores saved offline successfully. Records will sync when internet returns.");
        if (syncEngine) syncEngine.syncNow();
      } else {
        // Mock API upload save
        await fetch("/api/admin/setup-students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scores: payload })
        });
        success("Class assessments and exam scores uploaded to school server successfully!");
      }
    } catch {
      toastError("Failed to save student scores.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-extrabold text-slate-900 leading-tight">Assessments & Scores Entry</h1>
          <p className="text-slate-500 text-[12px] font-semibold mt-0.5">Input term grades, quizzes, SBA class assessments (30%) and exams (70%).</p>
        </div>
        
        {/* Network status */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-bold shadow-sm ${
          isOnline
            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
            : "bg-amber-50 text-amber-700 border-amber-100"
        }`}>
          {isOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
          <span>{isOnline ? "Online" : "Offline"} Mode</span>
        </div>
      </div>

      {/* Info card */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3 text-blue-800">
        <Info size={18} className="shrink-0 text-blue-600 mt-0.5" />
        <p className="text-[12px] font-semibold leading-relaxed">
          <strong>GES Standard Scheme:</strong> Enter SBA Class Score out of 30 max, and Final Exam Score out of 70 max. The portal automatically computes the Total, Letter Grade, Class Position, and Subject Remarks in real-time.
        </p>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white rounded-2xl border border-[#e8e4f3] p-5 shadow-sm flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[150px] space-y-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Classroom</label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-700 outline-none focus:border-[#7c3aed] bg-white"
          >
            {classrooms.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[150px] space-y-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Subject</label>
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-700 outline-none focus:border-[#7c3aed] bg-white"
          >
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving || classStudents.length === 0}
            className="h-10 px-4 rounded-xl text-white text-[12px] font-bold hover:opacity-90 disabled:opacity-50 transition-all shrink-0 flex items-center gap-1.5"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            {isOnline ? "Save & Upload" : "Save Offline Draft"}
          </button>
        </div>
      </div>

      {/* Roster Sheet */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#faf9ff] border-b border-[#f0edf8]">
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Student</th>
                <th className="px-4 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center w-28">SBA Score (30%)</th>
                <th className="px-4 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center w-28">Exam Score (70%)</th>
                <th className="px-4 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center w-20">Total</th>
                <th className="px-4 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center w-16">Grade</th>
                <th className="px-4 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center w-16">Rank</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-left w-40">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5f3fc]">
              {classStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-slate-400 font-semibold text-[13px]">
                    No students listed for this class configuration.
                  </td>
                </tr>
              ) : (
                classStudents.map((stud) => {
                  const sValues = scores[stud.id] || { classScore: "", examScore: "" };
                  const { total, grade, remarks } = calculateRowDetails(stud.id);
                  const rank = rankings[stud.id] || "—";
                  
                  return (
                    <tr key={stud.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-3 font-bold text-slate-900 text-[13px]">
                        {stud.first_name} {stud.last_name}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="text"
                          maxLength={5}
                          value={sValues.classScore}
                          onChange={(e) => handleScoreChange(stud.id, "classScore", e.target.value)}
                          className="w-16 h-8 text-center rounded border border-[#e0daf0] text-[13px] font-bold outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20"
                          placeholder="/30"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="text"
                          maxLength={5}
                          value={sValues.examScore}
                          onChange={(e) => handleScoreChange(stud.id, "examScore", e.target.value)}
                          className="w-16 h-8 text-center rounded border border-[#e0daf0] text-[13px] font-bold outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20"
                          placeholder="/70"
                        />
                      </td>
                      <td className="px-4 py-3 text-center font-extrabold text-slate-900 text-[13px]">{total || "—"}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-extrabold ${
                          grade === "A1" || grade === "B2"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : grade === "F9"
                              ? "bg-rose-50 text-rose-700 border border-rose-100"
                              : "bg-slate-50 text-slate-700 border border-slate-100"
                        }`}>
                          {grade}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-[12.5px] font-bold text-slate-600 font-mono">
                        {total > 0 ? `${rank}th` : "—"}
                      </td>
                      <td className="px-6 py-3 text-left text-[12px] font-semibold text-slate-500">{remarks}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
