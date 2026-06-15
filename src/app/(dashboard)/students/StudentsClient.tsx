"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AdmitStudentModal } from "@/components/students/AdmitStudentModal";
import { UserPlus, Search, Phone, Mail, MessageSquare, X, MapPin, ChevronRight, SlidersHorizontal, Upload, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDate, getInitials } from "@/lib/utils";

const LEVEL_COLORS: Record<string, { bg: string; text: string }> = {
  daycare:  { bg: "#fce7f3", text: "#be185d" },
  nursery:  { bg: "#d1fae5", text: "#065f46" },
  kg:       { bg: "#fef3c7", text: "#92400e" },
  primary:  { bg: "#ede9fe", text: "#5b21b6" },
  jhs:      { bg: "#dbeafe", text: "#1e40af" },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StudentRow = Record<string, any> & {
  id: string; first_name: string; middle_name: string | null; last_name: string;
  admission_number: string; date_of_birth: string | null; gender: string | null;
  status: string; admission_date: string | null; class_id: string | null;
  photo_url?: string | null;
  classrooms: { name: string; level: string } | null;
};

interface ClassRoom { id: string; name: string; level: string }

interface StudentStats {
  total: number;
  active: number;
  male: number;
  female: number;
  newThisMonth: number;
  presentToday: number;
  absentToday: number;
  outstandingFees: number;
}

interface Props {
  students: StudentRow[];
  classes: ClassRoom[];
  schoolId: string;
  filters: { q?: string; status?: string; class?: string; view?: string };
  role: string;
  stats: StudentStats;
}

function calcAge(dob: string | null) {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

export function StudentsClient({ students, classes, schoolId, filters, role, stats }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [admitOpen, setAdmitOpen] = useState(false);
  const [selected, setSelected] = useState<StudentRow | null>(null);
  const [search, setSearch] = useState(filters.q ?? "");
  const [csvUploading, setCsvUploading] = useState(false);
  const canAdmit = ["headmaster", "owner", "teacher", "admin"].includes(role);

  function exportCSV() {
    const headers = ["Admission No", "First Name", "Middle Name", "Last Name", "Class", "Gender", "Date of Birth", "Status", "Admission Date"];
    const rows = students.map((s) => [
      s.admission_number, s.first_name, s.middle_name ?? "", s.last_name,
      s.classrooms?.name ?? "", s.gender ?? "", s.date_of_birth ?? "", s.status, s.admission_date ?? "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "students.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvUploading(true);
    const text = await file.text();
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",").map((h) => h.replace(/"/g, "").trim().toLowerCase());
    const rows = lines.slice(1).map((line) => {
      const vals = line.split(",").map((v) => v.replace(/"/g, "").trim());
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const obj: Record<string, any> = {};
      headers.forEach((h, i) => { obj[h] = vals[i] ?? ""; });
      return obj;
    });

    const classMap: Record<string, string> = {};
    classes.forEach((c) => { classMap[c.name.toLowerCase()] = c.id; });

    const insertRows = rows
      .filter((r) => r["first name"] || r["first_name"])
      .map((r) => ({
        school_id: schoolId,
        first_name: (r["first name"] || r["first_name"] || "").trim(),
        middle_name: (r["middle name"] || r["middle_name"] || null) || null,
        last_name: (r["last name"] || r["last_name"] || "").trim(),
        admission_number: r["admission no"] || r["admission_number"] || r["admission number"] || `ADM-${Date.now()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`,
        gender: r["gender"] || null,
        date_of_birth: r["date of birth"] || r["date_of_birth"] || null,
        status: r["status"] || "active",
        admission_date: r["admission date"] || r["admission_date"] || new Date().toISOString().split("T")[0],
        class_id: classMap[(r["class"] || "").toLowerCase()] || null,
      }));

    if (insertRows.length) {
      await supabase.from("students").insert(insertRows);
    }
    setCsvUploading(false);
    e.target.value = "";
    router.refresh();
  }

  const filtered = students.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.first_name.toLowerCase().includes(q) || s.last_name.toLowerCase().includes(q) || s.admission_number?.toLowerCase().includes(q);
  });

  const classmates = selected
    ? students.filter((s) => s.class_id === selected.class_id && s.id !== selected.id).slice(0, 6)
    : [];

  const STAT_CARDS = [
    { label: "Total Students", value: stats.total, sub: `${stats.active} active`, color: "#262262", bg: "#EEF2FF" },
    { label: "New This Month", value: stats.newThisMonth, sub: "fresh admissions", color: "#7c3aed", bg: "#ede9fe" },
    { label: "Male", value: stats.male, sub: `${stats.female} female`, color: "#0369a1", bg: "#e0f2fe" },
    { label: "Present Today", value: stats.presentToday, sub: `${stats.absentToday} absent`, color: "#059669", bg: "#d1fae5" },
    { label: "Outstanding Fees", value: stats.outstandingFees, sub: "students with balance", color: "#b45309", bg: "#fef3c7" },
  ];

  return (
    <div className="space-y-5">
      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {STAT_CARDS.map((c) => (
          <div key={c.label} className="bg-white rounded-2xl border border-[var(--border)] p-4 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)] mb-1">{c.label}</p>
            <p className="text-[26px] font-extrabold" style={{ color: c.color }}>{c.value}</p>
            <p className="text-[11px] text-[var(--text-subtle)] mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-strong)]">Students Database</h2>
          <p className="text-[13px] text-[var(--text-muted)]">{students.length} students enrolled</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border)] bg-white text-[13px] font-semibold text-[var(--text-muted)] hover:bg-[var(--neutral-50)]">
            <SlidersHorizontal size={14} /> Filter
          </button>
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border)] bg-white text-[13px] font-semibold text-[var(--text-muted)] hover:bg-[var(--neutral-50)]">
            <Download size={14} /> Export
          </button>
          {canAdmit && (
            <>
              <label className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border)] bg-white text-[13px] font-semibold text-[var(--text-muted)] hover:bg-[var(--neutral-50)] cursor-pointer ${csvUploading ? "opacity-50 pointer-events-none" : ""}`}>
                <Upload size={14} /> {csvUploading ? "Importing…" : "Bulk Upload"}
                <input type="file" accept=".csv" className="hidden" onChange={handleCSVUpload} />
              </label>
              <button onClick={() => setAdmitOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold text-white hover:opacity-90 shadow-sm"
                style={{ background: "linear-gradient(135deg, #262262, #92278F)" }}>
                <UserPlus size={14} /> + Add
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs + search */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-[var(--neutral-100)] rounded-xl p-1">
          <button className="px-4 py-1.5 rounded-lg text-[13px] font-semibold bg-white text-[#262262] shadow-sm">Students</button>
          <Link href="/staff" className="px-4 py-1.5 rounded-lg text-[13px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-strong)]">Staff</Link>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search here…"
            className="h-9 pl-9 pr-4 w-52 rounded-xl border border-[var(--border)] bg-white text-[13px] outline-none focus:border-[var(--ring)]" />
        </div>
      </div>

      {/* Split layout */}
      <div className={`flex gap-4 items-start transition-all`}>
        {/* Table */}
        <div className={`min-w-0 bg-white rounded-2xl border border-[var(--border)] shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden transition-all ${selected ? "flex-[2]" : "flex-1"}`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--neutral-50)]">
                  <th className="w-10 px-4 py-3"><input type="checkbox" className="rounded accent-[#262262]" /></th>
                  {["Name", "ID", "Class", "Age", "Gender", "Contact"].map((h) => (
                    <th key={h} className="text-left px-3 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map((s) => {
                  const level = s.classrooms?.level ?? "primary";
                  const cls = LEVEL_COLORS[level] ?? LEVEL_COLORS.primary;
                  const age = calcAge(s.date_of_birth);
                  const isActive = selected?.id === s.id;
                  return (
                    <tr key={s.id} onClick={() => router.push(`/students/${s.id}`)}
                      className={`transition-colors cursor-pointer group ${isActive ? "bg-[#ede9fe]" : "hover:bg-[var(--neutral-50)]"}`}>
                      <td className="px-4 py-3"><input type="checkbox" checked={isActive} readOnly className="rounded accent-[#262262]" onClick={(e) => e.stopPropagation()} /></td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          {s.photo_url ? (
                            <img src={s.photo_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                              style={{ background: "linear-gradient(135deg, #262262, #92278F)" }}>
                              {getInitials(`${s.first_name} ${s.last_name}`)}
                            </div>
                          )}
                          <span className="text-[13px] font-semibold text-[var(--text-strong)] whitespace-nowrap">
                            {s.first_name} {s.last_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 font-mono text-[12px] text-[var(--text-muted)] whitespace-nowrap">{s.admission_number}</td>
                      <td className="px-3 py-3">
                        {s.classrooms ? (
                          <span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold whitespace-nowrap" style={{ background: cls.bg, color: cls.text }}>
                            {s.classrooms.name}
                          </span>
                        ) : <span className="text-[var(--text-subtle)]">—</span>}
                      </td>
                      <td className="px-3 py-3 text-[13px] text-[var(--text-body)]">{age ?? "—"}</td>
                      <td className="px-3 py-3 text-[13px] text-[var(--text-body)] capitalize">{s.gender ?? "—"}</td>
                      <td className="px-3 py-3">
                        <div className="flex gap-1">
                          <span className="w-6 h-6 rounded-lg bg-[#ede9fe] flex items-center justify-center"><Phone size={11} className="text-[#5b21b6]" /></span>
                          <span className="w-6 h-6 rounded-lg bg-[#dbeafe] flex items-center justify-center"><MessageSquare size={11} className="text-[#1e40af]" /></span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-14 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: "#ede9fe" }}>
                        <UserPlus size={20} className="text-[#5b21b6]" />
                      </div>
                      <p className="text-[14px] font-semibold text-[var(--text-strong)]">No students found</p>
                    </div>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Profile Panel */}
        {selected && (
          <div className="w-72 shrink-0 bg-white rounded-2xl border border-[var(--border)] shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden sticky top-4">
            {/* Close + link */}
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <Link href={`/students/${selected.id}`} className="text-[11px] font-semibold text-[#262262] flex items-center gap-0.5 hover:underline">
                Full profile <ChevronRight size={11} />
              </Link>
              <button onClick={() => setSelected(null)} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-[var(--neutral-100)] text-[var(--text-muted)]">
                <X size={14} />
              </button>
            </div>

            {/* Photo */}
            <div className="flex flex-col items-center px-4 pb-4 pt-2">
              {selected.photo_url ? (
                <img src={selected.photo_url} alt="" className="w-20 h-20 rounded-full object-cover shadow-md" />
              ) : (
                <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-md"
                  style={{ background: "linear-gradient(135deg, #262262, #92278F)" }}>
                  {getInitials(`${selected.first_name} ${selected.last_name}`)}
                </div>
              )}
              <h3 className="text-[15px] font-bold text-[var(--text-strong)] mt-3 text-center">
                {selected.first_name} {selected.middle_name ? `${selected.middle_name} ` : ""}{selected.last_name}
              </h3>
              {selected.classrooms && (() => {
                const cls = LEVEL_COLORS[selected.classrooms.level] ?? LEVEL_COLORS.primary;
                return <span className="mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: cls.bg, color: cls.text }}>{selected.classrooms.name}</span>;
              })()}
              {/* Contact icons */}
              <div className="flex gap-2 mt-3">
                <button className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#ede9fe" }}><Phone size={13} className="text-[#5b21b6]" /></button>
                <button className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#dbeafe" }}><Mail size={13} className="text-[#1e40af]" /></button>
                <button className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#d1fae5" }}><MessageSquare size={13} className="text-[#065f46]" /></button>
              </div>
            </div>

            {/* About */}
            <div className="border-t border-[var(--border)] px-4 py-3">
              <p className="text-[12px] font-bold text-[var(--text-strong)] mb-2">About</p>
              <p className="text-[12px] text-[var(--text-muted)] leading-relaxed">
                {selected.first_name} is a {calcAge(selected.date_of_birth) ?? ""}-year-old {selected.gender ?? "student"} admitted as a {selected.student_type ?? "new"} student.
                {selected.nationality ? ` Nationality: ${selected.nationality}.` : ""}
                {selected.religion ? ` Religion: ${selected.religion}.` : ""}
                {selected.medical_notes ? ` Medical notes: ${selected.medical_notes}` : ""}
              </p>
            </div>

            {/* Details grid */}
            <div className="border-t border-[var(--border)] px-4 py-3">
              <div className="grid grid-cols-2 gap-3 text-[12px]">
                <div><p className="text-[var(--text-muted)]">Age</p><p className="font-bold text-[var(--text-strong)]">{calcAge(selected.date_of_birth) ?? "—"} yrs</p></div>
                <div><p className="text-[var(--text-muted)]">Gender</p><p className="font-bold text-[var(--text-strong)] capitalize">{selected.gender ?? "—"}</p></div>
                <div><p className="text-[var(--text-muted)]">Date of Birth</p><p className="font-bold text-[var(--text-strong)]">{selected.date_of_birth ? formatDate(selected.date_of_birth) : "—"}</p></div>
                <div><p className="text-[var(--text-muted)]">Blood Group</p><p className="font-bold text-[var(--text-strong)]">{selected.blood_group ?? "—"}</p></div>
                <div><p className="text-[var(--text-muted)]">NHIS No.</p><p className="font-bold text-[var(--text-strong)]">{selected.nhis_number ?? "—"}</p></div>
                <div><p className="text-[var(--text-muted)]">Status</p><p className="font-bold text-[var(--text-strong)] capitalize">{selected.status}</p></div>
              </div>
              {selected.residential_address && (
                <div className="mt-3 flex gap-1.5 text-[12px] text-[var(--text-muted)]">
                  <MapPin size={12} className="shrink-0 mt-0.5 text-[#92278F]" />
                  <span>{selected.residential_address}</span>
                </div>
              )}
            </div>

            {/* Students from same class */}
            {classmates.length > 0 && (
              <div className="border-t border-[var(--border)] px-4 py-3">
                <p className="text-[12px] font-bold text-[var(--text-strong)] mb-2">Students from same class</p>
                <div className="flex flex-wrap gap-2">
                  {classmates.map((c) => (
                    <button key={c.id} onClick={() => setSelected(c)} title={`${c.first_name} ${c.last_name}`}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-bold text-white hover:scale-110 transition-transform"
                      style={{ background: "linear-gradient(135deg, #262262, #92278F)" }}>
                      {getInitials(`${c.first_name} ${c.last_name}`)}
                    </button>
                  ))}
                </div>
                <button className="text-[11px] font-semibold text-[#262262] mt-2 hover:underline">See More →</button>
              </div>
            )}
          </div>
        )}
      </div>

      <AdmitStudentModal open={admitOpen} onClose={() => setAdmitOpen(false)} schoolId={schoolId} />
    </div>
  );
}
