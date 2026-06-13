"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdmitStudentModal } from "@/components/students/AdmitStudentModal";
import { UserPlus, Search, Phone, Mail, X, MapPin, Droplets, Book, Calendar, User } from "lucide-react";
import { formatDate, getInitials } from "@/lib/utils";
import type { Student } from "@/types/database";

const LEVEL_COLORS: Record<string, { bg: string; text: string }> = {
  daycare:  { bg: "#fce7f3", text: "#be185d" },
  nursery:  { bg: "#d1fae5", text: "#065f46" },
  kg:       { bg: "#fef3c7", text: "#92400e" },
  primary:  { bg: "#ede9fe", text: "#5b21b6" },
  jhs:      { bg: "#dbeafe", text: "#1e40af" },
};

interface ClassRoom { id: string; name: string; level: string }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface StudentRow extends Record<string, any> { id: string; first_name: string; middle_name: string | null; last_name: string; admission_number: string; date_of_birth: string | null; gender: string | null; status: string; admission_date: string | null; classrooms: { name: string; level: string } | null }

interface Props {
  students: StudentRow[];
  classes: ClassRoom[];
  schoolId: string;
  filters: { q?: string; status?: string; class?: string };
  role: string;
}

function calcAge(dob: string | null) {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

export function StudentsClient({ students, classes, schoolId, filters, role }: Props) {
  const router = useRouter();
  const [admitOpen, setAdmitOpen] = useState(false);
  const [selected, setSelected] = useState<StudentRow | null>(null);
  const [search, setSearch] = useState(filters.q ?? "");
  const canAdmit = ["headmaster", "owner", "teacher"].includes(role);

  const filtered = students.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.first_name.toLowerCase().includes(q) ||
      s.last_name.toLowerCase().includes(q) ||
      s.admission_number?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-strong)]">Students Database</h2>
          <p className="text-[13px] text-[var(--text-muted)]">{students.length} students enrolled</p>
        </div>
        <div className="flex items-center gap-2">
          {canAdmit && (
            <button onClick={() => setAdmitOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[14px] font-semibold text-white transition-all hover:opacity-90 shadow-sm"
              style={{ background: "linear-gradient(135deg, #262262, #92278F)" }}>
              <UserPlus size={15} /> + Add
            </button>
          )}
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or admission no…"
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-[var(--border)] bg-white text-[14px] outline-none focus:border-[var(--ring)]"
          />
        </div>
        <select defaultValue={filters.class ?? ""} onChange={(e) => router.push(e.target.value ? `/students?class=${e.target.value}` : "/students")}
          className="h-10 rounded-xl border border-[var(--border)] bg-white px-3 text-[14px] outline-none focus:border-[var(--ring)]">
          <option value="">All classes</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select defaultValue={filters.status ?? ""} onChange={(e) => router.push(e.target.value ? `/students?status=${e.target.value}` : "/students")}
          className="h-10 rounded-xl border border-[var(--border)] bg-white px-3 text-[14px] outline-none focus:border-[var(--ring)]">
          <option value="">All statuses</option>
          {["active","inactive","graduated","transferred","withdrawn"].map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--neutral-50)]">
                {["Name", "ID", "Class", "Age", "Gender", "Contact"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filtered.map((s) => {
                const level = s.classrooms?.level ?? "primary";
                const cls = LEVEL_COLORS[level] ?? LEVEL_COLORS.primary;
                const age = calcAge(s.date_of_birth);
                return (
                  <tr key={s.id}
                    onClick={() => setSelected(s)}
                    className="hover:bg-[var(--neutral-50)] transition-colors cursor-pointer group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                          style={{ background: "linear-gradient(135deg, #262262, #92278F)" }}>
                          {getInitials(`${s.first_name} ${s.last_name}`)}
                        </div>
                        <span className="text-[14px] font-semibold text-[var(--text-strong)] group-hover:text-[#262262]">
                          {s.first_name} {s.last_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[13px] text-[var(--text-muted)]">{s.admission_number}</td>
                    <td className="px-4 py-3">
                      {s.classrooms ? (
                        <span className="px-2.5 py-1 rounded-lg text-[12px] font-semibold" style={{ background: cls.bg, color: cls.text }}>
                          {s.classrooms.name}
                        </span>
                      ) : <span className="text-[var(--text-subtle)]">—</span>}
                    </td>
                    <td className="px-4 py-3 text-[14px] text-[var(--text-body)]">{age ?? "—"}</td>
                    <td className="px-4 py-3 text-[14px] text-[var(--text-body)] capitalize">{s.gender}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <span className="w-7 h-7 rounded-lg bg-[#ede9fe] flex items-center justify-center" title="Phone">
                          <Phone size={12} className="text-[#5b21b6]" />
                        </span>
                        <span className="w-7 h-7 rounded-lg bg-[#dbeafe] flex items-center justify-center" title="Mail">
                          <Mail size={12} className="text-[#1e40af]" />
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "#ede9fe" }}>
                        <UserPlus size={22} className="text-[#5b21b6]" />
                      </div>
                      <p className="text-[14px] font-semibold text-[var(--text-strong)]">No students found</p>
                      <p className="text-[13px] text-[var(--text-muted)]">
                        {search ? "Try a different search term." : "Admit your first student to get started."}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Profile Modal — centered */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Close */}
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <p className="text-[13px] font-semibold text-[var(--text-muted)]">Student Profile</p>
              <button onClick={() => setSelected(null)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[var(--neutral-100)] text-[var(--text-muted)]">
                <X size={16} />
              </button>
            </div>

            {/* Avatar + name */}
            <div className="flex flex-col items-center px-5 pb-4 pt-2">
              <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white mb-3"
                style={{ background: "linear-gradient(135deg, #262262, #92278F)" }}>
                {getInitials(`${selected.first_name} ${selected.last_name}`)}
              </div>
              <h3 className="text-[17px] font-bold text-[var(--text-strong)]">{selected.first_name} {selected.middle_name ? `${selected.middle_name} ` : ""}{selected.last_name}</h3>
              <p className="text-[13px] text-[var(--text-muted)] mt-0.5">{selected.admission_number}</p>
              {selected.classrooms && (
                <span className="mt-2 px-3 py-1 rounded-full text-[12px] font-semibold"
                  style={{ background: LEVEL_COLORS[selected.classrooms.level]?.bg ?? "#ede9fe", color: LEVEL_COLORS[selected.classrooms.level]?.text ?? "#5b21b6" }}>
                  {selected.classrooms.name}
                </span>
              )}
            </div>

            {/* About / details */}
            <div className="border-t border-[var(--border)] px-5 py-4 space-y-4">
              <p className="text-[13px] font-bold text-[var(--text-strong)]">About</p>
              <div className="grid grid-cols-2 gap-3 text-[13px]">
                <div>
                  <p className="text-[var(--text-muted)] mb-0.5">Age</p>
                  <p className="font-semibold text-[var(--text-strong)]">{calcAge(selected.date_of_birth) ?? "—"} yrs</p>
                </div>
                <div>
                  <p className="text-[var(--text-muted)] mb-0.5">Gender</p>
                  <p className="font-semibold text-[var(--text-strong)] capitalize">{selected.gender ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[var(--text-muted)] mb-0.5">Date of Birth</p>
                  <p className="font-semibold text-[var(--text-strong)]">{selected.date_of_birth ? formatDate(selected.date_of_birth) : "—"}</p>
                </div>
                <div>
                  <p className="text-[var(--text-muted)] mb-0.5">Nationality</p>
                  <p className="font-semibold text-[var(--text-strong)]">{selected.nationality ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[var(--text-muted)] mb-0.5">Religion</p>
                  <p className="font-semibold text-[var(--text-strong)]">{(selected as any).religion ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[var(--text-muted)] mb-0.5">Blood Group</p>
                  <p className="font-semibold text-[var(--text-strong)]">{(selected as any).blood_group ?? "—"}</p>
                </div>
              </div>

              {selected.residential_address && (
                <div className="flex gap-2 text-[13px] text-[var(--text-muted)]">
                  <MapPin size={14} className="shrink-0 mt-0.5 text-[#92278F]" />
                  <span>{selected.residential_address}</span>
                </div>
              )}

              {(selected as any).nhis_number && (
                <div className="flex gap-2 text-[13px]">
                  <span className="text-[var(--text-muted)]">NHIS:</span>
                  <span className="font-mono font-semibold text-[var(--text-strong)]">{(selected as any).nhis_number}</span>
                </div>
              )}
            </div>

            {/* Admission info */}
            <div className="border-t border-[var(--border)] px-5 py-4">
              <p className="text-[13px] font-bold text-[var(--text-strong)] mb-3">Admission</p>
              <div className="grid grid-cols-2 gap-3 text-[13px]">
                <div>
                  <p className="text-[var(--text-muted)] mb-0.5">Type</p>
                  <p className="font-semibold text-[var(--text-strong)] capitalize">{selected.student_type ?? "New"}</p>
                </div>
                <div>
                  <p className="text-[var(--text-muted)] mb-0.5">Admitted</p>
                  <p className="font-semibold text-[var(--text-strong)]">{selected.admission_date ? formatDate(selected.admission_date) : "—"}</p>
                </div>
                <div>
                  <p className="text-[var(--text-muted)] mb-0.5">Status</p>
                  <p className="font-semibold text-[var(--text-strong)] capitalize">{selected.status}</p>
                </div>
              </div>
            </div>

            {/* View full profile link */}
            <div className="border-t border-[var(--border)] px-5 py-3">
              <a href={`/students/${selected.id}`}
                className="text-[13px] font-semibold text-[#262262] hover:underline">
                View full profile →
              </a>
            </div>
          </div>
        </div>
      )}

      <AdmitStudentModal open={admitOpen} onClose={() => setAdmitOpen(false)} schoolId={schoolId} />
    </div>
  );
}
