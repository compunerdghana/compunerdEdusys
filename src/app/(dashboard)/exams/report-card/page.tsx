"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getInitials } from "@/lib/utils";
import { Printer, Download, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";

interface School { name: string; address: string | null; phone: string | null; logo_url: string | null; motto: string | null }
interface ClassRoom { id: string; name: string; level: string }
interface Subject { id: string; name: string }
interface StudentRow { id: string; first_name: string; middle_name: string | null; last_name: string; date_of_birth: string | null; gender: string | null; photo_url: string | null; admission_number: string }
interface ScoreRow { subject_id: string; class_score: number | null; exam_score: number | null; total: number | null; grade: string | null; remark: string | null }
interface Term { id: string; name: string; start_date: string; end_date: string }
interface AcademicYear { name: string }

const GRADE_AGG: Record<string, number> = { A1:1, B2:2, B3:3, C4:4, C5:5, C6:6, D7:7, E8:8, F9:9 };

function computeGrade(total: number): string {
  if (total >= 80) return "A1"; if (total >= 75) return "B2"; if (total >= 70) return "B3";
  if (total >= 65) return "C4"; if (total >= 60) return "C5"; if (total >= 55) return "C6";
  if (total >= 50) return "D7"; if (total >= 45) return "E8"; return "F9";
}
function computeRemark(grade: string): string {
  if (["A1","B2","B3"].includes(grade)) return "Excellent";
  if (["C4","C5","C6"].includes(grade)) return "Credit";
  if (grade === "D7") return "Pass"; return "Fail";
}
function gradeColor(grade: string | null) {
  if (!grade) return "#374151";
  if (["A1","B2","B3"].includes(grade)) return "#15803d";
  if (["C4","C5","C6"].includes(grade)) return "#b45309";
  return "#dc2626";
}

const LS_HM = "rc_headmaster";
const LS_HMR = "rc_headmaster_remark";

function ReportCardInner() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const reportRef = useRef<HTMLDivElement>(null);
  const xlsxRef = useRef<HTMLInputElement>(null);

  const [school, setSchool] = useState<School | null>(null);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [academicYear, setAcademicYear] = useState<AcademicYear | null>(null);
  const [classId, setClassId] = useState(searchParams.get("classId") ?? "");
  const [studentId, setStudentId] = useState(searchParams.get("studentId") ?? "");
  const [termId, setTermId] = useState(searchParams.get("termId") ?? "");
  const [scores, setScores] = useState<Record<string, ScoreRow>>({});
  const [teacherRemark, setTeacherRemark] = useState("");
  const [headmasterRemark, setHeadmasterRemark] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem(LS_HMR) ?? "";
    return "";
  });
  const [nextTermResumes, setNextTermResumes] = useState("");
  const [classTeacher, setClassTeacher] = useState("");
  const [headmaster, setHeadmaster] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem(LS_HM) ?? "";
    return "";
  });
  const [positionInClass, setPositionInClass] = useState("");
  const [totalInClass, setTotalInClass] = useState("");
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

      if (!searchParams.get("termId")) {
        const currentTerm = (termRes.data ?? []).find((t: Term) => {
          const now = new Date();
          return new Date(t.start_date) <= now && new Date(t.end_date) >= now;
        });
        if (currentTerm) setTermId(currentTerm.id);
      }

      // Pre-fill headmaster from localStorage; only fall back to profile name if nothing in storage
      if (profile.role === "headmaster" || profile.role === "owner") {
        if (!localStorage.getItem(LS_HM)) {
          setHeadmaster(profile.full_name ?? "");
        }
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initStudentId = searchParams.get("studentId") ?? "";
  useEffect(() => {
    if (!classId) return;
    supabase.from("students").select("id, first_name, middle_name, last_name, date_of_birth, gender, photo_url, admission_number")
      .eq("class_id", classId).eq("status", "active").order("last_name")
      .then(({ data }) => {
        setStudents(data ?? []);
        if (!studentId && initStudentId) setStudentId(initStudentId);
        else if (!initStudentId) { setStudentId(""); setScores({}); }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, termId, classId]);

  // Persist headmaster name + remark to localStorage
  useEffect(() => { localStorage.setItem(LS_HM, headmaster); }, [headmaster]);
  useEffect(() => { localStorage.setItem(LS_HMR, headmasterRemark); }, [headmasterRemark]);

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
    const agg = grade ? (GRADE_AGG[grade] ?? null) : null;
    return { ...sub, class_score: cs, exam_score: es, total, grade, remark, agg };
  });

  const scoredRows = scoredSubjects.filter((r) => r.total !== null);
  const scoredCount = scoredRows.length;
  const totalMarks = scoredRows.reduce((s, r) => s + (r.total ?? 0), 0);
  const average = scoredCount > 0 ? (totalMarks / scoredCount).toFixed(1) : "—";

  // BECE aggregate: sum of best 6 (ascending agg = best grade)
  const aggValues = scoredRows.map(r => r.agg).filter((a): a is number => a !== null).sort((a,b) => a-b);
  const beceAgg = aggValues.slice(0, 6).reduce((s, v) => s + v, 0);

  function ordinalSuffix(n: number) {
    const s = ["th","st","nd","rd"]; const v = n % 100;
    return n + (s[(v-20)%10] || s[v] || s[0]);
  }

  function handlePrint() {
    setPrinting(true);
    setTimeout(() => { window.print(); setPrinting(false); }, 100);
  }

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
      return { id: crypto.randomUUID(), school_id: profile?.school_id, student_id: studentId, subject_id: sub.id, class_id: classId, term_id: termId, class_score: cs||null, exam_score: es||null, total: total||null, grade, remark: computeRemark(grade) };
    }).filter(Boolean);
    if (upsertRows.length) {
      await supabase.from("exam_scores").upsert(upsertRows as object[], { onConflict: "student_id,subject_id,term_id" });
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
      <style>{`
        @media print {
          body > * { display: none !important; }
          #printable-report-card { display: block !important; position: fixed; inset: 0; background: white; z-index: 9999; padding: 10mm 15mm; }
          #printable-report-card * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="space-y-5">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-[var(--text-strong)]">Report Cards</h2>
            <p className="text-[13px] text-[var(--text-muted)]">Generate, print and export student terminal report cards</p>
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

        {/* Extra inputs */}
        {canShow && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-semibold text-[var(--text-strong)] block mb-1.5">Class Teacher Name</label>
              <input value={classTeacher} onChange={(e) => setClassTeacher(e.target.value)} placeholder="e.g. Mr. Kwame Asante"
                className="h-10 w-full rounded-[10px] border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--ring)]" />
            </div>
            <div>
              <label className="text-sm font-semibold text-[var(--text-strong)] block mb-1.5">Headmaster Name</label>
              <input value={headmaster} onChange={(e) => setHeadmaster(e.target.value)} placeholder="e.g. Mrs. Abena Owusu"
                className="h-10 w-full rounded-[10px] border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--ring)]" />
            </div>
            <div>
              <label className="text-sm font-semibold text-[var(--text-strong)] block mb-1.5">Next Term Resumes</label>
              <input type="date" value={nextTermResumes} onChange={(e) => setNextTermResumes(e.target.value)}
                className="h-10 w-full rounded-[10px] border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--ring)]" />
            </div>
            <div>
              <label className="text-sm font-semibold text-[var(--text-strong)] block mb-1.5">Position in Class</label>
              <input value={positionInClass} onChange={(e) => setPositionInClass(e.target.value)} placeholder="e.g. 3"
                className="h-10 w-full rounded-[10px] border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--ring)]" />
            </div>
            <div>
              <label className="text-sm font-semibold text-[var(--text-strong)] block mb-1.5">Total Students in Class</label>
              <input value={totalInClass} onChange={(e) => setTotalInClass(e.target.value)} placeholder="e.g. 30"
                className="h-10 w-full rounded-[10px] border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--ring)]" />
            </div>
            <div>
              <label className="text-sm font-semibold text-[var(--text-strong)] block mb-1.5">Teacher&apos;s Remarks</label>
              <input value={teacherRemark} onChange={(e) => setTeacherRemark(e.target.value)} placeholder="e.g. Excellent performance!"
                className="h-10 w-full rounded-[10px] border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--ring)]" />
            </div>
            <div className="sm:col-span-3">
              <label className="text-sm font-semibold text-[var(--text-strong)] block mb-1.5">Headmaster&apos;s Remarks</label>
              <input value={headmasterRemark} onChange={(e) => setHeadmasterRemark(e.target.value)} placeholder="e.g. Approved. Keep up the good work."
                className="h-10 w-full rounded-[10px] border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--ring)]" />
            </div>
          </div>
        )}

        {/* ===== REPORT CARD (GES template) ===== */}
        {canShow && (
          <div id="printable-report-card">
            <div ref={reportRef}
              className="bg-white border-2 border-gray-800 max-w-3xl mx-auto"
              style={{ fontFamily: "Arial, sans-serif", fontSize: "11px", color: "#111" }}>

              {/* GES header strip */}
              <div className="text-center py-1" style={{ background: "#262262", color: "white", fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em" }}>
                GHANA EDUCATION SERVICE
              </div>

              {/* School identity row */}
              <div className="flex items-center gap-4 px-6 py-4 border-b-2 border-gray-800">
                {/* Logo left */}
                <div className="w-20 h-20 shrink-0 flex items-center justify-center border border-gray-300 rounded">
                  {school?.logo_url ? (
                    <img src={school.logo_url} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#262262,#92278F)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 900, fontSize: "22px" }}>
                      {school?.name ? school.name.split(" ").map(w => w[0]).join("").slice(0,3) : "S"}
                    </div>
                  )}
                </div>
                {/* Name center */}
                <div className="flex-1 text-center">
                  <div style={{ fontSize: "20px", fontWeight: 900, textTransform: "uppercase", color: "#262262", letterSpacing: "0.03em" }}>{school?.name}</div>
                  {school?.address && <div style={{ fontSize: "10px", color: "#444", marginTop: 2 }}>{school.address}</div>}
                  {school?.phone && <div style={{ fontSize: "10px", color: "#444" }}>Tel: {school.phone}</div>}
                  {school?.motto && <div style={{ fontSize: "10px", fontStyle: "italic", color: "#555", marginTop: 2 }}>&ldquo;{school.motto}&rdquo;</div>}
                </div>
                {/* Student photo right */}
                <div style={{ width: 72, height: 88, border: "1px solid #9ca3af", borderRadius: 4, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb" }}>
                  {student?.photo_url ? (
                    <img src={student.photo_url} alt="Passport" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#262262,#92278F)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "16px" }}>
                      {getInitials(`${student?.first_name} ${student?.last_name}`)}
                    </div>
                  )}
                </div>
              </div>

              {/* Title bar */}
              <div className="text-center py-2 border-b border-gray-800" style={{ background: "#f3f4f6" }}>
                <span style={{ fontSize: "13px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: "#111" }}>
                  STUDENT TERMINAL REPORT CARD
                </span>
                <span style={{ marginLeft: 16, fontSize: "11px", color: "#555" }}>
                  Academic Year: <strong>{academicYear?.name ?? "—"}</strong> &nbsp;|&nbsp; Term: <strong>{term?.name}</strong>
                </span>
              </div>

              {/* Student info table */}
              <div className="px-4 py-3 border-b border-gray-800">
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: "3px 6px", width: "16%", color: "#555" }}>Name:</td>
                      <td style={{ padding: "3px 6px", width: "34%", fontWeight: 700, borderBottom: "1px solid #9ca3af" }}>
                        {student?.last_name} {student?.first_name} {student?.middle_name ?? ""}
                      </td>
                      <td style={{ padding: "3px 6px", width: "16%", color: "#555" }}>Admission No:</td>
                      <td style={{ padding: "3px 6px", width: "34%", fontWeight: 700, fontFamily: "monospace", borderBottom: "1px solid #9ca3af" }}>{student?.admission_number}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "3px 6px", color: "#555" }}>Class/Division:</td>
                      <td style={{ padding: "3px 6px", fontWeight: 700, borderBottom: "1px solid #9ca3af" }}>{cls?.name}</td>
                      <td style={{ padding: "3px 6px", color: "#555" }}>Sex:</td>
                      <td style={{ padding: "3px 6px", fontWeight: 700, textTransform: "capitalize", borderBottom: "1px solid #9ca3af" }}>{student?.gender ?? "—"}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "3px 6px", color: "#555" }}>Date of Birth:</td>
                      <td style={{ padding: "3px 6px", fontWeight: 700, borderBottom: "1px solid #9ca3af" }}>{student?.date_of_birth ?? "—"}</td>
                      <td style={{ padding: "3px 6px", color: "#555" }}>Position in Class:</td>
                      <td style={{ padding: "3px 6px", fontWeight: 700, borderBottom: "1px solid #9ca3af" }}>
                        {positionInClass ? `${ordinalSuffix(parseInt(positionInClass))} out of ${totalInClass || "?"}` : "—"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Scores table */}
              <div className="px-4 py-3 border-b border-gray-800">
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                  <thead>
                    <tr style={{ background: "#262262", color: "white" }}>
                      <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700 }}>No</th>
                      <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700 }}>Subject</th>
                      <th style={{ padding: "6px 6px", textAlign: "center", fontWeight: 700 }}>Class Score<br /><span style={{ fontWeight: 400, fontSize: "9px" }}>(30)</span></th>
                      <th style={{ padding: "6px 6px", textAlign: "center", fontWeight: 700 }}>Exam Score<br /><span style={{ fontWeight: 400, fontSize: "9px" }}>(70)</span></th>
                      <th style={{ padding: "6px 6px", textAlign: "center", fontWeight: 700 }}>Total<br /><span style={{ fontWeight: 400, fontSize: "9px" }}>(100)</span></th>
                      <th style={{ padding: "6px 6px", textAlign: "center", fontWeight: 700 }}>Grade</th>
                      <th style={{ padding: "6px 6px", textAlign: "center", fontWeight: 700 }}>Agg</th>
                      <th style={{ padding: "6px 8px", textAlign: "center", fontWeight: 700 }}>Remark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scoredSubjects.map((sub, i) => (
                      <tr key={sub.id} style={{ background: i % 2 === 0 ? "#f9fafb" : "white", borderBottom: "1px solid #e5e7eb" }}>
                        <td style={{ padding: "5px 8px", color: "#6b7280" }}>{i + 1}</td>
                        <td style={{ padding: "5px 8px", fontWeight: 600 }}>{sub.name}</td>
                        <td style={{ padding: "5px 6px", textAlign: "center", fontFamily: "monospace" }}>{sub.class_score ?? "—"}</td>
                        <td style={{ padding: "5px 6px", textAlign: "center", fontFamily: "monospace" }}>{sub.exam_score ?? "—"}</td>
                        <td style={{ padding: "5px 6px", textAlign: "center", fontFamily: "monospace", fontWeight: 700 }}>{sub.total?.toFixed(1) ?? "—"}</td>
                        <td style={{ padding: "5px 6px", textAlign: "center", fontWeight: 700, color: gradeColor(sub.grade) }}>{sub.grade ?? "—"}</td>
                        <td style={{ padding: "5px 6px", textAlign: "center", fontFamily: "monospace" }}>{sub.agg ?? "—"}</td>
                        <td style={{ padding: "5px 8px", textAlign: "center", color: gradeColor(sub.grade), fontSize: "10px" }}>{sub.remark ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "#262262", color: "white", borderTop: "2px solid #111" }}>
                      <td colSpan={3} style={{ padding: "6px 8px", fontWeight: 700, textAlign: "right" }}>OVERALL TOTAL:</td>
                      <td colSpan={2} style={{ padding: "6px 8px", textAlign: "center", fontWeight: 900, fontFamily: "monospace", fontSize: "13px" }}>{totalMarks.toFixed(1)}</td>
                      <td style={{ padding: "6px 6px", textAlign: "center", fontWeight: 700 }}>AVERAGE:</td>
                      <td colSpan={2} style={{ padding: "6px 8px", textAlign: "center", fontWeight: 900, fontFamily: "monospace", fontSize: "13px" }}>
                        {average} &nbsp;|&nbsp; BECE AGG: <span style={{ color: "#facc15" }}>{aggValues.length >= 1 ? beceAgg : "—"}</span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Grade key */}
              <div className="px-4 py-2 border-b border-gray-800" style={{ background: "#f9fafb" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", fontSize: "9.5px", color: "#555" }}>
                  <strong style={{ color: "#111", marginRight: 4 }}>Grade Key:</strong>
                  {[["A1","80-100"],["B2","75-79"],["B3","70-74"],["C4","65-69"],["C5","60-64"],["C6","55-59"],["D7","50-54"],["E8","45-49"],["F9","0-44"]].map(([g,r]) => (
                    <span key={g}><b>{g}</b>: {r}</span>
                  ))}
                </div>
              </div>

              {/* Remarks row */}
              <div className="px-4 py-3 border-b border-gray-800">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Class Teacher&apos;s Remarks:</div>
                    <div style={{ minHeight: 44, border: "1px solid #9ca3af", padding: "6px 8px", fontSize: "11px", background: "#fafafa" }}>
                      {teacherRemark || <span style={{ color: "#9ca3af" }}>__________________________________</span>}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Headmaster&apos;s Remarks:</div>
                    <div style={{ minHeight: 44, border: "1px solid #9ca3af", padding: "6px 8px", fontSize: "11px", background: "#fafafa" }}>
                      {headmasterRemark || <span style={{ color: "#9ca3af" }}>__________________________________</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Next term */}
              <div className="px-4 py-2 border-b border-gray-800" style={{ fontSize: "11px" }}>
                <strong>Next Term Resumes: </strong>
                {nextTermResumes
                  ? new Date(nextTermResumes).toLocaleDateString("en-GH", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
                  : <span style={{ color: "#9ca3af" }}>_______________________________</span>}
              </div>

              {/* Signatures */}
              <div className="px-4 py-4">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
                  <div>
                    <div style={{ height: 36, borderBottom: "1.5px solid #374151", marginBottom: 4 }} />
                    <div style={{ fontSize: "10px", fontWeight: 700 }}>Class Teacher: {classTeacher || "________________________________"}</div>
                    <div style={{ fontSize: "9.5px", color: "#6b7280", marginTop: 2 }}>Date: ______________________________</div>
                  </div>
                  <div>
                    <div style={{ height: 36, borderBottom: "1.5px solid #374151", marginBottom: 4 }} />
                    <div style={{ fontSize: "10px", fontWeight: 700 }}>Headmaster: {headmaster || "________________________________"}</div>
                    <div style={{ fontSize: "9.5px", color: "#6b7280", marginTop: 2 }}>Date: ______________________________</div>
                  </div>
                </div>
                <div style={{ textAlign: "center", fontSize: "9px", color: "#9ca3af", marginTop: 16 }}>
                  Generated by Compunerd EduSys · {school?.name}
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function ReportCardPage() {
  return (
    <Suspense>
      <ReportCardInner />
    </Suspense>
  );
}
