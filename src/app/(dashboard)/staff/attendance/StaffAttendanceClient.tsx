"use client";

import { useState, useMemo } from "react";
import { formatDate } from "@/lib/utils";
import { ClipboardList, UserCheck, UserX, Clock, Search, Save, AlertCircle } from "lucide-react";

const GRADIENT = "linear-gradient(135deg, #262262, #92278F)";

const STATUS_OPTIONS = [
  { value: "present",  label: "Present",  color: "#16A34A", bg: "#F0FDF4" },
  { value: "absent",   label: "Absent",   color: "#DC2626", bg: "#FEF2F2" },
  { value: "late",     label: "Late",     color: "#D97706", bg: "#FFFBEB" },
  { value: "half_day", label: "Half Day", color: "#7C3AED", bg: "#F5F3FF" },
  { value: "on_leave", label: "On Leave", color: "#0284C7", bg: "#EFF6FF" },
] as const;

type AttStatus = "present" | "absent" | "late" | "half_day" | "on_leave";

interface StaffMember { id: string; full_name: string; role: string }
interface AttEntry { id?: string; status: AttStatus; check_in?: string; check_out?: string; note?: string }

interface Props {
  schoolId: string; userId: string; role: string; isAdmin: boolean;
  staff: StaffMember[];
  initialAttMap: Record<string, { id?: string; status: string; check_in?: string; check_out?: string; note?: string }>;
  today: string;
  tableNotReady: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  headmaster: "Headmaster", teacher: "Teacher", accountant: "Accountant",
  secretary: "Secretary", receptionist: "Receptionist", owner: "Owner",
};

