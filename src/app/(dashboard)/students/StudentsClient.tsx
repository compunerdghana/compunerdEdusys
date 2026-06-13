"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AdmitStudentModal } from "@/components/students/AdmitStudentModal";
import { UserPlus, Search, X } from "lucide-react";
import { formatDate, getInitials } from "@/lib/utils";
import type { Student } from "@/types/database";

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "default" | "brand"> = {
  active: "success", inactive: "default", graduated: "brand",
  transferred: "warning", withdrawn: "danger",
};

interface ClassRoom { id: string; name: string; level: string; }
interface Props {
  students: (Student & { classrooms: { name: string } | null })[];
  classes: ClassRoom[];
  schoolId: string;
  filters: { q?: string; status?: string; class?: string };
  role: string;
}

export function StudentsClient({ students, classes, schoolId, filters, role }: Props) {
  const router = useRouter();
  const [admitOpen, setAdmitOpen] = useState(false);
  const canAdmit = ["headmaster", "owner", "teacher"].includes(role);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[var(--text-strong)]">Students</h2>
          <p className="text-[15px] text-[var(--text-muted)] mt-0.5">{students.length} student{students.length !== 1 ? "s" : ""}</p>
        </div>
        {canAdmit && (
          <Button size="md" onClick={() => setAdmitOpen(true)}>
            <UserPlus size={16} /> Admit student
          </Button>
        )}
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]" />
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="Search name or admission no…"
            className="w-full h-11 pl-10 pr-3 rounded-[10px] border border-[var(--border)] bg-white text-[15px] outline-none focus:border-[var(--ring)] focus:shadow-[var(--shadow-focus)]"
          />
        </div>
        <select name="status" defaultValue={filters.status ?? ""} className="h-11 rounded-[10px] border border-[var(--border)] bg-white px-3.5 text-[15px] text-[var(--text-body)] outline-none focus:border-[var(--ring)]">
          <option value="">All statuses</option>
          {["active","inactive","graduated","transferred","withdrawn"].map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <select name="class" defaultValue={filters.class ?? ""} className="h-11 rounded-[10px] border border-[var(--border)] bg-white px-3.5 text-[15px] text-[var(--text-body)] outline-none focus:border-[var(--ring)]">
          <option value="">All classes</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <Button type="submit" variant="secondary">Filter</Button>
        {(filters.q || filters.status || filters.class) && (
          <Button type="button" variant="ghost" onClick={() => router.push("/students")}>
            <X size={14} /> Clear
          </Button>
        )}
      </form>

      {/* Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)]">
                {["Student", "Admission no.", "Class", "Gender", "Admitted", "Status"].map((h) => (
                  <th key={h} className="text-left px-5 py-4 text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-[var(--neutral-50)] transition-colors group">
                  <td className="px-5 py-4">
                    <Link href={`/students/${s.id}`} className="flex items-center gap-3 hover:text-[var(--brand)]">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: "var(--gradient-brand)" }}>
                        {getInitials(`${s.first_name} ${s.last_name}`)}
                      </div>
                      <span className="text-[15px] font-semibold text-[var(--text-strong)] group-hover:text-[var(--brand)] transition-colors">
                        {s.first_name}{s.middle_name ? ` ${s.middle_name[0]}.` : ""} {s.last_name}
                      </span>
                    </Link>
                  </td>
                  <td className="px-5 py-4 font-mono text-sm text-[var(--text-muted)]">{s.admission_number}</td>
                  <td className="px-5 py-4 text-[15px] text-[var(--text-body)]">{s.classrooms?.name ?? "—"}</td>
                  <td className="px-5 py-4 text-[15px] text-[var(--text-body)] capitalize">{s.gender}</td>
                  <td className="px-5 py-4 text-[15px] text-[var(--text-muted)]">{formatDate(s.admission_date)}</td>
                  <td className="px-5 py-4">
                    <Badge variant={STATUS_VARIANT[s.status] ?? "default"}>{s.status}</Badge>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-[var(--brand-subtle)] flex items-center justify-center">
                        <UserPlus size={24} className="text-[var(--brand)]" />
                      </div>
                      <div>
                        <p className="text-[15px] font-semibold text-[var(--text-strong)]">No students yet</p>
                        <p className="text-sm text-[var(--text-muted)] mt-1">Admit your first student to get started.</p>
                      </div>
                      {canAdmit && (
                        <Button onClick={() => setAdmitOpen(true)}>
                          <UserPlus size={15} /> Admit first student
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal */}
      <AdmitStudentModal
        open={admitOpen}
        onClose={() => setAdmitOpen(false)}
        schoolId={schoolId}
      />
    </div>
  );
}
