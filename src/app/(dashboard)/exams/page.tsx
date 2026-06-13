"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { queueOperation } from "@/lib/offline/db";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getInitials } from "@/lib/utils";
import { Save, CheckCircle, ChevronLeft, ChevronRight, User, FileText } from "lucide-react";
import { useRouter } from "next/navigation";

interface ClassRoom { id: string; name: string }
interface Subject { id: string; name: string }
interface StudentRow { id: string; first_name: string; last_name: string }

function computeGrade(total: number): string {
  if (total >= 80) return "A1";
  if (total >= 75) return "B2";
  if (total >= 70) return "B3";
  if (total >= 65) return "C4";
  if (total >= 60) return "C5";
  if (total >= 55) return "C6";
  if (total >= 50) return "D7";
  if (total >= 45) return "E8";
  return "F9";
}

function gradeColor(grade: string): string {
  if (["A1","B2","B3"].includes(grade)) return "#1BD084";
  if (["C4","C5","C6"].includes(grade)) return "#F4901F";
  return "#FF394B";
}

function computeRemark(grade: string): string {
  if (["A1","B2","B3"].includes(grade)) return "Excellent";
  if (["C4","C5","C6"].includes(grade)) return "Good";
  if (grade === "D7") return "Pass";
  return "Fail";
}

type ScoreMap = Record<string, { class_score: string; exam_score: string }>;

