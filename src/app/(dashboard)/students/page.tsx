import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { UserPlus, Search } from "lucide-react";
import { formatDate, getInitials } from "@/lib/utils";
import type { Student } from "@/types/database";

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

  let query = supabase
    .from("students")
    .select("*, classrooms(name)")
    .eq("school_id", schoolId)
    .order("last_name");

  if (params.q) {
    query = query.or(
      `first_name.ilike.%${params.q}%,last_name.ilike.%${params.q}%,admission_number.ilike.%${params.q}%`,
    );
  }
  if (params.status) query = query.eq("status", params.status);
  if (params.class) query = query.eq("class_id", params.class);

  const { data: students } = await query;

  const statusVariant: Record<string, "success" | "warning" | "danger" | "default"> = {
    active: "success",
    inactive: "default",
    graduated: "brand" as never,
    transferred: "warning",
    withdrawn: "danger",
  };

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-strong)]">Students</h2>
          <p className="text-sm text-[var(--text-muted)]">{students?.length ?? 0} students</p>
        </div>
        <Link href="/students/new">
          <Button>
            <UserPlus size={15} />
            Admit student
          </Button>
        </Link>
      </div>

      {/* Search */}
      <form method="GET" className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]" />
          <input
            name="q"
            defaultValue={params.q}
            placeholder="Search by name or admission number…"
            className="w-full h-10 pl-9 pr-3 rounded-[10px] border border-[var(--border)] bg-white text-sm outline-none focus:border-[var(--ring)] focus:shadow-[var(--shadow-focus)]"
          />
        </div>
        <Button type="submit" variant="secondary" size="md">Search</Button>
      </form>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                {["Student", "Admission no.", "Class", "Gender", "Admitted", "Status"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    {h}
                  </th>
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
                        {s.first_name} {s.middle_name ? `${s.middle_name[0]}. ` : ""}{s.last_name}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)]">{s.admission_number}</td>
                  <td className="px-4 py-3 text-[var(--text-body)]">{s.classrooms?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-[var(--text-body)] capitalize">{s.gender}</td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">{formatDate(s.admission_date)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant[s.status] ?? "default"}>{s.status}</Badge>
                  </td>
                </tr>
              ))}
              {(!students || students.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-[var(--text-muted)]">
                    No students found. <Link href="/students/new" className="text-[var(--brand)] font-semibold">Admit the first student</Link>
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
