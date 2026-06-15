"use client";

import { useState, useMemo } from "react";
import { SlidePanel } from "@/components/ui/SlidePanel";
import { formatDate } from "@/lib/utils";
import { Dumbbell, PlusCircle, Award, Search, ExternalLink } from "lucide-react";

const GRADIENT = "linear-gradient(135deg, #262262, #92278F)";

const TYPE_OPTIONS = ["workshop", "seminar", "conference", "certification", "in-house", "online", "other"] as const;
type TrainingType = typeof TYPE_OPTIONS[number];

const TYPE_STYLE: Record<string, { bg: string; color: string }> = {
  workshop:      { bg: "#EEF2FF", color: "#4338CA" },
  seminar:       { bg: "#F5F3FF", color: "#7C3AED" },
  conference:    { bg: "#FDF4FF", color: "#92278F" },
  certification: { bg: "#F0FDF4", color: "#16A34A" },
  "in-house":    { bg: "#FFFBEB", color: "#D97706" },
  online:        { bg: "#EFF6FF", color: "#2563EB" },
  other:         { bg: "#F9FAFB", color: "#6B7280" },
};

interface Training {
  id: string; profile_id: string; staff_name: string; training_type: string;
  title: string; organizer?: string; start_date: string; end_date?: string;
  location?: string; certificate_url?: string; notes?: string; created_at: string;
}
interface StaffMember { id: string; full_name: string }

interface Props {
  schoolId: string; userId: string; role: string; isAdmin: boolean;
  staff: StaffMember[];
  initialRecords: Training[];
  tableNotReady: boolean;
}

function FieldLabel({ c }: { c: React.ReactNode }) {
  return <label className="block text-[13px] font-semibold text-[var(--text-strong)] mb-1.5">{c}</label>;
}

