"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { queueOperation } from "@/lib/offline/db";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getInitials } from "@/lib/utils";
import { Save, CheckCircle } from "lucide-react";

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
  if (["A1","B2","B3"].includes(grade)) return "var(--success)";
  if (["C4","C5","C6"].includes(grade)) return "var(--warning)";
  return "var(--danger)";
}

function computeRemark(grade: string): string {
  if (["A1","B2","B3"].includes(grade)) return "Excellent";
  if (["C4","C5","C6"].includes(grade)) return "Good";
  if (grade === "D7") return "Pass";
  return "Fail";
}

export default function ExamsPage() {
  const supabase = createClient();
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [termId, setTermId] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, { class_score: string; exam_score: string }>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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

  // Load students + existing scores when class or subject changes
  useEffect(() => {
    if (!classId) return;
    async function loadStudents() {
      const { data: studs } = await supabase
        .from("students").select("id, first_name, last_name")
        .eq("class_id", classId).eq("status", "active").order("last_name");
      setStudents(studs ?? []);
      const init: Record<string, { class_score: string; exam_score: string }> = {};
      (studs ?? []).forEach((s: StudentRow) => { init[s.id] = { class_score: "", exam_score: "" }; });
      setScores(init);
    }
    loadStudents();
  }, [classId]);

  // Load existing scores when subject is also selected
  useEffect(() => {
    if (!classId || !subjectId || !termId) return;
    async function loadExisting() {
      const { data } = await supabase.from("exam_scores")
        .select("student_id, class_score, exam_score")
        .eq("class_id", classId).eq("subject_id", subjectId).eq("term_id", termId);
      if (!data?.length) return;
      setScores((prev) => {
        const next = { ...prev };
        data.forEach((r: { student_id: string; class_score: number | null; exam_score: number | null }) => {
          if (next[r.student_id]) {
            next[r.student_id] = {
              class_score: r.class_score?.toString() ?? "",
              exam_score: r.exam_score?.toString() ?? "",
            };
          }
        });
        return next;
      });
    }
    loadExisting();
  }, [classId, subjectId, termId]);

  function updateScore(studentId: string, field: "class_score" | "exam_score", value: string) {
    setScores((prev) => ({ ...prev, [studentId]: { ...prev[studentId], [field]: value } }));
  }

  async function handleSave() {
    if (!classId || !subjectId) return;
    setSaving(true);
    const records = students.map((s) => {
      const cs = parseFloat(scores[s.id]?.class_score || "0");
      const es = parseFloat(scores[s.id]?.exam_score || "0");
      const total = cs + es;
      const grade = computeGrade(total);
      return {
        id: crypto.randomUUID(),
        school_id: schoolId,
        student_id: s.id,
        subject_id: subjectId,
        class_id: classId,
        term_id: termId,
        class_score: cs || null,
        exam_score: es || null,
        total: total || null,
        grade,
        remark: computeRemark(grade),
      };
    });
    if (navigator.onLine) {
      await supabase.from("exam_scores").upsert(records, { onConflict: "student_id,subject_id,term_id" });
    } else {
      for (const r of records) await queueOperation("exam_scores", "insert", r);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const ready = classId && subjectId && students.length > 0;

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h2 className="text-xl font-bold text-[var(--text-strong)]">Exams &amp; scores</h2>
        <p className="text-[15px] text-[var(--text-muted)]">Class score (30%) + exam score (70%) — grade auto-calculated</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[140px]">
          <label className="text-[15px] font-semibold text-[var(--text-strong)] block mb-1.5">Class</label>
          <select value={classId} onChange={(e) => setClassId(e.target.value)}
            className="h-11 w-full rounded-[10px] border border-[var(--border)] bg-white px-3.5 text-[15px] outline-none focus:border-[var(--ring)]">
            <option value="">— Select class —</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="text-[15px] font-semibold text-[var(--text-strong)] block mb-1.5">Subject</label>
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}
            className="h-11 w-full rounded-[10px] border border-[var(--border)] bg-white px-3.5 text-[15px] outline-none focus:border-[var(--ring)]">
            <option value="">— Select subject —</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {classId && students.length === 0 && (
        <Card><p className="text-[15px] text-[var(--text-muted)] text-center py-3">No active students in this class.</p></Card>
      )}

      {ready && (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block">
            <Card padding="none">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Student</th>
                    <th className="px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] text-center">Class (30)</th>
                    <th className="px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] text-center">Exam (70)</th>
                    <th className="px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] text-center">Total</th>
                    <th className="px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] text-center">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {students.map((s) => {
                    const cs = parseFloat(scores[s.id]?.class_score || "0");
                    const es = parseFloat(scores[s.id]?.exam_score || "0");
                    const total = cs + es;
                    const grade = (cs || es) ? computeGrade(total) : "—";
                    return (
                      <tr key={s.id} className="hover:bg-[var(--neutral-50)]">
                        <td className="px-4 py-3 font-medium text-[var(--text-strong)]">{s.last_name}, {s.first_name}</td>
                        <td className="px-3 py-3">
                          <input type="number" min="0" max="30" step="0.5"
                            className="w-20 h-9 text-center rounded-[8px] border border-[var(--border)] text-[15px] font-mono outline-none focus:border-[var(--ring)] mx-auto block"
                            value={scores[s.id]?.class_score ?? ""}
                            onChange={(e) => updateScore(s.id, "class_score", e.target.value)} />
                        </td>
                        <td className="px-3 py-3">
                          <input type="number" min="0" max="70" step="0.5"
                            className="w-20 h-9 text-center rounded-[8px] border border-[var(--border)] text-[15px] font-mono outline-none focus:border-[var(--ring)] mx-auto block"
                            value={scores[s.id]?.exam_score ?? ""}
                            onChange={(e) => updateScore(s.id, "exam_score", e.target.value)} />
                        </td>
                        <td className="px-3 py-3 text-center font-mono font-semibold text-[var(--text-strong)]">
                          {(cs || es) ? total.toFixed(1) : "—"}
                        </td>
                        <td className="px-3 py-3 text-center font-mono font-bold" style={{ color: grade === "—" ? "var(--text-muted)" : gradeColor(grade) }}>
                          {grade}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-2">
            {students.map((s) => {
              const cs = parseFloat(scores[s.id]?.class_score || "0");
              const es = parseFloat(scores[s.id]?.exam_score || "0");
              const total = cs + es;
              const grade = (cs || es) ? computeGrade(total) : "—";
              return (
                <div key={s.id} className="bg-white border border-[var(--border)] rounded-[12px] p-3 shadow-[var(--shadow-sm)]">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: "var(--gradient-brand)" }}>
                      {getInitials(`${s.first_name} ${s.last_name}`)}
                    </div>
                    <span className="font-semibold text-[var(--text-strong)] text-[15px]">{s.last_name}, {s.first_name}</span>
                    {grade !== "—" && (
                      <span className="ml-auto font-mono font-bold text-base" style={{ color: gradeColor(grade) }}>{grade} · {total.toFixed(1)}</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-[var(--text-muted)] font-semibold block mb-1">Class score (max 30)</label>
                      <input type="number" min="0" max="30" step="0.5" placeholder="0"
                        className="h-10 w-full text-center rounded-[8px] border border-[var(--border)] text-[15px] font-mono outline-none focus:border-[var(--ring)]"
                        value={scores[s.id]?.class_score ?? ""}
                        onChange={(e) => updateScore(s.id, "class_score", e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs text-[var(--text-muted)] font-semibold block mb-1">Exam score (max 70)</label>
                      <input type="number" min="0" max="70" step="0.5" placeholder="0"
                        className="h-10 w-full text-center rounded-[8px] border border-[var(--border)] text-[15px] font-mono outline-none focus:border-[var(--ring)]"
                        value={scores[s.id]?.exam_score ?? ""}
                        onChange={(e) => updateScore(s.id, "exam_score", e.target.value)} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Button size="lg" onClick={handleSave} loading={saving} className="w-full sm:w-auto">
            {saved ? <><CheckCircle size={15} /> Scores saved</> : <><Save size={15} /> Save scores</>}
          </Button>
        </>
      )}
    </div>
  );
}
