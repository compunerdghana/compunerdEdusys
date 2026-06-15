"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  LayoutGrid, Printer, Users, CreditCard, CalendarCheck, FileText,
  BarChart3, Search, Download, TrendingUp, AlertCircle, MessageSquare,
  BadgeDollarSign, GraduationCap, UserCheck, PiggyBank,
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts";

// ─── Types ───────────────────────────────────────────────────────────────────

interface School {
  id: string; name: string; address?: string | null; logo_url?: string | null;
  headmaster_signature_url?: string | null; motto?: string | null; phone?: string | null;
}
interface Classroom { id: string; name: string; level?: string | null; }
interface Student {
  id: string; admission_number?: string | null; first_name: string; last_name: string;
  gender?: string | null; status?: string | null; class_id?: string | null;
  date_of_birth?: string | null;
  classrooms?: { id: string; name: string; level?: string | null } | null;
  created_at?: string;
}
interface Term { id: string; name: string; start_date?: string | null; end_date?: string | null; is_current?: boolean | null; }
interface StaffMember {
  id: string; full_name: string; role: string; email?: string | null; phone?: string | null; created_at?: string;
  staff_details?: { department?: string; designation?: string; basic_salary?: number; allowances?: number; employment_type?: string; qualification?: string; } | null;
}
interface Wallet { student_id: string; total_billed: number; total_paid: number; total_waived: number; }
interface Receipt { id: string; student_id: string; amount: number; payment_method?: string; created_at: string; }
interface AttendanceRecord { student_id: string; status: string; date: string; }
interface Expense { id: string; title: string; amount: number; category?: string | null; date: string; paid_by?: string | null; }
interface IncomeRecord { id: string; title: string; amount: number; category?: string | null; date: string; }
interface ExamResult { id: string; student_id: string; subject: string; score: number; grade?: string | null; class_id?: string | null; term_id?: string | null; }
interface CommLog { id: string; channel: string; status: string; recipient_count?: number | null; sent_at?: string | null; }
interface PayrollRun { id: string; month: number; year: number; status: string; total_gross: number; total_net: number; total_deductions: number; }