export function TrainingClient({ schoolId, userId, isAdmin, staff, initialRecords, tableNotReady }: Props) {
  const [records, setRecords] = useState(initialRecords);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [submitting, setSubmitting] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    profile_id: staff[0]?.id ?? "",
    training_type: "workshop" as TrainingType,
    title: "", organizer: "", start_date: today, end_date: "", location: "", notes: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const staffName = staff.find((s) => s.id === form.profile_id)?.full_name ?? "";
    const res = await fetch("/api/admin/staff/training", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schoolId, created_by: userId, ...form, end_date: form.end_date || null }),
    });
    const json = await res.json();
    if (json.data) {
      setRecords((prev) => [{ ...json.data, staff_name: staffName }, ...prev]);
      setShowForm(false);
      setForm({ profile_id: staff[0]?.id ?? "", training_type: "workshop", title: "", organizer: "", start_date: today, end_date: "", location: "", notes: "" });
    }
    setSubmitting(false);
  }

  const filtered = useMemo(() => {
    return records.filter((r) => {
      const matchSearch = r.title.toLowerCase().includes(search.toLowerCase()) ||
        r.staff_name.toLowerCase().includes(search.toLowerCase()) ||
        (r.organizer ?? "").toLowerCase().includes(search.toLowerCase());
      const matchType = filterType === "all" || r.training_type === filterType;
      return matchSearch && matchType;
    });
  }, [records, search, filterType]);

  const typeCount = (t: string) => records.filter((r) => r.training_type === t).length;

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[22px] font-extrabold text-[var(--text-strong)]">Training &amp; Development</h2>
          <p className="text-[14px] text-[var(--text-muted)] mt-0.5">Workshops, seminars, and certifications attended by staff</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-bold text-white shadow-sm hover:opacity-90"
            style={{ background: GRADIENT }}>
            <PlusCircle size={16} /> Log Training
          </button>
        )}
      </div>

      {tableNotReady && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-[13px] text-amber-800 font-semibold">Run <code className="bg-amber-100 px-1 rounded">supabase/migrations/staff_lifecycle.sql</code> to enable training records.</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Records", value: records.length,                   icon: Dumbbell, bg: "#EEF2FF", color: "#4338CA" },
          { label: "Certifications", value: typeCount("certification"),      icon: Award,    bg: "#F0FDF4", color: "#16A34A" },
          { label: "Workshops",      value: typeCount("workshop"),           icon: Dumbbell, bg: "#F5F3FF", color: "#7C3AED" },
          { label: "Conferences",    value: typeCount("conference"),         icon: Dumbbell, bg: "#FDF4FF", color: "#92278F" },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-[0_1px_6px_rgba(0,0,0,0.05)] flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: c.bg }}>
              <c.icon size={22} style={{ color: c.color }} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">{c.label}</p>
              <p className="text-[26px] font-extrabold text-[var(--text-strong)] leading-tight">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[0_1px_6px_rgba(0,0,0,0.05)] p-4 flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by title, staff, organizer…"
            className="h-9 w-full pl-9 pr-3 rounded-xl border border-[var(--border)] text-[13px] outline-none focus:border-[#262262]" />
        </div>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
          className="h-9 rounded-xl border border-[var(--border)] px-3 text-[13px] outline-none cursor-pointer capitalize">
          <option value="all">All Types</option>
          {TYPE_OPTIONS.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
        </select>
      </div>

      {/* Records */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[var(--border)] p-16 text-center shadow-[0_1px_6px_rgba(0,0,0,0.05)]">
          <Dumbbell size={36} className="mx-auto mb-3 opacity-20 text-[var(--text-muted)]" />
          <p className="text-[16px] font-bold text-[var(--text-muted)]">No training records yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[0_1px_6px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--neutral-50)]">
                  {["Staff", "Training", "Type", "Date", "Organizer", "Location", "Cert"].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map((r) => {
                  const ts = TYPE_STYLE[r.training_type] ?? TYPE_STYLE.other;
                  return (
                    <tr key={r.id} className="hover:bg-[var(--neutral-50)] transition-colors">
                      <td className="px-5 py-4 text-[14px] font-semibold text-[var(--text-strong)] whitespace-nowrap">{r.staff_name}</td>
                      <td className="px-5 py-4">
                        <p className="text-[14px] font-semibold text-[var(--text-strong)]">{r.title}</p>
                        {r.notes && <p className="text-[12px] text-[var(--text-muted)] mt-0.5 truncate max-w-[200px]">{r.notes}</p>}
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize" style={{ background: ts.bg, color: ts.color }}>{r.training_type}</span>
                      </td>
                      <td className="px-5 py-4 text-[13px] text-[var(--text-muted)] whitespace-nowrap">
                        {formatDate(r.start_date)}{r.end_date && r.end_date !== r.start_date ? ` – ${formatDate(r.end_date)}` : ""}
                      </td>
                      <td className="px-5 py-4 text-[13px] text-[var(--text-muted)]">{r.organizer ?? "—"}</td>
                      <td className="px-5 py-4 text-[13px] text-[var(--text-muted)]">{r.location ?? "—"}</td>
                      <td className="px-5 py-4">
                        {r.certificate_url
                          ? <a href={r.certificate_url} target="_blank" rel="noreferrer"
                              className="flex items-center gap-1 text-[12px] font-semibold text-[#262262] hover:underline">
                              <Award size={13} /> View <ExternalLink size={10} />
                            </a>
                          : <span className="text-[12px] text-[var(--text-muted)]">—</span>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Log Training Panel */}
      <SlidePanel open={showForm} onClose={() => setShowForm(false)} title="Log Training Record" subtitle="Record a training, workshop, or certification" width="md">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <FieldLabel c="Staff Member *" />
            <select required value={form.profile_id} onChange={(e) => setForm((f) => ({ ...f, profile_id: e.target.value }))}
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-[14px] outline-none focus:border-[#262262] cursor-pointer">
              {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel c="Training Type *" />
            <select required value={form.training_type} onChange={(e) => setForm((f) => ({ ...f, training_type: e.target.value as TrainingType }))}
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-[14px] outline-none focus:border-[#262262] cursor-pointer capitalize">
              {TYPE_OPTIONS.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel c="Title / Topic *" />
            <input required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Inclusive Education Workshop"
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-[14px] outline-none focus:border-[#262262] focus:ring-2 focus:ring-[#262262]/10" />
          </div>
          <div>
            <FieldLabel c="Organizer" />
            <input value={form.organizer} onChange={(e) => setForm((f) => ({ ...f, organizer: e.target.value }))} placeholder="e.g. GES, MOESS, NGO"
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-[14px] outline-none focus:border-[#262262]" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel c="Start Date *" />
              <input type="date" required value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-[14px] outline-none focus:border-[#262262]" />
            </div>
            <div>
              <FieldLabel c="End Date" />
              <input type="date" min={form.start_date} value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-[14px] outline-none focus:border-[#262262]" />
            </div>
          </div>
          <div>
            <FieldLabel c="Location" />
            <input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="e.g. Accra, Online"
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-[14px] outline-none focus:border-[#262262]" />
          </div>
          <div>
            <FieldLabel c="Notes" />
            <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Additional details…"
              className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-[14px] outline-none focus:border-[#262262] resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 h-11 rounded-xl border border-[var(--border)] text-[14px] font-semibold text-[var(--text-muted)] hover:bg-[var(--neutral-50)] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 h-11 rounded-xl text-[14px] font-bold text-white disabled:opacity-60"
              style={{ background: GRADIENT }}>
              {submitting ? "Saving…" : "Save Record"}
            </button>
          </div>
        </form>
      </SlidePanel>
    </div>
  );
}