export function StaffAttendanceClient({ schoolId, userId, isAdmin, staff, initialAttMap, today, tableNotReady }: Props) {
  const [attMap, setAttMap] = useState<Record<string, AttEntry>>(() => {
    const m: Record<string, AttEntry> = {};
    for (const s of staff) {
      m[s.id] = {
        id: initialAttMap[s.id]?.id,
        status: (initialAttMap[s.id]?.status ?? "present") as AttStatus,
        check_in: initialAttMap[s.id]?.check_in ?? "",
        check_out: initialAttMap[s.id]?.check_out ?? "",
        note: initialAttMap[s.id]?.note ?? "",
      };
    }
    return m;
  });
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [viewDate, setViewDate] = useState(today);
  const [historyData, setHistoryData] = useState<Record<string, AttEntry> | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const displayMap = viewDate === today ? attMap : (historyData ?? {});

  async function loadHistory(date: string) {
    if (date === today) { setHistoryData(null); return; }
    setLoadingHistory(true);
    const res = await fetch(`/api/admin/staff/attendance?schoolId=${schoolId}&date=${date}`);
    const json = await res.json();
    const m: Record<string, AttEntry> = {};
    for (const a of (json.data ?? [])) {
      m[a.profile_id] = { id: a.id, status: a.status, check_in: a.check_in, check_out: a.check_out, note: a.note };
    }
    setHistoryData(m);
    setLoadingHistory(false);
  }

  function setStatus(profileId: string, status: AttStatus) {
    setAttMap((m) => ({ ...m, [profileId]: { ...m[profileId], status } }));
  }

  const filtered = useMemo(() => {
    return staff.filter((s) => {
      const matchSearch = s.full_name.toLowerCase().includes(search.toLowerCase()) ||
        (ROLE_LABELS[s.role] ?? s.role).toLowerCase().includes(search.toLowerCase());
      const currentStatus = displayMap[s.id]?.status;
      const matchFilter = filterStatus === "all" || currentStatus === filterStatus;
      return matchSearch && matchFilter;
    });
  }, [staff, search, filterStatus, displayMap]);

  async function saveAttendance() {
    setSaving(true);
    const records = staff.map((s) => ({
      profile_id: s.id,
      status: attMap[s.id]?.status ?? "present",
      check_in: attMap[s.id]?.check_in || null,
      check_out: attMap[s.id]?.check_out || null,
      note: attMap[s.id]?.note || null,
    }));
    await fetch("/api/admin/staff/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schoolId, date: today, records, marked_by: userId }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function markAll(status: AttStatus) {
    const updated = { ...attMap };
    for (const s of staff) updated[s.id] = { ...updated[s.id], status };
    setAttMap(updated);
  }

  const presentCount = staff.filter((s) => ["present", "late"].includes(attMap[s.id]?.status ?? "")).length;
  const absentCount = staff.filter((s) => attMap[s.id]?.status === "absent").length;
  const leaveCount  = staff.filter((s) => attMap[s.id]?.status === "on_leave").length;

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[22px] font-extrabold text-[var(--text-strong)]">Staff Attendance</h2>
          <p className="text-[14px] text-[var(--text-muted)] mt-0.5">{formatDate(today)}</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="date" value={viewDate} max={today}
            onChange={(e) => { setViewDate(e.target.value); loadHistory(e.target.value); }}
            className="h-10 rounded-xl border border-[var(--border)] px-3 text-[13px] outline-none focus:border-[#262262]" />
          {isAdmin && viewDate === today && (
            <button onClick={saveAttendance} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-bold text-white disabled:opacity-60 hover:opacity-90"
              style={{ background: GRADIENT }}>
              <Save size={15} /> {saving ? "Saving…" : saved ? "Saved ✓" : "Save Attendance"}
            </button>
          )}
        </div>
      </div>

      {tableNotReady && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-bold text-amber-800 text-[14px]">Run the SQL migration first</p>
            <p className="text-[12px] text-amber-700">The attendance table doesn't exist yet. Run <code className="bg-amber-100 px-1 rounded">supabase/migrations/staff_lifecycle.sql</code> in Supabase.</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Present / Late", value: presentCount, icon: UserCheck, bg: "#F0FDF4", color: "#16A34A" },
          { label: "Absent",         value: absentCount,  icon: UserX,    bg: "#FEF2F2", color: "#DC2626" },
          { label: "On Leave",       value: leaveCount,   icon: Clock,    bg: "#FFFBEB", color: "#D97706" },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-[0_1px_6px_rgba(0,0,0,0.05)] flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: c.bg }}>
              <c.icon size={22} style={{ color: c.color }} />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">{c.label}</p>
              <p className="text-[28px] font-extrabold text-[var(--text-strong)] leading-tight">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters + Quick mark-all */}
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[0_1px_6px_rgba(0,0,0,0.05)] p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search staff…"
            className="h-9 w-full pl-9 pr-3 rounded-xl border border-[var(--border)] text-[13px] outline-none focus:border-[#262262]" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="h-9 rounded-xl border border-[var(--border)] px-3 text-[13px] outline-none focus:border-[#262262] cursor-pointer">
          <option value="all">All Status</option>
          {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        {isAdmin && viewDate === today && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[12px] text-[var(--text-muted)] font-semibold">Mark all:</span>
            {["present", "absent"].map((s) => (
              <button key={s} onClick={() => markAll(s as AttStatus)}
                className="px-3 py-1.5 rounded-lg text-[12px] font-bold border transition-colors capitalize"
                style={{
                  borderColor: STATUS_OPTIONS.find(o => o.value === s)?.color,
                  color: STATUS_OPTIONS.find(o => o.value === s)?.color,
                }}>
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Attendance Table */}
      {loadingHistory ? (
        <div className="py-12 text-center text-[14px] text-[var(--text-muted)]">Loading…</div>
      ) : (
        <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[0_1px_6px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--neutral-50)]">
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Staff Member</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Role</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide w-[320px]">Status</th>
                  {isAdmin && viewDate === today && (
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Check In / Out</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center text-[13px] text-[var(--text-muted)]">
                      <ClipboardList size={28} className="mx-auto mb-2 opacity-20" /> No staff found
                    </td>
                  </tr>
                ) : filtered.map((s) => {
                  const entry = displayMap[s.id];
                  const status = (entry?.status ?? "present") as AttStatus;
                  const opt = STATUS_OPTIONS.find((o) => o.value === status);
                  const isEditable = isAdmin && viewDate === today;

                  return (
                    <tr key={s.id} className="hover:bg-[var(--neutral-50)] transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[12px] font-extrabold text-white shrink-0"
                            style={{ background: GRADIENT }}>
                            {s.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-[14px] font-semibold text-[var(--text-strong)]">{s.full_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-[13px] text-[var(--text-muted)]">{ROLE_LABELS[s.role] ?? s.role}</td>
                      <td className="px-5 py-4">
                        {isEditable ? (
                          <div className="flex gap-1.5 flex-wrap">
                            {STATUS_OPTIONS.map((o) => (
                              <button key={o.value} onClick={() => setStatus(s.id, o.value)}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border"
                                style={status === o.value
                                  ? { background: o.bg, color: o.color, borderColor: o.color }
                                  : { background: "transparent", color: "#9CA3AF", borderColor: "#E5E7EB" }}>
                                {o.label}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="inline-block px-3 py-1 rounded-lg text-[12px] font-bold"
                            style={{ background: opt?.bg ?? "#F9FAFB", color: opt?.color ?? "#6B7280" }}>
                            {opt?.label ?? status}
                          </span>
                        )}
                      </td>
                      {isEditable && (
                        <td className="px-5 py-4">
                          <div className="flex gap-2">
                            <input type="time" value={attMap[s.id]?.check_in ?? ""}
                              onChange={(e) => setAttMap((m) => ({ ...m, [s.id]: { ...m[s.id], check_in: e.target.value } }))}
                              className="h-8 w-[100px] rounded-lg border border-[var(--border)] px-2 text-[12px] outline-none focus:border-[#262262]" />
                            <input type="time" value={attMap[s.id]?.check_out ?? ""}
                              onChange={(e) => setAttMap((m) => ({ ...m, [s.id]: { ...m[s.id], check_out: e.target.value } }))}
                              className="h-8 w-[100px] rounded-lg border border-[var(--border)] px-2 text-[12px] outline-none focus:border-[#262262]" />
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
