"use client";
import { useState, useRef, useCallback } from "react";
import { PhotoCropModal } from "@/components/ui/PhotoCropModal";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft, User, Users, CreditCard, ClipboardList, BarChart2,
  Phone, Edit3, Save, X, Plus, Trash2, FileDown, Camera,
  Heart, FileText, AlertTriangle, Trophy, TrendingUp, Clock,
  CheckCircle2, AlertCircle, Shield, BookOpen, Star, Award,
  Calendar, ChevronRight, Upload,
} from "lucide-react";
import { formatDate, formatCurrency, getInitials, cn } from "@/lib/utils";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Badge } from "@/components/ui/Badge";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend,
} from "recharts";
import type { Student, Parent, FeePayment, AttendanceRecord, ExamScore } from "@/types/database";

// ── Types ────────────────────────────────────────────────────────
type ClassRoom = { id: string; name: string; level: string };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Medical    = Record<string, any> | null;
type DocRow     = { id:string; document_type:string; file_name:string|null; file_url:string; uploaded_at:string };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Discipline = Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Award      = Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Promotion  = Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Timeline   = Record<string, any>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WalletRow   = Record<string, any> | null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InvoiceRow  = Record<string, any>;

interface Props {
  student: Student & { classrooms: ClassRoom | null };
  parents: Parent[];
  fees: (FeePayment & { fee_types: { name:string }|null; terms: { name:string }|null })[];
  attendance: (Pick<AttendanceRecord,"date"|"status"> & { terms: { name:string }|{ name:string }[]|null })[];
  scores: (ExamScore & { subjects: { name:string }|null; terms: { name:string }|null })[];
  classes: ClassRoom[];
  medical: Medical;
  documents: DocRow[];
  discipline: Discipline[];
  awards: Award[];
  promotions: Promotion[];
  timeline: Timeline[];
  wallet: WalletRow;
  invoices: InvoiceRow[];
  viewerRole: string;
  viewerId: string;
}

const TABS = [
  { id:"biodata",     label:"Bio Data",        icon:User },
  { id:"admission",   label:"Admission",        icon:FileText },
  { id:"parents",     label:"Parents",          icon:Users },
  { id:"medical",     label:"Medical",          icon:Heart },
  { id:"academic",    label:"Academic",         icon:BookOpen },
  { id:"attendance",  label:"Attendance",       icon:ClipboardList },
  { id:"finance",     label:"Finance",          icon:CreditCard },
  { id:"discipline",  label:"Discipline",       icon:Shield },
  { id:"awards",      label:"Awards",           icon:Trophy },
  { id:"documents",   label:"Documents",        icon:FileText },
  { id:"promotions",  label:"Promotion History",icon:TrendingUp },
  { id:"timeline",    label:"Timeline",         icon:Clock },
];

const STATUS_COLORS: Record<string,{bg:string;text:string}> = {
  active:       { bg:"#d1fae5", text:"#065f46" },
  graduated:    { bg:"#dbeafe", text:"#1e40af" },
  "transfer out":{ bg:"#fef3c7", text:"#92400e" },
  withdrawn:    { bg:"#fee2e2", text:"#991b1b" },
  suspended:    { bg:"#fde8d8", text:"#9a3412" },
  expelled:     { bg:"#fce7f3", text:"#9d174d" },
  deceased:     { bg:"#f3f4f6", text:"#374151" },
};

const DOC_TYPES = [
  "Birth Certificate","Passport Photo","Admission Letter","Transfer Letter",
  "Medical Documents","Report Card","Other",
];
const INCIDENT_TYPES = [
  "Lateness","Absenteeism","Fighting","Insubordination","Vandalism",
  "Bullying","Cheating","Substance Abuse","Other",
];
const AWARD_TYPES = ["Academic","Sports","Leadership","Competition","Cultural","Other"];
const BLOOD_GROUPS = ["A+","A-","B+","B-","AB+","AB-","O+","O-"];
const RELIGIONS = ["Christianity","Islam","Traditional","Other","Prefer not to say"];
const ADMISSION_TYPES = ["New Admission","Transfer","Re-Admission","Scholarship"];
const STATUSES = ["active","graduated","transfer out","withdrawn","suspended","expelled","deceased"];

