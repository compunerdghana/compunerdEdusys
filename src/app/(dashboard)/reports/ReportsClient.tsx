"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  LayoutGrid,
  Printer,
  Users,
  CreditCard,
  CalendarCheck,
  FileText,
  BarChart3,
  Search,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

// ─── Types ──────────────────────────────────────────────────────────────────

interface School {
  id: string;
  name: string;
  address?: string | null;
  logo_url?: string | null;
  headmaster_signature_url?: string | null;
  motto?: string | null;
}

interface Classroom {
  id: string;
  name: string;
  level?: string | null;
}

interface Student {
  id: string;
  admission_number?: string | null;
  first_name: string;
  last_name: string;
  gender?: string | null;
  status?: string | null;
  class_id?: string | null;
  classrooms?: { id: string; name: string; level?: string | null } | null;
}

interface Term {
  id: string;
  name: string;
  start_date?: string | null;
  end_date?: string | null;
  is_current?: boolean | null;
}

interface StaffMember {
  id: string;
  full_name: string;
  role: string;
}

interface Wallet {
  student_id: string;
  total_billed: number;
  total_paid: number;
  total_waived: number;
}

interface Receipt {
  id: string;
  student_id: string;
  amount: number;
  created_at: string;
}

interface AttendanceRecord {
  student_id: string;
  status: string;
  date: string;
}

interface Props {
  school: School | null;
  classes: Classroom[];
  students: Student[];
  terms: Term[];
  currentTermId: string | null;
  staff: StaffMember[];
  wallets: Wallet[];
  receipts: Receipt[];
  attendanceRecords: AttendanceRecord[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: 2,
  }).format(n);
}

function fullName(s: Student) {
  return `${s.first_name} ${s.last_name}`;
}

// ─── Print helpers ─────────────────────────────────────────────────────────

const BASE_PRINT_STYLE = `
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',Arial,sans-serif;color:#111;background:#fff;padding:24px}
    h1{font-size:20px;font-weight:800;color:#262262}
    h2{font-size:15px;font-weight:700;color:#262262;margin-bottom:8px}
    p{font-size:12px;line-height:1.5}
    table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}
    th{background:#262262;color:#fff;padding:7px 10px;text-align:left;font-weight:600;font-size:11px}
    td{padding:6px 10px;border-bottom:1px solid #e5e7eb}
    tr:nth-child(even) td{background:#f9fafb}
    .school-header{display:flex;align-items:center;gap:16px;margin-bottom:20px;padding-bottom:16px;border-bottom:3px solid #262262}
    .school-header img{width:60px;height:60px;object-fit:contain}
    .school-info h1{font-size:22px}
    .school-info p{font-size:12px;color:#555}
    .summary-row{font-weight:700;background:#f3f4f6!important}
    .stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin:16px 0}
    .stat-box{border:1px solid #e5e7eb;border-radius:8px;padding:12px}
    .stat-box .val{font-size:22px;font-weight:800;color:#262262}
    .stat-box .lbl{font-size:11px;color:#777;margin-top:2px}
    .sig-block{margin-top:40px;display:flex;justify-content:flex-end}
    .sig-inner{text-align:center;min-width:200px}
    .sig-line{border-top:1px solid #333;margin-bottom:4px}
    .sig-label{font-size:11px;color:#555}
    @media print{body{padding:0}}
  </style>
`;

function schoolHeader(school: School | null) {
  if (!school) return "";
  return `
    <div class="school-header">
      ${school.logo_url ? `<img src="${school.logo_url}" alt="Logo"/>` : ""}
      <div class="school-info">
        <h1>${school.name}</h1>
        ${school.address ? `<p>${school.address}</p>` : ""}
        ${school.motto ? `<p><em>${school.motto}</em></p>` : ""}
      </div>
    </div>
  `;
}

function printWindow(html: string) {
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">${BASE_PRINT_STYLE}</head><body>${html}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 400);
}

// ─── Main Component ──────────────────────────────────────────────────────────

type Tab = "students" | "finance" | "attendance" | "reportcards" | "summary";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "students",    label: "Student List",      icon: Users },
  { id: "finance",     label: "Finance Report",    icon: CreditCard },
  { id: "attendance",  label: "Attendance Summary",icon: CalendarCheck },
  { id: "reportcards", label: "Term Report Cards", icon: FileText },
  { id: "summary",     label: "School Summary",    icon: BarChart3 },
];

