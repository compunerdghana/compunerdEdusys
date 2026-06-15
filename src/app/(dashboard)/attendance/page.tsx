"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { queueOperation } from "@/lib/offline/db";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getInitials } from "@/lib/utils";
import { CheckCircle2, XCircle, Clock, MinusCircle, Save, CheckCircle, MessageSquare } from "lucide-react";
import type { AttendanceStatus } from "@/types/database";

interface StudentRow {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  admission_number: string;
}
interface ClassRoom { id: string; name: string; level: string }

const STATUSES: { value: AttendanceStatus; label: string; color: string; bg: string; icon: React.ReactNode }[] = [
  { value: "present", label: "Present", color: "var(--success)", bg: "var(--success-bg)", icon: <CheckCircle2 size={15} /> },
  { value: "absent",  label: "Absent",  color: "var(--danger)",  bg: "var(--danger-bg)",  icon: <XCircle size={15} /> },
  { value: "late",    label: "Late",    color: "var(--warning)", bg: "var(--warning-bg)", icon: <Clock size={15} /> },
  { value: "excused", label: "Excused", color: "var(--text-muted)", bg: "var(--neutral-100)", icon: <MinusCircle size={15} /> },
];

const NOTE_STATUSES = new Set<AttendanceStatus>(["excused", "late"]);

const LEVEL_ORDER = ["daycare","nursery","kg","primary","jhs"];

