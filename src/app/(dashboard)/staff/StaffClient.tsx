"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { getInitials, formatDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { UserPlus, Pencil, UserX, UserCheck, ShieldCheck, Eye, EyeOff } from "lucide-react";

const ROLES = [
  { value: "teacher", label: "Teacher" },
  { value: "class_teacher", label: "Class Teacher" },
  { value: "accountant", label: "Accountant" },
  { value: "secretary", label: "Secretary" },
  { value: "headmaster", label: "Headmaster" },
];

const roleColors: Record<string, string> = {
  teacher: "var(--brand)", class_teacher: "var(--accent)",
  accountant: "var(--success)", secretary: "var(--warning)", headmaster: "var(--danger)",
};
const roleBgs: Record<string, string> = {
  teacher: "var(--brand-subtle)", class_teacher: "#f3e8ff",
  accountant: "var(--success-bg)", secretary: "var(--warning-bg)", headmaster: "var(--danger-bg)",
};

interface StaffMember {
  id: string; full_name: string; username: string; role: string;
  phone: string | null; is_active: boolean; created_at: string;
}

interface Props {
  initialStaff: StaffMember[];
  schoolId: string;
  isHeadmaster: boolean;
}

const emptyForm = { full_name: "", username: "", role: "teacher", phone: "", password: "" };

