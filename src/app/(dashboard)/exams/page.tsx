"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { queueOperation } from "@/lib/offline/db";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getInitials } from "@/lib/utils";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { Save, CheckCircle, ChevronLeft, ChevronRight, FileText, Upload, Download, X, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";

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
  const importRef = useRef<HTMLInputElement>(null);

  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [classId, setClassId] = useState("");
  const [selectedStudentIdx, setSelectedStudentIdx] = useState<number | null>(null);
  const [termId, setTermId] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, ScoreMap>>({});
  const [dirtyStudents, setDirtyStudents] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  const isDirty = dirtyStudents.size > 0;
  useUnsavedChanges(isDirty);

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
      setDirtyStudents(new Set());

      if (studs && studs.length > 0) {
        const ids = studs.map((s: StudentRow) => s.id);
        const { data: existing } = await supabase.from("exam_scores")
          .select("student_id, subject_id, class_score, exam_score")
          .in("student_id", ids);
        const map: Record<string, ScoreMap> = {};
        studs.forEach((s: StudentRow) => { map[s.id] = {}; });
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
  }, [classId]);

  function updateScore(studentId: string, subjectId: string, field: "class_score" | "exam_score", value: string) {
    setScores((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [subjectId]: { ...(prev[studentId]?.[subjectId] ?? { class_score: "", exam_score: "" }), [field]: value },
      },
    }));
    setDirtyStudents((s) => new Set(s).add(studentId));
  }

  async function handleSave() {
    if (!classId || selectedStudentIdx === null) return;
    const student = students[selectedStudentIdx];
    if (!student) return;
    if (!termId) {
      setSaveErr("No current term set. Go to Settings → Academic Year and mark a term as current.");
      return;
    }
    setSaveErr(null);
    setSaving(true);

    const subjectScores = scores[student.id] ?? {};
    const scoreData = subjects.map((sub) => {
      const cs = parseFloat(subjectScores[sub.id]?.class_score || "0") || null;
      const es = parseFloat(subjectScores[sub.id]?.exam_score || "0") || null;
      const total = (cs ?? 0) + (es ?? 0);
      const grade = computeGrade(total);
      return { subject_id: sub.id, class_score: cs, exam_score: es, grade, remark: computeRemark(grade) };
    }).filter((r) => r.class_score !== null || r.exam_score !== null);

    if (navigator.onLine) {
      const res = await fetch("/api/exams/save-scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: student.id, class_id: classId, term_id: termId, school_id: schoolId, scores: scoreData }),
      });
      const json = await res.json();
      if (!res.ok) { setSaveErr(json.error ?? "Failed to save scores."); setSaving(false); return; }
    } else {
      for (const s of scoreData) {
        await queueOperation("exam_scores", "insert", { school_id: schoolId, student_id: student.id, class_id: classId, term_id: termId, ...s });
      }
    }

    setDirtyStudents((prev) => { const n = new Set(prev); n.delete(student.id); return n; });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  // Download blank template for this class
  function downloadTemplate() {
    if (!students.length || !subjects.length) return;
    const rows = students.flatMap((s) =>
      subjects.map((sub) => ({
        "Student Name": `${s.last_name} ${s.first_name}`,
        "Subject": sub.name,
        "Class Score (max 30)": "",
        "Exam Score (max 70)": "",
      }))
    );
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Scores");
    XLSX.writeFile(wb, `scores_template.xlsx`);
  }

  // Bulk import: expects columns "Student Name", "Subject", "Class Score", "Exam Score"
  async function handleBulkImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !classId) return;
    setImporting(true);
    setImportResult(null);
    e.target.value = "";

    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws);

    // Build lookup maps (case-insensitive)
    const studentMap: Record<string, string> = {};
    students.forEach((s) => {
      studentMap[`${s.last_name} ${s.first_name}`.toLowerCase()] = s.id;
      studentMap[`${s.first_name} ${s.last_name}`.toLowerCase()] = s.id;
    });
    const subjectMap: Record<string, string> = {};
    subjects.forEach((s) => { subjectMap[s.name.toLowerCase()] = s.id; });

    let matched = 0, skipped = 0;
    const newScores: Record<string, ScoreMap> = { ...scores };

    for (const row of rows) {
      const nameKey = (row["Student Name"] ?? row["student name"] ?? row["Name"] ?? "").toString().trim().toLowerCase();
      const subjKey = (row["Subject"] ?? row["subject"] ?? "").toString().trim().toLowerCase();
      const cs = (row["Class Score (max 30)"] ?? row["Class Score"] ?? row["class score"] ?? "").toString().trim();
      const es = (row["Exam Score (max 70)"] ?? row["Exam Score"] ?? row["exam score"] ?? "").toString().trim();

      const sId = studentMap[nameKey];
      const subId = subjectMap[subjKey];
      if (!sId || !subId) { skipped++; continue; }

      if (!newScores[sId]) newScores[sId] = {};
      newScores[sId][subId] = { class_score: cs, exam_score: es };
      setDirtyStudents((prev) => new Set(prev).add(sId));
      matched++;
    }

    setScores(newScores);
    setImporting(false);
    setImportResult(`Imported ${matched} score rows. ${skipped > 0 ? `${skipped} rows skipped (name/subject not found).` : ""}`);
  }

  const selectedStudent = selectedStudentIdx !== null ? students[selectedStudentIdx] : null;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-strong)]">Exams &amp; Scores</h2>
          <p className="text-[13px] text-[var(--text-muted)]">Class score (30%) + Exam score (70%) — grade auto-calculated</p>
        </div>
        {classId && students.length > 0 && (
          <div className="flex gap-2">
            <input ref={importRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleBulkImport} />
            <button onClick={downloadTemplate} title="Download blank Excel template"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border)] bg-white text-[13px] font-semibold text-[var(--text-muted)] hover:bg-[var(--neutral-50)]">
              <Download size={14} /> Template
            </button>
            <button onClick={() => importRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border)] bg-white text-[13px] font-semibold text-[var(--text-muted)] hover:bg-[var(--neutral-50)]"
              disabled={importing}>
              <Upload size={14} /> {importing ? "Importing…" : "Import Excel / CSV"}
            </button>
          </div>
        )}
      </div>

      {/* Unsaved changes banner */}
      {isDirty && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-[13px] font-semibold"
          style={{ background: "#FEF3C7", color: "#92400E", border: "1px solid #FDE68A" }}>
          <AlertTriangle size={15} />
          You have unsaved changes — save before leaving this page.
        </div>
      )}

      {importResult && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-[13px]"
          style={{ background: "#D1FAE5", color: "#065F46", border: "1px solid #A7F3D0" }}>
          <CheckCircle size={14} /> {importResult}
          <button onClick={() => setImportResult(null)} className="ml-auto"><X size={13} /></button>
        </div>
      )}

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
        {!termId && classId && (
          <p className="text-[13px] text-amber-600 font-medium">⚠ No current term set — go to Settings → Academic Year first.</p>
        )}
      </div>

      {classId && students.length === 0 && (
        <Card><p className="text-[15px] text-[var(--text-muted)] text-center py-3">No active students in this class.</p></Card>
      )}

      {classId && students.length > 0 && (
        <div className="flex gap-4 items-start">
          {/* Student list */}
          <div className="w-56 shrink-0 bg-white rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--neutral-50)]">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Students ({students.length})</p>
            </div>
            <div className="overflow-y-auto max-h-[520px]">
              {students.map((s, i) => {
                const hasScores = subjects.some((sub) => scores[s.id]?.[sub.id]?.class_score || scores[s.id]?.[sub.id]?.exam_score);
                const isDirtyStudent = dirtyStudents.has(s.id);
                return (
                  <button key={s.id} onClick={() => setSelectedStudentIdx(i)}
                    className={`w-full flex items-center gap-2.5 px-4 py-3 text-left border-b border-[var(--border)] last:border-0 transition-colors ${selectedStudentIdx === i ? "bg-[#ede9fe]" : "hover:bg-[var(--neutral-50)]"}`}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                      style={{ background: "linear-gradient(135deg, #262262, #92278F)" }}>
                      {getInitials(`${s.first_name} ${s.last_name}`)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-[var(--text-strong)] truncate">{s.last_name}, {s.first_name}</p>
                      {isDirtyStudent && <p className="text-[10px] text-amber-500 font-semibold">● Unsaved</p>}
                      {!isDirtyStudent && hasScores && <p className="text-[10px] text-[#1BD084] font-semibold">✓ Saved</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Score entry */}
          {selectedStudent && (
            <div className="flex-1 min-w-0">
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
                        <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)] text-center">Class Score<br/><span className="text-[10px] font-normal normal-case">(max 30)</span></th>
                        <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)] text-center">Exam Score<br/><span className="text-[10px] font-normal normal-case">(max 70)</span></th>
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
                <Button size="lg" onClick={handleSave} loading={saving}
                  style={{ background: "linear-gradient(135deg,#262262,#92278F)" }}>
                  {saved ? <><CheckCircle size={15} /> Saved!</> : <><Save size={15} /> Save scores</>}
                </Button>
                {selectedStudentIdx !== null && selectedStudentIdx < students.length - 1 && (
                  <Button size="lg" variant="secondary" onClick={async () => { await handleSave(); setSelectedStudentIdx((i) => (i ?? 0) + 1); }}>
                    Save &amp; Next <ChevronRight size={14} />
                  </Button>
                )}
                <Button size="lg" variant="secondary" type="button"
                  onClick={() => {
                    if (!selectedStudent) return;
                    const params = new URLSearchParams({ classId, studentId: selectedStudent.id, ...(termId ? { termId } : {}) });
                    router.push(`/exams/report-card?${params.toString()}`);
                  }}>
                  <FileText size={15} /> Print Report
                </Button>
                {saveErr && (
                  <div className="w-full flex items-start gap-2 px-4 py-3 rounded-xl text-[13px]"
                    style={{ background: "#FEE2E2", color: "#991B1B", border: "1px solid #FCA5A5" }}>
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <span>{saveErr}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
