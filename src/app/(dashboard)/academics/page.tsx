import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import Link from "next/link";
import { BookOpen, Users, Hash } from "lucide-react";

export default async function AcademicsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("school_id").eq("id", user!.id).single();
  const schoolId = profile?.school_id;

  const [classesRes, subjectsRes, yearRes] = await Promise.all([
    supabase.from("classrooms").select("id, name, arm, level").eq("school_id", schoolId).order("name"),
    supabase.from("subjects").select("id, name, code").eq("school_id", schoolId).order("name"),
    supabase.from("academic_years").select("id, name, is_current").eq("school_id", schoolId).order("start_date", { ascending: false }).limit(3),
  ]);

  const classes = classesRes.data ?? [];
  const subjects = subjectsRes.data ?? [];
  const years = yearRes.data ?? [];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-xl font-bold text-[var(--text-strong)]">Academics</h2>
        <p className="text-sm text-[var(--text-muted)]">Classes, subjects, and academic years</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Academic years */}
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Hash size={16} className="text-[var(--brand)]" />
            <h3 className="text-sm font-semibold text-[var(--text-strong)]">Academic years</h3>
          </div>
          <div className="space-y-2">
            {years.map((y: { id: string; name: string; is_current: boolean }) => (
              <div key={y.id} className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-body)]">{y.name}</span>
                {y.is_current && <span className="text-[11px] font-semibold text-[var(--brand)] bg-[var(--brand-subtle)] px-2 py-0.5 rounded-full">Current</span>}
              </div>
            ))}
            {years.length === 0 && <p className="text-sm text-[var(--text-muted)]">No academic years set up.</p>}
          </div>
        </Card>

        {/* Classes */}
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} className="text-[var(--brand)]" />
            <h3 className="text-sm font-semibold text-[var(--text-strong)]">Classes ({classes.length})</h3>
          </div>
          <div className="space-y-1.5">
            {classes.slice(0, 8).map((c: { id: string; name: string; arm: string | null; level: string }) => (
              <div key={c.id} className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-body)]">{c.name}{c.arm ? ` (${c.arm})` : ""}</span>
                <span className="text-[11px] text-[var(--text-muted)] uppercase">{c.level}</span>
              </div>
            ))}
            {classes.length === 0 && <p className="text-sm text-[var(--text-muted)]">No classes configured.</p>}
          </div>
        </Card>

        {/* Subjects */}
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={16} className="text-[var(--brand)]" />
            <h3 className="text-sm font-semibold text-[var(--text-strong)]">Subjects ({subjects.length})</h3>
          </div>
          <div className="space-y-1.5">
            {subjects.slice(0, 10).map((s: { id: string; name: string; code: string | null }) => (
              <div key={s.id} className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-body)]">{s.name}</span>
                {s.code && <span className="text-[11px] font-mono text-[var(--text-muted)]">{s.code}</span>}
              </div>
            ))}
            {subjects.length === 0 && <p className="text-sm text-[var(--text-muted)]">No subjects configured.</p>}
          </div>
        </Card>
      </div>

      <div className="text-sm text-[var(--text-muted)] bg-[var(--brand-subtle)] rounded-[14px] p-5">
        <p className="font-semibold text-[var(--brand)] mb-1">School setup</p>
        <p>Classes, subjects, and academic years are configured by the school administrator via{" "}
          <Link href="/school-settings" className="text-[var(--brand)] underline underline-offset-2">school settings</Link>.
        </p>
      </div>
    </div>
  );
}
