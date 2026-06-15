"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import {
  Clock, Plus, Trash2, Edit2, Printer, Coffee,
  CalendarDays, AlertTriangle, X, Check, LayoutGrid,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Classroom { id: string; name: string; level?: string }
interface Subject   { id: string; name: string }
interface Teacher   { id: string; full_name: string }
interface Term      { id: string; name: string; start_date?: string; end_date?: string; is_current?: boolean }

interface Period {
  id: string;
  school_id: string;
  name: string;
  start_time: string;
  end_time: string;
  sort_order: number;
  is_break: boolean;
}

interface Slot {
  id: string;
  classroom_id: string;
  period_id: string;
  day_of_week: number;
  subject_id: string | null;
  teacher_id: string | null;
  term_id: string | null;
  subjects?: { id: string; name: string } | null;
  profiles?: { id: string; full_name: string } | null;
}

interface Props {
  schoolId: string;
  isHeadmaster: boolean;
  classes: Classroom[];
  subjects: Subject[];
  teachers: Teacher[];
  terms: Term[];
  currentTermId: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri"];

const SUBJECT_COLORS = [
  "bg-blue-100 text-blue-800",
  "bg-emerald-100 text-emerald-800",
  "bg-violet-100 text-violet-800",
  "bg-amber-100 text-amber-800",
  "bg-rose-100 text-rose-800",
  "bg-cyan-100 text-cyan-800",
  "bg-fuchsia-100 text-fuchsia-800",
  "bg-lime-100 text-lime-800",
  "bg-orange-100 text-orange-800",
  "bg-teal-100 text-teal-800",
];

function subjectColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return SUBJECT_COLORS[h % SUBJECT_COLORS.length];
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function fmt12(t: string) {
  if (!t) return "";
  const [hStr, mStr] = t.split(":");
  const h = parseInt(hStr, 10);
  const m = mStr ?? "00";
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${suffix}`;
}

// ─── Migration SQL Banner ─────────────────────────────────────────────────────

const MIGRATION_SQL = `-- Run this in your Supabase SQL editor
CREATE TABLE IF NOT EXISTS timetable_periods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  sort_order INT DEFAULT 0,
  is_break BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE timetable_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "school_read_periods" ON timetable_periods FOR SELECT
  USING (school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid()));

CREATE TABLE IF NOT EXISTS timetable_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES timetable_periods(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL,
  subject_id UUID REFERENCES subjects(id),
  teacher_id UUID REFERENCES profiles(id),
  term_id UUID REFERENCES terms(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(classroom_id, period_id, day_of_week, term_id)
);
ALTER TABLE timetable_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "school_read_slots" ON timetable_slots FOR SELECT
  USING (school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid()));`;

function MigrationBanner({ onDismiss }: { onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
          <AlertTriangle size={17} className="text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-amber-900 text-[14px]">Database tables not ready</p>
          <p className="text-[13px] text-amber-700 mt-0.5">Run the migration SQL in your Supabase dashboard to enable the timetable feature.</p>
        </div>
        <button onClick={onDismiss} className="text-amber-500 hover:text-amber-700 shrink-0"><X size={16} /></button>
      </div>
      <pre className="text-[11px] bg-white border border-amber-200 rounded-xl p-3 overflow-x-auto text-amber-900 leading-relaxed whitespace-pre">{MIGRATION_SQL}</pre>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => { navigator.clipboard.writeText(MIGRATION_SQL); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      >
        {copied ? <><Check size={13} /> Copied!</> : "Copy SQL"}
      </Button>
    </div>
  );
}

// ─── Slot Cell Modal ──────────────────────────────────────────────────────────

interface SlotModalProps {
  open: boolean;
  onClose: () => void;
  periodName: string;
  dayName: string;
  slot: Slot | null;
  subjects: Subject[];
  teachers: Teacher[];
  onSave: (subjectId: string | null, teacherId: string | null) => Promise<void>;
  onClear: () => Promise<void>;
  saving: boolean;
  error?: string | null;
}

function SlotModal({ open, onClose, periodName, dayName, slot, subjects, teachers, onSave, onClear, saving, error }: SlotModalProps) {
  const [subjectId, setSubjectId] = useState(slot?.subject_id ?? "");
  const [teacherId, setTeacherId] = useState(slot?.teacher_id ?? "");

  useEffect(() => {
    setSubjectId(slot?.subject_id ?? "");
    setTeacherId(slot?.teacher_id ?? "");
  }, [slot, open]);

  return (
    <Modal open={open} onClose={onClose} title={`${dayName} — ${periodName}`} subtitle="Assign a subject and teacher" size="sm">
      <div className="space-y-4">
        <Select
          label="Subject"
          placeholder="— Select subject —"
          options={subjects.map((s) => ({ value: s.id, label: s.name }))}
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
        />
        <Select
          label="Teacher"
          placeholder="— Select teacher —"
          options={teachers.map((t) => ({ value: t.id, label: t.full_name }))}
          value={teacherId}
          onChange={(e) => setTeacherId(e.target.value)}
        />
        {error && (
          <div className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            {error}
          </div>
        )}
        <div className="flex gap-2 pt-1">
          {slot && (
            <Button variant="danger" size="sm" className="shrink-0" onClick={onClear} loading={saving}>
              Clear
            </Button>
          )}
          <Button variant="secondary" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" className="flex-1" loading={saving}
            onClick={() => onSave(subjectId || null, teacherId || null)}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TimetableClient({
  schoolId, isHeadmaster, classes, subjects, teachers, terms, currentTermId,
}: Props) {
  const [activeTab, setActiveTab] = useState<"timetable" | "periods">("timetable");
  const [selectedClassId, setSelectedClassId] = useState<string | null>(classes[0]?.id ?? null);
  const [selectedTermId, setSelectedTermId] = useState<string | null>(currentTermId ?? terms[0]?.id ?? null);
  const [tableNotReady, setTableNotReady] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // ── Periods state ──────────────────────────────────────────────────────────
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loadingPeriods, setLoadingPeriods] = useState(false);
  const [addingPeriod, setAddingPeriod] = useState(false);
  const [savingPeriod, setSavingPeriod] = useState(false);
  const [newPeriod, setNewPeriod] = useState({ name: "", start_time: "", end_time: "", is_break: false });
  const [editingPeriod, setEditingPeriod] = useState<Period | null>(null);
  const [deletingPeriodId, setDeletingPeriodId] = useState<string | null>(null);
  const [deletingPeriod, setDeletingPeriod] = useState(false);

  // ── Slots state ────────────────────────────────────────────────────────────
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotModal, setSlotModal] = useState<{ periodId: string; day: number } | null>(null);
  const [savingSlot, setSavingSlot] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);

  // ── Fetch periods ──────────────────────────────────────────────────────────
  const fetchPeriods = useCallback(async () => {
    setLoadingPeriods(true);
    const res = await fetch(`/api/admin/timetable-periods?schoolId=${schoolId}`);
    const json = await res.json();
    setLoadingPeriods(false);
    if (json.tableNotReady) { setTableNotReady(true); return; }
    if (json.data) setPeriods(json.data);
  }, [schoolId]);

  // ── Fetch slots ────────────────────────────────────────────────────────────
  const fetchSlots = useCallback(async () => {
    if (!selectedClassId) return;
    setLoadingSlots(true);
    const params = new URLSearchParams({ schoolId, classId: selectedClassId });
    if (selectedTermId) params.set("termId", selectedTermId);
    const res = await fetch(`/api/admin/timetable-slots?${params}`);
    const json = await res.json();
    setLoadingSlots(false);
    if (json.tableNotReady) { setTableNotReady(true); return; }
    if (json.data) setSlots(json.data);
  }, [schoolId, selectedClassId, selectedTermId]);

  useEffect(() => { fetchPeriods(); }, [fetchPeriods]);
  useEffect(() => { if (activeTab === "timetable") fetchSlots(); }, [fetchSlots, activeTab]);

  // ── Add period ─────────────────────────────────────────────────────────────
  async function handleAddPeriod() {
    if (!newPeriod.name || !newPeriod.start_time || !newPeriod.end_time) return;
    setSavingPeriod(true);
    const res = await fetch("/api/admin/timetable-periods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ school_id: schoolId, ...newPeriod, sort_order: periods.length }),
    });
    const json = await res.json();
    setSavingPeriod(false);
    if (json.tableNotReady) { setTableNotReady(true); return; }
    if (json.data) {
      setPeriods((prev) => [...prev, json.data]);
      setNewPeriod({ name: "", start_time: "", end_time: "", is_break: false });
      setAddingPeriod(false);
    }
  }

  // ── Edit period ────────────────────────────────────────────────────────────
  async function handleEditPeriod() {
    if (!editingPeriod) return;
    setSavingPeriod(true);
    const res = await fetch(`/api/admin/timetable-periods?id=${editingPeriod.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editingPeriod.name,
        start_time: editingPeriod.start_time,
        end_time: editingPeriod.end_time,
        is_break: editingPeriod.is_break,
      }),
    });
    const json = await res.json();
    setSavingPeriod(false);
    if (json.data) {
      setPeriods((prev) => prev.map((p) => (p.id === json.data.id ? json.data : p)));
      setEditingPeriod(null);
    }
  }

  // ── Delete period ──────────────────────────────────────────────────────────
  async function handleDeletePeriod() {
    if (!deletingPeriodId) return;
    setDeletingPeriod(true);
    await fetch(`/api/admin/timetable-periods?id=${deletingPeriodId}`, { method: "DELETE" });
    setDeletingPeriod(false);
    setPeriods((prev) => prev.filter((p) => p.id !== deletingPeriodId));
    setDeletingPeriodId(null);
  }

  // ── Save slot ──────────────────────────────────────────────────────────────
  async function handleSaveSlot(subjectId: string | null, teacherId: string | null) {
    if (!slotModal || !selectedClassId) return;
    setSavingSlot(true);
    const res = await fetch("/api/admin/timetable-slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        school_id: schoolId,
        classroom_id: selectedClassId,
        period_id: slotModal.periodId,
        day_of_week: slotModal.day,
        subject_id: subjectId,
        teacher_id: teacherId,
        term_id: selectedTermId,
      }),
    });
    const json = await res.json();
    setSavingSlot(false);
    if (!res.ok || json.error) {
      setSlotError(json.error ?? "Save failed. Check that the timetable tables exist in your database.");
      return;
    }
    if (json.tableNotReady) { setTableNotReady(true); setSlotModal(null); return; }
    if (json.data) {
      setSlots((prev) => {
        const filtered = prev.filter(
          (s) => !(s.period_id === slotModal.periodId && s.day_of_week === slotModal.day),
        );
        return [...filtered, json.data];
      });
    }
    setSlotModal(null);
    setSlotError(null);
  }

  // ── Clear slot ─────────────────────────────────────────────────────────────
  async function handleClearSlot() {
    if (!slotModal) return;
    const existing = slots.find(
      (s) => s.period_id === slotModal.periodId && s.day_of_week === slotModal.day,
    );
    if (!existing) { setSlotModal(null); return; }
    setSavingSlot(true);
    await fetch(`/api/admin/timetable-slots?id=${existing.id}`, { method: "DELETE" });
    setSavingSlot(false);
    setSlots((prev) => prev.filter((s) => s.id !== existing.id));
    setSlotModal(null);
  }

  // ── Slot lookup helper ─────────────────────────────────────────────────────
  function getSlot(periodId: string, day: number): Slot | null {
    return slots.find((s) => s.period_id === periodId && s.day_of_week === day) ?? null;
  }

  // ── Slot modal context ─────────────────────────────────────────────────────
  const activeSlotPeriod = slotModal ? periods.find((p) => p.id === slotModal.periodId) : null;
  const activeSlot = slotModal ? getSlot(slotModal.periodId, slotModal.day) : null;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-[20px] font-extrabold text-[var(--text-strong)]">Timetable</h2>
          <p className="text-[13px] text-[var(--text-muted)] mt-0.5">Manage weekly class schedules and period times.</p>
        </div>
        {activeTab === "timetable" && (
          <Button variant="secondary" size="sm" onClick={() => window.print()}>
            <Printer size={14} /> Print
          </Button>
        )}
      </div>

      {/* Migration banner */}
      {tableNotReady && !bannerDismissed && (
        <MigrationBanner onDismiss={() => setBannerDismissed(true)} />
      )}

      {/* Class selector cards (SettingsNav style) */}
      {activeTab === "timetable" && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {classes.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No classes found. Add classes in Settings → Classes.</p>
          ) : (
            classes.map((cls) => {
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
            })
          )}
        </div>
      )}

      {/* Main card */}
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[0_1px_6px_rgba(0,0,0,0.05)]">
        {/* Tab bar */}
        <div className="flex border-b border-[var(--border)] px-5 pt-1">
          {(["timetable", "periods"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-3 text-[13px] font-semibold border-b-2 -mb-px transition-colors capitalize",
                activeTab === tab
                  ? "border-[#262262] text-[#262262]"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-strong)]",
              )}
            >
              {tab === "timetable" ? "Timetable" : "Periods"}
            </button>
          ))}
        </div>

        {/* ── TIMETABLE TAB ── */}
        {activeTab === "timetable" && (
          <div className="p-5 space-y-4">
            {/* Term selector */}
            {terms.length > 0 && (
              <div className="flex items-center gap-3 flex-wrap">
                <CalendarDays size={15} className="text-[var(--text-muted)] shrink-0" />
                <Select
                  options={terms.map((t) => ({ value: t.id, label: t.name + (t.is_current ? " (current)" : "") }))}
                  value={selectedTermId ?? ""}
                  onChange={(e) => setSelectedTermId(e.target.value || null)}
                  className="w-48"
                />
              </div>
            )}

            {!selectedClassId ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
                <LayoutGrid size={32} className="text-[var(--text-subtle)]" />
                <p className="font-semibold text-[var(--text-strong)]">Select a class</p>
                <p className="text-sm text-[var(--text-muted)]">Choose a class above to view its timetable.</p>
              </div>
            ) : periods.length === 0 && !loadingPeriods ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
                <Clock size={32} className="text-[var(--text-subtle)]" />
                <p className="font-semibold text-[var(--text-strong)]">No periods yet</p>
                <p className="text-sm text-[var(--text-muted)] max-w-xs">
                  Switch to the <strong>Periods</strong> tab to add periods before building your timetable.
                </p>
                <Button variant="secondary" size="sm" onClick={() => setActiveTab("periods")}>
                  Set up periods
                </Button>
              </div>
            ) : (
              /* Grid */
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full min-w-[560px] border-separate border-spacing-0 print:text-xs">
                  <thead>
                    <tr>
                      <th className="sticky left-0 z-10 bg-white/95 backdrop-blur-sm w-28 min-w-[7rem] text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] border-b border-[var(--border)]">
                        Period
                      </th>
                      {DAYS.map((d, i) => (
                        <th key={d} className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#262262] border-b border-[var(--border)] bg-[#262262]/5 min-w-[100px]">
                          <span className="hidden sm:inline">{d}</span>
                          <span className="sm:hidden">{DAY_SHORT[i]}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loadingPeriods || loadingSlots ? (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-sm text-[var(--text-muted)]">Loading…</td>
                      </tr>
                    ) : (
                      periods.map((period, pIdx) => (
                        <tr key={period.id} className={pIdx % 2 === 0 ? "" : "bg-[var(--neutral-50)]/40"}>
                          {/* Period name col */}
                          <td className="sticky left-0 z-10 bg-[var(--neutral-50)] backdrop-blur-sm px-3 py-2 border-b border-[var(--border)] align-top">
                            <div className="flex items-start gap-1.5">
                              {period.is_break && <Coffee size={11} className="text-amber-500 mt-0.5 shrink-0" />}
                              <div>
                                <p className="text-[12px] font-semibold text-[var(--text-strong)] leading-tight">{period.name}</p>
                                <p className="text-[10px] text-[var(--text-muted)]">{fmt12(period.start_time)} – {fmt12(period.end_time)}</p>
                              </div>
                            </div>
                          </td>

                          {/* Day cells */}
                          {[1, 2, 3, 4, 5].map((day) => {
                            const slot = getSlot(period.id, day);
                            const subjectName = slot?.subjects?.name ?? null;
                            const teacherName = slot?.profiles?.full_name ?? null;

                            if (period.is_break) {
                              return (
                                <td key={day} className="px-2 py-2 border-b border-[var(--border)] text-center">
                                  <span className="text-[10px] text-amber-500 font-medium">Break</span>
                                </td>
                              );
                            }

                            return (
                              <td
                                key={day}
                                className={cn(
                                  "px-2 py-2 border-b border-[var(--border)] transition-colors",
                                  isHeadmaster && "cursor-pointer hover:bg-[#262262]/5 group",
                                )}
                                onClick={() => {
                                  if (!isHeadmaster) return;
                                  setSlotModal({ periodId: period.id, day });
                                }}
                              >
                                {subjectName ? (
                                  <div className={cn("rounded-lg px-2 py-1 text-center", subjectColor(subjectName))}>
                                    <p className="text-[11px] font-semibold leading-tight">
                                      {subjectName.length > 12 ? subjectName.slice(0, 11) + "…" : subjectName}
                                    </p>
                                    {teacherName && (
                                      <p className="text-[10px] opacity-75 leading-tight">{initials(teacherName)}</p>
                                    )}
                                  </div>
                                ) : (
                                  isHeadmaster && (
                                    <div className="border border-dashed border-[var(--border)] rounded-lg h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Plus size={13} className="text-[var(--text-muted)]" />
                                    </div>
                                  )
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── PERIODS TAB ── */}
        {activeTab === "periods" && (
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-[var(--text-muted)]">{periods.length} period{periods.length !== 1 ? "s" : ""}</p>
              {isHeadmaster && !addingPeriod && (
                <Button variant="primary" size="sm" onClick={() => setAddingPeriod(true)}>
                  <Plus size={14} /> Add Period
                </Button>
              )}
            </div>

            {/* Add period form */}
            {isHeadmaster && addingPeriod && (
              <div className="rounded-2xl border-2 border-dashed border-[#262262]/30 p-4 space-y-3 bg-[#262262]/[0.02]">
                <p className="text-[13px] font-semibold text-[var(--text-strong)]">New Period</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    label="Name"
                    placeholder="e.g. Period 1"
                    value={newPeriod.name}
                    onChange={(e) => setNewPeriod((p) => ({ ...p, name: e.target.value }))}
                  />
                  <Input
                    label="Start time"
                    type="time"
                    value={newPeriod.start_time}
                    onChange={(e) => setNewPeriod((p) => ({ ...p, start_time: e.target.value }))}
                  />
                  <Input
                    label="End time"
                    type="time"
                    value={newPeriod.end_time}
                    onChange={(e) => setNewPeriod((p) => ({ ...p, end_time: e.target.value }))}
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
                  <input
                    type="checkbox"
                    checked={newPeriod.is_break}
                    onChange={(e) => setNewPeriod((p) => ({ ...p, is_break: e.target.checked }))}
                    className="accent-[#262262] w-4 h-4 rounded"
                  />
                  <span className="text-sm text-[var(--text-body)]">Mark as break</span>
                </label>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => { setAddingPeriod(false); setNewPeriod({ name: "", start_time: "", end_time: "", is_break: false }); }}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    loading={savingPeriod}
                    disabled={!newPeriod.name || !newPeriod.start_time || !newPeriod.end_time}
                    onClick={handleAddPeriod}
                  >
                    Add Period
                  </Button>
                </div>
              </div>
            )}

            {/* Periods list */}
            {loadingPeriods ? (
              <div className="text-sm text-[var(--text-muted)] py-6 text-center">Loading periods…</div>
            ) : periods.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
                <Clock size={28} className="text-[var(--text-subtle)]" />
                <p className="font-semibold text-[var(--text-strong)]">No periods defined</p>
                <p className="text-sm text-[var(--text-muted)]">Add periods to define your school day structure.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {periods.map((period) => (
                  <div
                    key={period.id}
                    className={cn(
                      "rounded-xl border border-[var(--border)] px-4 py-3",
                      period.is_break ? "bg-amber-50 border-amber-100" : "bg-white",
                    )}
                  >
                    {editingPeriod?.id === period.id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <Input
                            label="Name"
                            value={editingPeriod.name}
                            onChange={(e) => setEditingPeriod((p) => p ? { ...p, name: e.target.value } : p)}
                          />
                          <Input
                            label="Start time"
                            type="time"
                            value={editingPeriod.start_time}
                            onChange={(e) => setEditingPeriod((p) => p ? { ...p, start_time: e.target.value } : p)}
                          />
                          <Input
                            label="End time"
                            type="time"
                            value={editingPeriod.end_time}
                            onChange={(e) => setEditingPeriod((p) => p ? { ...p, end_time: e.target.value } : p)}
                          />
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
                          <input
                            type="checkbox"
                            checked={editingPeriod.is_break}
                            onChange={(e) => setEditingPeriod((p) => p ? { ...p, is_break: e.target.checked } : p)}
                            className="accent-[#262262] w-4 h-4 rounded"
                          />
                          <span className="text-sm text-[var(--text-body)]">Mark as break</span>
                        </label>
                        <div className="flex gap-2">
                          <Button variant="secondary" size="sm" onClick={() => setEditingPeriod(null)}>Cancel</Button>
                          <Button variant="primary" size="sm" loading={savingPeriod} onClick={handleEditPeriod}>Save</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                          period.is_break ? "bg-amber-100" : "bg-[#262262]/8",
                        )}>
                          {period.is_break
                            ? <Coffee size={14} className="text-amber-600" />
                            : <Clock size={14} className="text-[#262262]" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold text-[var(--text-strong)]">{period.name}</p>
                          <p className="text-[12px] text-[var(--text-muted)]">
                            {fmt12(period.start_time)} – {fmt12(period.end_time)}
                            {period.is_break && <span className="ml-2 text-amber-600 font-medium">· Break</span>}
                          </p>
                        </div>
                        {isHeadmaster && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => setEditingPeriod(period)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--neutral-100)] hover:text-[var(--text-strong)] transition-all"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => setDeletingPeriodId(period.id)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-red-50 hover:text-red-600 transition-all"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Slot assignment modal */}
      {slotModal && (
        <SlotModal
          open={true}
          onClose={() => { setSlotModal(null); setSlotError(null); }}
          periodName={activeSlotPeriod?.name ?? ""}
          dayName={DAYS[slotModal.day - 1] ?? ""}
          slot={activeSlot}
          subjects={subjects}
          teachers={teachers}
          onSave={handleSaveSlot}
          onClear={handleClearSlot}
          saving={savingSlot}
          error={slotError}
        />
      )}

      {/* Delete period confirm */}
      <ConfirmModal
        open={!!deletingPeriodId}
        title="Delete period?"
        message="This will also remove all timetable slots assigned to this period. This cannot be undone."
        confirmLabel="Delete"
        danger
        loading={deletingPeriod}
        onConfirm={handleDeletePeriod}
        onCancel={() => setDeletingPeriodId(null)}
      />

      {/* Print styles */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          .max-w-5xl { display: block !important; max-width: 100% !important; }
          button, nav { display: none !important; }
        }
      `}</style>
    </div>
  );
}
