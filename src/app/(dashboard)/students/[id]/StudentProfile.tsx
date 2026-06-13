"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  ArrowLeft, User, Users, CreditCard, ClipboardList, BarChart2,
  Phone, Edit3, Save, X, Plus, Trash2, CheckCircle2, AlertCircle, Clock,
} from "lucide-react";
import { formatDate, formatCurrency, getInitials, cn } from "@/lib/utils";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import type { Student, Parent, FeePayment, AttendanceRecord, ExamScore } from "@/types/database";

type Tab = "info" | "parents" | "fees" | "attendance" | "results";

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "default"> = {
  active: "success", inactive: "default", graduated: "brand" as never,
  transferred: "warning", withdrawn: "danger",
};
const ATT_ICON: Record<string, React.ReactNode> = {
  present: <CheckCircle2 size={13} className="text-[var(--success)]" />,
  absent: <AlertCircle size={13} className="text-[var(--danger)]" />,
  late: <Clock size={13} className="text-[var(--warning)]" />,
  excused: <Clock size={13} className="text-[var(--info)]" />,
};
const ATT_COLOR: Record<string, string> = {
  present: "var(--success)", absent: "var(--danger)", late: "var(--warning)", excused: "var(--info)",
};

interface ClassRoom { id: string; name: string; level: string; }

interface Props {
  student: Student & { classrooms: ClassRoom | null };
  parents: Parent[];
  fees: (FeePayment & { fee_types: { name: string } | null; terms: { name: string } | null })[];
  attendance: (Pick<AttendanceRecord, "date" | "status"> & { terms: { name: string } | { name: string }[] | null })[];
  scores: (ExamScore & { subjects: { name: string } | null; terms: { name: string } | null })[];
  classes: ClassRoom[];
  viewerRole: string;
}