interface Props {
  school: School | null; classes: Classroom[]; students: Student[]; terms: Term[];
  currentTermId: string | null; staff: StaffMember[]; wallets: Wallet[]; receipts: Receipt[];
  attendanceRecords: AttendanceRecord[]; expenses: Expense[]; incomeRecords: IncomeRecord[];
  examResults: ExamResult[]; commLogs: CommLog[]; payrollRuns: PayrollRun[];
  admissions: { id: string; created_at?: string; status?: string }[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const FULL_MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const GRADIENT = "linear-gradient(135deg, #262262, #92278F)";
const BRAND = "#262262";

function fmt(n: number) {
  return new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS", minimumFractionDigits: 2 }).format(n ?? 0);
}
function fullName(s: { first_name: string; last_name: string }) { return `${s.first_name} ${s.last_name}`; }

function exportCSV(rows: (string | number)[][], filename: string) {
  const csv = rows.map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const BASE_PRINT_STYLE = `
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',Arial,sans-serif;color:#111;background:#fff;padding:24px;font-size:12px}
    h1{font-size:20px;font-weight:800;color:#262262}
    h2{font-size:14px;font-weight:700;color:#262262;margin:16px 0 8px}
    table{width:100%;border-collapse:collapse;font-size:11px;margin-top:6px}
    th{background:#262262;color:#fff;padding:6px 10px;text-align:left;font-weight:600;font-size:10px;text-transform:uppercase;letter-spacing:.5px}
    td{padding:5px 10px;border-bottom:1px solid #e5e7eb}
    tr:nth-child(even) td{background:#f9fafb}
    .school-header{display:flex;align-items:center;gap:16px;margin-bottom:20px;padding-bottom:14px;border-bottom:3px solid #262262}
    .school-header img{width:56px;height:56px;object-fit:contain}
    .school-info h1{font-size:20px}.school-info p{font-size:11px;color:#555}
    .summary-row td{font-weight:700;background:#eef2ff!important;color:#262262}
    .stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:12px 0}
    .stat-box{border:1px solid #e5e7eb;border-radius:8px;padding:10px}
    .stat-box .val{font-size:20px;font-weight:800;color:#262262}
    .stat-box .lbl{font-size:10px;color:#777;margin-top:2px;text-transform:uppercase;letter-spacing:.5px}
    .sig-block{margin-top:40px;display:flex;justify-content:flex-end}
    .sig-inner{text-align:center;min-width:200px}
    .sig-line{border-top:1px solid #333;margin-bottom:4px}
    .sig-label{font-size:10px;color:#555}
    @media print{body{padding:0}}
  </style>
`;

function schoolHeader(school: School | null) {
  if (!school) return "";
  return `<div class="school-header">${school.logo_url ? `<img src="${school.logo_url}" alt="Logo"/>` : ""}
    <div class="school-info"><h1>${school.name}</h1>
    ${school.address ? `<p>${school.address}</p>` : ""}
    ${school.phone ? `<p>Tel: ${school.phone}</p>` : ""}
    ${school.motto ? `<p><em>${school.motto}</em></p>` : ""}</div></div>`;
}

function printWindow(html: string) {
  const w = window.open("", "_blank", "width=1000,height=750");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">${BASE_PRINT_STYLE}</head><body>${html}</body></html>`);
  w.document.close(); w.focus();
  setTimeout(() => { w.print(); }, 400);
}

const PIE_COLORS = ["#262262", "#92278F", "#3b82f6", "#16a34a", "#f59e0b", "#ef4444", "#06b6d4", "#8b5cf6"];

// ─── Tabs ────────────────────────────────────────────────────────────────────

type Tab = "summary" | "students" | "finance" | "outstanding" | "attendance" | "staff" | "analytics" | "exams" | "comms" | "payroll" | "reportcards";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "summary",     label: "Dashboard",        icon: BarChart3 },
  { id: "students",    label: "Students",         icon: Users },
  { id: "attendance",  label: "Attendance",       icon: CalendarCheck },
  { id: "finance",     label: "Fee Collection",   icon: CreditCard },
  { id: "outstanding", label: "Outstanding Fees", icon: AlertCircle },
  { id: "staff",       label: "Staff Reports",    icon: UserCheck },
  { id: "payroll",     label: "Payroll",          icon: BadgeDollarSign },
  { id: "exams",       label: "Exam Results",     icon: GraduationCap },
  { id: "analytics",   label: "Analytics",        icon: TrendingUp },
  { id: "comms",       label: "Communications",   icon: MessageSquare },
  { id: "reportcards", label: "Report Cards",     icon: FileText },
];

// ─── Main Component ─────────────────────────────────────────────────────────

export function ReportsClient({
  school, classes, students, terms, currentTermId, staff, wallets, receipts,
  attendanceRecords, expenses, incomeRecords, examResults, commLogs, payrollRuns, admissions,
}: Props) {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>((searchParams.get("tab") as Tab) || "summary");
  useEffect(() => {
    const t = searchParams.get("tab") as Tab | null;
    if (t && TABS.find(tab => tab.id === t)) setActiveTab(t);
  }, [searchParams]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedTermId, setSelectedTermId] = useState<string | null>(currentTermId);
  const [search, setSearch] = useState("");
  const [outstandingOnly, setOutstandingOnly] = useState(true);

  // ── Derived data ─────────────────────────────────────────────────────────

  const filteredStudents = useMemo(() => {
    let list = students;
    if (selectedClassId) list = list.filter(s => s.class_id === selectedClassId);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s => fullName(s).toLowerCase().includes(q) || (s.admission_number ?? "").toLowerCase().includes(q));
    }
    return list;
  }, [students, selectedClassId, search]);

  const walletMap = useMemo(() => {
    const m: Record<string, Wallet> = {};
    wallets.forEach(w => { m[w.student_id] = w; });
    return m;
  }, [wallets]);

  const attendanceMap = useMemo(() => {
    const m: Record<string, { present: number; absent: number; late: number }> = {};
    attendanceRecords.forEach(r => {
      if (!m[r.student_id]) m[r.student_id] = { present: 0, absent: 0, late: 0 };
      const st = r.status?.toLowerCase() ?? "";
      if (st === "present") m[r.student_id].present++;
      else if (st === "absent") m[r.student_id].absent++;
      else if (st === "late") m[r.student_id].late++;
    });
    return m;
  }, [attendanceRecords]);

  const totalBilled = wallets.reduce((a, w) => a + Number(w.total_billed ?? 0), 0);
  const totalPaid   = wallets.reduce((a, w) => a + Number(w.total_paid ?? 0), 0);
  const totalWaived = wallets.reduce((a, w) => a + Number(w.total_waived ?? 0), 0);
  const totalOutstanding = Math.max(0, totalBilled - totalPaid - totalWaived);
  const collectionRate = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;

  const presentTotal = Object.values(attendanceMap).reduce((a, v) => a + v.present, 0);
  const totalDays    = Object.values(attendanceMap).reduce((a, v) => a + v.present + v.absent + v.late, 0);
  const attendanceRate = totalDays > 0 ? Math.round((presentTotal / totalDays) * 100) : 0;

  const totalExpenses = expenses.reduce((a, e) => a + Number(e.amount ?? 0), 0);
  const totalIncome   = incomeRecords.reduce((a, e) => a + Number(e.amount ?? 0), 0);

  const enrollmentData = useMemo(() => {
    const counts: Record<string, number> = {};
    students.forEach(s => {
      const key = s.classrooms?.name ?? "Unknown";
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [students]);

  // Monthly receipts for chart
  const monthlyReceipts = useMemo(() => {
    const m: Record<string, number> = {};
    receipts.forEach(r => {
      const month = new Date(r.created_at).getMonth();
      const key = MONTHS[month];
      m[key] = (m[key] ?? 0) + Number(r.amount ?? 0);
    });
    return MONTHS.map(mo => ({ month: mo, amount: m[mo] ?? 0 }));
  }, [receipts]);

  // Monthly admissions
  const admissionTrend = useMemo(() => {
    const m: Record<string, number> = {};
    admissions.forEach(a => {
      if (!a.created_at) return;
      const month = MONTHS[new Date(a.created_at).getMonth()];
      m[month] = (m[month] ?? 0) + 1;
    });
    return MONTHS.map(mo => ({ month: mo, students: m[mo] ?? 0 }));
  }, [admissions]);

  // Gender distribution
  const genderData = useMemo(() => {
    const m: Record<string, number> = {};
    students.forEach(s => { const g = s.gender ?? "Unknown"; m[g] = (m[g] ?? 0) + 1; });
    return Object.entries(m).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
  }, [students]);

  // Outstanding debtors
  const debtors = useMemo(() => {
    return filteredStudents
      .map(s => {
        const w = walletMap[s.id];
        const billed  = Number(w?.total_billed  ?? 0);
        const paid    = Number(w?.total_paid    ?? 0);
        const waived  = Number(w?.total_waived  ?? 0);
        const balance = Math.max(0, billed - paid - waived);
        return { s, billed, paid, balance };
      })
      .filter(d => !outstandingOnly || d.balance > 0)
      .sort((a, b) => b.balance - a.balance);
  }, [filteredStudents, walletMap, outstandingOnly]);

  // Exam subject averages
  const subjectAverages = useMemo(() => {
    const m: Record<string, { total: number; count: number }> = {};
    examResults.forEach(r => {
      if (!m[r.subject]) m[r.subject] = { total: 0, count: 0 };
      m[r.subject].total += Number(r.score ?? 0);
      m[r.subject].count++;
    });
    return Object.entries(m)
      .map(([subject, d]) => ({ subject, avg: Math.round(d.total / d.count) }))
      .sort((a, b) => b.avg - a.avg);
  }, [examResults]);

  // Comm log summary
  const commSummary = useMemo(() => {
    const m: Record<string, { sent: number; delivered: number; failed: number }> = {};
    commLogs.forEach(l => {
      if (!m[l.channel]) m[l.channel] = { sent: 0, delivered: 0, failed: 0 };
      m[l.channel].sent += l.recipient_count ?? 1;
      if (l.status === "delivered" || l.status === "read") m[l.channel].delivered += l.recipient_count ?? 1;
      if (l.status === "failed") m[l.channel].failed += l.recipient_count ?? 1;
    });
    return Object.entries(m).map(([channel, d]) => ({ channel, ...d }));
  }, [commLogs]);

  // Staff by department
  const staffByDept = useMemo(() => {
    const m: Record<string, number> = {};
    staff.forEach(s => {
      const dept = s.staff_details?.department ?? "General";
      m[dept] = (m[dept] ?? 0) + 1;
    });
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [staff]);

  // ── Print handlers ─────────────────────────────────────────────────────────

  function printStudentList() {
    const rows = filteredStudents.map(s => `<tr>
      <td>${s.admission_number ?? "—"}</td><td>${fullName(s)}</td>
      <td>${s.classrooms?.name ?? "—"}</td><td>${s.gender ?? "—"}</td><td>${s.status ?? "active"}</td>
    </tr>`).join("");
    printWindow(`${schoolHeader(school)}
      <h2>Student List — ${filteredStudents.length} students</h2>
      <table><thead><tr><th>Adm No</th><th>Name</th><th>Class</th><th>Gender</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody></table>`);
  }

  function printFinanceReport() {
    let totalB = 0, totalP = 0, totalBal = 0;
    const rows = filteredStudents.map(s => {
      const w = walletMap[s.id];
      const billed = Number(w?.total_billed ?? 0); const paid = Number(w?.total_paid ?? 0);
      const waived = Number(w?.total_waived ?? 0); const balance = Math.max(0, billed - paid - waived);
      totalB += billed; totalP += paid; totalBal += balance;
      return `<tr><td>${fullName(s)}</td><td>${s.classrooms?.name ?? "—"}</td><td>${fmt(billed)}</td><td>${fmt(paid)}</td><td>${fmt(balance)}</td></tr>`;
    }).join("");
    printWindow(`${schoolHeader(school)}
      <h2>Fee Collection Report</h2>
      <table><thead><tr><th>Student</th><th>Class</th><th>Billed</th><th>Paid</th><th>Balance</th></tr></thead>
      <tbody>${rows}<tr class="summary-row"><td colspan="2">TOTAL</td><td>${fmt(totalB)}</td><td>${fmt(totalP)}</td><td>${fmt(totalBal)}</td></tr></tbody></table>`);
  }

  function printOutstandingFees() {
    const rows = debtors.map(({ s, billed, paid, balance }) =>
      `<tr><td>${fullName(s)}</td><td>${s.classrooms?.name ?? "—"}</td><td>${fmt(billed)}</td><td>${fmt(paid)}</td><td style="color:#dc2626;font-weight:700">${fmt(balance)}</td></tr>`
    ).join("");
    printWindow(`${schoolHeader(school)}
      <h2>Outstanding Fees Report — ${debtors.length} debtors — ${fmt(debtors.reduce((a, d) => a + d.balance, 0))} outstanding</h2>
      <table><thead><tr><th>Student</th><th>Class</th><th>Total Billed</th><th>Paid</th><th>Balance Due</th></tr></thead>
      <tbody>${rows}</tbody></table>`);
  }

  function printAttendance() {
    const rows = filteredStudents.map(s => {
      const a = attendanceMap[s.id] ?? { present: 0, absent: 0, late: 0 };
      const total = a.present + a.absent + a.late;
      const rate = total > 0 ? Math.round((a.present / total) * 100) : 0;
      return `<tr><td>${fullName(s)}</td><td>${s.classrooms?.name ?? "—"}</td><td>${a.present}</td><td>${a.absent}</td><td>${a.late}</td><td>${rate}%</td></tr>`;
    }).join("");
    printWindow(`${schoolHeader(school)}
      <h2>Attendance Report — Overall Rate: ${attendanceRate}%</h2>
      <table><thead><tr><th>Student</th><th>Class</th><th>Present</th><th>Absent</th><th>Late</th><th>Rate</th></tr></thead>
      <tbody>${rows}</tbody></table>`);
  }

  function printStaffReport() {
    const rows = staff.map(s => `<tr>
      <td>${s.full_name}</td><td>${s.role}</td>
      <td>${s.staff_details?.department ?? "—"}</td><td>${s.staff_details?.designation ?? "—"}</td>
      <td>${s.staff_details?.employment_type ?? "—"}</td><td>${s.staff_details?.qualification ?? "—"}</td>
    </tr>`).join("");
    printWindow(`${schoolHeader(school)}
      <h2>Staff Directory — ${staff.length} staff</h2>
      <table><thead><tr><th>Name</th><th>Role</th><th>Department</th><th>Designation</th><th>Type</th><th>Qualification</th></tr></thead>
      <tbody>${rows}</tbody></table>`);
  }

  function printReportCard(s: Student) {
    const w = walletMap[s.id];
    const att = attendanceMap[s.id] ?? { present: 0, absent: 0, late: 0 };
    const total = att.present + att.absent + att.late;
    const rate = total > 0 ? Math.round((att.present / total) * 100) : 0;
    const termName = terms.find(t => t.id === selectedTermId)?.name ?? "Current Term";
    const myExams = examResults.filter(r => r.student_id === s.id && (!selectedTermId || r.term_id === selectedTermId));
    const examRows = myExams.length > 0
      ? myExams.map(r => `<tr><td>${r.subject}</td><td>${r.score}</td><td>${r.grade ?? "—"}</td></tr>`).join("")
      : `<tr><td colspan="3" style="color:#999;font-style:italic;text-align:center">No results recorded</td></tr>`;
    printWindow(`${schoolHeader(school)}
      <h2>Academic Report Card — ${termName}</h2>
      <table style="margin-bottom:16px"><tr><td><b>Student:</b></td><td>${fullName(s)}</td><td><b>Adm No:</b></td><td>${s.admission_number ?? "—"}</td></tr>
      <tr><td><b>Class:</b></td><td>${s.classrooms?.name ?? "—"}</td><td><b>Gender:</b></td><td>${s.gender ?? "—"}</td></tr></table>
      <h2>Academic Performance</h2>
      <table><thead><tr><th>Subject</th><th>Score</th><th>Grade</th></tr></thead><tbody>${examRows}</tbody></table>
      <h2>Attendance</h2>
      <table><thead><tr><th>Present</th><th>Absent</th><th>Late</th><th>Rate</th></tr></thead>
      <tbody><tr><td>${att.present}</td><td>${att.absent}</td><td>${att.late}</td><td>${rate}%</td></tr></tbody></table>
      ${w ? `<h2>Fees</h2><table><thead><tr><th>Billed</th><th>Paid</th><th>Balance</th></tr></thead>
      <tbody><tr><td>${fmt(Number(w.total_billed))}</td><td>${fmt(Number(w.total_paid))}</td>
      <td>${fmt(Math.max(0, Number(w.total_billed) - Number(w.total_paid) - Number(w.total_waived)))}</td></tr></tbody></table>` : ""}
      <div class="sig-block"><div class="sig-inner">
        ${school?.headmaster_signature_url ? `<img src="${school.headmaster_signature_url}" style="height:50px;margin-bottom:4px" alt=""/>` : `<div style="height:50px"></div>`}
        <div class="sig-line"></div><div class="sig-label">Headmaster / Principal</div>
      </div></div>`);
  }

  function printSummary() {
    printWindow(`${schoolHeader(school)}
      <h2>School Summary Report</h2>
      <div class="stat-grid">
        <div class="stat-box"><div class="val">${students.length}</div><div class="lbl">Total Students</div></div>
        <div class="stat-box"><div class="val">${staff.length}</div><div class="lbl">Staff Members</div></div>
        <div class="stat-box"><div class="val">${attendanceRate}%</div><div class="lbl">Attendance Rate</div></div>
        <div class="stat-box"><div class="val">${collectionRate}%</div><div class="lbl">Collection Rate</div></div>
        <div class="stat-box"><div class="val">${fmt(totalPaid)}</div><div class="lbl">Fees Collected</div></div>
        <div class="stat-box"><div class="val">${fmt(totalOutstanding)}</div><div class="lbl">Outstanding Fees</div></div>
      </div>
      <h2>Enrollment by Class</h2>
      <table><thead><tr><th>Class</th><th>Students</th></tr></thead>
      <tbody>${enrollmentData.map(d => `<tr><td>${d.name}</td><td>${d.count}</td></tr>`).join("")}</tbody></table>`);
  }

  // ── Shared UI bits ─────────────────────────────────────────────────────────

  const classChips = (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
      <button onClick={() => setSelectedClassId(null)}
        className={cn("flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all shrink-0 text-[12px] font-semibold",
          selectedClassId === null ? "bg-[#262262] border-[#262262] text-white shadow-sm" : "bg-white border-[var(--border)] text-[var(--text-muted)] hover:border-[#262262]/30")}>
        <LayoutGrid size={13} /> All Classes
      </button>
      {classes.map(cls => (
        <button key={cls.id} onClick={() => setSelectedClassId(cls.id)}
          className={cn("flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all shrink-0 text-[12px] font-semibold",
            cls.id === selectedClassId ? "bg-[#262262] border-[#262262] text-white shadow-sm" : "bg-white border-[var(--border)] text-[var(--text-muted)] hover:border-[#262262]/30")}>
          {cls.name}
        </button>
      ))}
    </div>
  );

  function SectionHeader({ title, onPrint, onCSV }: { title: string; onPrint?: () => void; onCSV?: () => void }) {
    return (
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <p className="text-[13px] font-semibold text-[var(--text-muted)]">{title}</p>
        <div className="flex gap-2">
          {onCSV && <button onClick={onCSV} className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[var(--border)] text-[12px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-strong)] hover:bg-[var(--neutral-50)] transition-colors"><Download size={12} /> CSV</button>}
          {onPrint && <button onClick={onPrint} className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[var(--border)] text-[12px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-strong)] hover:bg-[var(--neutral-50)] transition-colors"><Printer size={12} /> Print</button>}
        </div>
      </div>
    );
  }

  function StatCard({ label, value, color, icon: Icon, sub }: { label: string; value: string | number; color: string; icon: React.ElementType; sub?: string }) {
    return (
      <div className="bg-white border border-[var(--border)] rounded-2xl p-4 shadow-sm flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: color + "18" }}>
          <Icon size={18} style={{ color }} />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
          <p className="text-[22px] font-extrabold leading-tight" style={{ color }}>{value}</p>
          {sub && <p className="text-[11px] text-[var(--text-muted)]">{sub}</p>}
        </div>
      </div>
    );
  }

  // ── Tab renderers ─────────────────────────────────────────────────────────

  function renderSummary() {
    const activeStudents = students.filter(s => (s.status ?? "active") === "active").length;
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Students" value={students.length} color={BRAND} icon={Users} sub={`${activeStudents} active`} />
          <StatCard label="Staff Members" value={staff.length} color="#92278F" icon={UserCheck} sub={`${classes.length} classes`} />
          <StatCard label="Fee Collection" value={`${collectionRate}%`} color={collectionRate >= 70 ? "#16a34a" : "#d97706"} icon={CreditCard} sub={fmt(totalPaid) + " collected"} />
          <StatCard label="Attendance Rate" value={`${attendanceRate}%`} color={attendanceRate >= 80 ? "#16a34a" : "#d97706"} icon={CalendarCheck} sub={`${totalDays} total sessions`} />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Outstanding Fees" value={fmt(totalOutstanding)} color="#dc2626" icon={AlertCircle} sub={`${debtors.filter(d => d.balance > 0).length} debtors`} />
          <StatCard label="Total Income" value={fmt(totalIncome)} color="#16a34a" icon={TrendingUp} sub="All time" />
          <StatCard label="Total Expenses" value={fmt(totalExpenses)} color="#f59e0b" icon={PiggyBank} sub="All time" />
          <StatCard label="Net Position" value={fmt(totalIncome - totalExpenses)} color={totalIncome >= totalExpenses ? "#16a34a" : "#dc2626"} icon={BarChart3} sub="Income minus expenses" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-sm">
            <h3 className="text-[14px] font-bold text-[var(--text-strong)] mb-4">Enrollment by Class</h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={enrollmentData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#6b7280" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 11 }} />
                  <Bar dataKey="count" fill={BRAND} radius={[5, 5, 0, 0]} name="Students" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-sm">
            <h3 className="text-[14px] font-bold text-[var(--text-strong)] mb-4">Fee Collection — Monthly</h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyReceipts} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#6b7280" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 11 }} formatter={(v: number) => [fmt(v), "Collected"]} />
                  <Line type="monotone" dataKey="amount" stroke={BRAND} strokeWidth={2.5} dot={false} name="Collected" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-sm">
            <h3 className="text-[14px] font-bold text-[var(--text-strong)] mb-4">Gender Distribution</h3>
            {genderData.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-[13px] text-[var(--text-muted)]">No gender data</div>
            ) : (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={genderData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {genderData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => [v, "Students"]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-sm">
            <h3 className="text-[14px] font-bold text-[var(--text-strong)] mb-4">Student Admissions Trend</h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={admissionTrend} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#6b7280" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 11 }} />
                  <Bar dataKey="students" fill="#92278F" radius={[5, 5, 0, 0]} name="New Students" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={printSummary}
            className="flex items-center gap-2 h-10 px-5 rounded-xl text-[13px] font-bold text-white shadow"
            style={{ background: GRADIENT }}>
            <Printer size={14} /> Print School Summary
          </button>
        </div>
      </div>
    );
  }

  function renderStudentList() {
    const csvExport = () => exportCSV(
      [["Adm No", "First Name", "Last Name", "Class", "Gender", "Status"],
       ...filteredStudents.map(s => [s.admission_number ?? "", s.first_name, s.last_name, s.classrooms?.name ?? "", s.gender ?? "", s.status ?? "active"])],
      "student_list.csv"
    );
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <Input placeholder="Search students…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="secondary" size="sm" onClick={csvExport}><Download size={13} /> CSV</Button>
            <Button variant="secondary" size="sm" onClick={printStudentList}><Printer size={13} /> Print</Button>
          </div>
        </div>
        <p className="text-[12px] text-[var(--text-muted)]">{filteredStudents.length} students</p>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--border)]">
                {["Adm No","Name","Class","Gender","Date of Birth","Status"].map(h =>
                  <th key={h} className="text-left py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0
                ? <tr><td colSpan={6} className="text-center py-10 text-[var(--text-muted)]">No students found</td></tr>
                : filteredStudents.map((s, i) => (
                  <tr key={s.id} className={cn("border-b border-[var(--border)]", i % 2 !== 0 && "bg-[var(--neutral-50)]/50")}>
                    <td className="py-2.5 px-3 font-mono text-[12px] text-[var(--text-muted)]">{s.admission_number ?? "—"}</td>
                    <td className="py-2.5 px-3 font-semibold text-[var(--text-strong)]">{fullName(s)}</td>
                    <td className="py-2.5 px-3">{s.classrooms?.name ?? "—"}</td>
                    <td className="py-2.5 px-3 capitalize">{s.gender ?? "—"}</td>
                    <td className="py-2.5 px-3">{s.date_of_birth ? new Date(s.date_of_birth).toLocaleDateString("en-GH") : "—"}</td>
                    <td className="py-2.5 px-3">
                      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold capitalize", (s.status ?? "active") === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600")}>{s.status ?? "active"}</span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderFinanceReport() {
    let totalB = 0, totalP = 0, totalBal = 0;
    const rows = filteredStudents.map(s => {
      const w = walletMap[s.id];
      const billed = Number(w?.total_billed ?? 0); const paid = Number(w?.total_paid ?? 0);
      const waived = Number(w?.total_waived ?? 0); const balance = Math.max(0, billed - paid - waived);
      totalB += billed; totalP += paid; totalBal += balance;
      return { s, billed, paid, balance };
    });
    const csvExport = () => exportCSV(
      [["Student","Class","Total Billed","Total Paid","Balance"],
       ...rows.map(r => [fullName(r.s), r.s.classrooms?.name ?? "", r.billed, r.paid, r.balance]),
       ["TOTAL","",totalB,totalP,totalBal]],
      "fee_collection.csv"
    );
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Billed", value: fmt(totalBilled), color: BRAND },
            { label: "Total Collected", value: fmt(totalPaid), color: "#16a34a" },
            { label: "Outstanding", value: fmt(totalOutstanding), color: "#dc2626" },
          ].map(c => (
            <div key={c.label} className="bg-white border border-[var(--border)] rounded-xl p-4">
              <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">{c.label}</p>
              <p className="text-[20px] font-extrabold mt-1" style={{ color: c.color }}>{c.value}</p>
            </div>
          ))}
        </div>
        <SectionHeader title={`${filteredStudents.length} students`} onPrint={printFinanceReport} onCSV={csvExport} />
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--border)]">
                {["Student","Class","Total Billed","Total Paid","Balance"].map(h =>
                  <th key={h} className="text-left py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ s, billed, paid, balance }, i) => (
                <tr key={s.id} className={cn("border-b border-[var(--border)]", i % 2 !== 0 && "bg-[var(--neutral-50)]/50")}>
                  <td className="py-2.5 px-3 font-semibold text-[var(--text-strong)]">{fullName(s)}</td>
                  <td className="py-2.5 px-3">{s.classrooms?.name ?? "—"}</td>
                  <td className="py-2.5 px-3 font-mono text-[12px]">{fmt(billed)}</td>
                  <td className="py-2.5 px-3 font-mono text-[12px] text-green-700">{fmt(paid)}</td>
                  <td className={cn("py-2.5 px-3 font-mono text-[12px]", balance > 0 ? "text-red-600 font-bold" : "text-[var(--text-muted)]")}>{fmt(balance)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#262262] bg-[#262262]/5">
                <td colSpan={2} className="py-2.5 px-3 font-bold text-[#262262] text-[13px]">TOTAL</td>
                <td className="py-2.5 px-3 font-bold font-mono text-[13px]">{fmt(totalB)}</td>
                <td className="py-2.5 px-3 font-bold font-mono text-[13px] text-green-700">{fmt(totalP)}</td>
                <td className={cn("py-2.5 px-3 font-bold font-mono text-[13px]", totalBal > 0 ? "text-red-600" : "")}>{fmt(totalBal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  }

  function renderOutstanding() {
    const totalOwed = debtors.reduce((a, d) => a + d.balance, 0);
    const csvExport = () => exportCSV(
      [["Rank","Student","Class","Total Billed","Paid","Balance Due"],
       ...debtors.map((d, i) => [i + 1, fullName(d.s), d.s.classrooms?.name ?? "", d.billed, d.paid, d.balance])],
      "outstanding_fees.csv"
    );
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Outstanding", value: fmt(totalOwed), color: "#dc2626" },
            { label: "No. of Debtors", value: debtors.filter(d => d.balance > 0).length, color: "#d97706" },
            { label: "Collection Rate", value: `${collectionRate}%`, color: collectionRate >= 70 ? "#16a34a" : "#dc2626" },
          ].map(c => (
            <div key={c.label} className="bg-white border border-[var(--border)] rounded-xl p-4">
              <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">{c.label}</p>
              <p className="text-[20px] font-extrabold mt-1" style={{ color: c.color }}>{c.value}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-[13px] font-semibold cursor-pointer">
            <input type="checkbox" checked={outstandingOnly} onChange={e => setOutstandingOnly(e.target.checked)} className="rounded" />
            Show debtors only
          </label>
          <div className="ml-auto flex gap-2">
            <button onClick={csvExport} className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[var(--border)] text-[12px] font-semibold text-[var(--text-muted)] hover:bg-[var(--neutral-50)]"><Download size={12} /> CSV</button>
            <button onClick={printOutstandingFees} className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[var(--border)] text-[12px] font-semibold text-[var(--text-muted)] hover:bg-[var(--neutral-50)]"><Printer size={12} /> Print</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--border)]">
                {["#","Student","Class","Total Billed","Paid","Balance Due"].map(h =>
                  <th key={h} className="text-left py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {debtors.length === 0
                ? <tr><td colSpan={6} className="text-center py-10 text-[var(--text-muted)]">No outstanding fees 🎉</td></tr>
                : debtors.map(({ s, billed, paid, balance }, i) => (
                  <tr key={s.id} className={cn("border-b border-[var(--border)]", i % 2 !== 0 && "bg-[var(--neutral-50)]/50")}>
                    <td className="py-2.5 px-3 text-[var(--text-muted)]">{i + 1}</td>
                    <td className="py-2.5 px-3 font-semibold text-[var(--text-strong)]">{fullName(s)}</td>
                    <td className="py-2.5 px-3">{s.classrooms?.name ?? "—"}</td>
                    <td className="py-2.5 px-3 font-mono text-[12px]">{fmt(billed)}</td>
                    <td className="py-2.5 px-3 font-mono text-[12px] text-green-700">{fmt(paid)}</td>
                    <td className={cn("py-2.5 px-3 font-mono text-[12px] font-bold", balance > 0 ? "text-red-600" : "text-[var(--text-muted)]")}>{fmt(balance)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderAttendance() {
    const csvExport = () => exportCSV(
      [["Student","Class","Present","Absent","Late","Rate"],
       ...filteredStudents.map(s => {
         const a = attendanceMap[s.id] ?? { present: 0, absent: 0, late: 0 };
         const total = a.present + a.absent + a.late;
         const rate = total > 0 ? Math.round((a.present / total) * 100) : 0;
         return [fullName(s), s.classrooms?.name ?? "", a.present, a.absent, a.late, `${rate}%`];
       })],
      "attendance_report.csv"
    );
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Overall Rate", value: `${attendanceRate}%`, color: attendanceRate >= 80 ? "#16a34a" : "#d97706" },
            { label: "Total Present", value: presentTotal, color: "#16a34a" },
            { label: "Total Sessions", value: totalDays, color: BRAND },
          ].map(c => (
            <div key={c.label} className="bg-white border border-[var(--border)] rounded-xl p-4">
              <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">{c.label}</p>
              <p className="text-[20px] font-extrabold mt-1" style={{ color: c.color }}>{c.value}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <label className="text-[12px] font-semibold text-[var(--text-muted)]">Term:</label>
          <select value={selectedTermId ?? ""} onChange={e => setSelectedTermId(e.target.value || null)}
            className="text-[13px] border border-[var(--border)] rounded-xl px-3 py-1.5 bg-white focus:outline-none focus:border-[#262262]">
            <option value="">All Terms</option>
            {terms.map(t => <option key={t.id} value={t.id}>{t.name}{t.is_current ? " (current)" : ""}</option>)}
          </select>
          <div className="ml-auto flex gap-2">
            <button onClick={csvExport} className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[var(--border)] text-[12px] font-semibold text-[var(--text-muted)] hover:bg-[var(--neutral-50)]"><Download size={12} /> CSV</button>
            <button onClick={printAttendance} className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[var(--border)] text-[12px] font-semibold text-[var(--text-muted)] hover:bg-[var(--neutral-50)]"><Printer size={12} /> Print</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--border)]">
                {["Student","Class","Present","Absent","Late","Rate"].map(h =>
                  <th key={h} className="text-left py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((s, i) => {
                const a = attendanceMap[s.id] ?? { present: 0, absent: 0, late: 0 };
                const total = a.present + a.absent + a.late;
                const rate = total > 0 ? Math.round((a.present / total) * 100) : 0;
                return (
                  <tr key={s.id} className={cn("border-b border-[var(--border)]", i % 2 !== 0 && "bg-[var(--neutral-50)]/50")}>
                    <td className="py-2.5 px-3 font-semibold text-[var(--text-strong)]">{fullName(s)}</td>
                    <td className="py-2.5 px-3">{s.classrooms?.name ?? "—"}</td>
                    <td className="py-2.5 px-3 text-green-700 font-semibold">{a.present}</td>
                    <td className="py-2.5 px-3 text-red-600 font-semibold">{a.absent}</td>
                    <td className="py-2.5 px-3 text-amber-600 font-semibold">{a.late}</td>
                    <td className="py-2.5 px-3">
                      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", rate >= 80 ? "bg-green-100 text-green-700" : rate >= 60 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700")}>{rate}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderStaffReport() {
    const totalSalaryPool = staff.reduce((a, s) => a + Number(s.staff_details?.basic_salary ?? 0) + Number(s.staff_details?.allowances ?? 0), 0);
    const csvExport = () => exportCSV(
      [["Name","Role","Department","Designation","Employment Type","Qualification","Basic Salary","Allowances"],
       ...staff.map(s => [s.full_name, s.role, s.staff_details?.department ?? "", s.staff_details?.designation ?? "", s.staff_details?.employment_type ?? "", s.staff_details?.qualification ?? "", s.staff_details?.basic_salary ?? 0, s.staff_details?.allowances ?? 0])],
      "staff_report.csv"
    );
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white border border-[var(--border)] rounded-xl p-4"><p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase">Total Staff</p><p className="text-[20px] font-extrabold text-[#262262] mt-1">{staff.length}</p></div>
          <div className="bg-white border border-[var(--border)] rounded-xl p-4"><p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase">Departments</p><p className="text-[20px] font-extrabold text-[#92278F] mt-1">{staffByDept.length}</p></div>
          <div className="bg-white border border-[var(--border)] rounded-xl p-4 col-span-2"><p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase">Monthly Salary Pool</p><p className="text-[20px] font-extrabold text-[#16a34a] mt-1">{fmt(totalSalaryPool)}</p></div>
        </div>
        <SectionHeader title={`${staff.length} active staff`} onPrint={printStaffReport} onCSV={csvExport} />
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--border)]">
                {["Name","Role","Department","Designation","Type","Basic Salary","Allowances"].map(h =>
                  <th key={h} className="text-left py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {staff.map((s, i) => (
                <tr key={s.id} className={cn("border-b border-[var(--border)]", i % 2 !== 0 && "bg-[var(--neutral-50)]/50")}>
                  <td className="py-2.5 px-3 font-semibold text-[var(--text-strong)]">{s.full_name}</td>
                  <td className="py-2.5 px-3 capitalize"><span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#262262]/10 text-[#262262]">{s.role}</span></td>
                  <td className="py-2.5 px-3">{s.staff_details?.department ?? "—"}</td>
                  <td className="py-2.5 px-3">{s.staff_details?.designation ?? "—"}</td>
                  <td className="py-2.5 px-3 capitalize">{s.staff_details?.employment_type ?? "—"}</td>
                  <td className="py-2.5 px-3 font-mono text-[12px]">{s.staff_details?.basic_salary ? fmt(Number(s.staff_details.basic_salary)) : <span className="text-amber-600 text-[11px]">Not set</span>}</td>
                  <td className="py-2.5 px-3 font-mono text-[12px]">{fmt(Number(s.staff_details?.allowances ?? 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderPayroll() {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Pay Runs", value: payrollRuns.length, color: BRAND },
            { label: "Total Gross (All)", value: fmt(payrollRuns.reduce((a, r) => a + Number(r.total_gross ?? 0), 0)), color: "#16a34a" },
            { label: "Total Net (All)", value: fmt(payrollRuns.reduce((a, r) => a + Number(r.total_net ?? 0), 0)), color: "#92278F" },
          ].map(c => (
            <div key={c.label} className="bg-white border border-[var(--border)] rounded-xl p-4">
              <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">{c.label}</p>
              <p className="text-[20px] font-extrabold mt-1" style={{ color: c.color }}>{c.value}</p>
            </div>
          ))}
        </div>
        {payrollRuns.length === 0
          ? <div className="py-10 text-center text-[13px] text-[var(--text-muted)]">No payroll runs yet. <a href="/finance/payroll" className="text-[#262262] font-semibold underline">Go to Payroll →</a></div>
          : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {["Month","Year","Status","Total Gross","Total Deductions","Net Pay"].map(h =>
                    <th key={h} className="text-left py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {payrollRuns.map((r, i) => (
                  <tr key={r.id} className={cn("border-b border-[var(--border)]", i % 2 !== 0 && "bg-[var(--neutral-50)]/50")}>
                    <td className="py-2.5 px-3 font-bold text-[var(--text-strong)]">{FULL_MONTHS[r.month - 1]}</td>
                    <td className="py-2.5 px-3">{r.year}</td>
                    <td className="py-2.5 px-3">
                      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold capitalize",
                        r.status === "paid" ? "bg-green-100 text-green-700" : r.status === "processing" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600")}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[12px]">{fmt(Number(r.total_gross))}</td>
                    <td className="py-2.5 px-3 font-mono text-[12px] text-red-600">{fmt(Number(r.total_deductions))}</td>
                    <td className="py-2.5 px-3 font-mono text-[12px] font-bold text-green-700">{fmt(Number(r.total_net))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex justify-end"><a href="/finance/payroll" className="text-[13px] font-semibold text-[#262262] hover:underline">Manage Payroll →</a></div>
      </div>
    );
  }

  function renderExams() {
    const csvExport = () => exportCSV(
      [["Student ID","Subject","Score","Grade","Class"],
       ...examResults.filter(r => !selectedTermId || r.term_id === selectedTermId).map(r => [r.student_id, r.subject, r.score, r.grade ?? "", r.class_id ?? ""])],
      "exam_results.csv"
    );
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <label className="text-[12px] font-semibold text-[var(--text-muted)]">Term:</label>
          <select value={selectedTermId ?? ""} onChange={e => setSelectedTermId(e.target.value || null)}
            className="text-[13px] border border-[var(--border)] rounded-xl px-3 py-1.5 bg-white focus:outline-none focus:border-[#262262]">
            <option value="">All Terms</option>
            {terms.map(t => <option key={t.id} value={t.id}>{t.name}{t.is_current ? " (current)" : ""}</option>)}
          </select>
          <button onClick={csvExport} className="ml-auto flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[var(--border)] text-[12px] font-semibold text-[var(--text-muted)] hover:bg-[var(--neutral-50)]"><Download size={12} /> CSV</button>
        </div>
        {subjectAverages.length === 0
          ? <div className="py-10 text-center text-[13px] text-[var(--text-muted)]">No exam results found</div>
          : (
          <>
            <div className="bg-white rounded-2xl border border-[var(--border)] p-5">
              <h3 className="text-[14px] font-bold text-[var(--text-strong)] mb-4">Subject Averages</h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subjectAverages.slice(0, 12)} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                    <XAxis dataKey="subject" tick={{ fontSize: 9, fill: "#6b7280" }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#6b7280" }} />
                    <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 11 }} />
                    <Bar dataKey="avg" fill={BRAND} radius={[5, 5, 0, 0]} name="Average Score" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    {["#","Subject","Average Score","No. of Results"].map(h =>
                      <th key={h} className="text-left py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {subjectAverages.map((s, i) => (
                    <tr key={s.subject} className={cn("border-b border-[var(--border)]", i % 2 !== 0 && "bg-[var(--neutral-50)]/50")}>
                      <td className="py-2.5 px-3 text-[var(--text-muted)]">{i + 1}</td>
                      <td className="py-2.5 px-3 font-semibold text-[var(--text-strong)]">{s.subject}</td>
                      <td className="py-2.5 px-3">
                        <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-bold", s.avg >= 70 ? "bg-green-100 text-green-700" : s.avg >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700")}>{s.avg}%</span>
                      </td>
                      <td className="py-2.5 px-3 text-[var(--text-muted)]">{examResults.filter(r => r.subject === s.subject).length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    );
  }

  function renderComms() {
    const totalSent = commLogs.reduce((a, l) => a + (l.recipient_count ?? 1), 0);
    const totalDelivered = commLogs.filter(l => l.status === "delivered" || l.status === "read").length;
    const totalFailed = commLogs.filter(l => l.status === "failed").length;
    const csvExport = () => exportCSV(
      [["Channel","Total Sent","Delivered","Failed","Delivery Rate"],
       ...commSummary.map(s => [s.channel, s.sent, s.delivered, s.failed, s.sent > 0 ? `${Math.round((s.delivered / s.sent) * 100)}%` : "0%"])],
      "communication_report.csv"
    );
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Messages Sent", value: totalSent, color: BRAND },
            { label: "Delivered", value: totalDelivered, color: "#16a34a" },
            { label: "Failed", value: totalFailed, color: "#dc2626" },
          ].map(c => (
            <div key={c.label} className="bg-white border border-[var(--border)] rounded-xl p-4">
              <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase">{c.label}</p>
              <p className="text-[20px] font-extrabold mt-1" style={{ color: c.color }}>{c.value}</p>
            </div>
          ))}
        </div>
        <SectionHeader title="By Channel" onCSV={csvExport} />
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--border)]">
                {["Channel","Total Sent","Delivered","Failed","Delivery Rate"].map(h =>
                  <th key={h} className="text-left py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {commSummary.length === 0
                ? <tr><td colSpan={5} className="text-center py-10 text-[var(--text-muted)]">No communication logs</td></tr>
                : commSummary.map((s, i) => (
                  <tr key={s.channel} className={cn("border-b border-[var(--border)]", i % 2 !== 0 && "bg-[var(--neutral-50)]/50")}>
                    <td className="py-2.5 px-3 font-semibold capitalize">{s.channel}</td>
                    <td className="py-2.5 px-3">{s.sent}</td>
                    <td className="py-2.5 px-3 text-green-700">{s.delivered}</td>
                    <td className="py-2.5 px-3 text-red-600">{s.failed}</td>
                    <td className="py-2.5 px-3">
                      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold",
                        s.sent > 0 && (s.delivered / s.sent) >= 0.8 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>
                        {s.sent > 0 ? `${Math.round((s.delivered / s.sent) * 100)}%` : "—"}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderAnalytics() {
    const expenseByCategory = expenses.reduce<Record<string, number>>((a, e) => {
      const cat = e.category ?? "Uncategorized";
      a[cat] = (a[cat] ?? 0) + Number(e.amount ?? 0);
      return a;
    }, {});
    const expensePieData = Object.entries(expenseByCategory).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);

    const incomeByCategory = incomeRecords.reduce<Record<string, number>>((a, e) => {
      const cat = e.category ?? "Other";
      a[cat] = (a[cat] ?? 0) + Number(e.amount ?? 0);
      return a;
    }, {});
    const incomePieData = Object.entries(incomeByCategory).map(([name, value]) => ({ name, value }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-sm">
            <h3 className="text-[14px] font-bold text-[var(--text-strong)] mb-4">Expense Breakdown</h3>
            {expensePieData.length === 0
              ? <div className="h-52 flex items-center justify-center text-[13px] text-[var(--text-muted)]">No expense data</div>
              : <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={expensePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, percent }) => `${name.slice(0,8)} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                      {expensePieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => [fmt(v), ""]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            }
          </div>

          <div className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-sm">
            <h3 className="text-[14px] font-bold text-[var(--text-strong)] mb-4">Income by Category</h3>
            {incomePieData.length === 0
              ? <div className="h-52 flex items-center justify-center text-[13px] text-[var(--text-muted)]">No income data</div>
              : <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={incomePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, percent }) => `${name.slice(0,8)} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                      {incomePieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => [fmt(v), ""]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            }
          </div>

          <div className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-sm">
            <h3 className="text-[14px] font-bold text-[var(--text-strong)] mb-4">Staff by Department</h3>
            {staffByDept.length === 0
              ? <div className="h-52 flex items-center justify-center text-[13px] text-[var(--text-muted)]">No department data</div>
              : <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={staffByDept} layout="vertical" margin={{ top: 4, right: 8, left: 60, bottom: 4 }}>
                    <XAxis type="number" tick={{ fontSize: 10, fill: "#6b7280" }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#6b7280" }} width={56} />
                    <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 11 }} />
                    <Bar dataKey="value" fill="#92278F" radius={[0, 5, 5, 0]} name="Staff" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            }
          </div>

          <div className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-sm">
            <h3 className="text-[14px] font-bold text-[var(--text-strong)] mb-4">Monthly Fee Collection</h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyReceipts} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#6b7280" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 11 }} formatter={(v: number) => [fmt(v), "Collected"]} />
                  <Line type="monotone" dataKey="amount" stroke={BRAND} strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderReportCards() {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-[12px] font-semibold text-[var(--text-muted)]">Term:</label>
          <select value={selectedTermId ?? ""} onChange={e => setSelectedTermId(e.target.value || null)}
            className="text-[13px] border border-[var(--border)] rounded-xl px-3 py-1.5 bg-white focus:outline-none focus:border-[#262262]">
            <option value="">All Terms</option>
            {terms.map(t => <option key={t.id} value={t.id}>{t.name}{t.is_current ? " (current)" : ""}</option>)}
          </select>
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <Input placeholder="Search students…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
          </div>
        </div>
        <p className="text-[12px] text-[var(--text-muted)]">{filteredStudents.length} students — click Print to generate individual report card</p>
        {filteredStudents.length === 0
          ? <div className="py-12 text-center text-[13px] text-[var(--text-muted)]">No students match your filters</div>
          : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filteredStudents.map(s => (
              <div key={s.id} className="group bg-white border border-[var(--border)] rounded-2xl p-4 hover:border-[#262262]/40 hover:shadow-md transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#262262]/8 flex items-center justify-center shrink-0">
                    <span className="text-[12px] font-bold text-[#262262]">{s.first_name[0]}{s.last_name[0]}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-[var(--text-strong)] truncate">{fullName(s)}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">{s.classrooms?.name ?? "—"} · {s.admission_number ?? "No ID"}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => printReportCard(s)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold border border-[var(--border)] hover:bg-[var(--neutral-50)] transition-colors">
                    <Printer size={12} /> Print Card
                  </button>
                  <a href={`/students/${s.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white hover:opacity-90"
                    style={{ background: BRAND }}>
                    Profile
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[22px] font-extrabold text-[var(--text-strong)]">Reports &amp; Analytics</h2>
          <p className="text-[13px] text-[var(--text-muted)] mt-0.5">{school?.name ?? "School"} · Enterprise Reports</p>
        </div>
        <button onClick={printSummary}
          className="h-10 px-5 rounded-xl text-[13px] font-bold text-white flex items-center gap-2 shadow"
          style={{ background: GRADIENT }}>
          <Printer size={14} /> Print Summary
        </button>
      </div>

      {/* Class filter (only relevant tabs) */}
      {["students","finance","outstanding","attendance","reportcards"].includes(activeTab) && classChips}

      {/* Main card */}
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
        {/* Tab bar */}
        <div className="flex overflow-x-auto border-b border-[var(--border)] px-4 pt-1 scrollbar-hide">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cn("flex items-center gap-1.5 px-3.5 py-3 text-[12px] font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap shrink-0",
                  activeTab === tab.id ? "border-[#262262] text-[#262262]" : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-strong)]")}>
                <Icon size={12} /> {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-5">
          {activeTab === "summary"     && renderSummary()}
          {activeTab === "students"    && renderStudentList()}
          {activeTab === "finance"     && renderFinanceReport()}
          {activeTab === "outstanding" && renderOutstanding()}
          {activeTab === "attendance"  && renderAttendance()}
          {activeTab === "staff"       && renderStaffReport()}
          {activeTab === "payroll"     && renderPayroll()}
          {activeTab === "exams"       && renderExams()}
          {activeTab === "analytics"   && renderAnalytics()}
          {activeTab === "comms"       && renderComms()}
          {activeTab === "reportcards" && renderReportCards()}
        </div>
      </div>
    </div>
  );
}