export default function ExamsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [classId, setClassId] = useState("");
  const [selectedStudentIdx, setSelectedStudentIdx] = useState<number | null>(null);
  const [termId, setTermId] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  // scores[studentId][subjectId] = { class_score, exam_score }
  const [scores, setScores] = useState<Record<string, ScoreMap>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("school_id").eq("id", user.id).single();
      if (!profile?.school_id) return;
      setSchoolId(profile.school_id);
      const [clsRes, subRes, termRes] = await Promise.all([
        supabase.from("classrooms").select("id, name").eq("school_id", profile.school_id).order("name"),
        supabase.from("subjects").select("id, name").eq("school_id", profile.school_id).order("name"),
        supabase.from("terms").select("id").eq("school_id", profile.school_id).eq("is_current", true).single(),
      ]);
      setClasses(clsRes.data ?? []);
      setSubjects(subRes.data ?? []);
      setTermId(termRes.data?.id ?? null);
    }
    load();
  }, []);

  useEffect(() => {
    if (!classId) return;
    async function loadStudents() {
      const { data: studs } = await supabase
        .from("students").select("id, first_name, last_name")
        .eq("class_id", classId).eq("status", "active").order("last_name");
      setStudents(studs ?? []);
      setSelectedStudentIdx(studs && studs.length > 0 ? 0 : null);
      // Load all existing scores for this class
      if (studs && studs.length > 0 && termId) {
        const ids = studs.map((s: StudentRow) => s.id);
        const { data: existing } = await supabase.from("exam_scores")
          .select("student_id, subject_id, class_score, exam_score")
          .in("student_id", ids).eq("class_id", classId);
        const map: Record<string, ScoreMap> = {};
        studs.forEach((s: StudentRow) => {
          map[s.id] = {};
        });
        (existing ?? []).forEach((r: { student_id: string; subject_id: string; class_score: number | null; exam_score: number | null }) => {
          if (map[r.student_id]) {
            map[r.student_id][r.subject_id] = {
              class_score: r.class_score?.toString() ?? "",
              exam_score: r.exam_score?.toString() ?? "",
            };
          }
        });
        setScores(map);
      }
    }
    loadStudents();
  }, [classId, termId]);

  function updateScore(studentId: string, subjectId: string, field: "class_score" | "exam_score", value: string) {
    setScores((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [subjectId]: { ...(prev[studentId]?.[subjectId] ?? { class_score: "", exam_score: "" }), [field]: value } },
    }));
  }

  async function handleSave() {
    if (!classId || selectedStudentIdx === null) return;
    const student = students[selectedStudentIdx];
    if (!student) return;
    if (!termId) { setSaveErr("No current term found. Please set a current term in Settings → Academic Year."); return; }
    setSaveErr(null);
    setSaving(true);
    const subjectScores = scores[student.id] ?? {};
    const records = subjects.map((sub) => {
      const cs = parseFloat(subjectScores[sub.id]?.class_score || "0");
      const es = parseFloat(subjectScores[sub.id]?.exam_score || "0");
      const total = cs + es;
      const grade = computeGrade(total);
      return {
        school_id: schoolId,
        student_id: student.id,
        subject_id: sub.id,
        class_id: classId,
        term_id: termId,
        class_score: cs || null,
        exam_score: es || null,
        grade,
        remark: computeRemark(grade),
      };
    }).filter((r) => r.class_score !== null || r.exam_score !== null);

    if (navigator.onLine) {
      // Delete existing scores for this student+class+term, then insert fresh
      await supabase.from("exam_scores")
        .delete()
        .eq("student_id", student.id)
        .eq("class_id", classId)
        .eq("term_id", termId);
      if (records.length > 0) {
        const { error } = await supabase.from("exam_scores").insert(records);
        if (error) { setSaveErr(error.message); setSaving(false); return; }
      }
    } else {
      for (const r of records) await queueOperation("exam_scores", "insert", r);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const selectedStudent = selectedStudentIdx !== null ? students[selectedStudentIdx] : null;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-[var(--text-strong)]">Exams &amp; Scores</h2>
        <p className="text-[15px] text-[var(--text-muted)]">Class score (30%) + Exam score (70%) — grade auto-calculated</p>
      </div>

      {/* Class selector */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px] max-w-xs">
          <label className="text-[15px] font-semibold text-[var(--text-strong)] block mb-1.5">Select class</label>
          <select value={classId} onChange={(e) => { setClassId(e.target.value); setSelectedStudentIdx(null); }}
            className="h-11 w-full rounded-[10px] border border-[var(--border)] bg-white px-3.5 text-[15px] outline-none focus:border-[var(--ring)]">
            <option value="">— Select class —</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {classId && students.length === 0 && (
        <Card><p className="text-[15px] text-[var(--text-muted)] text-center py-3">No active students in this class.</p></Card>
      )}

      {classId && students.length > 0 && (
        <div className="flex gap-4 items-start">
          {/* Student list sidebar */}
          <div className="w-56 shrink-0 bg-white rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--neutral-50)]">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Students ({students.length})</p>
            </div>
            <div className="overflow-y-auto max-h-[520px]">
              {students.map((s, i) => {
                const hasScores = subjects.some((sub) => scores[s.id]?.[sub.id]?.class_score || scores[s.id]?.[sub.id]?.exam_score);
                return (
                  <button key={s.id} onClick={() => setSelectedStudentIdx(i)}
                    className={`w-full flex items-center gap-2.5 px-4 py-3 text-left border-b border-[var(--border)] last:border-0 transition-colors ${selectedStudentIdx === i ? "bg-[#ede9fe]" : "hover:bg-[var(--neutral-50)]"}`}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                      style={{ background: "linear-gradient(135deg, #262262, #92278F)" }}>
                      {getInitials(`${s.first_name} ${s.last_name}`)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-[var(--text-strong)] truncate">{s.last_name}, {s.first_name}</p>
                      {hasScores && <p className="text-[10px] text-[#1BD084] font-semibold">✓ Scored</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Score entry panel */}
          {selectedStudent && (
            <div className="flex-1 min-w-0">
              {/* Student header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold text-white shrink-0"
                  style={{ background: "linear-gradient(135deg, #262262, #92278F)" }}>
                  {getInitials(`${selectedStudent.first_name} ${selectedStudent.last_name}`)}
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-[var(--text-strong)]">{selectedStudent.first_name} {selectedStudent.last_name}</h3>
                  <p className="text-[13px] text-[var(--text-muted)]">Enter scores for each subject below</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setSelectedStudentIdx((i) => Math.max(0, (i ?? 0) - 1))}
                    disabled={selectedStudentIdx === 0}
                    className="w-8 h-8 flex items-center justify-center rounded-xl border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--neutral-50)] disabled:opacity-30">
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-[12px] text-[var(--text-muted)] font-mono">{(selectedStudentIdx ?? 0) + 1}/{students.length}</span>
                  <button onClick={() => setSelectedStudentIdx((i) => Math.min(students.length - 1, (i ?? 0) + 1))}
                    disabled={selectedStudentIdx === students.length - 1}
                    className="w-8 h-8 flex items-center justify-center rounded-xl border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--neutral-50)] disabled:opacity-30">
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              {subjects.length === 0 ? (
                <Card><p className="text-[15px] text-[var(--text-muted)] text-center py-3">No subjects set up. <a href="/settings/subjects" className="text-[var(--brand)] font-semibold">Add subjects</a> first.</p></Card>
              ) : (
                <Card padding="none">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--neutral-50)]">
                        <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Subject</th>
                        <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)] text-center">Class Score<br/><span className="text-[10px] font-normal normal-case tracking-normal">(max 30)</span></th>
                        <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)] text-center">Exam Score<br/><span className="text-[10px] font-normal normal-case tracking-normal">(max 70)</span></th>
                        <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)] text-center">Total</th>
                        <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)] text-center">Grade</th>
                        <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)] text-center">Remark</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {subjects.map((sub) => {
                        const cs = parseFloat(scores[selectedStudent.id]?.[sub.id]?.class_score || "0");
                        const es = parseFloat(scores[selectedStudent.id]?.[sub.id]?.exam_score || "0");
                        const total = cs + es;
                        const hasScore = scores[selectedStudent.id]?.[sub.id]?.class_score || scores[selectedStudent.id]?.[sub.id]?.exam_score;
                        const grade = hasScore ? computeGrade(total) : "—";
                        return (
                          <tr key={sub.id} className="hover:bg-[var(--neutral-50)]">
                            <td className="px-5 py-3 font-semibold text-[var(--text-strong)]">{sub.name}</td>
                            <td className="px-4 py-3">
                              <input type="number" min="0" max="30" step="0.5" placeholder="—"
                                className="w-20 h-9 text-center rounded-[8px] border border-[var(--border)] text-[14px] font-mono outline-none focus:border-[var(--ring)] mx-auto block"
                                value={scores[selectedStudent.id]?.[sub.id]?.class_score ?? ""}
                                onChange={(e) => updateScore(selectedStudent.id, sub.id, "class_score", e.target.value)} />
                            </td>
                            <td className="px-4 py-3">
                              <input type="number" min="0" max="70" step="0.5" placeholder="—"
                                className="w-20 h-9 text-center rounded-[8px] border border-[var(--border)] text-[14px] font-mono outline-none focus:border-[var(--ring)] mx-auto block"
                                value={scores[selectedStudent.id]?.[sub.id]?.exam_score ?? ""}
                                onChange={(e) => updateScore(selectedStudent.id, sub.id, "exam_score", e.target.value)} />
                            </td>
                            <td className="px-4 py-3 text-center font-mono font-semibold text-[var(--text-strong)]">
                              {hasScore ? total.toFixed(1) : "—"}
                            </td>
                            <td className="px-4 py-3 text-center font-mono font-bold text-base" style={{ color: grade === "—" ? "var(--text-muted)" : gradeColor(grade) }}>
                              {grade}
                            </td>
                            <td className="px-4 py-3 text-center text-[13px] text-[var(--text-muted)]">
                              {hasScore ? computeRemark(grade) : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </Card>
              )}

              <div className="mt-4 flex items-center gap-3 flex-wrap">
                <Button size="lg" onClick={handleSave} loading={saving}>
                  {saved ? <><CheckCircle size={15} /> Saved!</> : <><Save size={15} /> Save scores</>}
                </Button>
                <Button size="lg" variant="secondary" type="button"
                  onClick={() => {
                    if (!selectedStudent) return;
                    const params = new URLSearchParams({ classId, studentId: selectedStudent.id, ...(termId ? { termId } : {}) });
                    router.push(`/exams/report-card?${params.toString()}`);
                  }}>
                  <FileText size={15} /> Print Report
                </Button>
                {saveErr && <p className="text-sm text-red-600">{saveErr}</p>}
                {selectedStudentIdx !== null && selectedStudentIdx < students.length - 1 && (
                  <Button size="lg" variant="secondary" onClick={() => { handleSave(); setSelectedStudentIdx((i) => (i ?? 0) + 1); }}>
                    Save & Next student <ChevronRight size={14} />
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