export function StaffClient({ initialStaff, schoolId, isHeadmaster }: Props) {
  const supabase = createClient();
  const [staff, setStaff] = useState(initialStaff);
  const [showAdd, setShowAdd] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState<StaffMember | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);

  function f(k: string, v: string) { setForm((p) => ({ ...p, [k]: v })); }

  async function addStaff(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!form.password || form.password.length < 6) { setErr("Password must be at least 6 characters."); return; }
    setSaving(true);
    const res = await fetch("/api/admin/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, school_id: schoolId }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) { setErr(json.error ?? "Failed to create staff."); return; }
    // Fetch the new profile
    const { data: newProfile } = await supabase.from("profiles")
      .select("id, full_name, username, role, phone, is_active, created_at")
      .eq("id", json.id).single();
    if (newProfile) setStaff((s) => [...s, newProfile].sort((a, b) => a.full_name.localeCompare(b.full_name)));
    setShowAdd(false);
    setForm(emptyForm);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingStaff) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: form.full_name.trim(),
      role: form.role,
      phone: form.phone.trim() || null,
    }).eq("id", editingStaff.id);
    setSaving(false);
    if (error) { setErr(error.message); return; }
    setStaff((s) => s.map((x) => x.id === editingStaff.id
      ? { ...x, full_name: form.full_name.trim(), role: form.role, phone: form.phone.trim() || null }
      : x
    ).sort((a, b) => a.full_name.localeCompare(b.full_name)));
    setEditingStaff(null);
  }

  async function toggleActive(member: StaffMember) {
    const newActive = !member.is_active;
    await supabase.from("profiles").update({ is_active: newActive }).eq("id", member.id);
    setStaff((s) => s.map((x) => x.id === member.id ? { ...x, is_active: newActive } : x));
    setConfirmDeactivate(null);
  }

  function openEdit(member: StaffMember) {
    setEditingStaff(member);
    setForm({ full_name: member.full_name, username: member.username, role: member.role, phone: member.phone ?? "", password: "" });
    setErr(null);
  }

  const activeCount = staff.filter((s) => s.is_active).length;

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-strong)]">Staff</h2>
          <p className="text-[15px] text-[var(--text-muted)]">{activeCount} active · {staff.length} total</p>
        </div>
        {isHeadmaster && (
          <Button onClick={() => { setShowAdd(true); setForm(emptyForm); setErr(null); }}>
            <UserPlus size={15} /> Add staff
          </Button>
        )}
      </div>

      {/* Role summary */}
      {staff.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {ROLES.filter((r) => staff.some((s) => s.role === r.value)).map((r) => {
            const count = staff.filter((s) => s.role === r.value).length;
            return (
              <div key={r.value} className="px-3 py-1.5 rounded-full text-[13px] font-semibold"
                style={{ background: roleBgs[r.value], color: roleColors[r.value] }}>
                {count} {r.label}{count > 1 ? "s" : ""}
              </div>
            );
          })}
        </div>
      )}

      {staff.length === 0 && (
        <Card>
          <p className="text-[15px] text-[var(--text-muted)] text-center py-6">
            No staff added yet.{isHeadmaster ? " Click "Add staff" to get started." : ""}
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {staff.map((member) => (
          <div key={member.id}
            className={`bg-white border rounded-[14px] p-4 flex gap-3 shadow-[var(--shadow-sm)] transition-opacity ${!member.is_active ? "opacity-60" : ""}`}
            style={{ borderColor: "var(--border)" }}>
            {/* Avatar */}
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-[13px] font-bold text-white shrink-0"
              style={{ background: member.is_active ? "var(--gradient-brand)" : "var(--neutral-300)" }}>
              {getInitials(member.full_name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[15px] font-bold text-[var(--text-strong)] truncate">{member.full_name}</p>
                  <p className="text-xs text-[var(--text-muted)]">@{member.username}</p>
                </div>
                {isHeadmaster && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(member)} title="Edit"
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--text-subtle)] hover:text-[var(--brand)] hover:bg-[var(--brand-subtle)] transition-all">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => setConfirmDeactivate(member)}
                      title={member.is_active ? "Deactivate" : "Activate"}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--text-subtle)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] transition-all">
                      {member.is_active ? <UserX size={13} /> : <UserCheck size={13} />}
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-semibold"
                  style={{ background: roleBgs[member.role] ?? "var(--neutral-100)", color: roleColors[member.role] ?? "var(--text-muted)" }}>
                  <ShieldCheck size={11} />
                  {ROLES.find((r) => r.value === member.role)?.label ?? member.role}
                </span>
                {!member.is_active && (
                  <span className="text-[12px] font-semibold text-[var(--text-muted)] bg-[var(--neutral-100)] px-2 py-0.5 rounded-full">Inactive</span>
                )}
                {member.phone && <span className="text-[12px] text-[var(--text-muted)]">{member.phone}</span>}
              </div>
              <p className="text-[11px] text-[var(--text-subtle)] mt-1">Joined {formatDate(member.created_at)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Add staff modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add staff member">
        <form onSubmit={addStaff} className="space-y-4">
          <Input label="Full name" value={form.full_name} onChange={(e) => f("full_name", e.target.value)} required placeholder="e.g. Kwame Asante" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Username" value={form.username} onChange={(e) => f("username", e.target.value.toLowerCase().replace(/\s/g, ""))} required placeholder="e.g. kwame.asante" />
            <div className="flex flex-col gap-1.5">
              <label className="text-[15px] font-semibold text-[var(--text-strong)]">Role</label>
              <select value={form.role} onChange={(e) => f("role", e.target.value)}
                className="h-11 rounded-[10px] border border-[var(--border)] bg-white px-3 text-[15px] text-[var(--text-strong)] outline-none focus:border-[var(--ring)]">
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>
          <Input label="Phone number (optional)" value={form.phone} onChange={(e) => f("phone", e.target.value)} placeholder="+233 …" />
          <div className="relative">
            <Input label="Password" type={showPwd ? "text" : "password"} value={form.password}
              onChange={(e) => f("password", e.target.value)} required placeholder="Min. 6 characters" />
            <button type="button" onClick={() => setShowPwd((v) => !v)}
              className="absolute right-3 top-9 text-[var(--text-muted)] hover:text-[var(--text-strong)]">
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {err && <p className="text-[15px] text-[var(--danger)]">{err}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Create account</Button>
          </div>
        </form>
      </Modal>

      {/* Edit staff modal */}
      <Modal open={!!editingStaff} onClose={() => setEditingStaff(null)} title="Edit staff member">
        {editingStaff && (
          <form onSubmit={saveEdit} className="space-y-4">
            <Input label="Full name" value={form.full_name} onChange={(e) => f("full_name", e.target.value)} required />
            <div className="flex flex-col gap-1.5">
              <label className="text-[15px] font-semibold text-[var(--text-strong)]">Role</label>
              <select value={form.role} onChange={(e) => f("role", e.target.value)}
                className="h-11 rounded-[10px] border border-[var(--border)] bg-white px-3 text-[15px] text-[var(--text-strong)] outline-none focus:border-[var(--ring)]">
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <Input label="Phone number" value={form.phone} onChange={(e) => f("phone", e.target.value)} placeholder="+233 …" />
            <p className="text-[13px] text-[var(--text-muted)]">Username cannot be changed after creation.</p>
            {err && <p className="text-[15px] text-[var(--danger)]">{err}</p>}
            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="secondary" onClick={() => setEditingStaff(null)}>Cancel</Button>
              <Button type="submit" loading={saving}>Save changes</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Confirm deactivate/activate */}
      <ConfirmModal
        open={!!confirmDeactivate}
        title={confirmDeactivate?.is_active ? "Deactivate staff?" : "Activate staff?"}
        message={confirmDeactivate?.is_active
          ? `${confirmDeactivate?.full_name} will lose access to the system. You can reactivate them at any time.`
          : `${confirmDeactivate?.full_name} will regain access to the system.`
        }
        confirmLabel={confirmDeactivate?.is_active ? "Deactivate" : "Activate"}
        danger={confirmDeactivate?.is_active}
        onConfirm={() => confirmDeactivate && toggleActive(confirmDeactivate)}
        onCancel={() => setConfirmDeactivate(null)}
      />
    </div>
  );
}