export function ReportsClient({
  school, classes, students, terms, currentTermId,
  staff, wallets, receipts, attendanceRecords,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("students");
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedTermId, setSelectedTermId] = useState<string | null>(currentTermId);
  const [search, setSearch] = useState("");

  // ── Derived data ──────────────────────────────────────────────────────────

  const filteredStudents = useMemo(() => {
    let list = students;
    if (selectedClassId) list = list.filter((s) => s.class_id === selectedClassId);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          fullName(s).toLowerCase().includes(q) ||
          (s.admission_number ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [students, selectedClassId, search]);

  const walletMap = useMemo(() => {
    const m: Record<string, Wallet> = {};
    wallets.forEach((w) => { m[w.student_id] = w; });
    return m;
  }, [wallets]);

  const attendanceMap = useMemo(() => {
    const m: Record<string, { present: number; absent: number; late: number }> = {};
    attendanceRecords.forEach((r) => {
      if (!m[r.student_id]) m[r.student_id] = { present: 0, absent: 0, late: 0 };
      const st = r.status?.toLowerCase() ?? "";
      if (st === "present") m[r.student_id].present++;
      else if (st === "absent") m[r.student_id].absent++;
      else if (st === "late") m[r.student_id].late++;
    });
    return m;
  }, [attendanceRecords]);

  // For enrollment bar chart (by level / class)
  const enrollmentData = useMemo(() => {
    const counts: Record<string, number> = {};
    students.forEach((s) => {
      const cls = s.classrooms;
      const key = cls?.level ?? cls?.name ?? "Unknown";
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [students]);

  // Summary stats
  const totalBilled = wallets.reduce((a, w) => a + Number(w.total_billed ?? 0), 0);
  const totalPaid   = wallets.reduce((a, w) => a + Number(w.total_paid ?? 0), 0);
  const collectionRate = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;
  const presentTotal = Object.values(attendanceMap).reduce((a, v) => a + v.present, 0);
  const totalDays    = Object.values(attendanceMap).reduce((a, v) => a + v.present + v.absent + v.late, 0);
  const attendanceRate = totalDays > 0 ? Math.round((presentTotal / totalDays) * 100) : 0;

  // ── Print handlers ────────────────────────────────────────────────────────

  function printStudentList() {
    const rows = filteredStudents.map((s) => `
      <tr>
        <td>${s.admission_number ?? "—"}</td>
        <td>${fullName(s)}</td>
        <td>${s.classrooms?.name ?? "—"}</td>
        <td>${s.gender ?? "—"}</td>
        <td>${s.status ?? "active"}</td>
      </tr>`).join("");
    printWindow(`
      ${schoolHeader(school)}
      <h2>Student List</h2>
      <p style="margin-bottom:8px;font-size:11px;color:#666">${filteredStudents.length} students</p>
      <table>
        <thead><tr><th>Adm No</th><th>Name</th><th>Class</th><th>Gender</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `);
  }

  function printFinanceReport() {
    let totalB = 0, totalP = 0, totalBal = 0;
    const rows = filteredStudents.map((s) => {
      const w = walletMap[s.id];
      const billed  = Number(w?.total_billed  ?? 0);
      const paid    = Number(w?.total_paid    ?? 0);
      const waived  = Number(w?.total_waived  ?? 0);
      const balance = Math.max(0, billed - paid - waived);
      totalB   += billed;
      totalP   += paid;
      totalBal += balance;
      return `<tr><td>${fullName(s)}</td><td>${s.classrooms?.name ?? "—"}</td><td>${fmt(billed)}</td><td>${fmt(paid)}</td><td>${fmt(balance)}</td></tr>`;
    }).join("");
    printWindow(`
      ${schoolHeader(school)}
      <h2>Finance Report</h2>
      <table>
        <thead><tr><th>Student</th><th>Class</th><th>Total Billed</th><th>Total Paid</th><th>Balance</th></tr></thead>
        <tbody>
          ${rows}
          <tr class="summary-row">
            <td colspan="2">TOTAL</td>
            <td>${fmt(totalB)}</td><td>${fmt(totalP)}</td><td>${fmt(totalBal)}</td>
          </tr>
        </tbody>
      </table>
    `);
  }

  function printAttendance() {
    const rows = filteredStudents.map((s) => {
      const a = attendanceMap[s.id] ?? { present: 0, absent: 0, late: 0 };
      const total = a.present + a.absent + a.late;
      const rate  = total > 0 ? Math.round((a.present / total) * 100) : 0;
      return `<tr><td>${fullName(s)}</td><td>${s.classrooms?.name ?? "—"}</td><td>${a.present}</td><td>${a.absent}</td><td>${a.late}</td><td>${rate}%</td></tr>`;
    }).join("");
    printWindow(`
      ${schoolHeader(school)}
      <h2>Attendance Summary</h2>
      <table>
        <thead><tr><th>Student</th><th>Class</th><th>Present</th><th>Absent</th><th>Late</th><th>Rate</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `);
  }

  function printReportCard(s: Student) {
    const w   = walletMap[s.id];
    const att = attendanceMap[s.id] ?? { present: 0, absent: 0, late: 0 };
    const total = att.present + att.absent + att.late;
    const rate  = total > 0 ? Math.round((att.present / total) * 100) : 0;
    const termName = terms.find((t) => t.id === selectedTermId)?.name ?? "Current Term";
    printWindow(`
      ${schoolHeader(school)}
      <h2 style="margin-bottom:4px">Academic Report Card</h2>
      <table style="margin-bottom:16px">
        <tr><td><strong>Student Name:</strong></td><td>${fullName(s)}</td><td><strong>Admission No:</strong></td><td>${s.admission_number ?? "—"}</td></tr>
        <tr><td><strong>Class:</strong></td><td>${s.classrooms?.name ?? "—"}</td><td><strong>Term:</strong></td><td>${termName}</td></tr>
        <tr><td><strong>Gender:</strong></td><td>${s.gender ?? "—"}</td><td></td><td></td></tr>
      </table>

      <h2>Academic Performance</h2>
      <table>
        <thead><tr><th>Subject</th><th>1st Test</th><th>2nd Test</th><th>Exam</th><th>Total</th><th>Grade</th><th>Remarks</th></tr></thead>
        <tbody>
          <tr><td colspan="7" style="color:#999;font-style:italic;text-align:center">No scores recorded for this term</td></tr>
        </tbody>
      </table>

      <h2 style="margin-top:16px">Attendance</h2>
      <table>
        <thead><tr><th>Days Present</th><th>Days Absent</th><th>Days Late</th><th>Attendance Rate</th></tr></thead>
        <tbody><tr><td>${att.present}</td><td>${att.absent}</td><td>${att.late}</td><td>${rate}%</td></tr></tbody>
      </table>

      ${w ? `
      <h2 style="margin-top:16px">Fees</h2>
      <table>
        <thead><tr><th>Total Billed</th><th>Total Paid</th><th>Balance</th></tr></thead>
        <tbody><tr><td>${fmt(Number(w.total_billed))}</td><td>${fmt(Number(w.total_paid))}</td><td>${fmt(Math.max(0,Number(w.total_billed)-Number(w.total_paid)-Number(w.total_waived)))}</td></tr></tbody>
      </table>` : ""}

      <div class="sig-block">
        <div class="sig-inner">
          ${school?.headmaster_signature_url ? `<img src="${school.headmaster_signature_url}" style="height:50px;margin-bottom:4px" alt="Signature"/>` : `<div style="height:50px"></div>`}
          <div class="sig-line"></div>
          <div class="sig-label">Headmaster / Principal</div>
        </div>
      </div>
    `);
  }

  function printSummary() {
    const activeStudents = students.filter((s) => (s.status ?? "active") === "active").length;
    printWindow(`
      ${schoolHeader(school)}
      <h2>School Summary Report</h2>
      <div class="stat-grid">
        <div class="stat-box"><div class="val">${students.length}</div><div class="lbl">Total Students</div></div>
        <div class="stat-box"><div class="val">${activeStudents}</div><div class="lbl">Active Students</div></div>
        <div class="stat-box"><div class="val">${staff.length}</div><div class="lbl">Staff Members</div></div>
        <div class="stat-box"><div class="val">${attendanceRate}%</div><div class="lbl">Attendance Rate</div></div>
        <div class="stat-box"><div class="val">${collectionRate}%</div><div class="lbl">Fee Collection Rate</div></div>
        <div class="stat-box"><div class="val">${fmt(totalPaid)}</div><div class="lbl">Total Fees Collected</div></div>
      </div>
      <h2 style="margin-top:16px">Enrollment by Level</h2>
      <table>
        <thead><tr><th>Level / Class</th><th>Students</th></tr></thead>
        <tbody>${enrollmentData.map((d) => `<tr><td>${d.name}</td><td>${d.count}</td></tr>`).join("")}</tbody>
      </table>
    `);
  }

  // ── Class selector ─────────────────────────────────────────────────────────

  const classChips = (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      {/* All Classes chip */}
      <button
        onClick={() => setSelectedClassId(null)}
        className={cn(
          "flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border transition-all shrink-0",
          selectedClassId === null
            ? "bg-[#262262] border-[#262262] shadow-sm"
            : "bg-white border-[var(--border)] hover:border-[#262262]/30 hover:shadow-sm",
        )}
      >
        <div className={cn(
          "w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
          selectedClassId === null ? "bg-white/20" : "bg-[#26226210]",
        )}>
          <LayoutGrid size={13} className={selectedClassId === null ? "text-white" : "text-[#262262]"} />
        </div>
        <span className={cn(
          "text-[13px] font-semibold",
          selectedClassId === null ? "text-white" : "text-[var(--text-strong)]",
        )}>
          All Classes
        </span>
      </button>

      {classes.map((cls) => {
        const active = cls.id === selectedClassId;
        return (
          <button
            key={cls.id}
            onClick={() => setSelectedClassId(cls.id)}
            className={cn(
              "flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border transition-all shrink-0",
              active
                ? "bg-[#262262] border-[#262262] shadow-sm"
                : "bg-white border-[var(--border)] hover:border-[#262262]/30 hover:shadow-sm",
            )}
          >
            <div className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
              active ? "bg-white/20" : "bg-[#26226210]",
            )}>
              <LayoutGrid size={13} className={active ? "text-white" : "text-[#262262]"} />
            </div>
            <div className="text-left">
              <p className={cn("text-[13px] font-semibold leading-tight", active ? "text-white" : "text-[var(--text-strong)]")}>
                {cls.name}
              </p>
              {cls.level && (
                <p className={cn("text-[11px] leading-tight", active ? "text-white/70" : "text-[var(--text-muted)]")}>
                  {cls.level}
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );

  // ── Tab content ────────────────────────────────────────────────────────────

  function renderStudentList() {
    return (
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="relative max-w-xs w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <Input
              placeholder="Search students…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button variant="secondary" size="sm" onClick={printStudentList}>
            <Printer size={14} /> Print
          </Button>
        </div>
        <p className="text-[12px] text-[var(--text-muted)]">{filteredStudents.length} student{filteredStudents.length !== 1 ? "s" : ""}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Adm No</th>
                <th className="text-left py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Name</th>
                <th className="text-left py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Class</th>
                <th className="text-left py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Gender</th>
                <th className="text-left py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-[var(--text-muted)] text-sm">No students found</td>
                </tr>
              ) : (
                filteredStudents.map((s, i) => (
                  <tr key={s.id} className={i % 2 === 0 ? "" : "bg-[var(--neutral-50)]/50"}>
                    <td className="py-2.5 px-3 text-[var(--text-muted)] font-mono text-[12px]">{s.admission_number ?? "—"}</td>
                    <td className="py-2.5 px-3 font-semibold text-[var(--text-strong)]">{fullName(s)}</td>
                    <td className="py-2.5 px-3 text-[var(--text-body)]">{s.classrooms?.name ?? "—"}</td>
                    <td className="py-2.5 px-3 text-[var(--text-body)] capitalize">{s.gender ?? "—"}</td>
                    <td className="py-2.5 px-3">
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold",
                        (s.status ?? "active") === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600",
                      )}>
                        {s.status ?? "active"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderFinanceReport() {
    let totalB = 0, totalP = 0, totalBal = 0;
    const rows = filteredStudents.map((s) => {
      const w = walletMap[s.id];
      const billed  = Number(w?.total_billed  ?? 0);
      const paid    = Number(w?.total_paid    ?? 0);
      const waived  = Number(w?.total_waived  ?? 0);
      const balance = Math.max(0, billed - paid - waived);
      totalB   += billed;
      totalP   += paid;
      totalBal += balance;
      return { s, billed, paid, balance };
    });

    return (
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-[12px] text-[var(--text-muted)]">{filteredStudents.length} students</p>
          <Button variant="secondary" size="sm" onClick={printFinanceReport}>
            <Printer size={14} /> Print
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Student</th>
                <th className="text-left py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Class</th>
                <th className="text-right py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Total Billed</th>
                <th className="text-right py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Total Paid</th>
                <th className="text-right py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Balance</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-[var(--text-muted)] text-sm">No data</td></tr>
              ) : (
                rows.map(({ s, billed, paid, balance }, i) => (
                  <tr key={s.id} className={i % 2 === 0 ? "" : "bg-[var(--neutral-50)]/50"}>
                    <td className="py-2.5 px-3 font-semibold text-[var(--text-strong)]">{fullName(s)}</td>
                    <td className="py-2.5 px-3 text-[var(--text-body)]">{s.classrooms?.name ?? "—"}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-[12px]">{fmt(billed)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-[12px] text-green-700">{fmt(paid)}</td>
                    <td className={cn(
                      "py-2.5 px-3 text-right font-mono text-[12px]",
                      balance > 0 ? "text-red-600 font-semibold" : "text-[var(--text-muted)]",
                    )}>{fmt(balance)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-[#262262] bg-[#262262]/5">
                  <td colSpan={2} className="py-2.5 px-3 text-[13px] font-bold text-[#262262]">Total</td>
                  <td className="py-2.5 px-3 text-right font-bold font-mono text-[13px]">{fmt(totalB)}</td>
                  <td className="py-2.5 px-3 text-right font-bold font-mono text-[13px] text-green-700">{fmt(totalP)}</td>
                  <td className={cn("py-2.5 px-3 text-right font-bold font-mono text-[13px]", totalBal > 0 ? "text-red-600" : "")}>{fmt(totalBal)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    );
  }

  function renderAttendance() {
    return (
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-[12px] font-semibold text-[var(--text-muted)]">Term:</label>
            <select
              value={selectedTermId ?? ""}
              onChange={(e) => setSelectedTermId(e.target.value || null)}
              className="text-[13px] border border-[var(--border)] rounded-xl px-3 py-1.5 bg-white text-[var(--text-strong)] focus:outline-none focus:border-[#262262]"
            >
              <option value="">All Terms</option>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>{t.name}{t.is_current ? " (current)" : ""}</option>
              ))}
            </select>
          </div>
          <Button variant="secondary" size="sm" onClick={printAttendance}>
            <Printer size={14} /> Print
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Student</th>
                <th className="text-left py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Class</th>
                <th className="text-right py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Present</th>
                <th className="text-right py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Absent</th>
                <th className="text-right py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Late</th>
                <th className="text-right py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Rate %</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-[var(--text-muted)] text-sm">No data</td></tr>
              ) : (
                filteredStudents.map((s, i) => {
                  const a = attendanceMap[s.id] ?? { present: 0, absent: 0, late: 0 };
                  const total = a.present + a.absent + a.late;
                  const rate  = total > 0 ? Math.round((a.present / total) * 100) : 0;
                  return (
                    <tr key={s.id} className={i % 2 === 0 ? "" : "bg-[var(--neutral-50)]/50"}>
                      <td className="py-2.5 px-3 font-semibold text-[var(--text-strong)]">{fullName(s)}</td>
                      <td className="py-2.5 px-3 text-[var(--text-body)]">{s.classrooms?.name ?? "—"}</td>
                      <td className="py-2.5 px-3 text-right text-green-700 font-semibold">{a.present}</td>
                      <td className="py-2.5 px-3 text-right text-red-600 font-semibold">{a.absent}</td>
                      <td className="py-2.5 px-3 text-right text-amber-600 font-semibold">{a.late}</td>
                      <td className="py-2.5 px-3 text-right">
                        <span className={cn(
                          "inline-block px-2 py-0.5 rounded-full text-[11px] font-bold",
                          rate >= 80 ? "bg-green-100 text-green-700" : rate >= 60 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700",
                        )}>
                          {rate}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderReportCards() {
    return (
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-[12px] font-semibold text-[var(--text-muted)]">Term:</label>
            <select
              value={selectedTermId ?? ""}
              onChange={(e) => setSelectedTermId(e.target.value || null)}
              className="text-[13px] border border-[var(--border)] rounded-xl px-3 py-1.5 bg-white text-[var(--text-strong)] focus:outline-none focus:border-[#262262]"
            >
              <option value="">All Terms</option>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>{t.name}{t.is_current ? " (current)" : ""}</option>
              ))}
            </select>
          </div>
          <p className="text-[12px] text-[var(--text-muted)]">Click a student to print their report card</p>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText size={32} className="text-[var(--text-subtle)] mb-2" />
            <p className="font-semibold text-[var(--text-strong)]">No students</p>
            <p className="text-sm text-[var(--text-muted)]">Select a class or adjust filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filteredStudents.map((s) => (
              <button
                key={s.id}
                onClick={() => printReportCard(s)}
                className="group text-left bg-white border border-[var(--border)] rounded-2xl p-4 hover:border-[#262262]/40 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#262262]/8 flex items-center justify-center shrink-0 group-hover:bg-[#262262]/15 transition-colors">
                    <span className="text-[12px] font-bold text-[#262262]">
                      {s.first_name[0]}{s.last_name[0]}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-[var(--text-strong)] truncate">{fullName(s)}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">{s.classrooms?.name ?? "—"} · {s.admission_number ?? "No ID"}</p>
                  </div>
                  <Printer size={13} className="text-[var(--text-muted)] group-hover:text-[#262262] transition-colors shrink-0" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  function renderSummary() {
    const activeStudents = students.filter((s) => (s.status ?? "active") === "active").length;

    const statCards = [
      { label: "Total Students", value: students.length, color: "#262262" },
      { label: "Active Students", value: activeStudents, color: "#262262" },
      { label: "Staff Members", value: staff.length, color: "#92278F" },
      { label: "Classes", value: classes.length, color: "#92278F" },
      { label: "Attendance Rate", value: `${attendanceRate}%`, color: attendanceRate >= 80 ? "#16a34a" : "#d97706" },
      { label: "Fee Collection Rate", value: `${collectionRate}%`, color: collectionRate >= 80 ? "#16a34a" : "#d97706" },
    ];

    return (
      <div className="p-5 space-y-6">
        <div className="flex justify-end">
          <Button variant="secondary" size="sm" onClick={printSummary}>
            <Printer size={14} /> Print Summary
          </Button>
        </div>

        {/* Stat grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {statCards.map(({ label, value, color }) => (
            <div key={label} className="bg-white border border-[var(--border)] rounded-2xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1">{label}</p>
              <p className="text-[26px] font-extrabold" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Finance summary */}
        <div className="bg-white border border-[var(--border)] rounded-2xl p-5">
          <h3 className="text-[14px] font-bold text-[var(--text-strong)] mb-3">Finance Overview</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl bg-[#262262]/5 p-3">
              <p className="text-[11px] text-[var(--text-muted)] font-semibold">Total Billed</p>
              <p className="text-[18px] font-bold text-[#262262]">{fmt(totalBilled)}</p>
            </div>
            <div className="rounded-xl bg-green-50 p-3">
              <p className="text-[11px] text-[var(--text-muted)] font-semibold">Total Collected</p>
              <p className="text-[18px] font-bold text-green-700">{fmt(totalPaid)}</p>
            </div>
            <div className="rounded-xl bg-red-50 p-3">
              <p className="text-[11px] text-[var(--text-muted)] font-semibold">Outstanding</p>
              <p className="text-[18px] font-bold text-red-600">{fmt(Math.max(0, totalBilled - totalPaid))}</p>
            </div>
          </div>
        </div>

        {/* Enrollment chart */}
        {enrollmentData.length > 0 && (
          <div className="bg-white border border-[var(--border)] rounded-2xl p-5">
            <h3 className="text-[14px] font-bold text-[var(--text-strong)] mb-4">Enrollment by Level</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={enrollmentData} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }}
                    labelStyle={{ fontWeight: 700 }}
                  />
                  <Bar dataKey="count" fill="#262262" radius={[6, 6, 0, 0]} name="Students" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-10">
      {/* Header */}
      <div>
        <h2 className="text-[20px] font-extrabold text-[var(--text-strong)]">Reports</h2>
        <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
          Generate and print reports for your school.
        </p>
      </div>

      {/* Class selector */}
      {classChips}

      {/* Main card */}
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[0_1px_6px_rgba(0,0,0,0.05)]">
        {/* Tab bar */}
        <div className="flex overflow-x-auto border-b border-[var(--border)] px-5 pt-1 scrollbar-hide">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-3 text-[13px] font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap shrink-0",
                  activeTab === tab.id
                    ? "border-[#262262] text-[#262262]"
                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-strong)]",
                )}
              >
                <Icon size={13} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {activeTab === "students"    && renderStudentList()}
        {activeTab === "finance"     && renderFinanceReport()}
        {activeTab === "attendance"  && renderAttendance()}
        {activeTab === "reportcards" && renderReportCards()}
        {activeTab === "summary"     && renderSummary()}
      </div>
    </div>
  );
}
