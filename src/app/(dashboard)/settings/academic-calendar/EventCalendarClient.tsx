"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft, ChevronRight, Plus, X, Trash2, CalendarDays, AlertTriangle,
} from "lucide-react";

interface Term {
  id: string; name: string; start_date: string; end_date: string; is_current: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  academic_years: Record<string, any> | null;
}

interface SchoolEvent {
  id: string;
  school_id: string;
  title: string;
  description?: string | null;
  event_date: string;
  color: string;
  all_day?: boolean | null;
  start_time?: string | null;
  end_time?: string | null;
}

interface Props {
  schoolId: string;
  terms: Term[];
  isHeadmaster: boolean;
}

const COLORS = [
  { value: "#262262", label: "Indigo" },
  { value: "#92278F", label: "Purple" },
  { value: "#16A34A", label: "Green" },
  { value: "#D97706", label: "Amber" },
  { value: "#DC2626", label: "Red" },
  { value: "#0369A1", label: "Blue" },
];

const TODAY = new Date();

function pad(n: number) { return String(n).padStart(2, "0"); }
function toDateStr(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

export function EventCalendarClient({ schoolId, terms, isHeadmaster }: Props) {
  const [cur, setCur] = useState(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1));
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [tableNotReady, setTableNotReady] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // Add-event modal
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newColor, setNewColor] = useState(COLORS[0].value);
  const [newAllDay, setNewAllDay] = useState(true);
  const [newStartTime, setNewStartTime] = useState("08:00");
  const [newEndTime, setNewEndTime] = useState("10:00");
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  // Day detail panel
  const [detailDate, setDetailDate] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDeleteEvent, setConfirmDeleteEvent] = useState<SchoolEvent | null>(null);

  const year = cur.getFullYear();
  const month = cur.getMonth();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthName = cur.toLocaleString("en-GH", { month: "long", year: "numeric" });

  const loadEvents = useCallback(async () => {
    setLoadingEvents(true);
    const res = await fetch(`/api/admin/school-events?schoolId=${schoolId}`);
    const json = await res.json();
    if (json.tableNotReady) { setTableNotReady(true); setLoadingEvents(false); return; }
    setEvents(json.events ?? []);
    setLoadingEvents(false);
  }, [schoolId]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const eventsThisMonth = events.filter(e => {
    const d = new Date(e.event_date);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  const eventsByDate = new Map<string, SchoolEvent[]>();
  eventsThisMonth.forEach(e => {
    const key = e.event_date;
    if (!eventsByDate.has(key)) eventsByDate.set(key, []);
    eventsByDate.get(key)!.push(e);
  });

  // Terms that overlap this month
  const termsThisMonth = terms.filter(t => {
    const start = new Date(t.start_date);
    const end = new Date(t.end_date);
    const mStart = new Date(year, month, 1);
    const mEnd = new Date(year, month + 1, 0);
    return start <= mEnd && end >= mStart;
  });

  const termColors = ["#262262", "#92278F", "#16A34A", "#D97706", "#0369A1"];

  function getTermForDay(day: number): { color: string; name: string } | null {
    const dateStr = toDateStr(year, month, day);
    const dt = new Date(dateStr);
    for (let i = 0; i < termsThisMonth.length; i++) {
      const t = termsThisMonth[i];
      if (new Date(t.start_date) <= dt && dt <= new Date(t.end_date)) {
        return { color: termColors[i % termColors.length], name: t.name };
      }
    }
    return null;
  }

  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  async function handleAddEvent() {
    if (!selectedDate || !newTitle.trim()) return;
    setSaving(true); setSaveErr(null);
    const res = await fetch("/api/admin/school-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        school_id: schoolId,
        title: newTitle.trim(),
        description: newDesc.trim() || null,
        event_date: selectedDate,
        color: newColor,
        all_day: newAllDay,
        start_time: newAllDay ? null : newStartTime,
        end_time: newAllDay ? null : newEndTime,
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (json.error === "TABLE_NOT_READY" || res.status === 422) {
      setTableNotReady(true); setSelectedDate(null); return;
    }
    if (!res.ok) { setSaveErr(json.error ?? "Failed to save"); return; }
    setEvents(prev => [...prev, json.event]);
    setSelectedDate(null);
    setNewTitle(""); setNewDesc(""); setNewColor(COLORS[0].value); setNewAllDay(true); setNewStartTime("08:00"); setNewEndTime("10:00");
  }

  async function executeDelete(id: string) {
    setDeleting(id);
    setConfirmDeleteEvent(null);
    await fetch(`/api/admin/school-events?id=${id}`, { method: "DELETE" });
    setEvents(prev => prev.filter(e => e.id !== id));
    setDeleting(null);
    // Also close detail panel if event was there
    setDetailDate(prev => prev);
  }

  const detailEvents = detailDate ? (eventsByDate.get(detailDate) ?? []) : [];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-[var(--text-strong)]">Academic Calendar</h3>
        <p className="text-[14px] text-[var(--text-muted)]">Set school events, holidays and important dates for staff and parents to see.</p>
      </div>

      {tableNotReady && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-semibold text-amber-800">One-time setup required</p>
            <p className="text-[12px] text-amber-700 mt-1">Run this SQL in your Supabase SQL editor to enable the events calendar:</p>
            <pre className="mt-2 text-[11px] bg-amber-100 rounded-lg p-3 overflow-x-auto text-amber-900 whitespace-pre-wrap">{`CREATE TABLE IF NOT EXISTS school_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  color TEXT DEFAULT '#262262',
  all_day BOOLEAN DEFAULT TRUE,
  start_time TIME,
  end_time TIME,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE school_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "school_members_read_events" ON school_events FOR SELECT
  USING (school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid()));
-- If table already exists, add missing columns:
ALTER TABLE school_events ADD COLUMN IF NOT EXISTS all_day BOOLEAN DEFAULT TRUE;
ALTER TABLE school_events ADD COLUMN IF NOT EXISTS start_time TIME;
ALTER TABLE school_events ADD COLUMN IF NOT EXISTS end_time TIME;`}</pre>
            <button onClick={loadEvents} className="mt-2 text-[12px] font-semibold text-amber-800 underline">Retry after running →</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-5">
        {/* Calendar grid */}
        <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
          {/* Month nav */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
            <h3 className="text-[15px] font-bold text-[var(--text-strong)]">{monthName}</h3>
            <div className="flex items-center gap-1">
              <button onClick={() => setCur(new Date(year, month - 1, 1))}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[var(--neutral-100)] transition-colors">
                <ChevronLeft size={16} className="text-[var(--text-muted)]" />
              </button>
              <button onClick={() => setCur(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1))}
                className="px-3 py-1 text-[12px] font-semibold rounded-lg border border-[var(--border)] hover:bg-[var(--neutral-50)] transition-colors text-[var(--text-muted)]">
                Today
              </button>
              <button onClick={() => setCur(new Date(year, month + 1, 1))}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[var(--neutral-100)] transition-colors">
                <ChevronRight size={16} className="text-[var(--text-muted)]" />
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-[var(--border)]">
            {DAYS.map(d => (
              <div key={d} className="py-2 text-center text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                {d}
              </div>
            ))}
          </div>

          {/* Cells */}
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              if (!day) return <div key={i} className="h-20 sm:h-24 border-b border-r border-[var(--border)] bg-[var(--neutral-50)]" />;

              const dateStr = toDateStr(year, month, day);
              const isToday = dateStr === toDateStr(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());
              const isWeekend = i % 7 === 0 || i % 7 === 6;
              const dayEvents = eventsByDate.get(dateStr) ?? [];
              const termInfo = getTermForDay(day);
              const isDetail = detailDate === dateStr;

              return (
                <div key={i}
                  onClick={() => {
                    if (isDetail) { setDetailDate(null); }
                    else if (dayEvents.length > 0) { setDetailDate(dateStr); }
                    else if (isHeadmaster && !tableNotReady) { setSelectedDate(dateStr); setDetailDate(null); }
                  }}
                  className={`h-20 sm:h-24 border-b border-r border-[var(--border)] p-1.5 cursor-pointer transition-colors relative
                    ${isWeekend ? "bg-[var(--neutral-50)]" : "bg-white"}
                    ${isDetail ? "ring-2 ring-inset ring-[#262262]" : "hover:bg-[#EEF2FF]/50"}
                  `}>

                  {/* Term bar */}
                  {termInfo && (
                    <div className="absolute top-0 left-0 right-0 h-1 rounded-t" style={{ background: termInfo.color }} />
                  )}

                  <div className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full text-[11px] sm:text-[12px] font-semibold mb-0.5 mt-0.5
                    ${isToday ? "text-white" : isWeekend ? "text-[var(--text-muted)]" : "text-[var(--text-body)]"}`}
                    style={isToday ? { background: "#262262" } : {}}>
                    {day}
                  </div>

                  {/* Events */}
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 2).map(ev => (
                      <div key={ev.id} className="text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 rounded truncate text-white leading-tight"
                        style={{ background: ev.color }}>
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-[9px] text-[var(--text-muted)] font-medium pl-1">+{dayEvents.length - 2} more</div>
                    )}
                  </div>

                  {/* Add hint */}
                  {isHeadmaster && !tableNotReady && dayEvents.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <Plus size={16} className="text-[#262262]/30" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right panel: terms legend + upcoming events */}
        <div className="space-y-4">
          {/* Terms */}
          {terms.length > 0 && (
            <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
              <div className="px-4 py-3 border-b border-[var(--border)]">
                <p className="text-[13px] font-bold text-[var(--text-strong)]">Terms</p>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {terms.map((t, i) => {
                  const isNow = new Date(t.start_date) <= TODAY && TODAY <= new Date(t.end_date);
                  const col = termColors[i % termColors.length];
                  return (
                    <div key={t.id} className="flex items-start gap-3 px-4 py-3">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0 mt-1" style={{ background: col }} />
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold text-[var(--text-strong)] flex items-center gap-1.5">
                          {t.name}
                          {isNow && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">NOW</span>}
                        </p>
                        <p className="text-[11px] text-[var(--text-muted)]">
                          {new Date(t.start_date).toLocaleDateString("en-GH", { month: "short", day: "numeric" })} —{" "}
                          {new Date(t.end_date).toLocaleDateString("en-GH", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Upcoming events */}
          {!tableNotReady && (
            <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
              <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
                <p className="text-[13px] font-bold text-[var(--text-strong)]">Upcoming Events</p>
                {isHeadmaster && !tableNotReady && (
                  <button onClick={() => { setSelectedDate(toDateStr(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate())); setDetailDate(null); }}
                    className="flex items-center gap-1 text-[11px] font-semibold text-[#262262] hover:opacity-75 transition-opacity">
                    <Plus size={12} /> Add
                  </button>
                )}
              </div>
              {loadingEvents ? (
                <div className="py-8 flex justify-center">
                  <div className="w-5 h-5 border-2 border-[#262262] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="divide-y divide-[var(--border)]">
                  {events
                    .filter(e => new Date(e.event_date) >= new Date(toDateStr(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate())))
                    .sort((a, b) => a.event_date.localeCompare(b.event_date))
                    .slice(0, 8)
                    .map(ev => (
                      <div key={ev.id} className="flex items-start gap-3 px-4 py-3 group">
                        <div className="w-8 h-8 rounded-xl flex flex-col items-center justify-center shrink-0 text-white"
                          style={{ background: ev.color }}>
                          <span className="text-[10px] font-bold leading-none">
                            {new Date(ev.event_date).toLocaleDateString("en-GH", { month: "short" })}
                          </span>
                          <span className="text-[14px] font-extrabold leading-none">
                            {new Date(ev.event_date).getDate()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-semibold text-[var(--text-strong)] truncate">{ev.title}</p>
                          {ev.description && <p className="text-[11px] text-[var(--text-muted)] truncate">{ev.description}</p>}
                          <p className="text-[10px] text-[var(--text-muted)]">
                            {new Date(ev.event_date).toLocaleDateString("en-GH", { weekday: "short", month: "long", day: "numeric" })}
                            {!ev.all_day && ev.start_time && <> · {ev.start_time}{ev.end_time ? `–${ev.end_time}` : ""}</>}
                            {ev.all_day && <> · All day</>}
                          </p>
                        </div>
                        {isHeadmaster && (
                          <button onClick={() => setConfirmDeleteEvent(ev)} disabled={deleting === ev.id}
                            className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-all disabled:opacity-40 shrink-0">
                            {deleting === ev.id
                              ? <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
                              : <Trash2 size={11} />}
                          </button>
                        )}
                      </div>
                    ))}
                  {events.filter(e => new Date(e.event_date) >= TODAY).length === 0 && (
                    <div className="py-8 text-center">
                      <CalendarDays size={24} className="text-[var(--text-muted)] opacity-20 mx-auto mb-2" />
                      <p className="text-[12px] text-[var(--text-muted)]">No upcoming events</p>
                      {isHeadmaster && <p className="text-[11px] text-[var(--text-muted)] mt-1">Click any date to add one</p>}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Day detail panel */}
      {detailDate && detailEvents.length > 0 && (
        <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[0_1px_6px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--border)] flex items-center justify-between">
            <p className="text-[14px] font-bold text-[var(--text-strong)]">
              {new Date(detailDate).toLocaleDateString("en-GH", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </p>
            <div className="flex items-center gap-2">
              {isHeadmaster && (
                <button onClick={() => { setSelectedDate(detailDate); setDetailDate(null); }}
                  className="flex items-center gap-1 text-[12px] font-semibold text-[#262262] hover:opacity-75">
                  <Plus size={13} /> Add event
                </button>
              )}
              <button onClick={() => setDetailDate(null)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--neutral-100)]">
                <X size={14} className="text-[var(--text-muted)]" />
              </button>
            </div>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {detailEvents.map(ev => (
              <div key={ev.id} className="flex items-start gap-3 px-5 py-3.5 group">
                <div className="w-3 h-3 rounded-full shrink-0 mt-1" style={{ background: ev.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-[var(--text-strong)]">{ev.title}</p>
                  {!ev.all_day && ev.start_time && (
                    <p className="text-[11px] text-[var(--text-muted)] font-medium">
                      {ev.start_time}{ev.end_time ? ` – ${ev.end_time}` : ""}
                    </p>
                  )}
                  {ev.all_day && <p className="text-[11px] text-[var(--text-muted)]">All day</p>}
                  {ev.description && <p className="text-[12px] text-[var(--text-muted)]">{ev.description}</p>}
                </div>
                {isHeadmaster && (
                  <button onClick={() => setConfirmDeleteEvent(ev)} disabled={deleting === ev.id}
                    className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-all disabled:opacity-40">
                    {deleting === ev.id
                      ? <div className="w-3.5 h-3.5 border border-red-400 border-t-transparent rounded-full animate-spin" />
                      : <Trash2 size={13} />}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete event confirmation */}
      {confirmDeleteEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} className="text-red-600" />
              </div>
              <div>
                <p className="text-[15px] font-bold text-[var(--text-strong)]">Delete event?</p>
                <p className="text-[13px] text-[var(--text-muted)] mt-0.5 truncate max-w-[220px]">{confirmDeleteEvent.title}</p>
              </div>
            </div>
            <p className="text-[13px] text-[var(--text-muted)] mb-5">
              {new Date(confirmDeleteEvent.event_date).toLocaleDateString("en-GH", { weekday: "long", month: "long", day: "numeric" })} · This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteEvent(null)}
                className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-[13px] font-semibold text-[var(--text-muted)] hover:bg-[var(--neutral-50)] transition-colors">
                Cancel
              </button>
              <button onClick={() => executeDelete(confirmDeleteEvent.id)}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-[13px] font-bold hover:bg-red-700 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add event modal */}
      {selectedDate && isHeadmaster && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <div>
                <h3 className="text-[15px] font-bold text-[var(--text-strong)]">Add Event</h3>
                <p className="text-[12px] text-[var(--text-muted)]">
                  {new Date(selectedDate).toLocaleDateString("en-GH", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                </p>
              </div>
              <button onClick={() => { setSelectedDate(null); setSaveErr(null); }}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--neutral-100)] text-[var(--text-muted)]">
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-[13px] font-semibold text-[var(--text-strong)] block mb-1.5">Event title *</label>
                <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. PTA Meeting, Sports Day, End of Term…"
                  className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-[13px] outline-none focus:border-[#262262] transition-colors" />
              </div>
              <div>
                <label className="text-[13px] font-semibold text-[var(--text-strong)] block mb-1.5">Description (optional)</label>
                <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={2}
                  placeholder="Additional details…"
                  className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#262262] transition-colors resize-none" />
              </div>
              {/* All-day / time toggle */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[13px] font-semibold text-[var(--text-strong)]">Timing</label>
                  <button type="button" onClick={() => setNewAllDay(v => !v)}
                    className="flex items-center gap-2 text-[12px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-strong)] transition-colors">
                    <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${newAllDay ? "bg-[#262262]" : "bg-gray-200"}`}>
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${newAllDay ? "translate-x-4.5" : "translate-x-0.5"}`} />
                    </span>
                    All day
                  </button>
                </div>
                {!newAllDay && (
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">Start time</label>
                      <input type="time" value={newStartTime} onChange={e => setNewStartTime(e.target.value)}
                        className="h-9 w-full rounded-xl border border-[var(--border)] px-3 text-[13px] outline-none focus:border-[#262262]" />
                    </div>
                    <div className="flex-1">
                      <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">End time</label>
                      <input type="time" value={newEndTime} onChange={e => setNewEndTime(e.target.value)}
                        className="h-9 w-full rounded-xl border border-[var(--border)] px-3 text-[13px] outline-none focus:border-[#262262]" />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-[13px] font-semibold text-[var(--text-strong)] block mb-2">Colour</label>
                <div className="flex gap-2">
                  {COLORS.map(c => (
                    <button key={c.value} type="button" onClick={() => setNewColor(c.value)} title={c.label}
                      className="w-8 h-8 rounded-full transition-transform hover:scale-110 shrink-0"
                      style={{
                        background: c.value,
                        outline: newColor === c.value ? `3px solid ${c.value}` : "none",
                        outlineOffset: "2px",
                      }} />
                  ))}
                </div>
              </div>

              {saveErr && <p className="text-[12px] text-red-600 bg-red-50 px-3 py-2 rounded-lg">{saveErr}</p>}

              <div className="flex gap-2 pt-1">
                <button onClick={() => { setSelectedDate(null); setSaveErr(null); }}
                  className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-[13px] font-semibold text-[var(--text-muted)] hover:bg-[var(--neutral-50)] transition-colors">
                  Cancel
                </button>
                <button onClick={handleAddEvent} disabled={saving || !newTitle.trim()}
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white flex items-center justify-center gap-1.5 disabled:opacity-50 transition-opacity"
                  style={{ background: "linear-gradient(135deg, #262262, #92278F)" }}>
                  {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Add Event"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
