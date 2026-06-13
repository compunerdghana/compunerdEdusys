"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/ui/Modal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { getInitials, formatDate } from "@/lib/utils";
import { UserPlus, Search, X, Phone, Mail, ShieldCheck, Pencil, UserX, UserCheck, Eye, EyeOff, MapPin, Banknote, CreditCard, Landmark } from "lucide-react";

const ROLES = [
  { value: "teacher", label: "Teacher" },
  { value: "class_teacher", label: "Class Teacher" },
  { value: "accountant", label: "Accountant" },
  { value: "secretary", label: "Secretary" },
  { value: "headmaster", label: "Headmaster" },
];

const ROLE_STYLE: Record<string, { bg: string; text: string }> = {
  teacher:       { bg: "#ede9fe", text: "#5b21b6" },
  class_teacher: { bg: "#f3e8ff", text: "#7e22ce" },
  accountant:    { bg: "#d1fae5", text: "#065f46" },
  secretary:     { bg: "#fef3c7", text: "#92400e" },
  headmaster:    { bg: "#fce7f3", text: "#be185d" },
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

const EMPTY_FORM = {
  // Basic
  full_name: "", username: "", role: "teacher", password: "", phone: "",
  // Personal
  gender: "", date_of_birth: "", address: "", qualification: "", date_joined: "",
  // Bank
  bank_name: "", bank_account_number: "", bank_account_name: "", bank_branch: "", momo_number: "",
};

type FormTab = "basic" | "personal" | "bank";

export function StaffClient({ initialStaff, schoolId, isHeadmaster }: Props) {
  const supabase = createClient();
  const [staff, setStaff] = useState(initialStaff);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [addTab, setAddTab] = useState<FormTab>("basic");
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [selected, setSelected] = useState<StaffMember | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState<StaffMember | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);

  function f(k: string, v: string) { setForm((p) => ({ ...p, [k]: v })); }

  const filtered = staff.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.full_name.toLowerCase().includes(q) || s.username.toLowerCase().includes(q) || s.role.toLowerCase().includes(q);
  });

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
    const { data: newProfile } = await supabase.from("profiles")
      .select("id, full_name, username, role, phone, is_active, created_at")
      .eq("id", json.id).single();
    if (newProfile) setStaff((s) => [...s, newProfile].sort((a, b) => a.full_name.localeCompare(b.full_name)));
    setShowAdd(false);
    setForm(EMPTY_FORM);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingStaff) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: form.full_name.trim(), role: form.role, phone: form.phone.trim() || null,
    }).eq("id", editingStaff.id);
    setSaving(false);
    if (error) { setErr(error.message); return; }
    setStaff((s) => s.map((x) => x.id === editingStaff.id
      ? { ...x, full_name: form.full_name.trim(), role: form.role, phone: form.phone.trim() || null }
      : x).sort((a, b) => a.full_name.localeCompare(b.full_name)));
    setEditingStaff(null);
  }

  async function toggleActive(member: StaffMember) {
    await supabase.from("profiles").update({ is_active: !member.is_active }).eq("id", member.id);
    setStaff((s) => s.map((x) => x.id === member.id ? { ...x, is_active: !member.is_active } : x));
    setConfirmDeactivate(null);
    if (selected?.id === member.id) setSelected((p) => p ? { ...p, is_active: !p.is_active } : null);
  }

  const TAB_LABELS: { key: FormTab; label: string }[] = [
    { key: "basic", label: "Account" },
    { key: "personal", label: "Personal" },
    { key: "bank", label: "Bank / MoMo" },
  ];

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-strong)]">Staff</h2>
          <p className="text-[13px] text-[var(--text-muted)]">{staff.filter((s) => s.is_active).length} active · {staff.length} total</p>
        </div>
        {isHeadmaster && (
          <button onClick={() => { setShowAdd(true); setForm(EMPTY_FORM); setErr(null); setAddTab("basic"); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[14px] font-semibold text-white hover:opacity-90 shadow-sm"
            style={{ background: "linear-gradient(135deg, #262262, #92278F)" }}>
            <UserPlus size={15} /> Add Staff
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search staff…"
          className="w-full h-10 pl-9 pr-3 rounded-xl border border-[var(--border)] bg-white text-[14px] outline-none focus:border-[var(--ring)]" />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[var(--border)] py-16 text-center">
          <p className="text-[14px] font-semibold text-[var(--text-strong)]">No staff found</p>
          <p className="text-[13px] text-[var(--text-muted)] mt-1">{search ? "Try a different search." : isHeadmaster ? 'Click "Add Staff" to get started.' : ""}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((member) => {
            const rs = ROLE_STYLE[member.role] ?? { bg: "#f3f4f6", text: "#374151" };
            return (
              <div key={member.id} onClick={() => setSelected(member)}
                className={`bg-white rounded-2xl border border-[var(--border)] p-4 flex flex-col items-center gap-2 cursor-pointer hover:shadow-md transition-all ${!member.is_active ? "opacity-50" : ""}`}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white"
                  style={{ background: member.is_active ? "linear-gradient(135deg, #262262, #92278F)" : "#9ca3af" }}>
                  {getInitials(member.full_name)}
                </div>
                <div className="text-center">
                  <p className="text-[13px] font-bold text-[var(--text-strong)] leading-tight">{member.full_name}</p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">@{member.username}</p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: rs.bg, color: rs.text }}>
                  {ROLES.find((r) => r.value === member.role)?.label ?? member.role}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Staff Profile Modal — centered */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <p className="text-[13px] font-semibold text-[var(--text-muted)]">Staff Profile</p>
              <div className="flex gap-1">
                {isHeadmaster && (
                  <>
                    <button onClick={() => { setEditingStaff(selected); setForm({ ...EMPTY_FORM, full_name: selected.full_name, username: selected.username, role: selected.role, phone: selected.phone ?? "" }); setSelected(null); }}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--neutral-100)] text-[var(--text-muted)]">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => { setConfirmDeactivate(selected); setSelected(null); }}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--danger-bg)] text-[var(--text-muted)] hover:text-[var(--danger)]">
                      {selected.is_active ? <UserX size={13} /> : <UserCheck size={13} />}
                    </button>
                  </>
                )}
                <button onClick={() => setSelected(null)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[var(--neutral-100)] text-[var(--text-muted)]">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Avatar + name */}
            <div className="flex flex-col items-center px-5 pb-4">
              <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white mb-3"
                style={{ background: selected.is_active ? "linear-gradient(135deg, #262262, #92278F)" : "#9ca3af" }}>
                {getInitials(selected.full_name)}
              </div>
              <h3 className="text-[17px] font-bold text-[var(--text-strong)]">{selected.full_name}</h3>
              <p className="text-[13px] text-[var(--text-muted)]">@{selected.username}</p>
              <div className="flex gap-2 mt-2">
                {(() => { const rs = ROLE_STYLE[selected.role] ?? { bg: "#f3f4f6", text: "#374151" }; return (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-semibold" style={{ background: rs.bg, color: rs.text }}>
                    <ShieldCheck size={11} /> {ROLES.find((r) => r.value === selected.role)?.label ?? selected.role}
                  </span>
                ); })()}
                {!selected.is_active && <span className="px-2.5 py-1 rounded-full text-[12px] font-semibold bg-[var(--neutral-100)] text-[var(--text-muted)]">Inactive</span>}
              </div>
            </div>

            {/* Contact */}
            <div className="border-t border-[var(--border)] px-5 py-3 flex gap-3">
              {selected.phone && (
                <div className="flex items-center gap-2 text-[13px] text-[var(--text-muted)]">
                  <Phone size={13} className="text-[#92278F]" /> {selected.phone}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="border-t border-[var(--border)] px-5 py-4">
              <p className="text-[13px] font-bold text-[var(--text-strong)] mb-3">Details</p>
              <div className="grid grid-cols-2 gap-3 text-[13px]">
                <div><p className="text-[var(--text-muted)] mb-0.5">Joined</p><p className="font-semibold text-[var(--text-strong)]">{formatDate(selected.created_at)}</p></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Staff Modal — tabbed comprehensive form */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add staff member">
        {/* Tabs */}
        <div className="flex gap-1 bg-[var(--neutral-100)] rounded-xl p-1 mb-5">
          {TAB_LABELS.map((t) => (
            <button key={t.key} onClick={() => setAddTab(t.key)}
              className={`flex-1 py-1.5 rounded-lg text-[13px] font-semibold transition-all ${addTab === t.key ? "bg-white text-[#262262] shadow-sm" : "text-[var(--text-muted)]"}`}>
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={addStaff} className="space-y-4">
          {/* Tab: Account */}
          {addTab === "basic" && (
            <>
              <Input label="Full name" value={form.full_name} onChange={(e) => f("full_name", e.target.value)} required placeholder="e.g. Kwame Asante" />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Username" value={form.username} onChange={(e) => f("username", e.target.value.toLowerCase().replace(/\s/g, ""))} required placeholder="e.g. k.asante" />
                <div className="flex flex-col gap-1.5">
                  <label className="text-[15px] font-semibold text-[var(--text-strong)]">Role</label>
                  <select value={form.role} onChange={(e) => f("role", e.target.value)}
                    className="h-11 rounded-[10px] border border-[var(--border)] bg-white px-3 text-[15px] outline-none focus:border-[var(--ring)]">
                    {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
              </div>
              <Input label="Phone number" value={form.phone} onChange={(e) => f("phone", e.target.value)} placeholder="+233 …" />
              <div className="relative">
                <Input label="Password" type={showPwd ? "text" : "password"} value={form.password}
                  onChange={(e) => f("password", e.target.value)} required placeholder="Min. 6 characters" />
                <button type="button" onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-9 text-[var(--text-muted)]">
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </>
          )}

          {/* Tab: Personal */}
          {addTab === "personal" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[15px] font-semibold text-[var(--text-strong)]">Gender</label>
                  <select value={form.gender} onChange={(e) => f("gender", e.target.value)}
                    className="h-11 rounded-[10px] border border-[var(--border)] bg-white px-3 text-[15px] outline-none focus:border-[var(--ring)]">
                    <option value="">— Select —</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <Input label="Date of birth" type="date" value={form.date_of_birth} onChange={(e) => f("date_of_birth", e.target.value)} />
              </div>
              <Input label="Qualification" value={form.qualification} onChange={(e) => f("qualification", e.target.value)} placeholder="e.g. B.Ed. Basic Education" />
              <Input label="Date joined" type="date" value={form.date_joined} onChange={(e) => f("date_joined", e.target.value)} />
              <div className="flex flex-col gap-1.5">
                <label className="text-[15px] font-semibold text-[var(--text-strong)]">Residential address</label>
                <textarea value={form.address} onChange={(e) => f("address", e.target.value)} rows={2}
                  className="rounded-[10px] border border-[var(--border)] p-3 text-[15px] outline-none focus:border-[var(--ring)] resize-none" placeholder="House no., Area, Town" />
              </div>
            </>
          )}

          {/* Tab: Bank / MoMo */}
          {addTab === "bank" && (
            <>
              <div className="flex items-center gap-2 text-[13px] text-[var(--text-muted)] mb-1">
                <Landmark size={14} /> <span className="font-semibold text-[var(--text-strong)]">Bank Account</span>
              </div>
              <Input label="Bank name" value={form.bank_name} onChange={(e) => f("bank_name", e.target.value)} placeholder="e.g. GCB Bank, Absa" />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Account number" value={form.bank_account_number} onChange={(e) => f("bank_account_number", e.target.value)} placeholder="0000000000" />
                <Input label="Branch" value={form.bank_branch} onChange={(e) => f("bank_branch", e.target.value)} placeholder="e.g. Kumasi Main" />
              </div>
              <Input label="Account name" value={form.bank_account_name} onChange={(e) => f("bank_account_name", e.target.value)} placeholder="Name on the account" />

              <div className="flex items-center gap-2 text-[13px] text-[var(--text-muted)] mt-2">
                <CreditCard size={14} /> <span className="font-semibold text-[var(--text-strong)]">Mobile Money (MoMo)</span>
              </div>
              <Input label="MoMo number" value={form.momo_number} onChange={(e) => f("momo_number", e.target.value)} placeholder="+233 …" />
            </>
          )}

          {err && <p className="text-[14px] text-[var(--danger)]">{err}</p>}

          <div className="flex gap-2 justify-between pt-1">
            <div className="flex gap-2">
              {addTab !== "basic" && (
                <Button type="button" variant="secondary" onClick={() => setAddTab(addTab === "bank" ? "personal" : "basic")}>← Back</Button>
              )}
              {addTab !== "bank" && (
                <Button type="button" onClick={() => setAddTab(addTab === "basic" ? "personal" : "bank")}>Next →</Button>
              )}
            </div>
            {addTab === "bank" && (
              <Button type="submit" loading={saving}>Create account</Button>
            )}
            {addTab === "basic" && (
              <Button type="button" variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            )}
          </div>
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editingStaff} onClose={() => setEditingStaff(null)} title="Edit staff member">
        {editingStaff && (
          <form onSubmit={saveEdit} className="space-y-4">
            <Input label="Full name" value={form.full_name} onChange={(e) => f("full_name", e.target.value)} required />
            <div className="flex flex-col gap-1.5">
              <label className="text-[15px] font-semibold text-[var(--text-strong)]">Role</label>
              <select value={form.role} onChange={(e) => f("role", e.target.value)}
                className="h-11 rounded-[10px] border border-[var(--border)] bg-white px-3 text-[15px] outline-none focus:border-[var(--ring)]">
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <Input label="Phone" value={form.phone} onChange={(e) => f("phone", e.target.value)} placeholder="+233 …" />
            {err && <p className="text-[14px] text-[var(--danger)]">{err}</p>}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="secondary" onClick={() => setEditingStaff(null)}>Cancel</Button>
              <Button type="submit" loading={saving}>Save changes</Button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmModal
        open={!!confirmDeactivate}
        title={confirmDeactivate?.is_active ? "Deactivate staff?" : "Activate staff?"}
        message={confirmDeactivate?.is_active
          ? `${confirmDeactivate?.full_name} will lose system access.`
          : `${confirmDeactivate?.full_name} will regain system access.`}
        confirmLabel={confirmDeactivate?.is_active ? "Deactivate" : "Activate"}
        danger={confirmDeactivate?.is_active}
        onConfirm={() => confirmDeactivate && toggleActive(confirmDeactivate)}
        onCancel={() => setConfirmDeactivate(null)}
      />
    </div>
  );
}