export function StudentProfile({
  student: initial, parents: initialParents, fees, attendance, scores, classes,
  medical: initialMedical, documents: initialDocs, discipline: initialDisc,
  awards: initialAwards, promotions: initialPromotions, timeline: initialTimeline,
  wallet: initialWallet, invoices: initialInvoices,
  viewerRole, viewerId,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [tab, setTab]         = useState("biodata");
  const [student, setStudent] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving]   = useState(false);

  const [parents, setParents]       = useState(initialParents);
  const [medical, setMedical]       = useState(initialMedical);
  const [docs, setDocs]             = useState(initialDocs);
  const [discipline, setDiscipline] = useState(initialDisc);
  const [awards, setAwards]         = useState(initialAwards);
  const [promotions, setPromotions] = useState(initialPromotions);
  const [timeline, setTimeline]     = useState(initialTimeline);
  const [wallet]                    = useState(initialWallet);
  const [invoices]                  = useState(initialInvoices);

  const [photoPreview, setPhotoPreview] = useState<string>(initial.photo_url ?? "");
  const photoRef = useRef<HTMLInputElement>(null);
  const docRef   = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmDeleteType, setConfirmDeleteType] = useState<"parent"|"doc"|"disc"|"award">("parent");

  const canEdit    = ["headmaster","owner","teacher","admin"].includes(viewerRole);
  const canFinance = ["headmaster","owner","accountant"].includes(viewerRole);
  const canSensitive = ["headmaster","owner"].includes(viewerRole);

  const fullName = [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(" ");

  // ── Edit form state ────────────────────────────────────────────
  const [ef, setEf] = useState({
    first_name: initial.first_name,
    middle_name: initial.middle_name ?? "",
    last_name: initial.last_name,
    date_of_birth: initial.date_of_birth ?? "",
    gender: initial.gender,
    class_id: initial.class_id ?? "",
    status: initial.status,
    previous_school: initial.previous_school ?? "",
    medical_notes: initial.medical_notes ?? "",
    student_id_manual: (initial as never as Record<string,string>).student_id_manual ?? "",
    nationality: (initial as never as Record<string,string>).nationality ?? "Ghanaian",
    place_of_birth: (initial as never as Record<string,string>).place_of_birth ?? "",
    religion: (initial as never as Record<string,string>).religion ?? "",
    blood_group: (initial as never as Record<string,string>).blood_group ?? "",
    admission_type: (initial as never as Record<string,string>).admission_type ?? "new",
    previous_class: (initial as never as Record<string,string>).previous_class ?? "",
    admission_year: (initial as never as Record<string,string>).admission_year ?? "",
  });

  // ── Parent form ────────────────────────────────────────────────
  const [addingParent, setAddingParent] = useState(false);
  const [pf, setPf] = useState({
    full_name:"", phone:"", relationship:"Father", email:"",
    occupation:"", employer:"", address:"", digital_address:"",
  });
  const [savingParent, setSavingParent] = useState(false);

  // ── Medical form ───────────────────────────────────────────────
  const [editMedical, setEditMedical] = useState(false);
  const [mf, setMf] = useState({
    blood_group: medical?.blood_group ?? "",
    allergies: medical?.allergies ?? "",
    medical_conditions: medical?.medical_conditions ?? "",
    special_needs: medical?.special_needs ?? "",
    hospital_name: medical?.hospital_name ?? "",
    doctor_name: medical?.doctor_name ?? "",
    insurance_provider: medical?.insurance_provider ?? "",
    insurance_number: medical?.insurance_number ?? "",
  });

  // ── Discipline form ────────────────────────────────────────────
  const [addingDisc, setAddingDisc] = useState(false);
  const [df, setDf] = useState({
    incident_date:"", incident_type:"", description:"", action_taken:"", parent_notified:false,
  });

  // ── Award form ─────────────────────────────────────────────────
  const [addingAward, setAddingAward] = useState(false);
  const [awf, setAwf] = useState({
    award_type:"Academic", title:"", description:"", awarded_date:"", awarded_by:"",
  });

  // ── Promotion form ─────────────────────────────────────────────
  const [addingPromo, setAddingPromo] = useState(false);
  const [prf, setPrf] = useState({ academic_year:"", class_id:"", notes:"" });

  // ── Document upload ────────────────────────────────────────────
  const [docType, setDocType]   = useState(DOC_TYPES[0]);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // ── Summary stats ──────────────────────────────────────────────
  // Use wallet data (new ERP system) if available; fallback to old fee_payments
  const walletBalance = wallet
    ? Math.max(0, Number(wallet.total_billed ?? 0) - Number(wallet.total_paid ?? 0) - Number(wallet.total_waived ?? 0))
    : null;
  const totalDue  = fees.reduce((s,f)=>s+f.amount_due,0);
  const totalPaid = fees.reduce((s,f)=>s+f.amount_paid,0);
  const balance   = walletBalance ?? (totalDue - totalPaid);
  const present   = attendance.filter(a=>a.status==="present").length;
  const absent    = attendance.filter(a=>a.status==="absent").length;
  const late      = attendance.filter(a=>a.status==="late").length;
  const attRate   = attendance.length > 0 ? Math.round((present/attendance.length)*100) : null;

  // ── Monthly attendance chart data ──────────────────────────────
  const monthlyAtt = (() => {
    const map: Record<string,{present:number;absent:number;late:number}> = {};
    attendance.forEach(a => {
      const m = a.date.slice(0,7); // YYYY-MM
      if (!map[m]) map[m] = {present:0,absent:0,late:0};
      if (a.status==="present") map[m].present++;
      else if (a.status==="absent") map[m].absent++;
      else if (a.status==="late") map[m].late++;
    });
    return Object.entries(map).sort(([a],[b])=>a.localeCompare(b)).slice(-6).map(([m,v])=>({
      month: new Date(m+"-01").toLocaleDateString("en-GH",{month:"short"}),
      ...v,
    }));
  })();

  // ── Academic trend chart data ──────────────────────────────────
  const academicTrend = (() => {
    const byTerm: Record<string, number[]> = {};
    scores.forEach(s => {
      const t = s.terms?.name ?? "Unknown";
      if (!byTerm[t]) byTerm[t] = [];
      if (s.total != null) byTerm[t].push(Number(s.total));
    });
    return Object.entries(byTerm).map(([term, vals]) => ({
      term,
      avg: vals.length ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length) : 0,
    }));
  })();

  // ── Handlers ───────────────────────────────────────────────────
  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setPendingPhotoFile(f);
    setCropSrc(URL.createObjectURL(f));
    e.target.value = "";
  }

  const handleCropConfirm = useCallback(async (blob: Blob) => {
    setCropSrc(null);
    const f = pendingPhotoFile;
    setPendingPhotoFile(null);
    const ext = f?.name.split(".").pop() ?? "jpg";
    const path = `students/${student.id}-photo-${Date.now()}.${ext}`;
    const preview = URL.createObjectURL(blob);
    setPhotoPreview(preview);
    const { error } = await supabase.storage.from("school-assets").upload(path, blob, { upsert: true, contentType: "image/jpeg" });
    if (!error) {
      const { data } = supabase.storage.from("school-assets").getPublicUrl(path);
      await supabase.from("students").update({ photo_url: data.publicUrl }).eq("id", student.id);
      setPhotoPreview(data.publicUrl);
    }
  }, [pendingPhotoFile, student.id, supabase]);

  async function saveEdit() {
    setSaving(true);
    const { data, error } = await supabase.from("students").update({
      first_name: ef.first_name.trim(),
      middle_name: ef.middle_name.trim() || null,
      last_name: ef.last_name.trim(),
      date_of_birth: ef.date_of_birth || null,
      gender: ef.gender as "male"|"female",
      class_id: ef.class_id || null,
      status: ef.status as Student["status"],
      previous_school: ef.previous_school.trim() || null,
      medical_notes: ef.medical_notes.trim() || null,
      student_id_manual: ef.student_id_manual.trim() || null,
      nationality: ef.nationality || "Ghanaian",
      place_of_birth: ef.place_of_birth.trim() || null,
      religion: ef.religion || null,
      blood_group: ef.blood_group || null,
      admission_type: ef.admission_type || null,
      previous_class: ef.previous_class.trim() || null,
      admission_year: ef.admission_year.trim() || null,
    }).eq("id", student.id).select("*, classrooms(id,name,level)").single();
    setSaving(false);
    if (!error && data) {
      // Fire status-change automation if status changed
      if (ef.status !== student.status) {
        fetch("/api/billing/status-change", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            student_id: student.id,
            new_status: ef.status,
            old_status: student.status,
            school_id: student.school_id,
          }),
        }).catch(() => null);
      }
      setStudent(data); setEditing(false); router.refresh();
    }
  }

  async function saveMedical() {
    const payload = { ...mf, student_id: student.id, school_id: student.school_id };
    const { data } = await supabase.from("student_medical").upsert(payload).select().single();
    if (data) setMedical(data);
    setEditMedical(false);
  }

  async function saveParent(e: React.FormEvent) {
    e.preventDefault();
    setSavingParent(true);
    const { data } = await supabase.from("parents").insert({
      school_id: student.school_id,
      student_id: student.id,
      full_name: pf.full_name.trim(),
      phone: pf.phone.trim(),
      relationship: pf.relationship,
      email: pf.email.trim() || null,
      occupation: pf.occupation.trim() || null,
      employer: pf.employer.trim() || null,
      address: pf.address.trim() || null,
      digital_address: pf.digital_address.trim() || null,
      is_primary: parents.length === 0,
    }).select().single();
    setSavingParent(false);
    if (data) {
      setParents(p=>[...p,data]);
      setAddingParent(false);
      setPf({ full_name:"",phone:"",relationship:"Father",email:"",occupation:"",employer:"",address:"",digital_address:"" });
      addTimelineEvent("parent", `${pf.full_name} added as ${pf.relationship}`, new Date().toISOString().slice(0,10));
    }
  }

  async function deleteParent(id: string) {
    await supabase.from("parents").delete().eq("id", id);
    setParents(p=>p.filter(x=>x.id!==id));
    setConfirmDelete(null);
  }

  async function saveDisc(e: React.FormEvent) {
    e.preventDefault();
    const { data } = await supabase.from("student_discipline").insert({
      student_id: student.id,
      school_id: student.school_id,
      incident_date: df.incident_date,
      incident_type: df.incident_type,
      description: df.description || null,
      action_taken: df.action_taken || null,
      parent_notified: df.parent_notified,
      recorded_by: viewerId,
    }).select().single();
    if (data) {
      setDiscipline(d=>[data,...d]);
      setAddingDisc(false);
      setDf({ incident_date:"",incident_type:"",description:"",action_taken:"",parent_notified:false });
      addTimelineEvent("discipline", `Discipline: ${df.incident_type}`, df.incident_date);
    }
  }

  async function saveAward(e: React.FormEvent) {
    e.preventDefault();
    const { data } = await supabase.from("student_awards").insert({
      student_id: student.id,
      school_id: student.school_id,
      award_type: awf.award_type,
      title: awf.title,
      description: awf.description || null,
      awarded_date: awf.awarded_date || null,
      awarded_by: awf.awarded_by || null,
    }).select().single();
    if (data) {
      setAwards(a=>[data,...a]);
      setAddingAward(false);
      setAwf({ award_type:"Academic",title:"",description:"",awarded_date:"",awarded_by:"" });
      if (awf.awarded_date) addTimelineEvent("award", `Award: ${awf.title}`, awf.awarded_date);
    }
  }

  async function savePromotion(e: React.FormEvent) {
    e.preventDefault();
    const cls = classes.find(c=>c.id===prf.class_id);
    const { data } = await supabase.from("student_promotions").insert({
      student_id: student.id,
      school_id: student.school_id,
      academic_year: prf.academic_year,
      class_name: cls?.name ?? "",
      class_id: prf.class_id || null,
      promoted_by: viewerId,
      notes: prf.notes || null,
    }).select().single();
    if (data) {
      setPromotions(p=>[...p,data]);
      setAddingPromo(false);
      setPrf({ academic_year:"",class_id:"",notes:"" });
      addTimelineEvent("promotion", `Promoted to ${cls?.name ?? ""}`, new Date().toISOString().slice(0,10));
    }
  }

  async function uploadDoc(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploadingDoc(true);
    const newDocs: DocRow[] = [];
    for (const f of files) {
      const ext = f.name.split(".").pop();
      const path = `students/${student.id}/docs/${docType.replace(/\s+/g,"_").toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("school-assets").upload(path, f);
      if (!error) {
        const { data: urlData } = supabase.storage.from("school-assets").getPublicUrl(path);
        const { data } = await supabase.from("student_documents").insert({
          student_id: student.id,
          school_id: student.school_id,
          document_type: docType,
          file_name: f.name,
          file_url: urlData.publicUrl,
        }).select().single();
        if (data) newDocs.push(data);
      }
    }
    if (newDocs.length) setDocs(d=>[...newDocs,...d]);
    setUploadingDoc(false);
    e.target.value = "";
  }

  async function deleteDoc(id: string) {
    await supabase.from("student_documents").delete().eq("id", id);
    setDocs(d=>d.filter(x=>x.id!==id));
    setConfirmDelete(null);
  }

  async function addTimelineEvent(type: string, title: string, date: string) {
    await supabase.from("student_timeline").insert({
      student_id: student.id,
      school_id: student.school_id,
      event_type: type,
      title,
      event_date: date,
    });
    const { data } = await supabase.from("student_timeline").select("*").eq("student_id", student.id).order("event_date", { ascending: false });
    if (data) setTimeline(data);
  }

  async function exportPDF() {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const M = 14; const PW = 182;

    function header(title: string) {
      doc.setFillColor(38,34,98); doc.rect(0,0,210,30,"F");
      doc.setTextColor(255,255,255); doc.setFontSize(16); doc.setFont("helvetica","bold");
      doc.text("Student Profile", M, 12);
      doc.setFontSize(9); doc.setFont("helvetica","normal");
      doc.text(`${title}  ·  ${fullName}  ·  ${student.admission_number}`, M, 20);
      doc.setFontSize(8); doc.text(`Generated ${new Date().toLocaleDateString("en-GH")}`, 210-M, 20, { align:"right" });
    }

    function section(label: string, y: number): number {
      doc.setFillColor(240,240,250); doc.rect(M, y, PW, 7, "F");
      doc.setFontSize(9); doc.setFont("helvetica","bold"); doc.setTextColor(38,34,98);
      doc.text(label.toUpperCase(), M+2, y+5); return y+10;
    }

    function row(label: string, value: string, y: number, indent=0): number {
      doc.setFont("helvetica","bold"); doc.setTextColor(80,80,80); doc.setFontSize(9);
      doc.text(label+":", M+indent, y);
      doc.setFont("helvetica","normal"); doc.setTextColor(20,20,20);
      const lines = doc.splitTextToSize(value || "—", PW-65);
      doc.text(lines, M+60+indent, y);
      return y + Math.max(6, lines.length*5);
    }

    function newPage(title: string) { doc.addPage(); header(title); return 38; }
    function checkPage(y: number, title: string, threshold=250): number {
      return y > threshold ? newPage(title) : y;
    }

    // ── PAGE 1: Bio Data ───────────────────────────────────────────
    header("Bio Data"); let y = 38;
    const s = student as never as Record<string,string>;
    y = section("Personal Information", y);
    y = row("Full Name", fullName, y);
    y = row("Admission No.", student.admission_number, y);
    y = row("Gender", student.gender, y);
    y = row("Date of Birth", student.date_of_birth ? formatDate(student.date_of_birth) : "—", y);
    y = row("Class", student.classrooms?.name ?? "—", y);
    y = row("Status", student.status, y);
    y = row("Nationality", s.nationality || "Ghanaian", y);
    y = row("Place of Birth", s.place_of_birth || "—", y);
    y = row("Religion", s.religion || "—", y);
    y = row("Blood Group", s.blood_group || "—", y);
    y += 4;
    y = section("Admission", y);
    y = row("Admission Date", formatDate(student.admission_date), y);
    y = row("Admission Type", s.admission_type || "—", y);
    y = row("Previous School", student.previous_school || "—", y);
    y = row("Previous Class", s.previous_class || "—", y);

    // ── PAGE 2: Parents/Guardians ───────────────────────────────────
    y = newPage("Parents / Guardians");
    if (parents.length === 0) { doc.setFontSize(10); doc.setTextColor(120,120,120); doc.text("No parents/guardians on record.", M, y); }
    parents.forEach((p, i) => {
      y = checkPage(y, "Parents / Guardians");
      y = section(`${p.relationship} ${i+1}: ${p.full_name}`, y);
      y = row("Phone", p.phone || "—", y);
      y = row("Email", (p as never as Record<string,string>).email || "—", y);
      y = row("Occupation", (p as never as Record<string,string>).occupation || "—", y);
      y = row("Address", (p as never as Record<string,string>).address || "—", y);
      y += 3;
    });

    // ── PAGE 3: Medical ────────────────────────────────────────────
    y = newPage("Medical");
    const med = medical as Record<string,string> | null;
    y = section("Medical Information", y);
    y = row("Blood Group", med?.blood_group || s.blood_group || "—", y);
    y = row("Allergies", med?.allergies || "—", y);
    y = row("Medical Conditions", med?.conditions || student.medical_notes || "—", y);
    y = row("Medications", med?.medications || "—", y);
    y = row("Doctor Name", med?.doctor_name || "—", y);
    y = row("Doctor Phone", med?.doctor_phone || "—", y);

    // ── PAGE 4: Academic ───────────────────────────────────────────
    y = newPage("Academic Performance");
    if (scores.length === 0) { doc.setFontSize(10); doc.setTextColor(120,120,120); doc.text("No exam scores recorded.", M, y); }
    else {
      const byTerm: Record<string, typeof scores> = {};
      scores.forEach(sc => { const t = sc.terms?.name ?? "N/A"; (byTerm[t] ??= []).push(sc); });
      Object.entries(byTerm).forEach(([term, list]) => {
        y = checkPage(y, "Academic Performance", 240);
        y = section(term, y);
        list.forEach(sc => {
          y = checkPage(y, "Academic Performance", 270);
          doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(30,30,30);
          doc.text(`${sc.subjects?.name ?? "Subject"}`, M+2, y);
          doc.text(`${sc.total ?? "—"}%`, M+PW-10, y, { align:"right" });
          y += 5.5;
        });
        y += 2;
      });
    }

    // ── PAGE 5: Attendance ─────────────────────────────────────────
    y = newPage("Attendance");
    y = section("Summary", y);
    y = row("Total Days", `${attendance.length}`, y);
    y = row("Present", `${present} (${attRate ?? "—"}%)`, y);
    y = row("Absent", `${absent}`, y);
    y = row("Late", `${late}`, y);
    y += 6;
    if (attendance.length > 0) {
      y = section("Attendance Log (last 30)", y);
      attendance.slice(0,30).forEach(a => {
        y = checkPage(y, "Attendance", 270);
        doc.setFont("helvetica","normal"); doc.setFontSize(8.5); doc.setTextColor(40,40,40);
        doc.text(a.date, M+2, y);
        doc.setTextColor(a.status==="present"?0:a.status==="absent"?180:130, a.status==="present"?130:0, 0);
        doc.text(a.status.charAt(0).toUpperCase()+a.status.slice(1), M+40, y);
        doc.setTextColor(40,40,40);
        y += 5;
      });
    }

    // ── PAGE 6: Finance ────────────────────────────────────────────
    if (canFinance) {
      y = newPage("Finance");
      const wb = wallet as Record<string,number> | null;
      y = section("Wallet Summary", y);
      y = row("Total Billed", wb ? formatCurrency(Number(wb.total_billed)) : "—", y);
      y = row("Total Paid", wb ? formatCurrency(Number(wb.total_paid)) : "—", y);
      y = row("Waived", wb ? formatCurrency(Number(wb.total_waived)) : "—", y);
      const outstanding = wb ? Math.max(0, Number(wb.total_billed)-Number(wb.total_paid)-Number(wb.total_waived)) : 0;
      y = row("Outstanding", outstanding > 0 ? `OUTSTANDING: ${formatCurrency(outstanding)}` : "Cleared", y);
      y += 6;
      if (invoices.length > 0) {
        y = section("Invoices", y);
        invoices.forEach((inv: Record<string,unknown>) => {
          y = checkPage(y, "Finance", 265);
          const ivr = inv as Record<string, number | string | null>;
          doc.setFont("helvetica","normal"); doc.setFontSize(8.5); doc.setTextColor(40,40,40);
          doc.text(String(ivr.description ?? ivr.term_name ?? "Invoice"), M+2, y);
          doc.text(String(ivr.status ?? ""), M+90, y);
          doc.text(formatCurrency(Number(ivr.amount_due ?? 0)), M+PW-10, y, { align:"right" });
          y += 5.5;
        });
      }
    }

    // ── PAGE 7: Discipline & Awards ─────────────────────────────────
    y = newPage("Discipline & Awards");
    y = section(`Discipline Records (${discipline.length})`, y);
    if (discipline.length===0) { doc.setFontSize(9); doc.setTextColor(120,120,120); doc.text("No incidents recorded.", M+2, y); y+=8; }
    else discipline.slice(0,15).forEach(d => {
      y = checkPage(y, "Discipline & Awards", 265);
      const dr = d as Record<string,string>;
      doc.setFont("helvetica","bold"); doc.setFontSize(9); doc.setTextColor(30,30,30);
      doc.text(`${dr.incident_type || "Incident"}`, M+2, y);
      doc.setFont("helvetica","normal"); doc.setTextColor(80,80,80);
      doc.text(`${dr.incident_date || ""}  ${dr.action_taken || ""}`, M+60, y);
      y += 5.5;
    });
    y += 4;
    y = section(`Awards & Recognition (${awards.length})`, y);
    if (awards.length===0) { doc.setFontSize(9); doc.setTextColor(120,120,120); doc.text("No awards on record.", M+2, y); y+=8; }
    else awards.forEach(a => {
      y = checkPage(y, "Discipline & Awards", 265);
      const ar = a as Record<string,string>;
      doc.setFont("helvetica","bold"); doc.setFontSize(9); doc.setTextColor(30,30,30);
      doc.text(`${ar.title || ar.award_type || "Award"}`, M+2, y);
      doc.setFont("helvetica","normal"); doc.setTextColor(80,80,80);
      doc.text(`${ar.awarded_date || ""}`, M+80, y);
      y += 5.5;
    });

    doc.save(`student_profile_${student.admission_number}.pdf`);
  }

  const statusStyle = STATUS_COLORS[student.status] ?? { bg:"#f3f4f6", text:"#374151" };

  return (
    <div className="min-h-screen bg-[var(--neutral-50)]">
      {/* Photo crop modal */}
      {cropSrc && (
        <PhotoCropModal
          src={cropSrc}
          onConfirm={handleCropConfirm}
          onCancel={() => { setCropSrc(null); setPendingPhotoFile(null); }}
        />
      )}
      {/* ── Hero Header ─────────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #3a3596 0%, #5e3b9e 50%, #9e3da0 100%)" }}>
        {/* Decorative blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div style={{ position:"absolute", top:-40, right:-40, width:180, height:180, borderRadius:"50%", background:"rgba(255,255,255,0.05)" }} />
          <div style={{ position:"absolute", bottom:-30, left:60, width:120, height:120, borderRadius:"50%", background:"rgba(255,255,255,0.04)" }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-0">
          <button onClick={() => router.back()}
            className="flex items-center gap-1.5 text-[13px] text-white/60 hover:text-white mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Students
          </button>

          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 sm:gap-5 pb-5">
            {/* Photo */}
            <div className="relative flex-shrink-0">
              <div className="w-24 h-24 rounded-2xl overflow-hidden flex items-center justify-center text-white text-3xl font-black shadow-xl ring-4 ring-white/20"
                style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}>
                {photoPreview
                  ? <img src={photoPreview} alt={fullName} className="w-full h-full object-cover" />
                  : <span>{getInitials(fullName)}</span>
                }
              </div>
              {canEdit && (
                <button onClick={() => photoRef.current?.click()}
                  className="absolute -bottom-1.5 -right-1.5 bg-white text-[#262262] p-1.5 rounded-full shadow-lg hover:scale-110 transition-transform">
                  <Camera className="w-3.5 h-3.5" />
                </button>
              )}
              <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-[26px] font-black text-white leading-tight">{fullName}</h1>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold capitalize"
                  style={{ background: statusStyle.bg, color: statusStyle.text }}>
                  {student.status}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[12px] text-white/60">
                <span className="font-mono font-bold text-white/80">{student.admission_number}</span>
                <span className="text-white/30">·</span>
                <span>{student.classrooms?.name ?? "No class"}</span>
                <span className="text-white/30">·</span>
                <span className="capitalize">{student.gender}</span>
                {student.date_of_birth && <><span className="text-white/30">·</span><span>Born {formatDate(student.date_of_birth)}</span></>}
              </div>

              {/* Stats chips */}
              <div className="flex flex-wrap gap-3 mt-3">
                {attRate !== null && (
                  <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-1.5">
                    <ClipboardList className="w-3.5 h-3.5 text-white/60" />
                    <span className="text-[11px] text-white/60">Attendance</span>
                    <span className={`text-[13px] font-extrabold ml-0.5 ${attRate>=75?"text-green-300":"text-red-300"}`}>{attRate}%</span>
                  </div>
                )}
                {canFinance && (
                  <div className={`flex items-center gap-1.5 backdrop-blur-sm rounded-xl px-3 py-1.5 ${balance>0?"bg-red-500/20 ring-1 ring-red-400/30":"bg-white/10"}`}>
                    <CreditCard className="w-3.5 h-3.5 text-white/60" />
                    <span className={`text-[11px] font-semibold ${balance>0?"text-red-200":"text-white/60"}`}>{balance>0?"Outstanding":"Cleared"}</span>
                    <span className={`text-[13px] font-extrabold ml-0.5 ${balance>0?"text-red-300":"text-green-300"}`}>{formatCurrency(balance)}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-1.5">
                  <Trophy className="w-3.5 h-3.5 text-white/60" />
                  <span className="text-[11px] text-white/60">Awards</span>
                  <span className="text-[13px] font-extrabold ml-0.5 text-yellow-300">{awards.length}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-white/60" />
                  <span className="text-[11px] text-white/60">Subjects</span>
                  <span className="text-[13px] font-extrabold ml-0.5 text-white">{[...new Set(scores.map(s=>s.subjects?.name))].filter(Boolean).length}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-shrink-0 pb-0.5">
              <button onClick={exportPDF}
                className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[12px] font-semibold transition-colors backdrop-blur-sm">
                <FileDown className="w-3.5 h-3.5" /> Export PDF
              </button>
              {canEdit && !editing && (
                <button onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white text-[#262262] rounded-xl text-[12px] font-bold hover:bg-white/90 transition-colors shadow-lg">
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </button>
              )}
              {editing && (
                <>
                  <button onClick={saveEdit} disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white text-[#262262] rounded-xl text-[12px] font-bold hover:bg-white/90 disabled:opacity-50 transition-colors shadow-lg">
                    <Save className="w-3.5 h-3.5" /> {saving?"Saving…":"Save"}
                  </button>
                  <button onClick={() => setEditing(false)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[12px] font-semibold transition-colors backdrop-blur-sm">
                    <X className="w-3.5 h-3.5" /> Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tabs — float at bottom of header */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 overflow-x-auto scrollbar-hide">
          <div className="flex gap-0 min-w-max">
            {TABS.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-[12px] font-semibold border-b-2 whitespace-nowrap transition-all ${
                    tab===t.id
                      ? "border-white text-white"
                      : "border-transparent text-white/50 hover:text-white/80"
                  }`}>
                  <Icon className="w-3.5 h-3.5" />{t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">

        {/* BIO DATA */}
        {tab==="biodata" && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            {editing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <EField label="First Name *" value={ef.first_name} onChange={v=>setEf(f=>({...f,first_name:v}))} required />
                  <EField label="Middle Name" value={ef.middle_name} onChange={v=>setEf(f=>({...f,middle_name:v}))} />
                  <EField label="Last Name *" value={ef.last_name} onChange={v=>setEf(f=>({...f,last_name:v}))} required />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <ESelect label="Gender" value={ef.gender} onChange={v=>setEf(f=>({...f,gender:v as "male"|"female"}))}
                    options={[{v:"male",l:"Male"},{v:"female",l:"Female"}]} />
                  <EField label="Date of Birth" value={ef.date_of_birth} onChange={v=>setEf(f=>({...f,date_of_birth:v}))} type="date" />
                  <ESelect label="Blood Group" value={ef.blood_group} onChange={v=>setEf(f=>({...f,blood_group:v}))}
                    options={BLOOD_GROUPS.map(b=>({v:b,l:b}))} placeholder="Select" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <EField label="Nationality" value={ef.nationality} onChange={v=>setEf(f=>({...f,nationality:v}))} />
                  <EField label="Place of Birth" value={ef.place_of_birth} onChange={v=>setEf(f=>({...f,place_of_birth:v}))} />
                  <ESelect label="Religion" value={ef.religion} onChange={v=>setEf(f=>({...f,religion:v}))}
                    options={RELIGIONS.map(r=>({v:r,l:r}))} placeholder="Select" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <EField label="Student ID (manual)" value={ef.student_id_manual} onChange={v=>setEf(f=>({...f,student_id_manual:v}))} placeholder="e.g. STU-001" />
                  <ESelect label="Status" value={ef.status} onChange={v=>setEf(f=>({...f,status:v as Student["status"]}))}
                    options={STATUSES.map(s=>({v:s,l:s.charAt(0).toUpperCase()+s.slice(1)}))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea value={ef.medical_notes} onChange={e=>setEf(f=>({...f,medical_notes:e.target.value}))}
                    rows={3} className={INPUT_CLS} placeholder="Any notes about this student…" />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-10 gap-y-5">
                {[
                  ["Admission Number", student.admission_number],
                  ["Full Name", fullName],
                  ["Student ID", (student as never as Record<string,string>).student_id_manual ?? "—"],
                  ["Gender", student.gender],
                  ["Date of Birth", student.date_of_birth ? formatDate(student.date_of_birth) : "—"],
                  ["Blood Group", (student as never as Record<string,string>).blood_group ?? "—"],
                  ["Nationality", (student as never as Record<string,string>).nationality ?? "—"],
                  ["Place of Birth", (student as never as Record<string,string>).place_of_birth ?? "—"],
                  ["Religion", (student as never as Record<string,string>).religion ?? "—"],
                  ["Status", student.status],
                  ["Class", student.classrooms?.name ?? "—"],
                  ["Notes", student.medical_notes ?? "—"],
                ].map(([l,v]) => (
                  <div key={l}>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">{l}</p>
                    <p className="text-sm text-gray-800 font-medium capitalize">{v as string}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ADMISSION */}
        {tab==="admission" && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            {editing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <ESelect label="Admission Type" value={ef.admission_type} onChange={v=>setEf(f=>({...f,admission_type:v}))}
                    options={ADMISSION_TYPES.map(a=>({v:a,l:a}))} />
                  <EField label="Admission Year" value={ef.admission_year} onChange={v=>setEf(f=>({...f,admission_year:v}))} placeholder="e.g. 2024" />
                  <ESelect label="Class" value={ef.class_id} onChange={v=>setEf(f=>({...f,class_id:v}))}
                    options={classes.map(c=>({v:c.id,l:c.name}))} placeholder="Select class" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <EField label="Previous School" value={ef.previous_school} onChange={v=>setEf(f=>({...f,previous_school:v}))} />
                  <EField label="Previous Class" value={ef.previous_class} onChange={v=>setEf(f=>({...f,previous_class:v}))} />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-10 gap-y-5">
                {[
                  ["Admission Number", student.admission_number],
                  ["Admission Date", formatDate(student.admission_date)],
                  ["Admission Year", (student as never as Record<string,string>).admission_year ?? "—"],
                  ["Admission Type", (student as never as Record<string,string>).admission_type ?? "—"],
                  ["Current Class", student.classrooms?.name ?? "—"],
                  ["Admission Status", (student as never as Record<string,string>).admission_status ?? "active"],
                  ["Previous School", student.previous_school ?? "—"],
                  ["Previous Class", (student as never as Record<string,string>).previous_class ?? "—"],
                ].map(([l,v]) => (
                  <div key={l}>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">{l}</p>
                    <p className="text-sm text-gray-800 font-medium capitalize">{v as string}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PARENTS */}
        {tab==="parents" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm font-semibold text-gray-500">{parents.length} parent / guardian{parents.length!==1?"s":""}</p>
              {canEdit && (
                <button onClick={() => setAddingParent(v=>!v)}
                  className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Add Parent
                </button>
              )}
            </div>

            {addingParent && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <p className="text-sm font-semibold text-gray-800 mb-4">Add Parent / Guardian</p>
                <form onSubmit={saveParent} className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <EField label="Full Name *" value={pf.full_name} onChange={v=>setPf(f=>({...f,full_name:v}))} required />
                    <EField label="Phone *" value={pf.phone} onChange={v=>setPf(f=>({...f,phone:v}))} type="tel" required />
                    <ESelect label="Relationship" value={pf.relationship} onChange={v=>setPf(f=>({...f,relationship:v}))}
                      options={["Father","Mother","Guardian","Uncle","Aunt","Grandparent","Other"].map(r=>({v:r,l:r}))} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <EField label="Email" value={pf.email} onChange={v=>setPf(f=>({...f,email:v}))} type="email" />
                    <EField label="Occupation" value={pf.occupation} onChange={v=>setPf(f=>({...f,occupation:v}))} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <EField label="Employer" value={pf.employer} onChange={v=>setPf(f=>({...f,employer:v}))} />
                    <EField label="Digital Address" value={pf.digital_address} onChange={v=>setPf(f=>({...f,digital_address:v}))} placeholder="e.g. GA-123-4567" />
                  </div>
                  <EField label="Residential Address" value={pf.address} onChange={v=>setPf(f=>({...f,address:v}))} />
                  <div className="flex gap-2">
                    <BtnPrimary type="submit" loading={savingParent}>Save</BtnPrimary>
                    <BtnSecondary type="button" onClick={() => setAddingParent(false)}>Cancel</BtnSecondary>
                  </div>
                </form>
              </div>
            )}

            {parents.length===0 && !addingParent && (
              <EmptyState icon={<Users className="w-8 h-8 text-gray-300" />} text="No parents or guardians added yet." />
            )}

            <div className="space-y-3">
              {parents.map(p => (
                <div key={p.id} className="bg-white rounded-2xl border border-gray-200 p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3">
                      {[
                        ["Name", p.full_name],
                        ["Relationship", p.relationship],
                        ["Phone", p.phone],
                        ["Email", p.email ?? "—"],
                        ["Occupation", p.occupation ?? "—"],
                        ["Employer", (p as unknown as Record<string,string>).employer ?? "—"],
                        ["Address", p.address ?? "—"],
                        ["Digital Address", (p as unknown as Record<string,string>).digital_address ?? "—"],
                      ].map(([l,v]) => (
                        <div key={l}>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{l}</p>
                          <p className="text-sm text-gray-800">{v as string}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {p.is_primary && <Badge variant="brand">Primary</Badge>}
                      {canEdit && (
                        <button onClick={() => { setConfirmDelete(p.id); setConfirmDeleteType("parent"); }}
                          className="text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <a href={`tel:${p.phone}`} className="text-indigo-600 hover:text-indigo-800 transition-colors">
                        <Phone className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MEDICAL */}
        {tab==="medical" && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-gray-800">Medical Information</h3>
              {canEdit && !editMedical && (
                <button onClick={() => { setEditMedical(true); setMf({
                  blood_group: medical?.blood_group??"",
                  allergies: medical?.allergies??"",
                  medical_conditions: medical?.medical_conditions??"",
                  special_needs: medical?.special_needs??"",
                  hospital_name: medical?.hospital_name??"",
                  doctor_name: medical?.doctor_name??"",
                  insurance_provider: medical?.insurance_provider??"",
                  insurance_number: medical?.insurance_number??"",
                }); }}
                  className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </button>
              )}
            </div>
            {editMedical ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <ESelect label="Blood Group" value={mf.blood_group} onChange={v=>setMf(f=>({...f,blood_group:v}))}
                    options={BLOOD_GROUPS.map(b=>({v:b,l:b}))} placeholder="Select" />
                  <EField label="Doctor's Name" value={mf.doctor_name} onChange={v=>setMf(f=>({...f,doctor_name:v}))} />
                </div>
                <EField label="Hospital / Clinic" value={mf.hospital_name} onChange={v=>setMf(f=>({...f,hospital_name:v}))} />
                <ETextarea label="Allergies" value={mf.allergies} onChange={v=>setMf(f=>({...f,allergies:v}))} />
                <ETextarea label="Medical Conditions" value={mf.medical_conditions} onChange={v=>setMf(f=>({...f,medical_conditions:v}))} />
                <ETextarea label="Special Needs" value={mf.special_needs} onChange={v=>setMf(f=>({...f,special_needs:v}))} />
                <div className="grid grid-cols-2 gap-4">
                  <EField label="Insurance Provider" value={mf.insurance_provider} onChange={v=>setMf(f=>({...f,insurance_provider:v}))} />
                  <EField label="Insurance Number" value={mf.insurance_number} onChange={v=>setMf(f=>({...f,insurance_number:v}))} />
                </div>
                <div className="flex gap-2">
                  <BtnPrimary onClick={saveMedical}>Save</BtnPrimary>
                  <BtnSecondary onClick={() => setEditMedical(false)}>Cancel</BtnSecondary>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-10 gap-y-5">
                {[
                  ["Blood Group", medical?.blood_group ?? "—"],
                  ["Doctor", medical?.doctor_name ?? "—"],
                  ["Hospital", medical?.hospital_name ?? "—"],
                  ["Insurance Provider", medical?.insurance_provider ?? "—"],
                  ["Insurance Number", medical?.insurance_number ?? "—"],
                  ["Allergies", medical?.allergies ?? "None recorded"],
                  ["Medical Conditions", medical?.medical_conditions ?? "None recorded"],
                  ["Special Needs", medical?.special_needs ?? "None recorded"],
                ].map(([l,v]) => (
                  <div key={l}>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">{l}</p>
                    <p className="text-sm text-gray-800">{v as string}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ACADEMIC */}
        {tab==="academic" && (
          <div className="space-y-5">
            {/* Academic trend chart */}
            {academicTrend.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-800 mb-4">Average Score Per Term</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={academicTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="term" tick={{fontSize:12}} />
                    <YAxis domain={[0,100]} tick={{fontSize:12}} />
                    <Tooltip />
                    <Line type="monotone" dataKey="avg" stroke="#262262" strokeWidth={2} dot={{r:4}} name="Avg Score" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Scores table */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">Examination Records</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      {["Subject","Term","Class Score","Exam Score","Total","Grade","Position","Remark"].map(h=>(
                        <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {scores.length===0 && (
                      <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-400">No exam records yet.</td></tr>
                    )}
                    {scores.map(s => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-800">{s.subjects?.name ?? "—"}</td>
                        <td className="px-4 py-3 text-gray-500">{s.terms?.name ?? "—"}</td>
                        <td className="px-4 py-3 font-mono text-center">{s.class_score ?? "—"}</td>
                        <td className="px-4 py-3 font-mono text-center">{s.exam_score ?? "—"}</td>
                        <td className="px-4 py-3 font-mono font-bold text-center text-gray-800">{s.total ?? "—"}</td>
                        <td className="px-4 py-3">
                          {s.grade && <GradeBadge grade={s.grade} />}
                        </td>
                        <td className="px-4 py-3 font-mono text-center text-gray-500">{s.position ?? "—"}</td>
                        <td className="px-4 py-3 text-gray-500">{s.remark ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ATTENDANCE */}
        {tab==="attendance" && (
          <div className="space-y-5">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label:"Attendance Rate", value: attRate!==null?`${attRate}%`:"—", color: attRate!==null&&attRate>=75?"#16a34a":"#dc2626" },
                { label:"Days Present", value: present, color:"#16a34a" },
                { label:"Days Absent", value: absent, color:"#dc2626" },
                { label:"Days Late", value: late, color:"#d97706" },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
                  <p className="text-xs text-gray-400 mb-1">{s.label}</p>
                  <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Monthly chart */}
            {monthlyAtt.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-800 mb-4">Monthly Attendance</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlyAtt} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{fontSize:12}} />
                    <YAxis tick={{fontSize:12}} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="present" fill="#262262" name="Present" radius={[3,3,0,0]} />
                    <Bar dataKey="absent"  fill="#dc2626" name="Absent"  radius={[3,3,0,0]} />
                    <Bar dataKey="late"    fill="#d97706" name="Late"    radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Records table */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">Attendance Records</h3>
                <span className="text-xs text-gray-400">{attendance.length} records</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50">
                    {["Date","Status","Term"].map(h=>(
                      <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {attendance.length===0 && (
                      <tr><td colSpan={3} className="px-4 py-10 text-center text-sm text-gray-400">No attendance records.</td></tr>
                    )}
                    {attendance.slice(0,50).map((a,i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-gray-600">{formatDate(a.date)}</td>
                        <td className="px-4 py-2.5">
                          <span className={cn("flex items-center gap-1.5 text-xs font-semibold capitalize",
                            a.status==="present"?"text-green-600":a.status==="absent"?"text-red-500":"text-amber-600")}>
                            {a.status==="present" ? <CheckCircle2 className="w-3.5 h-3.5" />
                              : a.status==="absent" ? <AlertCircle className="w-3.5 h-3.5" />
                              : <Clock className="w-3.5 h-3.5" />}
                            {a.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-500">{Array.isArray(a.terms)?a.terms[0]?.name:a.terms?.name ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* FINANCE */}
        {tab==="finance" && !canFinance && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Shield className="w-10 h-10 mb-3" />
            <p className="text-sm">Financial information is restricted to authorized staff.</p>
          </div>
        )}
        {tab==="finance" && canFinance && (() => {
          const walletBilled      = Number(wallet?.total_billed ?? 0);
          const walletPaid        = Number(wallet?.total_paid ?? 0);
          const walletWaived      = Number(wallet?.total_waived ?? 0);
          const walletOutstanding = Math.max(0, walletBilled - walletPaid - walletWaived);
          const hasWallet         = !!wallet;
          const collectionRate    = walletBilled > 0 ? Math.round((walletPaid / walletBilled) * 100) : 0;
          return (
            <div className="space-y-5">
              {/* Wallet balance banner */}
              {hasWallet ? (
                <div className="rounded-2xl p-5" style={{background:"#262262"}}>
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <p className="text-white/70 text-[11px] font-semibold uppercase tracking-wider mb-1">
                        Wallet · {wallet.wallet_number}
                      </p>
                      <p className={`text-[32px] font-extrabold leading-none ${walletOutstanding > 0 ? "text-red-300" : "text-green-300"}`}>
                        {walletOutstanding > 0 ? `−${formatCurrency(walletOutstanding)}` : "Cleared"}
                      </p>
                      <p className="text-white/60 text-[12px] mt-1">
                        {walletOutstanding > 0 ? "Outstanding balance" : "No outstanding balance"}
                      </p>
                    </div>
                    <div className="flex gap-6">
                      <div className="text-right">
                        <p className="text-white/60 text-[10px] uppercase font-semibold">Total Billed</p>
                        <p className="text-white font-bold text-[15px]">{formatCurrency(walletBilled)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white/60 text-[10px] uppercase font-semibold">Paid</p>
                        <p className="text-green-300 font-bold text-[15px]">{formatCurrency(walletPaid)}</p>
                      </div>
                      {walletWaived > 0 && (
                        <div className="text-right">
                          <p className="text-white/60 text-[10px] uppercase font-semibold">Waived</p>
                          <p className="text-purple-300 font-bold text-[15px]">{formatCurrency(walletWaived)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Collection progress */}
                  {walletBilled > 0 && (
                    <div className="mt-4">
                      <div className="flex justify-between text-[11px] text-white/60 mb-1">
                        <span>Collection progress</span>
                        <span>{collectionRate}%</span>
                      </div>
                      <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{width:`${collectionRate}%`,background:"#4ade80"}} />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">No wallet found</p>
                    <p className="text-xs text-amber-600 mt-0.5">Billing hasn&apos;t been set up for this student yet. Visit Settings → Fees to create a fee structure, then re-admit or run term billing.</p>
                  </div>
                </div>
              )}

              {/* Invoices */}
              {invoices.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[13px] font-semibold text-gray-500">{invoices.length} Invoice{invoices.length!==1?"s":""}</p>
                  {invoices.map((inv: InvoiceRow) => {
                    const isPaid = inv.status === "paid";
                    const isPartial = inv.status === "partial";
                    return (
                      <div key={inv.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                        <div className="p-4 flex items-center justify-between gap-3 border-b border-gray-100">
                          <div>
                            <p className="text-sm font-bold text-gray-800">{inv.invoice_number}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{new Date(inv.created_at).toLocaleDateString("en-GH")}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full capitalize",
                              isPaid?"bg-green-50 text-green-700":isPartial?"bg-amber-50 text-amber-700":"bg-red-50 text-red-700")}>
                              {inv.status}
                            </span>
                            <div className="text-right">
                              <p className="text-[11px] text-gray-400">Balance</p>
                              <p className={`text-[15px] font-extrabold ${inv.balance>0?"text-red-500":"text-green-600"}`}>
                                {formatCurrency(inv.balance)}
                              </p>
                            </div>
                          </div>
                        </div>
                        {/* Line items */}
                        {inv.student_invoice_lines?.length > 0 && (
                          <div className="divide-y divide-gray-50">
                            {inv.student_invoice_lines.map((line: Record<string,unknown>, i: number) => (
                              <div key={i} className="px-4 py-2.5 flex items-center justify-between text-sm">
                                <span className="text-gray-600">{line.item_name as string}</span>
                                <span className="font-mono text-gray-800">{formatCurrency(Number(line.amount))}</span>
                              </div>
                            ))}
                            <div className="px-4 py-2.5 flex items-center justify-between text-sm font-bold bg-gray-50">
                              <span className="text-gray-700">Total</span>
                              <span className="font-mono text-gray-900">{formatCurrency(Number(inv.total_amount))}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Legacy fee payments */}
              {fees.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-800">Legacy Payment History</h3>
                    <span className="text-xs text-gray-400">{fees.length} records</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="bg-gray-50">
                        {["Fee Type","Term","Amount Due","Amount Paid","Balance","Status"].map(h=>(
                          <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">{h}</th>
                        ))}
                      </tr></thead>
                      <tbody className="divide-y divide-gray-100">
                        {fees.map(f => (
                          <tr key={f.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-800">{f.fee_types?.name ?? "—"}</td>
                            <td className="px-4 py-3 text-gray-500">{f.terms?.name ?? "—"}</td>
                            <td className="px-4 py-3 font-mono">{formatCurrency(f.amount_due)}</td>
                            <td className="px-4 py-3 font-mono text-green-600">{formatCurrency(f.amount_paid)}</td>
                            <td className="px-4 py-3 font-mono" style={{color:f.balance>0?"#dc2626":"#16a34a"}}>{formatCurrency(f.balance)}</td>
                            <td className="px-4 py-3">
                              <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full capitalize",
                                f.payment_status==="paid"?"bg-green-50 text-green-700"
                                :f.payment_status==="partial"?"bg-amber-50 text-amber-700"
                                :"bg-red-50 text-red-700")}>
                                {f.payment_status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {!hasWallet && invoices.length === 0 && fees.length === 0 && (
                <EmptyState icon={<CreditCard className="w-8 h-8 text-gray-300" />} text="No financial records yet." />
              )}
            </div>
          );
        })()}

        {/* DISCIPLINE */}
        {tab==="discipline" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm font-semibold text-gray-500">{discipline.length} incident{discipline.length!==1?"s":""} recorded</p>
              {canEdit && (
                <button onClick={() => setAddingDisc(v=>!v)}
                  className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Add Incident
                </button>
              )}
            </div>
            {addingDisc && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <form onSubmit={saveDisc} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <EField label="Incident Date *" value={df.incident_date} onChange={v=>setDf(f=>({...f,incident_date:v}))} type="date" required />
                    <ESelect label="Incident Type *" value={df.incident_type} onChange={v=>setDf(f=>({...f,incident_type:v}))}
                      options={INCIDENT_TYPES.map(t=>({v:t,l:t}))} placeholder="Select type" />
                  </div>
                  <ETextarea label="Description" value={df.description} onChange={v=>setDf(f=>({...f,description:v}))} />
                  <ETextarea label="Action Taken" value={df.action_taken} onChange={v=>setDf(f=>({...f,action_taken:v}))} />
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={df.parent_notified} onChange={e=>setDf(f=>({...f,parent_notified:e.target.checked}))}
                      className="rounded border-gray-300 text-[#262262]" />
                    Parent / Guardian notified
                  </label>
                  <div className="flex gap-2">
                    <BtnPrimary type="submit">Save</BtnPrimary>
                    <BtnSecondary type="button" onClick={() => setAddingDisc(false)}>Cancel</BtnSecondary>
                  </div>
                </form>
              </div>
            )}
            {discipline.length===0 && !addingDisc && (
              <EmptyState icon={<Shield className="w-8 h-8 text-gray-300" />} text="No discipline incidents recorded." />
            )}
            <div className="space-y-3">
              {discipline.map(d => (
                <div key={d.id} className="bg-white rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-800">{d.incident_type}</p>
                          {d.parent_notified && <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">Parent Notified</span>}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{formatDate(d.incident_date)}</p>
                        {d.description && <p className="text-sm text-gray-600 mt-1">{d.description}</p>}
                        {d.action_taken && <p className="text-sm text-gray-500 mt-1"><span className="font-medium">Action:</span> {d.action_taken}</p>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AWARDS */}
        {tab==="awards" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm font-semibold text-gray-500">{awards.length} award{awards.length!==1?"s":""}</p>
              {canEdit && (
                <button onClick={() => setAddingAward(v=>!v)}
                  className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Add Award
                </button>
              )}
            </div>
            {addingAward && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <form onSubmit={saveAward} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <ESelect label="Award Type" value={awf.award_type} onChange={v=>setAwf(f=>({...f,award_type:v}))}
                      options={AWARD_TYPES.map(t=>({v:t,l:t}))} />
                    <EField label="Title *" value={awf.title} onChange={v=>setAwf(f=>({...f,title:v}))} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <EField label="Date Awarded" value={awf.awarded_date} onChange={v=>setAwf(f=>({...f,awarded_date:v}))} type="date" />
                    <EField label="Awarded By" value={awf.awarded_by} onChange={v=>setAwf(f=>({...f,awarded_by:v}))} />
                  </div>
                  <ETextarea label="Description" value={awf.description} onChange={v=>setAwf(f=>({...f,description:v}))} />
                  <div className="flex gap-2">
                    <BtnPrimary type="submit">Save</BtnPrimary>
                    <BtnSecondary type="button" onClick={() => setAddingAward(false)}>Cancel</BtnSecondary>
                  </div>
                </form>
              </div>
            )}
            {awards.length===0 && !addingAward && (
              <EmptyState icon={<Trophy className="w-8 h-8 text-gray-300" />} text="No awards or achievements recorded." />
            )}
            <div className="grid grid-cols-2 gap-3">
              {awards.map(a => (
                <div key={a.id} className="bg-white rounded-2xl border border-gray-200 p-4 flex gap-3">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                    a.award_type==="Academic"?"bg-indigo-50":a.award_type==="Sports"?"bg-green-50":"bg-amber-50")}>
                    {a.award_type==="Academic"
                      ? <Star className="w-5 h-5 text-indigo-600" />
                      : a.award_type==="Sports"
                      ? <Award className="w-5 h-5 text-green-600" />
                      : <Trophy className="w-5 h-5 text-amber-600" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{a.title}</p>
                    <p className="text-xs text-gray-400">{a.award_type}{a.awarded_date ? ` · ${formatDate(a.awarded_date)}` : ""}</p>
                    {a.description && <p className="text-xs text-gray-500 mt-1">{a.description}</p>}
                    {a.awarded_by && <p className="text-xs text-gray-400 mt-0.5">By {a.awarded_by}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DOCUMENTS */}
        {tab==="documents" && (
          <div className="space-y-4">
            <div className="flex items-end gap-3 flex-wrap">
              <div className="flex-1 min-w-[160px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
                <select value={docType} onChange={e=>setDocType(e.target.value)}
                  className={INPUT_CLS + " bg-white"}>
                  {DOC_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              {canEdit && (
                <button onClick={() => docRef.current?.click()} disabled={uploadingDoc}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#262262] text-white rounded-xl text-sm font-semibold hover:bg-[#1a1856] disabled:opacity-50 transition-colors">
                  <Upload className="w-4 h-4" />
                  {uploadingDoc ? "Uploading…" : "Upload Files"}
                </button>
              )}
              <input ref={docRef} type="file" multiple className="hidden" onChange={uploadDoc} />
            </div>
            {canEdit && (
              <p className="text-[11px] text-gray-400">You can select multiple files at once. Each will be saved under the selected document type.</p>
            )}
            {docs.length===0 && (
              <EmptyState icon={<FileText className="w-8 h-8 text-gray-300" />} text="No documents uploaded yet." />
            )}
            <div className="space-y-3">
              {docs.map(d => (
                <div key={d.id} className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center">
                      <FileText className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{d.document_type}</p>
                      <p className="text-xs text-gray-400">{d.file_name ?? "Document"} · {new Date(d.uploaded_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <a href={d.file_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-indigo-600 font-medium hover:text-indigo-800 transition-colors">View</a>
                    {canEdit && (
                      <button onClick={() => { setConfirmDelete(d.id); setConfirmDeleteType("doc"); }}
                        className="text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PROMOTION HISTORY */}
        {tab==="promotions" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm font-semibold text-gray-500">Academic Progression</p>
              {canEdit && (
                <button onClick={() => setAddingPromo(v=>!v)}
                  className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Add Promotion
                </button>
              )}
            </div>
            {addingPromo && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <form onSubmit={savePromotion} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <EField label="Academic Year *" value={prf.academic_year} onChange={v=>setPrf(f=>({...f,academic_year:v}))} placeholder="e.g. 2025/2026" required />
                    <ESelect label="Class *" value={prf.class_id} onChange={v=>setPrf(f=>({...f,class_id:v}))}
                      options={classes.map(c=>({v:c.id,l:c.name}))} placeholder="Select class" />
                  </div>
                  <EField label="Notes" value={prf.notes} onChange={v=>setPrf(f=>({...f,notes:v}))} />
                  <div className="flex gap-2">
                    <BtnPrimary type="submit">Save</BtnPrimary>
                    <BtnSecondary type="button" onClick={() => setAddingPromo(false)}>Cancel</BtnSecondary>
                  </div>
                </form>
              </div>
            )}
            {promotions.length===0 && !addingPromo && (
              <EmptyState icon={<TrendingUp className="w-8 h-8 text-gray-300" />} text="No promotion history recorded." />
            )}
            <div className="relative">
              {/* Vertical line */}
              {promotions.length > 1 && (
                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />
              )}
              <div className="space-y-3">
                {promotions.map((p, i) => (
                  <div key={p.id} className="relative flex items-start gap-4 pl-12">
                    <div className={cn("absolute left-0 w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold",
                      i===promotions.length-1 ? "bg-[#262262] text-white" : "bg-gray-100 text-gray-600")}>
                      {p.academic_year?.slice(-2) ?? i+1}
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4 flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{p.class_name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{p.academic_year}</p>
                        </div>
                        {i===promotions.length-1 && (
                          <span className="text-xs bg-[#262262] text-white px-2 py-0.5 rounded-full font-medium">Current</span>
                        )}
                      </div>
                      {p.notes && <p className="text-xs text-gray-500 mt-2">{p.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TIMELINE */}
        {tab==="timeline" && (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-gray-500">Student Journey · {timeline.length} events</p>

            {/* Auto-seed from admission */}
            {timeline.length===0 && (
              <EmptyState icon={<Clock className="w-8 h-8 text-gray-300" />} text="No timeline events yet. They auto-record as you add data." />
            )}

            <div className="relative">
              {timeline.length > 1 && <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-100" />}
              <div className="space-y-3">
                {timeline.map((ev) => {
                  const Icon = TIMELINE_ICON[ev.event_type] ?? Calendar;
                  const color = TIMELINE_COLOR[ev.event_type] ?? "#262262";
                  return (
                    <div key={ev.id} className="relative flex items-start gap-4 pl-12">
                      <div className="absolute left-0 w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ background: `${color}15` }}>
                        <Icon className="w-4 h-4" style={{ color }} />
                      </div>
                      <div className="bg-white rounded-xl border border-gray-200 p-4 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-gray-800">{ev.title}</p>
                          <p className="text-xs text-gray-400">{formatDate(ev.event_date)}</p>
                        </div>
                        {ev.description && <p className="text-xs text-gray-500 mt-1">{ev.description}</p>}
                        <span className="text-[10px] font-semibold uppercase tracking-wide mt-1 inline-block"
                          style={{ color }}>{ev.event_type}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!confirmDelete}
        title={confirmDeleteType==="parent" ? "Remove parent / guardian" : "Delete document"}
        message={confirmDeleteType==="parent"
          ? "Are you sure you want to remove this parent from the student record?"
          : "Are you sure you want to permanently delete this document?"}
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (!confirmDelete) return;
          if (confirmDeleteType==="parent") deleteParent(confirmDelete);
          else if (confirmDeleteType==="doc") deleteDoc(confirmDelete);
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

// ── Timeline icon/color map ────────────────────────────────────────
const TIMELINE_ICON: Record<string, React.ElementType> = {
  admission:  CheckCircle2,
  parent:     Users,
  discipline: AlertTriangle,
  award:      Trophy,
  promotion:  TrendingUp,
  payment:    CreditCard,
  attendance: ClipboardList,
  exam:       BarChart2,
  document:   FileText,
};
const TIMELINE_COLOR: Record<string, string> = {
  admission:  "#262262",
  parent:     "#7c3aed",
  discipline: "#dc2626",
  award:      "#d97706",
  promotion:  "#059669",
  payment:    "#0284c7",
  attendance: "#64748b",
  exam:       "#262262",
  document:   "#6b7280",
};

// ── Mini components ────────────────────────────────────────────────
const INPUT_CLS = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#262262]/30 focus:border-[#262262]";

function EField({ label, value, onChange, type="text", required=false, placeholder="" }:
  { label:string; value:string; onChange:(v:string)=>void; type?:string; required?:boolean; placeholder?:string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)}
        required={required} placeholder={placeholder} className={INPUT_CLS} />
    </div>
  );
}
function ESelect({ label, value, onChange, options, placeholder="" }:
  { label:string; value:string; onChange:(v:string)=>void; options:{v:string;l:string}[]; placeholder?:string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select value={value} onChange={e=>onChange(e.target.value)} className={INPUT_CLS + " bg-white"}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
}
function ETextarea({ label, value, onChange }:
  { label:string; value:string; onChange:(v:string)=>void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea value={value} onChange={e=>onChange(e.target.value)}
        rows={3} className={INPUT_CLS + " resize-none"} />
    </div>
  );
}
function BtnPrimary({ children, onClick, type="button", loading=false }:
  { children:React.ReactNode; onClick?:()=>void; type?:"button"|"submit"; loading?:boolean }) {
  return (
    <button type={type} onClick={onClick} disabled={loading}
      className="flex items-center gap-1.5 px-4 py-2 bg-[#262262] text-white rounded-lg text-sm font-medium hover:bg-[#1a1856] disabled:opacity-50 transition-colors">
      {loading ? "Saving…" : children}
    </button>
  );
}
function BtnSecondary({ children, onClick, type="button" }:
  { children:React.ReactNode; onClick?:()=>void; type?:"button"|"submit" }) {
  return (
    <button type={type} onClick={onClick}
      className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
      {children}
    </button>
  );
}
function EmptyState({ icon, text }: { icon:React.ReactNode; text:string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 flex flex-col items-center justify-center py-16 text-gray-400">
      {icon}
      <p className="text-sm mt-3">{text}</p>
    </div>
  );
}
function GradeBadge({ grade }: { grade:string }) {
  const cls = ["A1","A"].includes(grade) ? "bg-green-50 text-green-700"
    : ["B2","B3","B"].includes(grade) ? "bg-blue-50 text-blue-700"
    : ["C4","C5","C6","C"].includes(grade) ? "bg-amber-50 text-amber-700"
    : "bg-red-50 text-red-700";
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cls}`}>{grade}</span>;
}
