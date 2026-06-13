import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { UserPlus, Search } from "lucide-react";
import { formatDate, getInitials } from "@/lib/utils";
import type { Student } from "@/types/database";

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "default" | "brand"> = {
  active: "success", inactive: "default", graduated: "brand",
  transferred: "warning", withdrawn: "danger",
};

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; class?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from("profiles").select("school_id").eq("id", user!.id).single();
  const schoolId = profile?.school_id;

  const [classesRes] = await Promise.all([
    schoolId
      ? supabase.from("classrooms").select("id, name, level").eq("school_id", schoolId).order("level").order("name")
      : Promise.resolve({ data: [] }),
  ]);
  const classes = classesRes.data ?? [];

  let query = supabase
    .from("students")
    .select("*, classrooms(name)")
    .eq("school_id", schoolId)
    .order("last_name");

  if (params.q) {
    query = query.or(`first_name.ilike.%${params.q}%,last_name.ilike.%${params.q}%,admission_number.ilike.%${params.q}%`);
  }
  if (params.status) query = query.eq("status", params.status);
  if (params.class) query = query.eq("class_id", params.class);

  const { data: students } = await query;
  const total = students?.length ?? 0;

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-strong)]">Students</h2>
          <p className="text-sm text-[var(--text-muted)]">{total} student{total !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/students/new">
          <Button><UserPlus size={15} /> Admit student</Button>
        </Link>
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]" />
          <input
            name="q"
            defaultValue={params.q}
            placeholder="Search name or admission number…"
            className="w-full h-10 pl-9 pr-3 rounded-[10px] border border-[var(--border)] bg-white text-sm outline-none focus:border-[var(--ring)] focus:shadow-[var(--shadow-focus)]"
          />
        </div>
        <select
          name="status"
          defaultValue={params.status ?? ""}
          className="h-10 rounded-[10px] border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-body)] outline-none focus:border-[var(--ring)]"
        >
          <option value="">All statuses</option>
          {["active","inactive","graduated","transferred","withdrawn"].map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <select
          name="class"
          defaultValue={params.class ?? ""}
          className="h-10 rounded-[10px] border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-body)] outline-none focus:border-[var(--ring)]"
        >
          <option value="">All classes</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <Button type="submit" variant="secondary">Filter</Button>
        {(params.q || params.status || params.class) && (
          <Link href="/students"><Button type="button" variant="ghost">Clear</Button></Link>
        )}
      </form>

      {/* Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                {["Student", "Admission no.", "Class", "Gender", "Admitted", "Status"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {(students ?? []).map((s: Student & { classrooms: { name: string } | null }) => (
                <tr key={s.id} className="hover:bg-[var(--neutral-50)] transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/students/${s.id}`} className="flex items-center gap-2.5 hover:text-[var(--brand)]">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: "var(--gradient-brand)" }}>
                        {getInitials(`${s.first_name} ${s.last_name}`)}
                      </div>
                      <span className="font-semibold text-[var(--text-strong)]">
                        {s.first_name}{s.middle_name ? ` ${s.middle_name[0]}.` : ""} {s.last_name}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)]">{s.admission_number}</td>
                  <td className="px-4 py-3 text-[var(--text-body)]">{s.classrooms?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-[var(--text-body)] capitalize">{s.gender}</td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">{formatDate(s.admission_date)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[s.status] ?? "default"}>{s.status}</Badge>
                  </td>
                </tr>
              ))}
              {(!students || students.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-4 py-14 text-center">
                    <p className="text-sm text-[var(--text-muted)] mb-3">No students found.</p>
                    <Link href="/students/new">
                      <Button size="sm"><UserPlus size={13} /> Admit first student</Button>
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