export default function AttendancePage() {
  const supabase = createClient();
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [classId, setClassId] = useState("");
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [noteOpen, setNoteOpen] = useState<Record<string, boolean>>({});
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data: profile } = await supabase.from("profiles").select("school_id").eq("id", user.id).single();
      if (!profile?.school_id) return;
      setSchoolId(profile.school_id);
      const { data } = await supabase
        .from("classrooms").select("id, name, level")
        .eq("school_id", profile.school_id).order("name");
      const sorted = (data ?? []).sort((a, b) =>
        LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level) || a.name.localeCompare(b.name)
      );
      setClasses(sorted);
    }
    init();
  }, []);

  useEffect(() => {
    if (!classId) return;
    async function load() {
      const [{ data: studs }, { data: existing }] = await Promise.all([
        supabase.from("students")
          .select("id, first_name, middle_name, last_name, admission_number")
          .eq("class_id", classId).eq("status", "active").order("last_name"),
        supabase.from("attendance_records")
          .select("student_id, status, note")
          .eq("class_id", classId).eq("date", date),
      ]);
      setStudents(studs ?? []);
      const map: Record<string, AttendanceStatus> = {};
      const noteMap: Record<string, string> = {};
      (studs ?? []).forEach((s: StudentRow) => { map[s.id] = "present"; });
      (existing ?? []).forEach((r: { student_id: string; status: AttendanceStatus; note?: string | null }) => {
        map[r.student_id] = r.status;
        if (r.note) noteMap[r.student_id] = r.note;
      });
      setAttendance(map);
      setNotes(noteMap);
      setNoteOpen({});
    }
    load();
  }, [classId, date]);

  function mark(studentId: string, status: AttendanceStatus) {
    setAttendance((prev) => ({ ...prev, [studentId]: status }));
    // Auto-open note box for statuses that require it
    if (NOTE_STATUSES.has(status)) {
      setNoteOpen(prev => ({ ...prev, [studentId]: true }));
    } else {
      setNoteOpen(prev => ({ ...prev, [studentId]: false }));
    }
  }

  function markAll(status: AttendanceStatus) {
    const all: Record<string, AttendanceStatus> = {};
    students.forEach((s) => { all[s.id] = status; });
    setAttendance(all);
  }

  async function handleSave() {
    if (!schoolId || !userId) return;
    setSaving(true);
    const records = students.map((s) => ({
      id: crypto.randomUUID(),
      school_id: schoolId,
      student_id: s.id,
      class_id: classId,
      date,
      status: attendance[s.id] ?? "present",
      note: notes[s.id]?.trim() || null,
      recorded_by: userId,
    }));
    if (navigator.onLine) {
      await supabase.from("attendance_records").upsert(records, { onConflict: "student_id,date,class_id" });
    } else {
      for (const r of records) await queueOperation("attendance_records", "insert", r);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const counts = STATUSES.map((s) => ({
    ...s,
    count: Object.values(attendance).filter((v) => v === s.value).length,
  }));

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h2 className="text-xl font-bold text-[var(--text-strong)]">Attendance</h2>
        <p className="text-[15px] text-[var(--text-muted)]">Mark the daily register for a class</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[160px]">
          <label className="text-[15px] font-semibold text-[var(--text-strong)] block mb-1.5">Class</label>
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="h-11 w-full rounded-[10px] border border-[var(--border)] bg-white px-3.5 text-[15px] text-[var(--text-strong)] outline-none focus:border-[var(--ring)]"
          >
            <option value="">— Select class —</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[15px] font-semibold text-[var(--text-strong)] block mb-1.5">Date</label>
          <input
            type="date"
            value={date}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setDate(e.target.value)}
            className="h-11 rounded-[10px] border border-[var(--border)] bg-white px-3.5 text-[15px] outline-none focus:border-[var(--ring)]"
          />
        </div>
      </div>

      {classId && students.length === 0 && (
        <Card><p className="text-[15px] text-[var(--text-muted)] text-center py-3">No active students in this class.</p></Card>
      )}

      {students.length > 0 && (
        <>
          {/* Summary pills */}
          <div className="flex flex-wrap gap-2">
            {counts.map((s) => (
              <div key={s.value} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold"
                style={{ background: s.bg, color: s.color }}>
                {s.icon} {s.count} {s.label}
              </div>
            ))}
          </div>

          {/* Mark all */}
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <button key={s.value} onClick={() => markAll(s.value)}
                className="px-3 py-1.5 rounded-[8px] text-[13px] font-semibold border transition-all hover:opacity-90"
                style={{ background: s.bg, color: s.color, borderColor: s.color + "33" }}>
                All {s.label}
              </button>
            ))}
          </div>

          {/* Student list */}
          <div className="space-y-2">
            {students.map((s) => {
              const current = attendance[s.id] ?? "present";
              const cfg = STATUSES.find((x) => x.value === current)!;
              const needsNote = NOTE_STATUSES.has(current);
              const isNoteOpen = noteOpen[s.id] || (needsNote && notes[s.id]);
              return (
                <div key={s.id} className="bg-white border border-[var(--border)] rounded-[12px] shadow-[var(--shadow-sm)] overflow-hidden">
                  <div className="p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                      style={{ background: "var(--gradient-brand)" }}>
                      {getInitials(`${s.first_name} ${s.last_name}`)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-semibold text-[var(--text-strong)] leading-tight truncate">
                        {s.last_name}, {s.first_name}{s.middle_name ? ` ${s.middle_name[0]}.` : ""}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">{s.admission_number}</p>
                    </div>
                    {/* Status buttons */}
                    <div className="flex gap-1 shrink-0 items-center">
                      {STATUSES.map((st) => {
                        const active = current === st.value;
                        return (
                          <button key={st.value} onClick={() => mark(s.id, st.value)}
                            title={st.label}
                            className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                            style={{
                              background: active ? st.bg : "transparent",
                              color: active ? st.color : "var(--text-subtle)",
                              outline: active ? `2px solid ${st.color}` : "none",
                            }}>
                            {st.icon}
                          </button>
                        );
                      })}
                      {/* Note toggle for excused/late */}
                      {needsNote && (
                        <button
                          onClick={() => setNoteOpen(prev => ({ ...prev, [s.id]: !prev[s.id] }))}
                          title="Add note"
                          className="w-8 h-8 rounded-full flex items-center justify-center transition-all ml-0.5"
                          style={{
                            color: notes[s.id] ? "#262262" : "var(--text-subtle)",
                            background: notes[s.id] ? "#EEF2FF" : "transparent",
                          }}>
                          <MessageSquare size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Note input */}
                  {needsNote && isNoteOpen && (
                    <div className="px-3 pb-3 pt-0">
                      <input
                        type="text"
                        value={notes[s.id] ?? ""}
                        onChange={e => setNotes(prev => ({ ...prev, [s.id]: e.target.value }))}
                        placeholder={current === "excused" ? "Reason for excusal (e.g. Sick, Family event…)" : "Reason for lateness…"}
                        className="w-full h-9 rounded-[8px] border border-[var(--border)] px-3 text-[13px] text-[var(--text-strong)] outline-none focus:border-[#262262] bg-[var(--neutral-50)]"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <Button size="lg" onClick={handleSave} loading={saving} className="w-full sm:w-auto">
            {saved ? <><CheckCircle size={15} /> Saved!</> : <><Save size={15} /> Save attendance</>}
          </Button>
        </>
      )}
    </div>
  );
}
