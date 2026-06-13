"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getInitials } from "@/lib/utils";
import { Printer, Download, Upload, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";

interface School { name: string; address: string | null; phone: string | null; logo_url: string | null; motto: string | null }
interface ClassRoom { id: string; name: string; level: string }
interface Subject { id: string; name: string }
interface StudentRow { id: string; first_name: string; middle_name: string | null; last_name: string; date_of_birth: string | null; gender: string | null; photo_url: string | null; admission_number: string }
interface ScoreRow { subject_id: string; class_score: number | null; exam_score: number | null; total: number | null; grade: string | null; remark: string | null }
interface Term { id: string; name: string; start_date: string; end_date: string }
interface AcademicYear { name: string }

function gradeColor(grade: string | null) {
  if (!grade) return "inherit";
  if (["A1","B2","B3"].includes(grade)) return "#16a34a";
  if (["C4","C5","C6"].includes(grade)) return "#d97706";
  return "#dc2626";
}

function computeGrade(total: number): string {
  if (total >= 80) return "A1"; if (total >= 75) return "B2"; if (total >= 70) return "B3";
  if (total >= 65) return "C4"; if (total >= 60) return "C5"; if (total >= 55) return "C6";
  if (total >= 50) return "D7"; if (total >= 45) return "E8"; return "F9";
}
function computeRemark(grade: string): string {
  if (["A1","B2","B3"].includes(grade)) return "Excellent";
  if (["C4","C5","C6"].includes(grade)) return "Good";
  if (grade === "D7") return "Pass"; return "Fail";
}

export default function ReportCardPage() {
  const supabase = createClient();
  const reportRef = useRef<HTMLDivElement>(null);
  const xlsxRef = useRef<HTMLInputElement>(null);

  const [school, setSchool] = useState<School | null>(null);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [academicYear, setAcademicYear] = useState<AcademicYear | null>(null);
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [termId, setTermId] = useState("");
  const [scores, setScores] = useState<Record<string, ScoreRow>>({});
  const [teacherRemark, setTeacherRemark] = useState("");
  const [nextTermResumes, setNextTermResumes] = useState("");
  const [classTeacher, setClassTeacher] = useState("");
  const [headmaster, setHeadmaster] = useState("");
  const [printing, setPrinting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("school_id, full_name, role").eq("id", user.id).single();
      if (!profile?.school_id) return;
      const sId = profile.school_id;

      const [schoolRes, clsRes, subRes, termRes, yearRes] = await Promise.all([
        supabase.from("schools").select("name, address, phone, logo_url, motto").eq("id", sId).single(),
        supabase.from("classrooms").select("id, name, level").eq("school_id", sId).order("name"),
        supabase.from("subjects").select("id, name").eq("school_id", sId).order("name"),
        supabase.from("terms").select("id, name, start_date, end_date").eq("school_id", sId).order("start_date"),
        supabase.from("academic_years").select("name").eq("school_id", sId).eq("is_current", true).single(),
      ]);

      setSchool(schoolRes.data ?? null);
      setClasses(clsRes.data ?? []);
      setSubjects(subRes.data ?? []);
      setTerms(termRes.data ?? []);
      setAcademicYear(yearRes.data ?? null);

      // Auto-select current term
      const currentTerm = (termRes.data ?? []).find((t: Term) => {
        const now = new Date();
        return new Date(t.start_date) <= now && new Date(t.end_date) >= now;
      });
      if (currentTerm) setTermId(currentTerm.id);

      // Pre-fill headmaster name
      if (profile.role === "headmaster" || profile.role === "owner") {
        setHeadmaster(profile.full_name ?? "");
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!classId) return;
    supabase.from("students").select("id, first_name, middle_name, last_name, date_of_birth, gender, photo_url, admission_number")
      .eq("class_id", classId).eq("status", "active").order("last_name")
      .then(({ data }) => { setStudents(data ?? []); setStudentId(""); setScores({}); });
  }, [classId]);

  useEffect(() => {
    if (!studentId || !termId || !classId) return;
    supabase.from("exam_scores").select("subject_id, class_score, exam_score, total, grade, remark")
      .eq("student_id", studentId).eq("term_id", termId).eq("class_id", classId)
      .then(({ data }) => {
        const map: Record<string, ScoreRow> = {};
        (data ?? []).forEach((r: ScoreRow & { subject_id: string }) => { map[r.subject_id] = r; });
        setScores(map);
      });
    setTeacherRemark(""); setNextTermResumes("");
  }, [studentId, termId, classId]);

  const student = students.find((s) => s.id === studentId) ?? null;
  const cls = classes.find((c) => c.id === classId) ?? null;
  const term = terms.find((t) => t.id === termId) ?? null;

  const scoredSubjects = subjects.map((sub) => {
    const s = scores[sub.id];
    const cs = s?.class_score ?? null;
    const es = s?.exam_score ?? null;
    const total = s?.total ?? (cs !== null && es !== null ? cs + es : null);
    const grade = s?.grade ?? (total !== null ? computeGrade(total) : null);
    const remark = s?.remark ?? (grade ? computeRemark(grade) : null);
    return { ...sub, class_score: cs, exam_score: es, total, grade, remark };
  });

  const totalMarks = scoredSubjects.reduce((s, r) => s + (r.total ?? 0), 0);
  const scoredCount = scoredSubjects.filter((r) => r.total !== null).length;
  const average = scoredCount > 0 ? (totalMarks / scoredCount).toFixed(1) : "—";

  // Print
  function handlePrint() {
    setPrinting(true);
    setTimeout(() => { window.print(); setPrinting(false); }, 100);
  }

  // PDF export via html2canvas + jspdf
  async function handleExportPDF() {
    if (!reportRef.current) return;
    setExporting(true);
    const { default: html2canvas } = await import("html2canvas");
    const { default: jsPDF } = await import("jspdf");
    const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = (canvas.height * pdfW) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfW, pdfH);
    pdf.save(`${student?.last_name ?? "report"}_${term?.name ?? "term"}.pdf`);
    setExporting(false);
  }

  // Excel import — expected columns: Subject, Class Score, Exam Score
  async function handleExcelImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !studentId || !termId || !classId) return;
    setImporting(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from("profiles").select("school_id").eq("id", user!.id).single();

    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, string | number>>(ws);

    const upsertRows = rows.map((row) => {
      const subName = String(row["Subject"] ?? row["subject"] ?? "").trim();
      const sub = subjects.find((s) => s.name.toLowerCase() === subName.toLowerCase());
      if (!sub) return null;
      const cs = parseFloat(String(row["Class Score"] ?? row["class_score"] ?? "0")) || 0;
      const es = parseFloat(String(row["Exam Score"] ?? row["exam_score"] ?? "0")) || 0;
      const total = cs + es;
      const grade = computeGrade(total);
      return {
        id: crypto.randomUUID(),
        school_id: profile?.school_id,
        student_id: studentId,
        subject_id: sub.id,
        class_id: classId,
        term_id: termId,
        class_score: cs || null,
        exam_score: es || null,
        total: total || null,
        grade,
        remark: computeRemark(grade),
      };
    }).filter(Boolean);

    if (upsertRows.length) {
      await supabase.from("exam_scores").upsert(upsertRows as object[], { onConflict: "student_id,subject_id,term_id" });
      // Reload scores
      const { data } = await supabase.from("exam_scores").select("subject_id, class_score, exam_score, total, grade, remark")
        .eq("student_id", studentId).eq("term_id", termId).eq("class_id", classId);
      const map: Record<string, ScoreRow> = {};
      (data ?? []).forEach((r: ScoreRow & { subject_id: string }) => { map[r.subject_id] = r; });
      setScores(map);
    }
    setImporting(false);
    if (xlsxRef.current) xlsxRef.current.value = "";
  }

  const canShow = student && cls && term && scoredCount > 0;

  return (
    <>
      {/* Print styles — hides everything except report card */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #printable-report-card { display: block !important; position: fixed; inset: 0; background: white; z-index: 9999; padding: 20mm; }
          #printable-report-card * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-strong)]">Report Cards</h2>
            <p className="text-[15px] text-[var(--text-muted)]">Generate, print and export student terminal report cards</p>
          </div>
          <div className="flex items-center gap-2">
            <input ref={xlsxRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleExcelImport} />
            {studentId && (
              <Button variant="secondary" onClick={() => xlsxRef.current?.click()} loading={importing}>
                <FileSpreadsheet size={14} /> Import Excel scores
              </Button>
            )}
            {canShow && (
              <>
                <Button variant="secondary" onClick={handlePrint} loading={printing}>
                  <Printer size={14} /> Print
                </Button>
                <Button onClick={handleExportPDF} loading={exporting}>
                  <Download size={14} /> Export PDF
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Selectors */}
        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-semibold text-[var(--text-strong)] block mb-1.5">Class</label>
              <select value={classId} onChange={(e) => setClassId(e.target.value)}
                className="h-10 w-full rounded-[10px] border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--ring)]">
                <option value="">— Select class —</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-[var(--text-strong)] block mb-1.5">Student</label>
              <select value={studentId} onChange={(e) => setStudentId(e.target.value)} disabled={!classId}
                className="h-10 w-full rounded-[10px] border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--ring)] disabled:opacity-50">
                <option value="">— Select student —</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.last_name}, {s.first_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-[var(--text-strong)] block mb-1.5">Term</label>
              <select value={termId} onChange={(e) => setTermId(e.target.value)}
                className="h-10 w-full rounded-[10px] border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--ring)]">
                <option value="">— Select term —</option>
                {terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
        </Card>

        {studentId && !canShow && (
          <Card>
            <p className="text-sm text-[var(--text-muted)] text-center py-4">
              No scores recorded for this student this term. <a href="/exams" className="text-[var(--brand)] font-semibold">Enter scores</a> first, or import an Excel file above.
            </p>
          </Card>
        )}

        {/* Signature inputs */}
        {canShow && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-[var(--text-strong)] block mb-1.5">Class teacher name</label>
              <input value={classTeacher} onChange={(e) => setClassTeacher(e.target.value)} placeholder="e.g. Mr. Kwame Asante"
                className="h-10 w-full rounded-[10px] border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--ring)]" />
            </div>
            <div>
              <label className="text-sm font-semibold text-[var(--text-strong)] block mb-1.5">Headmaster name</label>
              <input value={headmaster} onChange={(e) => setHeadmaster(e.target.value)} placeholder="e.g. Mrs. Abena Owusu"
                className="h-10 w-full rounded-[10px] border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--ring)]" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-semibold text-[var(--text-strong)] block mb-1.5">Teacher&apos;s remarks</label>
              <textarea value={teacherRemark} onChange={(e) => setTeacherRemark(e.target.value)} rows={2}
                placeholder="e.g. A dedicated and hardworking student. Keep it up!"
                className="w-full rounded-[10px] border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--ring)] resize-none" />
            </div>
            <div>
              <label className="text-sm font-semibold text-[var(--text-strong)] block mb-1.5">Next term resumes</label>
              <input type="date" value={nextTermResumes} onChange={(e) => setNextTermResumes(e.target.value)}
                className="h-10 w-full rounded-[10px] border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--ring)]" />
            </div>
          </div>
        )}

        {/* ===== REPORT CARD ===== */}
        {canShow && (
          <div id="printable-report-card">
            <div ref={reportRef} className="bg-white border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm max-w-3xl mx-auto">
              {/* School header */}
              <div className="px-8 py-6 border-b-4 text-center" style={{ borderColor: "#262262" }}>
                <div className="flex items-center justify-center gap-4 mb-3">
                  {school?.logo_url && (
                    <img src={school.logo_url} alt="Logo" className="w-16 h-16 object-contain" />
                  )}
                  <div>
                    <h1 className="text-xl font-extrabold uppercase tracking-wide" style={{ color: "#262262" }}>{school?.name}</h1>
                    {school?.motto && <p className="text-sm italic text-gray-500 mt-0.5">&quot;{school.motto}&quot;</p>}
                    {school?.address && <p className="text-xs text-gray-500">{school.address}</p>}
                    {school?.phone && <p className="text-xs text-gray-500">Tel: {school.phone}</p>}
                  </div>
                </div>
                <div className="inline-block px-6 py-1 rounded-full text-white text-sm font-bold" style={{ background: "#262262" }}>
                  STUDENT TERMINAL REPORT CARD
                </div>
                <p className="text-xs text-gray-500 mt-1">{academicYear?.name ?? ""} · {term?.name}</p>
              </div>

              {/* Student info */}
              <div className="px-8 py-4 border-b" style={{ borderColor: "#e5e7eb" }}>
                <div className="flex items-start gap-6">
                  {/* Photo */}
                  <div className="w-24 h-28 border-2 border-gray-300 rounded-lg overflow-hidden flex items-center justify-center bg-gray-50 shrink-0">
                    {student?.photo_url ? (
                      <img src={student.photo_url} alt="Passport" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-white"
                        style={{ background: "linear-gradient(135deg, #262262, #92278F)" }}>
                        {getInitials(`${student?.first_name} ${student?.last_name}`)}
                      </div>
                    )}
                  </div>
                  {/* Details */}
                  <div className="flex-1 grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                    <div><span className="text-gray-500">Name:</span> <span className="font-bold">{student?.last_name}, {student?.first_name} {student?.middle_name ?? ""}</span></div>
                    <div><span className="text-gray-500">Admission No:</span> <span className="font-mono font-semibold">{student?.admission_number}</span></div>
                    <div><span className="text-gray-500">Class:</span> <span className="font-semibold">{cls?.name}</span></div>
                    <div><span className="text-gray-500">Gender:</span> <span className="font-semibold capitalize">{student?.gender ?? "—"}</span></div>
                    <div><span className="text-gray-500">Date of Birth:</span> <span className="font-semibold">{student?.date_of_birth ?? "—"}</span></div>
                    <div><span className="text-gray-500">Term:</span> <span className="font-semibold">{term?.name}</span></div>
                  </div>
                </div>
              </div>

              {/* Scores table */}
              <div className="px-8 py-4">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr style={{ background: "#262262", color: "white" }}>
                      <th className="text-left px-3 py-2.5 font-semibold">#</th>
                      <th className="text-left px-3 py-2.5 font-semibold">Subject</th>
                      <th className="px-3 py-2.5 text-center font-semibold">Class Score<br/><span className="text-[10px] font-normal">(30)</span></th>
                      <th className="px-3 py-2.5 text-center font-semibold">Exam Score<br/><span className="text-[10px] font-normal">(70)</span></th>
                      <th className="px-3 py-2.5 text-center font-semibold">Total<br/><span className="text-[10px] font-normal">(100)</span></th>
                      <th className="px-3 py-2.5 text-center font-semibold">Grade</th>
                      <th className="px-3 py-2.5 text-center font-semibold">Remark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scoredSubjects.map((sub, i) => (
                      <tr key={sub.id} style={{ background: i % 2 === 0 ? "#f9fafb" : "white" }}>
                        <td className="px-3 py-2 text-gray-400 text-xs">{i + 1}</td>
                        <td className="px-3 py-2 font-medium text-gray-800">{sub.name}</td>
                        <td className="px-3 py-2 text-center font-mono">{sub.class_score ?? "—"}</td>
                        <td className="px-3 py-2 text-center font-mono">{sub.exam_score ?? "—"}</td>
                        <td className="px-3 py-2 text-center font-mono font-bold">{sub.total?.toFixed(1) ?? "—"}</td>
                        <td className="px-3 py-2 text-center font-bold font-mono" style={{ color: gradeColor(sub.grade) }}>{sub.grade ?? "—"}</td>
                        <td className="px-3 py-2 text-center text-xs text-gray-600">{sub.remark ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "#f3f4f6", borderTop: "2px solid #262262" }}>
                      <td colSpan={4} className="px-3 py-2.5 font-bold text-right text-sm">Total / Average:</td>
                      <td className="px-3 py-2.5 text-center font-bold font-mono text-base">{average}</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Grade key */}
              <div className="px-8 pb-2">
                <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                  {[["A1","80-100","Excellent"],["B2","75-79","V. Good"],["B3","70-74","Good"],["C4","65-69","Credit"],["C5","60-64","Credit"],["C6","55-59","Credit"],["D7","50-54","Pass"],["E8","45-49","Pass"],["F9","0-44","Fail"]].map(([g,r,l]) => (
                    <span key={g}><b>{g}</b>: {r} ({l})</span>
                  ))}
                </div>
              </div>

              {/* Remarks */}
              <div className="px-8 py-4 border-t" style={{ borderColor: "#e5e7eb" }}>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Class Teacher&apos;s Remarks</p>
                    <div className="min-h-[48px] border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 bg-gray-50">
                      {teacherRemark || <span className="text-gray-400 italic">—</span>}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Headmaster&apos;s Remarks</p>
                    <div className="min-h-[48px] border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 bg-gray-50">
                      <span className="text-gray-400 italic">Approved</span>
                    </div>
                  </div>
                </div>
                {nextTermResumes && (
                  <p className="text-sm text-gray-600 mt-3"><span className="font-semibold">Next term resumes:</span> {new Date(nextTermResumes).toLocaleDateString("en-GH", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
                )}
              </div>

              {/* Signatures */}
              <div className="px-8 pb-8 pt-4 border-t" style={{ borderColor: "#e5e7eb" }}>
                <div className="grid grid-cols-2 gap-12">
                  <div>
                    <div className="h-10 border-b-2 border-gray-400 mb-1" />
                    <p className="text-xs font-semibold text-gray-600">Class Teacher: {classTeacher || "________________________"}</p>
                    <p className="text-xs text-gray-400">Date: ____________________</p>
                  </div>
                  <div>
                    <div className="h-10 border-b-2 border-gray-400 mb-1" />
                    <p className="text-xs font-semibold text-gray-600">Headmaster: {headmaster || "________________________"}</p>
                    <p className="text-xs text-gray-400">Date: ____________________</p>
                  </div>
                </div>
                <p className="text-center text-[10px] text-gray-400 mt-6">Generated by Compunerd EduSys · {school?.name}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