export function StudentProfile({ student: initial, parents: initialParents, fees, attendance, scores, classes, viewerRole }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [tab, setTab] = useState<Tab>("info");
  const [student, setStudent] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: initial.first_name, middle_name: initial.middle_name ?? "",
    last_name: initial.last_name, date_of_birth: initial.date_of_birth ?? "",
    gender: initial.gender, class_id: initial.class_id ?? "",
    status: initial.status, previous_school: initial.previous_school ?? "",
    medical_notes: initial.medical_notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [parents, setParents] = useState(initialParents);
  const [addingParent, setAddingParent] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [parentForm, setParentForm] = useState({ full_name: "", phone: "", relationship: "Father", email: "", occupation: "", address: "" });
  const [savingParent, setSavingParent] = useState(false);

  const canEdit = ["headmaster", "owner", "teacher"].includes(viewerRole);
  const canSeeFinance = ["headmaster", "owner", "accountant"].includes(viewerRole);

  const totalDue = fees.reduce((s, f) => s + f.amount_due, 0);
  const totalPaid = fees.reduce((s, f) => s + f.amount_paid, 0);
  const totalBalance = totalDue - totalPaid;

  const presentCount = attendance.filter((a) => a.status === "present").length;
  const attRate = attendance.length > 0 ? Math.round((presentCount / attendance.length) * 100) : null;

  async function saveEdit() {
    setSaving(true);
    const { data, error } = await supabase
      .from("students")
      .update({
        first_name: editForm.first_name.trim(),
        middle_name: editForm.middle_name.trim() || null,
        last_name: editForm.last_name.trim(),
        date_of_birth: editForm.date_of_birth || null,
        gender: editForm.gender as "male" | "female",
        class_id: editForm.class_id || null,
        status: editForm.status as Student["status"],
        previous_school: editForm.previous_school.trim() || null,
        medical_notes: editForm.medical_notes.trim() || null,
      })
      .eq("id", student.id)
      .select("*, classrooms(id, name, level)")
      .single();
    setSaving(false);
    if (!error && data) { setStudent(data); setEditing(false); router.refresh(); }
  }

  async function saveParent(e: React.FormEvent) {
    e.preventDefault();
    setSavingParent(true);
    const { data, error } = await supabase
      .from("parents")
      .insert({
        school_id: student.school_id,
        student_id: student.id,
        full_name: parentForm.full_name.trim(),
        phone: parentForm.phone.trim(),
        relationship: parentForm.relationship,
        email: parentForm.email.trim() || null,
        occupation: parentForm.occupation.trim() || null,
        address: parentForm.address.trim() || null,
        is_primary: parents.length === 0,
      })
      .select()
      .single();
    setSavingParent(false);
    if (!error && data) {
      setParents((p) => [...p, data]);
      setAddingParent(false);
      setParentForm({ full_name: "", phone: "", relationship: "Father", email: "", occupation: "", address: "" });
    }
  }

  async function deleteParent(id: string) {
    await supabase.from("parents").delete().eq("id", id);
    setParents((p) => p.filter((x) => x.id !== id));
    setConfirmDelete(null);
  }

  const fullName = `${student.first_name}${student.middle_name ? ` ${student.middle_name}` : ""} ${student.last_name}`;

  return (
    <div className="max-w-4xl space-y-5">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/students">
          <Button variant="ghost" size="sm"><ArrowLeft size={14} /> Students</Button>
        </Link>
      </div>

      {/* Student card */}
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] p-5">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white shrink-0" style={{ background: "var(--gradient-brand)" }}>
            {getInitials(fullName)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-extrabold text-[var(--text-strong)]">{fullName}</h2>
              <Badge variant={STATUS_VARIANT[student.status] ?? "default"}>{student.status}</Badge>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-[var(--text-muted)]">
              <span className="font-mono">{student.admission_number}</span>
              <span>{student.classrooms?.name ?? "No class"}</span>
              <span className="capitalize">{student.gender}</span>
              {student.date_of_birth && <span>Born {formatDate(student.date_of_birth)}</span>}
              <span>Admitted {formatDate(student.admission_date)}</span>
            </div>
          </div>
          {canEdit && !editing && (
            <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
              <Edit3 size={13} /> Edit
            </Button>
          )}
          {editing && (
            <div className="flex gap-2">
              <Button size="sm" loading={saving} onClick={saveEdit}><Save size={13} /> Save</Button>
              <Button size="sm" variant="secondary" onClick={() => setEditing(false)}><X size={13} /></Button>
            </div>
          )}
        </div>

        {/* Quick stats */}
        {(canSeeFinance || attRate !== null) && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-[var(--border)]">
            {attRate !== null && (
              <>
                <div className="text-center">
                  <p className="text-xs text-[var(--text-muted)] mb-0.5">Attendance rate</p>
                  <p className={`text-lg font-extrabold font-mono ${attRate >= 75 ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>{attRate}%</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-[var(--text-muted)] mb-0.5">Days recorded</p>
                  <p className="text-lg font-extrabold font-mono text-[var(--text-strong)]">{attendance.length}</p>
                </div>
              </>
            )}
            {canSeeFinance && (
              <>
                <div className="text-center">
                  <p className="text-xs text-[var(--text-muted)] mb-0.5">Fees paid</p>
                  <p className="text-lg font-extrabold font-mono text-[var(--success)]">{formatCurrency(totalPaid)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-[var(--text-muted)] mb-0.5">Balance</p>
                  <p className={`text-lg font-extrabold font-mono ${totalBalance > 0 ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>{formatCurrency(totalBalance)}</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap">
        {([
          { id: "info", label: "Profile", icon: User },
          { id: "parents", label: "Parents", icon: Users },
          ...(canSeeFinance ? [{ id: "fees", label: "Fees", icon: CreditCard }] : []),
          { id: "attendance", label: "Attendance", icon: ClipboardList },
          { id: "results", label: "Results", icon: BarChart2 },
        ] as { id: Tab; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-[15px] font-medium transition-all",
              tab === id
                ? "bg-[var(--brand)] text-white"
                : "text-[var(--text-muted)] hover:text-[var(--text-body)] hover:bg-[var(--neutral-100)]",
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "info" && (
        <Card>
          {editing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input label="First name" required value={editForm.first_name} onChange={(e) => setEditForm((f) => ({ ...f, first_name: e.target.value }))} />
                <Input label="Middle name" value={editForm.middle_name} onChange={(e) => setEditForm((f) => ({ ...f, middle_name: e.target.value }))} />
                <Input label="Last name" required value={editForm.last_name} onChange={(e) => setEditForm((f) => ({ ...f, last_name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input label="Date of birth" type="date" value={editForm.date_of_birth} onChange={(e) => setEditForm((f) => ({ ...f, date_of_birth: e.target.value }))} />
                <Select label="Gender" value={editForm.gender} onChange={(e) => setEditForm((f) => ({ ...f, gender: e.target.value as "male" | "female" }))} options={[{ value: "male", label: "Male" }, { value: "female", label: "Female" }]} />
                <Select label="Status" value={editForm.status} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as Student["status"] }))} options={["active","inactive","graduated","transferred","withdrawn"].map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }))} />
              </div>
              <Select
                label="Class"
                value={editForm.class_id}
                onChange={(e) => setEditForm((f) => ({ ...f, class_id: e.target.value }))}
                options={classes.map((c) => ({ value: c.id, label: `${c.name} (${c.level})` }))}
                placeholder="Select class"
              />
              <Input label="Previous school" value={editForm.previous_school} onChange={(e) => setEditForm((f) => ({ ...f, previous_school: e.target.value }))} />
              <div>
                <label className="text-sm font-semibold text-[var(--text-strong)] block mb-1.5">Medical notes</label>
                <textarea className="w-full rounded-[10px] border border-[var(--border)] p-3 text-sm outline-none focus:border-[var(--ring)] resize-none" rows={3} value={editForm.medical_notes} onChange={(e) => setEditForm((f) => ({ ...f, medical_notes: e.target.value }))} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-4">
              {[
                ["Admission number", student.admission_number, true],
                ["Full name", fullName],
                ["Gender", student.gender.charAt(0).toUpperCase() + student.gender.slice(1)],
                ["Date of birth", student.date_of_birth ? formatDate(student.date_of_birth) : "—"],
                ["Class", student.classrooms?.name ?? "—"],
                ["Status", student.status],
                ["Admission date", formatDate(student.admission_date)],
                ["Previous school", student.previous_school ?? "—"],
                ["Medical notes", student.medical_notes ?? "—"],
              ].map(([label, value, mono]) => (
                <div key={label as string} className="flex flex-col gap-0.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">{label as string}</p>
                  <p className={`text-sm text-[var(--text-strong)] ${mono ? "font-mono" : ""}`}>{value as string}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === "parents" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm font-semibold text-[var(--text-muted)]">{parents.length} parent / guardian{parents.length !== 1 ? "s" : ""}</p>
            {canEdit && (
              <Button size="sm" variant="secondary" onClick={() => setAddingParent((v) => !v)}>
                <Plus size={13} /> Add parent
              </Button>
            )}
          </div>

          {addingParent && (
            <Card>
              <p className="text-sm font-semibold text-[var(--text-strong)] mb-4">Add parent / guardian</p>
              <form onSubmit={saveParent} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input label="Full name" required value={parentForm.full_name} onChange={(e) => setParentForm((f) => ({ ...f, full_name: e.target.value }))} />
                  <Input label="Phone" type="tel" required value={parentForm.phone} onChange={(e) => setParentForm((f) => ({ ...f, phone: e.target.value }))} placeholder="024 000 0000" />
                  <Select label="Relationship" value={parentForm.relationship} onChange={(e) => setParentForm((f) => ({ ...f, relationship: e.target.value }))} options={["Father","Mother","Guardian","Uncle","Aunt","Grandparent","Other"].map((r) => ({ value: r, label: r }))} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input label="Email" type="email" value={parentForm.email} onChange={(e) => setParentForm((f) => ({ ...f, email: e.target.value }))} />
                  <Input label="Occupation" value={parentForm.occupation} onChange={(e) => setParentForm((f) => ({ ...f, occupation: e.target.value }))} />
                  <Input label="Address" value={parentForm.address} onChange={(e) => setParentForm((f) => ({ ...f, address: e.target.value }))} />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" loading={savingParent}>Save</Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => setAddingParent(false)}>Cancel</Button>
                </div>
              </form>
            </Card>
          )}

          {parents.length === 0 && !addingParent && (
            <Card><p className="text-sm text-[var(--text-muted)] text-center py-6">No parents or guardians added yet.</p></Card>
          )}

          <div className="space-y-3">
            {parents.map((p) => (
              <Card key={p.id}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[var(--brand-subtle)] flex items-center justify-center shrink-0">
                    <User size={16} className="text-[var(--brand)]" />
                  </div>
                  <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
                    {[
                      ["Name", p.full_name],
                      ["Relationship", p.relationship],
                      ["Phone", p.phone],
                      ["Email", p.email ?? "—"],
                      ["Occupation", p.occupation ?? "—"],
                      ["Address", p.address ?? "—"],
                    ].map(([label, val]) => (
                      <div key={label}>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">{label}</p>
                        <p className="text-sm text-[var(--text-strong)]">{val}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {p.is_primary && <Badge variant="brand">Primary</Badge>}
                    {canEdit && (
                      <button onClick={() => setConfirmDelete(p.id)} className="text-[var(--text-subtle)] hover:text-[var(--danger)] transition-colors">
                        <Trash2 size={14} />
                      </button>
                    )}
                    <a href={`tel:${p.phone}`} className="text-[var(--brand)] hover:underline">
                      <Phone size={14} />
                    </a>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === "fees" && canSeeFinance && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total due", value: formatCurrency(totalDue), color: "var(--text-strong)" },
              { label: "Total paid", value: formatCurrency(totalPaid), color: "var(--success)" },
              { label: "Balance", value: formatCurrency(totalBalance), color: totalBalance > 0 ? "var(--danger)" : "var(--success)" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl border border-[var(--border)] p-4 shadow-[var(--shadow-sm)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-1">{s.label}</p>
                <p className="text-xl font-extrabold font-mono" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>

          <Card padding="none">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    {["Fee type", "Term", "Due", "Paid", "Balance", "Status"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {fees.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-[var(--text-muted)]">No fee records yet.</td></tr>
                  )}
                  {fees.map((f) => (
                    <tr key={f.id} className="hover:bg-[var(--neutral-50)]">
                      <td className="px-4 py-3 font-medium text-[var(--text-strong)]">{f.fee_types?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">{f.terms?.name ?? "—"}</td>
                      <td className="px-4 py-3 font-mono text-[var(--text-body)]">{formatCurrency(f.amount_due)}</td>
                      <td className="px-4 py-3 font-mono text-[var(--success)]">{formatCurrency(f.amount_paid)}</td>
                      <td className="px-4 py-3 font-mono" style={{ color: f.balance > 0 ? "var(--danger)" : "var(--success)" }}>{formatCurrency(f.balance)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={f.payment_status === "paid" ? "success" : f.payment_status === "partial" ? "warning" : "danger"}>
                          {f.payment_status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {tab === "attendance" && (
        <div className="space-y-4">
          {attRate !== null && (
            <div className="flex gap-4">
              {[
                { label: "Attendance rate", value: `${attRate}%`, color: attRate >= 75 ? "var(--success)" : "var(--danger)" },
                { label: "Days present", value: presentCount, color: "var(--success)" },
                { label: "Days absent", value: attendance.filter((a) => a.status === "absent").length, color: "var(--danger)" },
                { label: "Total recorded", value: attendance.length, color: "var(--text-strong)" },
              ].map((s) => (
                <div key={s.label} className="bg-white rounded-2xl border border-[var(--border)] p-4 shadow-[var(--shadow-sm)] flex-1 text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-1">{s.label}</p>
                  <p className="text-xl font-extrabold font-mono" style={{ color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>
          )}

          <Card padding="none">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    {["Date", "Status", "Term"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {attendance.length === 0 && (
                    <tr><td colSpan={3} className="px-4 py-10 text-center text-sm text-[var(--text-muted)]">No attendance records yet.</td></tr>
                  )}
                  {attendance.map((a, i) => (
                    <tr key={i} className="hover:bg-[var(--neutral-50)]">
                      <td className="px-4 py-3 text-[var(--text-muted)]">{formatDate(a.date)}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5 font-medium capitalize" style={{ color: ATT_COLOR[a.status] }}>
                          {ATT_ICON[a.status]}{a.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">{Array.isArray(a.terms) ? a.terms[0]?.name : a.terms?.name ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {tab === "results" && (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {["Subject", "Term", "Class score", "Exam score", "Total", "Grade", "Position", "Remark"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {scores.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-[var(--text-muted)]">No exam results yet.</td></tr>
                )}
                {scores.map((s) => (
                  <tr key={s.id} className="hover:bg-[var(--neutral-50)]">
                    <td className="px-4 py-3 font-medium text-[var(--text-strong)]">{s.subjects?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">{s.terms?.name ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-center">{s.class_score ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-center">{s.exam_score ?? "—"}</td>
                    <td className="px-4 py-3 font-mono font-bold text-center text-[var(--text-strong)]">{s.total ?? "—"}</td>
                    <td className="px-4 py-3">
                      {s.grade && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          ["A1","A"].includes(s.grade ?? "") ? "bg-[var(--success-bg)] text-[var(--success)]" :
                          ["B2","B3","B"].includes(s.grade ?? "") ? "bg-[var(--info-bg)] text-[var(--info)]" :
                          ["C4","C5","C6","C"].includes(s.grade ?? "") ? "bg-[var(--amber-50)] text-[var(--amber-600)]" :
                          "bg-[var(--danger-bg)] text-[var(--danger)]"
                        }`}>{s.grade}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-[var(--text-muted)]">{s.position ?? "—"}</td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">{s.remark ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <ConfirmModal
        open={!!confirmDelete}
        title="Remove parent / guardian"
        message="Are you sure you want to remove this parent or guardian from the student record?"
        confirmLabel="Remove"
        danger
        onConfirm={() => confirmDelete && deleteParent(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
