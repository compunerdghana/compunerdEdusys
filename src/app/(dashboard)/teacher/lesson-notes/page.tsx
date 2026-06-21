"use client";

import { useState, useEffect } from "react";
import { ScrollText, Plus, Save, Loader2, CheckCircle2, AlertCircle, FileDown, FileSpreadsheet, Eye, Calendar, BookOpen, User, Check, X } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

interface LessonNote {
  id: string;
  week_number: number;
  academic_year: string;
  topic: string;
  objectives: string;
  activities: string; // Storing serialized Template 2 JSON here
  assessment_strategy: string;
  status: "draft" | "pending_approval" | "approved" | "rejected";
  remarks: string;
  created_at: string;
  class_id?: string;
  subject_id?: string;
  classroom?: { id: string; name: string };
  subject?: { id: string; name: string };
}

export default function LessonNotesView() {
  const { success, error: toastError } = useToast();
  const [plans, setPlans] = useState<LessonNote[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [schoolInfo, setSchoolInfo] = useState<any>(null);
  
  const [showCreate, setShowCreate] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<LessonNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form Steps
  const [formStep, setFormStep] = useState(1);
  const [activeDayTab, setActiveDayTab] = useState("Monday");

  // Expanded Template 2 Form State
  const [metadata, setMetadata] = useState({
    week_number: "1",
    academic_year: "2026/2027",
    class_id: "",
    subject_id: "",
    topic: "",
    week_ending: "",
    reference: "",
    learning_indicators: "",
    performance_indicators: "",
    resources: "",
    core_competencies: "",
    objectives: "",
    assessment_strategy: "",
  });

  const [dailyPhases, setDailyPhases] = useState<Record<string, { phase1: string; phase2: string; phase3: string }>>({
    Monday: { phase1: "", phase2: "", phase3: "" },
    Tuesday: { phase1: "", phase2: "", phase3: "" },
    Wednesday: { phase1: "", phase2: "", phase3: "" },
    Thursday: { phase1: "", phase2: "", phase3: "" },
    Friday: { phase1: "", phase2: "", phase3: "" },
  });

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  useEffect(() => {
    const supabase = createClient();
    async function loadSchoolInfo() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase.from("profiles").select("school_id").eq("id", user.id).single();
        if (profile?.school_id) {
          const { data: school } = await supabase.from("schools").select("*").eq("id", profile.school_id).single();
          if (school) setSchoolInfo(school);
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadSchoolInfo();
  }, []);

  async function loadRostersAndPlans() {
    try {
      const rosterRes = await fetch("/api/teacher/teacher-roster");
      const rosterData = await rosterRes.json();
      if (rosterRes.ok) {
        setClassrooms(rosterData.classrooms || []);
        setSubjects(rosterData.subjects || []);
        if (rosterData.classrooms?.length > 0) {
          setMetadata(prev => ({ ...prev, class_id: rosterData.classrooms[0].id }));
        }
        if (rosterData.subjects?.length > 0) {
          setMetadata(prev => ({ ...prev, subject_id: rosterData.subjects[0].id }));
        }
      }

      const res = await fetch("/api/teacher/lesson-plan");
      const data = await res.json();
      if (res.ok) {
        setPlans(data.plans || []);
      }
    } catch {
      toastError("Failed to load lesson notes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRostersAndPlans();
  }, [toastError]);

  // Helper to parse activities JSON safely
  function parseActivities(plan: LessonNote) {
    try {
      return JSON.parse(plan.activities);
    } catch {
      // Legacy fallback
      return {
        legacy: true,
        activitiesText: plan.activities,
        week_ending: "",
        reference: "",
        learning_indicators: "",
        performance_indicators: "",
        resources: "",
        core_competencies: "",
        days: {
          Monday: { phase1: plan.activities, phase2: "", phase3: "" },
          Tuesday: { phase1: "", phase2: "", phase3: "" },
          Wednesday: { phase1: "", phase2: "", phase3: "" },
          Thursday: { phase1: "", phase2: "", phase3: "" },
          Friday: { phase1: "", phase2: "", phase3: "" },
        }
      };
    }
  }

  async function handleSubmit(e: React.FormEvent, submitStatus: "draft" | "pending_approval") {
    e.preventDefault();
    setSaving(true);
    try {
      // Serialize all Template 2 fields into the activities column
      const serializedActivities = JSON.stringify({
        week_ending: metadata.week_ending,
        reference: metadata.reference,
        learning_indicators: metadata.learning_indicators,
        performance_indicators: metadata.performance_indicators,
        resources: metadata.resources,
        core_competencies: metadata.core_competencies,
        days: dailyPhases,
      });

      const payload = {
        week_number: metadata.week_number,
        academic_year: metadata.academic_year,
        class_id: metadata.class_id,
        subject_id: metadata.subject_id,
        topic: metadata.topic,
        objectives: metadata.objectives,
        assessment_strategy: metadata.assessment_strategy,
        activities: serializedActivities,
        status: submitStatus
      };

      const res = await fetch("/api/teacher/lesson-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");

      success(submitStatus === "pending_approval" ? "Lesson note submitted for supervisor approval!" : "Lesson note draft saved successfully.");
      setShowCreate(false);
      
      // Reset State
      setFormStep(1);
      setMetadata(prev => ({
        ...prev,
        topic: "",
        week_ending: "",
        reference: "",
        learning_indicators: "",
        performance_indicators: "",
        resources: "",
        core_competencies: "",
        objectives: "",
        assessment_strategy: "",
      }));
      setDailyPhases({
        Monday: { phase1: "", phase2: "", phase3: "" },
        Tuesday: { phase1: "", phase2: "", phase3: "" },
        Wednesday: { phase1: "", phase2: "", phase3: "" },
        Thursday: { phase1: "", phase2: "", phase3: "" },
        Friday: { phase1: "", phase2: "", phase3: "" },
      });
      loadRostersAndPlans();
    } catch (err: any) {
      toastError(err.message || "Failed to submit lesson note.");
    } finally {
      setSaving(false);
    }
  }

  function exportPDF(plan: LessonNote) {
    const details = parseActivities(plan);
    const activeClass = plan.classroom?.name ?? classrooms.find(c => c.id === plan.class_id)?.name ?? "N/A";
    const activeSubject = plan.subject?.name ?? subjects.find(s => s.id === plan.subject_id)?.name ?? "N/A";

    const doc = new jsPDF();

    // 1. Draw School Header
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

    // 2. Titles
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(38, 34, 98);
    doc.text("SAMPLE SCHEME OF LEARNING - WEEK " + plan.week_number, 14, 41);
    doc.text("WEEKLY LESSON NOTES", 14, 46);

    // 3. Metadata Table Block
    let y = 52;
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(250, 250, 250);
    
    const drawMetaRow = (label: string, value: string) => {
      doc.setFillColor(245, 243, 252);
      doc.rect(14, y, 45, 7, "FD");
      doc.setFillColor(255, 255, 255);
      doc.rect(59, y, 137, 7, "FD");
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(38, 34, 98);
      doc.text(label, 16, y + 4.5);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(50, 50, 50);
      
      const valText = value || "—";
      const truncated = valText.length > 80 ? valText.slice(0, 77) + "..." : valText;
      doc.text(truncated, 61, y + 4.5);
      y += 7;
    };

    drawMetaRow("Week Ending", details.week_ending);
    drawMetaRow("Class", activeClass);
    drawMetaRow("Subject", activeSubject);
    drawMetaRow("Reference", details.reference);
    drawMetaRow("Learning Indicator(s)", details.learning_indicators);
    drawMetaRow("Performance Indicator", details.performance_indicators);
    drawMetaRow("Resources", details.resources);
    drawMetaRow("Core Competencies", details.core_competencies);

    y += 5; // Spacing before daily grid

    // 4. Daily Phases Table Grid
    doc.setFillColor(245, 243, 252);
    doc.rect(14, y, 182, 8, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(38, 34, 98);
    doc.text("DAYS", 16, y + 5);
    doc.text("PHASE 1: STARTER (10M)", 38, y + 5);
    doc.text("PHASE 2: MAIN (40M)", 91, y + 5);
    doc.text("PHASE 3: REFLECTION (10M)", 144, y + 5);
    
    y += 8;
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);

    const colsX = [14, 36, 89, 142];
    const colWidths = [22, 53, 53, 54];

    days.forEach((day) => {
      const dayData = details.days?.[day] || { phase1: "", phase2: "", phase3: "" };
      
      // Split text to size to calculate height dynamically
      const p1Lines = doc.splitTextToSize(dayData.phase1 || "—", colWidths[1] - 4);
      const p2Lines = doc.splitTextToSize(dayData.phase2 || "—", colWidths[2] - 4);
      const p3Lines = doc.splitTextToSize(dayData.phase3 || "—", colWidths[3] - 4);
      
      const lineCount = Math.max(p1Lines.length, p2Lines.length, p3Lines.length, 1);
      const rowHeight = (lineCount * 3.5) + 6;

      // Check overflow
      if (y + rowHeight > 280) {
        doc.addPage();
        y = 20;
        
        // Repeat headers
        doc.setFillColor(245, 243, 252);
        doc.rect(14, y, 182, 8, "F");
        doc.setFont("helvetica", "bold");
        doc.text("DAYS", 16, y + 5);
        doc.text("PHASE 1: STARTER (10M)", 38, y + 5);
        doc.text("PHASE 2: MAIN (40M)", 91, y + 5);
        doc.text("PHASE 3: REFLECTION (10M)", 144, y + 5);
        y += 8;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);
      }

      // Draw cell boxes
      doc.rect(colsX[0], y, colWidths[0], rowHeight);
      doc.rect(colsX[1], y, colWidths[1], rowHeight);
      doc.rect(colsX[2], y, colWidths[2], rowHeight);
      doc.rect(colsX[3], y, colWidths[3], rowHeight);

      // Print Texts
      doc.setFont("helvetica", "bold");
      doc.text(day, colsX[0] + 2, y + 5);
      doc.setFont("helvetica", "normal");
      
      doc.text(p1Lines, colsX[1] + 2, y + 5);
      doc.text(p2Lines, colsX[2] + 2, y + 5);
      doc.text(p3Lines, colsX[3] + 2, y + 5);

      y += rowHeight;
    });

    doc.save(`lesson_note_week_${plan.week_number}.pdf`);
  }

  function exportExcel(plan: LessonNote) {
    const details = parseActivities(plan);
    const activeClass = plan.classroom?.name ?? classrooms.find(c => c.id === plan.class_id)?.name ?? "N/A";
    const activeSubject = plan.subject?.name ?? subjects.find(s => s.id === plan.subject_id)?.name ?? "N/A";

    const data = [
      [schoolInfo?.name?.toUpperCase() ?? "COMPUNERD EDUSYS SCHOOL"],
      [schoolInfo?.address ?? "Accra, Ghana"],
      [`Tel: ${schoolInfo?.phone || ""} | Email: ${schoolInfo?.email || ""}`],
      ["P.O. Box GP 1234, Accra Central, Ghana"],
      [],
      ["SAMPLE SCHEME OF LEARNING - WEEK " + plan.week_number],
      ["WEEKLY LESSON NOTES"],
      [],
      ["Week Ending", details.week_ending || ""],
      ["Class", activeClass],
      ["Subject", activeSubject],
      ["Reference", details.reference || ""],
      ["Learning Indicator(s)", details.learning_indicators || ""],
      ["Performance Indicator", details.performance_indicators || ""],
      ["Resources", details.resources || ""],
      ["Core Competencies", details.core_competencies || ""],
      [],
      ["DAYS", "PHASE 1: STARTER (10 MINS)", "PHASE 2: MAIN (40 MINS)", "PHASE 3: REFLECTION (10 MINS)"]
    ];

    days.forEach((day) => {
      const dayData = details.days?.[day] || { phase1: "", phase2: "", phase3: "" };
      data.push([
        day,
        dayData.phase1 || "",
        dayData.phase2 || "",
        dayData.phase3 || ""
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lesson Note");
    XLSX.writeFile(wb, `lesson_note_week_${plan.week_number}.xlsx`);
  }

  const statusBadge: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700 border-slate-200",
    pending_approval: "bg-amber-100 text-amber-800 border-amber-200",
    approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
    rejected: "bg-rose-100 text-rose-800 border-rose-200",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-extrabold text-slate-900 leading-tight">Lesson Note Management</h1>
          <p className="text-slate-500 text-[12px] font-semibold mt-0.5 font-sans">
            Prepare weekly curricula lesson notes and submit them for supervisor approval.
          </p>
        </div>
        <button
          onClick={() => {
            setFormStep(1);
            setShowCreate(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[12px] font-bold transition-all shadow-sm shrink-0 hover:opacity-90 active:scale-98"
          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
        >
          <Plus size={15} />
          New Lesson Note
        </button>
      </div>

      {/* Roster List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 size={24} className="animate-spin text-violet-600 mx-auto" />
            <p className="text-slate-400 text-[12px] font-semibold mt-2">Loading lesson notes...</p>
          </div>
        ) : plans.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#e8e4f3] p-16 text-center text-slate-400 font-semibold text-[13px] shadow-sm">
            No lesson notes submitted yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plans.map((p) => {
              const details = parseActivities(p);
              const activeClass = p.classroom?.name ?? classrooms.find(c => c.id === p.class_id)?.name ?? "N/A";
              const activeSubject = p.subject?.name ?? subjects.find(s => s.id === p.subject_id)?.name ?? "N/A";

              return (
                <div key={p.id} className="bg-white rounded-2xl border border-[#e8e4f3] p-5 shadow-sm space-y-4 hover:border-violet-200 transition-all hover:shadow-md flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-extrabold uppercase tracking-wide text-violet-600 bg-violet-50 px-2.5 py-0.5 rounded border border-violet-100/50">
                          Week {p.week_number} · {p.academic_year}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${statusBadge[p.status]}`}>
                          {p.status.replace("_", " ")}
                        </span>
                      </div>
                      <span className="text-[11px] font-medium text-slate-400">{new Date(p.created_at).toLocaleDateString()}</span>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-extrabold text-slate-900 text-[14px] leading-tight">{p.topic}</h4>
                      <div className="text-[11.5px] text-slate-500 font-semibold space-y-1">
                        <p><strong>Class:</strong> {activeClass}</p>
                        <p><strong>Subject:</strong> {activeSubject}</p>
                        {details.week_ending && <p><strong>Week Ending:</strong> {details.week_ending}</p>}
                      </div>
                    </div>

                    {p.remarks && (
                      <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3.5 flex items-start gap-2.5 text-amber-800 text-[11.5px]">
                        <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Supervisor Note:</span>
                          <p className="font-medium mt-0.5 leading-relaxed">{p.remarks}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-[#f5f3fc] flex items-center justify-between gap-2">
                    <button
                      onClick={() => setSelectedPlan(p)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-[11.5px] font-bold hover:bg-slate-50 transition-all"
                    >
                      <Eye size={13} /> View
                    </button>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => exportPDF(p)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-[11.5px] font-bold hover:bg-slate-50 transition-all"
                        title="Export PDF"
                      >
                        <FileDown size={13} /> PDF
                      </button>
                      <button
                        onClick={() => exportExcel(p)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-[11.5px] font-bold hover:bg-slate-50 transition-all"
                        title="Export Excel"
                      >
                        <FileSpreadsheet size={13} /> Excel
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Plan view Overlay */}
      {selectedPlan && (() => {
        const details = parseActivities(selectedPlan);
        const activeClass = selectedPlan.classroom?.name ?? classrooms.find(c => c.id === selectedPlan.class_id)?.name ?? "N/A";
        const activeSubject = selectedPlan.subject?.name ?? subjects.find(s => s.id === selectedPlan.subject_id)?.name ?? "N/A";

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
            <div className="bg-white rounded-2xl border border-[#e8e4f3] p-6 shadow-2xl space-y-5 w-full max-w-4xl relative my-8 max-h-[90vh] overflow-y-auto">
              <button
                type="button"
                onClick={() => setSelectedPlan(null)}
                className="absolute right-4 top-4 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all font-bold text-[14px]"
              >
                ✕
              </button>
              
              <div className="flex items-center justify-between border-b border-[#f5f3fc] pb-4 pr-8">
                <div className="flex items-center gap-3">
                  <span className="p-2 rounded-xl bg-violet-50 text-violet-600 border border-violet-100 shrink-0">
                    <ScrollText size={20} />
                  </span>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-[15px]">Lesson Plan Specification</h3>
                    <p className="text-[11.5px] text-slate-400 font-semibold mt-0.5">GES Scheme of Learning · Week {selectedPlan.week_number}</p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => exportPDF(selectedPlan)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-[11.5px] font-bold hover:bg-slate-50 transition-all shadow-sm"
                  >
                    <FileDown size={13} /> Export PDF
                  </button>
                  <button
                    onClick={() => exportExcel(selectedPlan)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-[11.5px] font-bold hover:bg-slate-50 transition-all shadow-sm"
                  >
                    <FileSpreadsheet size={13} /> Export Excel
                  </button>
                </div>
              </div>

              {/* Template Table 2 Layout */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-[12.5px] border-collapse text-left">
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="w-1/4 px-4 py-2.5 font-bold text-violet-950 bg-violet-50/50">Name of School</td>
                      <td className="w-3/4 px-4 py-2.5 text-slate-700 font-medium">{schoolInfo?.name ?? "Compunerd School"}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="px-4 py-2.5 font-bold text-violet-950 bg-violet-50/50">Week Ending</td>
                      <td className="px-4 py-2.5 text-slate-700 font-medium">{details.week_ending || "—"}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="px-4 py-2.5 font-bold text-violet-950 bg-violet-50/50">Class</td>
                      <td className="px-4 py-2.5 text-slate-700 font-medium">{activeClass}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="px-4 py-2.5 font-bold text-violet-950 bg-violet-50/50">Subject</td>
                      <td className="px-4 py-2.5 text-slate-700 font-bold uppercase">{activeSubject}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="px-4 py-2.5 font-bold text-violet-950 bg-violet-50/50">Reference</td>
                      <td className="px-4 py-2.5 text-slate-700 font-medium">{details.reference || "—"}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="px-4 py-2.5 font-bold text-violet-950 bg-violet-50/50">Learning Indicator(s)</td>
                      <td className="px-4 py-2.5 font-mono text-[11.5px] text-slate-700 font-bold">{details.learning_indicators || "—"}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="px-4 py-2.5 font-bold text-violet-950 bg-violet-50/50">Performance Indicator</td>
                      <td className="px-4 py-2.5 text-slate-600 font-semibold whitespace-pre-line">{details.performance_indicators || "—"}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="px-4 py-2.5 font-bold text-violet-950 bg-violet-50/50">Teaching/Learning Resources</td>
                      <td className="px-4 py-2.5 text-slate-600 font-semibold whitespace-pre-line">{details.resources || "—"}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 font-bold text-violet-950 bg-violet-50/50">Core Competencies</td>
                      <td className="px-4 py-2.5 text-slate-600 font-semibold whitespace-pre-line">{details.core_competencies || "—"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Weekly Phases Grid */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-[12px] border-collapse text-left">
                  <thead>
                    <tr className="bg-violet-950 text-white font-bold">
                      <th className="px-4 py-3 w-24">DAYS</th>
                      <th className="px-4 py-3">PHASE 1: STARTER (10 MINS)</th>
                      <th className="px-4 py-3">PHASE 2: MAIN (40 MINS)</th>
                      <th className="px-4 py-3">PHASE 3: REFLECTION (10 MINS)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium">
                    {days.map((day) => {
                      const dayData = details.days?.[day] || { phase1: "", phase2: "", phase3: "" };
                      return (
                        <tr key={day} className="hover:bg-slate-50/30">
                          <td className="px-4 py-3 font-extrabold text-violet-950 bg-slate-50/50">{day}</td>
                          <td className="px-4 py-3 text-slate-600 whitespace-pre-line leading-relaxed">{dayData.phase1 || "—"}</td>
                          <td className="px-4 py-3 text-slate-600 whitespace-pre-line leading-relaxed">{dayData.phase2 || "—"}</td>
                          <td className="px-4 py-3 text-slate-600 whitespace-pre-line leading-relaxed">{dayData.phase3 || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Create Lesson Note Multi-Step Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
          <form className="bg-white rounded-2xl border border-[#e8e4f3] p-6 shadow-2xl space-y-5 w-full max-w-2xl relative animate-scale-up my-8 max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="absolute right-4 top-4 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all font-bold text-[14px]"
            >
              ✕
            </button>
            <h3 className="font-extrabold text-slate-900 text-[15px] border-b border-[#f5f3fc] pb-3 flex items-center gap-2">
              <ScrollText size={18} className="text-violet-600" />
              <span>Draft Lesson Note (Template 2)</span>
            </h3>

            {/* Form Step indicators */}
            <div className="flex items-center justify-between gap-2 max-w-sm mx-auto py-2">
              {[1, 2, 3].map((step) => (
                <button
                  type="button"
                  key={step}
                  onClick={() => setFormStep(step)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all border ${
                    formStep === step
                      ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                      : formStep > step
                        ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                        : "bg-slate-50 text-slate-400 border-slate-200"
                  }`}
                >
                  {formStep > step ? <Check size={12} /> : step}
                </button>
              ))}
            </div>

            {/* STEP 1: Metadata */}
            {formStep === 1 && (
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Classroom</label>
                    <select
                      value={metadata.class_id}
                      onChange={(e) => setMetadata(prev => ({ ...prev, class_id: e.target.value }))}
                      className="w-full h-10 px-3.5 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] bg-white"
                    >
                      {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Subject</label>
                    <select
                      value={metadata.subject_id}
                      onChange={(e) => setMetadata(prev => ({ ...prev, subject_id: e.target.value }))}
                      className="w-full h-10 px-3.5 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] bg-white"
                    >
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Week Number</label>
                    <input
                      type="number"
                      min={1}
                      value={metadata.week_number}
                      onChange={(e) => setMetadata(prev => ({ ...prev, week_number: e.target.value }))}
                      className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Academic Year</label>
                    <input
                      type="text"
                      value={metadata.academic_year}
                      onChange={(e) => setMetadata(prev => ({ ...prev, academic_year: e.target.value }))}
                      className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Week Ending (Date)</label>
                    <input
                      type="date"
                      value={metadata.week_ending}
                      onChange={(e) => setMetadata(prev => ({ ...prev, week_ending: e.target.value }))}
                      className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Reference (Curriculum)</label>
                  <input
                    type="text"
                    value={metadata.reference}
                    onChange={(e) => setMetadata(prev => ({ ...prev, reference: e.target.value }))}
                    placeholder="e.g. English Language Curriculum"
                    className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Topic / Theme</label>
                  <input
                    type="text"
                    required
                    value={metadata.topic}
                    onChange={(e) => setMetadata(prev => ({ ...prev, topic: e.target.value }))}
                    placeholder="e.g. Oral Language - Story Telling"
                    className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Lesson Objectives</label>
                  <textarea
                    rows={2}
                    value={metadata.objectives}
                    onChange={(e) => setMetadata(prev => ({ ...prev, objectives: e.target.value }))}
                    placeholder="By the end of the lesson, learners will be able to..."
                    className="w-full p-3 text-[12.5px] font-semibold text-slate-800 border border-[#e0daf0] rounded-xl outline-none focus:border-[#7c3aed] bg-white"
                  />
                </div>
              </div>
            )}

            {/* STEP 2: Indicators */}
            {formStep === 2 && (
              <div className="space-y-4 animate-fade-in">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Learning Indicator(s)</label>
                  <input
                    type="text"
                    value={metadata.learning_indicators}
                    onChange={(e) => setMetadata(prev => ({ ...prev, learning_indicators: e.target.value }))}
                    placeholder="e.g. B4.1.4.1.2. B4.2.4.1.1..."
                    className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Performance Indicator</label>
                  <textarea
                    rows={2}
                    value={metadata.performance_indicators}
                    onChange={(e) => setMetadata(prev => ({ ...prev, performance_indicators: e.target.value }))}
                    placeholder="Learners can tell own stories, identify main characters..."
                    className="w-full p-3 text-[12.5px] font-semibold text-slate-800 border border-[#e0daf0] rounded-xl outline-none focus:border-[#7c3aed] bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Teaching / Learning Resources</label>
                  <textarea
                    rows={2}
                    value={metadata.resources}
                    onChange={(e) => setMetadata(prev => ({ ...prev, resources: e.target.value }))}
                    placeholder="Word cards, sentence cards, pictures..."
                    className="w-full p-3 text-[12.5px] font-semibold text-slate-800 border border-[#e0daf0] rounded-xl outline-none focus:border-[#7c3aed] bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Core Competencies</label>
                  <textarea
                    rows={2}
                    value={metadata.core_competencies}
                    onChange={(e) => setMetadata(prev => ({ ...prev, core_competencies: e.target.value }))}
                    placeholder="Reading and Writing Skills, Communication, Collaboration..."
                    className="w-full p-3 text-[12.5px] font-semibold text-slate-800 border border-[#e0daf0] rounded-xl outline-none focus:border-[#7c3aed] bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Assessment Strategy</label>
                  <input
                    type="text"
                    value={metadata.assessment_strategy}
                    onChange={(e) => setMetadata(prev => ({ ...prev, assessment_strategy: e.target.value }))}
                    placeholder="Class exercise worksheet, oral presentation, group quiz..."
                    className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] bg-white"
                  />
                </div>
              </div>
            )}

            {/* STEP 3: Grid */}
            {formStep === 3 && (
              <div className="space-y-4 animate-fade-in">
                {/* Days sub-tabs */}
                <div className="flex gap-1 overflow-x-auto pb-1 border-b border-slate-100">
                  {days.map((d) => (
                    <button
                      type="button"
                      key={d}
                      onClick={() => setActiveDayTab(d)}
                      className={`px-3 py-1.5 text-[11.5px] font-bold rounded-lg transition-all ${
                        activeDayTab === d
                          ? "bg-violet-50 text-violet-700 border border-violet-100"
                          : "text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      {d.substring(0, 3)}
                    </button>
                  ))}
                </div>

                <div className="p-3.5 bg-slate-50/50 border border-slate-100 rounded-xl space-y-4">
                  <p className="text-[12.5px] font-extrabold text-violet-950">Drafting Phase details for {activeDayTab}</p>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Phase 1: Starter (10 mins)</label>
                    <textarea
                      rows={2}
                      value={dailyPhases[activeDayTab].phase1}
                      onChange={(e) => setDailyPhases(prev => ({
                        ...prev,
                        [activeDayTab]: { ...prev[activeDayTab], phase1: e.target.value }
                      }))}
                      placeholder="Prepare student brains for learning (recite poems, sing songs...)"
                      className="w-full p-2.5 text-[12.5px] font-medium text-slate-800 border border-[#e0daf0] rounded-xl outline-none focus:border-[#7c3aed] bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Phase 2: Main (40 mins)</label>
                    <textarea
                      rows={3}
                      value={dailyPhases[activeDayTab].phase2}
                      onChange={(e) => setDailyPhases(prev => ({
                        ...prev,
                        [activeDayTab]: { ...prev[activeDayTab], phase2: e.target.value }
                      }))}
                      placeholder="Main lesson learning activities and exercises..."
                      className="w-full p-2.5 text-[12.5px] font-medium text-slate-800 border border-[#e0daf0] rounded-xl outline-none focus:border-[#7c3aed] bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Phase 3: Reflection (10 mins)</label>
                    <textarea
                      rows={2}
                      value={dailyPhases[activeDayTab].phase3}
                      onChange={(e) => setDailyPhases(prev => ({
                        ...prev,
                        [activeDayTab]: { ...prev[activeDayTab], phase3: e.target.value }
                      }))}
                      placeholder="Summarize lessons, answer learner questions, assign assessment..."
                      className="w-full p-2.5 text-[12.5px] font-medium text-slate-800 border border-[#e0daf0] rounded-xl outline-none focus:border-[#7c3aed] bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Form actions */}
            <div className="flex gap-3 pt-2 border-t border-[#f5f3fc]">
              {formStep > 1 && (
                <button
                  type="button"
                  onClick={() => setFormStep(s => s - 1)}
                  className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-700 font-bold text-[12.5px] hover:bg-slate-50 transition-all"
                >
                  Previous
                </button>
              )}
              {formStep < 3 ? (
                <button
                  type="button"
                  onClick={() => setFormStep(s => s + 1)}
                  className="flex-1 h-11 text-white font-bold text-[12.5px] transition-all hover:opacity-90 rounded-xl"
                  style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
                >
                  Next
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={(e) => handleSubmit(e, "draft")}
                    className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-700 font-bold text-[12.5px] hover:bg-slate-50 transition-all active:scale-98"
                  >
                    Save Draft
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={(e) => handleSubmit(e, "pending_approval")}
                    className="flex-1 h-11 text-white font-bold text-[12.5px] transition-all hover:opacity-90 active:scale-98 rounded-xl"
                    style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
                  >
                    {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                    Submit Lesson Note
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
