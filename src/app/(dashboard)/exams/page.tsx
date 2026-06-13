"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { queueOperation } from "@/lib/offline/db";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { Save } from "lucide-react";

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

function computeRemark(grade: string): string {
  if (["A1","B2","B3"].includes(grade)) return "Excellent";
  if (["C4","C5","C6"].includes(grade)) return "Good";
  if (grade === "D7") return "Pass";
  return "Fail";
}

export default function ExamsPage() {
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
      const supabase = createClient();
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
      const supabase = createClient();
      const { data } = await supabase
        .from("students")
        .select("id, first_name, last_name")
        .eq("class_id", classId)
        .eq("status", "active")
        .order("last_name");
      setStudents(data ?? []);
      const init: Record<string, { class_score: string; exam_score: string }> = {};
      (data ?? []).forEach((s: StudentRow) => { init[s.id] = { class_score: "", exam_score: "" }; });
      setScores(init);
    }
    loadStudents();
  }, [classId]);

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
      const supabase = createClient();
      await supabase.from("exam_scores").upsert(records, { onConflict: "student_id,subject_id,term_id" });
    } else {
      for (const r of records) {
        await queueOperation("exam_scores", "insert", r);
      }
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="max-w-5xl space-y-5">
      <div>
        <h2 className="text-xl font-bold text-[var(--text-strong)]">Exams & scores</h2>
        <p className="text-sm text-[var(--text-muted)]">Enter class scores (30%) and exam scores (70%) — totals and grades are automatic</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="w-48">
          <Select label="Class" value={classId} onChange={(e) => setClassId(e.target.value)} placeholder="Select class" options={classes.map((c) => ({ value: c.id, label: c.name }))} />
        </div>
        <div className="w-48">
          <Select label="Subject" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} placeholder="Select subject" options={subjects.map((s) => ({ value: s.id, label: s.name }))} />
        </div>
      </div>

      {students.length > 0 && classId && subjectId && (
        <>
          <Card padding="none">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Student</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] text-center">Class score<br/><span className="font-normal normal-case">(max 30)</span></th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] text-center">Exam score<br/><span className="font-normal normal-case">(max 70)</span></th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] text-center">Total</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] text-center">Grade</th>
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
                        <td className="px-4 py-3 font-medium text-[var(--text-strong)]">{s.first_name} {s.last_name}</td>
                        <td className="px-4 py-3">
                          <input
                            type="number" min="0" max="30" step="0.5"
                            className="w-20 h-8 text-center rounded-[8px] border border-[var(--border)] text-sm font-mono outline-none focus:border-[var(--ring)] mx-auto block"
                            value={scores[s.id]?.class_score ?? ""}
                            onChange={(e) => updateScore(s.id, "class_score", e.target.value)}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number" min="0" max="70" step="0.5"
                            className="w-20 h-8 text-center rounded-[8px] border border-[var(--border)] text-sm font-mono outline-none focus:border-[var(--ring)] mx-auto block"
                            value={scores[s.id]?.exam_score ?? ""}
                            onChange={(e) => updateScore(s.id, "exam_score", e.target.value)}
                          />
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-semibold text-[var(--text-strong)]">
                          {(cs || es) ? total.toFixed(1) : "—"}
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-[var(--brand)]">{grade}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Button size="lg" onClick={handleSave} loading={saving}>
            <Save size={15} />
            {saved ? "Scores saved" : "Save scores"}
          </Button>
        </>
      )}
    </div>
  );
}
