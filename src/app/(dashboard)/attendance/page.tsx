"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { queueOperation } from "@/lib/offline/db";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getInitials } from "@/lib/utils";
import { CheckCircle2, XCircle, Clock, Save } from "lucide-react";
import type { AttendanceStatus } from "@/types/database";

interface StudentRow { id: string; first_name: string; middle_name: string | null; last_name: string; admission_number: string }
interface ClassRoom { id: string; name: string }

const STATUSES: AttendanceStatus[] = ["present", "absent", "late", "excused"];

const statusConfig: Record<AttendanceStatus, { label: string; variant: "success" | "danger" | "warning" | "default"; icon: React.ReactNode }> = {
  present: { label: "Present", variant: "success", icon: <CheckCircle2 size={14} /> },
  absent: { label: "Absent", variant: "danger", icon: <XCircle size={14} /> },
  late: { label: "Late", variant: "warning", icon: <Clock size={14} /> },
  excused: { label: "Excused", variant: "default", icon: <Clock size={14} /> },
};

export default function AttendancePage() {
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [classId, setClassId] = useState("");
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function loadClasses() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("school_id").eq("id", user.id).single();
      if (!profile?.school_id) return;
      const { data } = await supabase.from("classrooms").select("id, name").eq("school_id", profile.school_id).order("name");
      setClasses(data ?? []);
    }
    loadClasses();
  }, []);

  useEffect(() => {
    if (!classId) return;
    async function loadStudents() {
      const supabase = createClient();
      const { data } = await supabase
        .from("students")
        .select("id, first_name, middle_name, last_name, admission_number")
        .eq("class_id", classId)
        .eq("status", "active")
        .order("last_name");
      setStudents(data ?? []);
      // Default everyone to present
      const defaults: Record<string, AttendanceStatus> = {};
      (data ?? []).forEach((s: StudentRow) => { defaults[s.id] = "present"; });
      setAttendance(defaults);
    }
    loadStudents();
  }, [classId]);

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from("profiles").select("school_id").eq("id", user.id).single();

    const records = students.map((s) => ({
      id: crypto.randomUUID(),
      school_id: profile?.school_id,
      student_id: s.id,
      class_id: classId,
      date,
      status: attendance[s.id] ?? "present",
      recorded_by: user.id,
      offline_id: null,
    }));

    if (navigator.onLine) {
      // Upsert by student + date + class
      await supabase.from("attendance_records").upsert(records, { onConflict: "student_id,date,class_id" });
    } else {
      for (const r of records) {
        await queueOperation("attendance_records", "insert", r);
      }
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const presentCount = Object.values(attendance).filter((s) => s === "present").length;
  const absentCount = Object.values(attendance).filter((s) => s === "absent").length;

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h2 className="text-xl font-bold text-[var(--text-strong)]">Attendance</h2>
        <p className="text-sm text-[var(--text-muted)]">Mark attendance for a class</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="w-48">
          <Select
            label="Class"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            placeholder="Select class"
            options={classes.map((c) => ({ value: c.id, label: c.name }))}
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-[var(--text-strong)] block mb-1.5">Date</label>
          <input
            type="date"
            value={date}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setDate(e.target.value)}
            className="h-10 rounded-[10px] border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--ring)]"
          />
        </div>
      </div>

      {students.length > 0 && (
        <>
          {/* Summary */}
          <div className="flex gap-3">
            <Badge variant="success">{presentCount} present</Badge>
            <Badge variant="danger">{absentCount} absent</Badge>
            <Badge variant="default">{students.length - presentCount - absentCount} other</Badge>
          </div>

          {/* Mark all */}
          <div className="flex gap-2">
            {STATUSES.map((s) => (
              <Button
                key={s}
                size="sm"
                variant="secondary"
                onClick={() => {
                  const all: Record<string, AttendanceStatus> = {};
                  students.forEach((st) => { all[st.id] = s; });
                  setAttendance(all);
                }}
              >
                Mark all {s}
              </Button>
            ))}
          </div>

          <Card padding="none">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Student</th>
                  {STATUSES.map((s) => (
                    <th key={s} className="px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] text-center">{s}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-[var(--neutral-50)] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: "var(--gradient-brand)" }}>
                          {getInitials(`${s.first_name} ${s.last_name}`)}
                        </div>
                        <span className="font-medium text-[var(--text-strong)]">{s.first_name} {s.last_name}</span>
                      </div>
                    </td>
                    {STATUSES.map((st) => (
                      <td key={st} className="px-3 py-3 text-center">
                        <input
                          type="radio"
                          name={`att-${s.id}`}
                          checked={attendance[s.id] === st}
                          onChange={() => setAttendance((prev) => ({ ...prev, [s.id]: st }))}
                          className="w-4 h-4 accent-[var(--brand)]"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Button size="lg" onClick={handleSave} loading={saving}>
            <Save size={15} />
            {saved ? "Saved" : "Save attendance"}
          </Button>
        </>
      )}

      {classId && students.length === 0 && (
        <p className="text-sm text-[var(--text-muted)]">No active students in this class.</p>
      )}
    </div>
  );
}
