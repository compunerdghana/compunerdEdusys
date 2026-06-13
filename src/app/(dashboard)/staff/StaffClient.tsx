"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/ui/Modal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { getInitials, formatDate } from "@/lib/utils";
import { UserPlus, Search, Phone, Mail, MessageSquare, X, Pencil, UserX, UserCheck, Eye, EyeOff, ShieldCheck, MapPin, Landmark, CreditCard, ChevronRight, SlidersHorizontal } from "lucide-react";

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
  phone: string | null; is_active: boolean; created_at: string; photo_url?: string | null;
}

interface Props { initialStaff: StaffMember[]; schoolId: string; isHeadmaster: boolean; }

const EMPTY = {
  full_name: "", username: "", role: "teacher", password: "", phone: "",
  gender: "", date_of_birth: "", address: "", qualification: "", date_joined: "",
  bank_name: "", bank_account_number: "", bank_account_name: "", bank_branch: "", momo_number: "",
};
type FormTab = "basic" | "personal" | "bank";

export function StaffClient({ initialStaff, schoolId, isHeadmaster }: Props) {
  const supabase = createClient();
  const [staff, setStaff] = useState(initialStaff);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<StaffMember | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addTab, setAddTab] = useState<FormTab>("basic");
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState<StaffMember | null>(null);
  const [form, setForm] = useState(EMPTY);
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
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, school_id: schoolId }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) { setErr(json.error ?? "Failed to create staff."); return; }
    const { data: np } = await supabase.from("profiles")
      .select("id, full_name, username, role, phone, is_active, created_at")
      .eq("id", json.id).single();
    if (np) setStaff((s) => [...s, np].sort((a, b) => a.full_name.localeCompare(b.full_name)));
    setShowAdd(false); setForm(EMPTY);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingStaff) return;
    setSaving(true);
    const { error } = await supabase.from("profiles")
      .update({ full_name: form.full_name.trim(), role: form.role, phone: form.phone.trim() || null })
      .eq("id", editingStaff.id);
    setSaving(false);
    if (error) { setErr(error.message); return; }
    const updated = { ...editingStaff, full_name: form.full_name.trim(), role: form.role, phone: form.phone.trim() || null };
    setStaff((s) => s.map((x) => x.id === editingStaff.id ? updated : x).sort((a, b) => a.full_name.localeCompare(b.full_name)));
    if (selected?.id === editingStaff.id) setSelected(updated);
    setEditingStaff(null);
  }

  async function toggleActive(member: StaffMember) {
    await supabase.from("profiles").update({ is_active: !member.is_active }).eq("id", member.id);
    const updated = { ...member, is_active: !member.is_active };
    setStaff((s) => s.map((x) => x.id === member.id ? updated : x));
    if (selected?.id === member.id) setSelected(updated);
    setConfirmDeactivate(null);
  }

  const TABS: { key: FormTab; label: string }[] = [
    { key: "basic", label: "Account" }, { key: "personal", label: "Personal" }, { key: "bank", label: "Bank / MoMo" },
  ];

  return (
    <div className="space-y-4 max-w-7xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-strong)]">Staff</h2>
          <p className="text-[13px] text-[var(--text-muted)]">{staff.filter((s) => s.is_active).length} active · {staff.length} total</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border)] bg-white text-[13px] font-semibold text-[var(--text-muted)] hover:bg-[var(--neutral-50)]">
            <SlidersHorizontal size={14} /> Filter
          </button>
          {isHeadmaster && (
            <button onClick={() => { setShowAdd(true); setForm(EMPTY); setErr(null); setAddTab("basic"); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold text-white hover:opacity-90 shadow-sm"
              style={{ background: "linear-gradient(135deg, #262262, #92278F)" }}>
              <UserPlus size={14} /> Add Staff
            </button>
          )}
        </div>
      </div>

      {/* Tabs + search */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-[var(--neutral-100)] rounded-xl p-1">
          <Link href="/students" className="px-4 py-1.5 rounded-lg text-[13px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-strong)]">Students</Link>
          <button className="px-4 py-1.5 rounded-lg text-[13px] font-semibold bg-white text-[#262262] shadow-sm">Staff</button>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search here…"
            className="h-9 pl-9 pr-4 w-52 rounded-xl border border-[var(--border)] bg-white text-[13px] outline-none focus:border-[var(--ring)]" />
        </div>
      </div>

      {/* Split layout */}
      <div className="flex gap-4 items-start">
        {/* Grid */}
        <div className={`min-w-0 transition-all ${selected ? "flex-[2]" : "flex-1"}`}>
          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[var(--border)] py-16 text-center">
              <p className="text-[14px] font-semibold text-[var(--text-strong)]">No staff found</p>
              <p className="text-[13px] text-[var(--text-muted)] mt-1">{search ? "Try a different search." : isHeadmaster ? 'Click "Add Staff" to get started.' : ""}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filtered.map((member) => {
                const rs = ROLE_STYLE[member.role] ?? { bg: "#f3f4f6", text: "#374151" };
                const isActive = selected?.id === member.id;
                return (
                  <div key={member.id} onClick={() => setSelected(isActive ? null : member)}
                    className={`bg-white rounded-2xl border p-4 flex flex-col items-center gap-2 cursor-pointer hover:shadow-md transition-all ${isActive ? "border-[#262262] shadow-md" : "border-[var(--border)]"} ${!member.is_active ? "opacity-50" : ""}`}>
                    {member.photo_url ? (
                      <img src={member.photo_url} alt="" className="w-16 h-16 rounded-full object-cover" />
                    ) : (
                      <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white"
                        style={{ background: member.is_active ? "linear-gradient(135deg, #262262, #92278F)" : "#9ca3af" }}>
                        {getInitials(member.full_name)}
                      </div>
                    )}
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
        </div>

        {/* Right Profile Panel */}
        {selected && (
          <div className="w-72 shrink-0 bg-white rounded-2xl border border-[var(--border)] shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden sticky top-4">
            {/* Actions bar */}
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <p className="text-[11px] font-semibold text-[var(--text-muted)]">Teacher Profile</p>
              <div className="flex gap-1">
                {isHeadmaster && (
                  <>
                    <button onClick={() => { setEditingStaff(selected); setForm({ ...EMPTY, full_name: selected.full_name, username: selected.username, role: selected.role, phone: selected.phone ?? "" }); setErr(null); }}
                      className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-[var(--neutral-100)] text-[var(--text-muted)]"><Pencil size={12} /></button>
                    <button onClick={() => setConfirmDeactivate(selected)}
                      className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-[var(--danger-bg)] text-[var(--text-muted)] hover:text-[var(--danger)]">
                      {selected.is_active ? <UserX size={12} /> : <UserCheck size={12} />}
                    </button>
                  </>
                )}
                <button onClick={() => setSelected(null)} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-[var(--neutral-100)] text-[var(--text-muted)]"><X size={14} /></button>
              </div>
            </div>

            {/* Photo + name */}
            <div className="flex flex-col items-center px-4 pb-4 pt-2">
              {selected.photo_url ? (
                <img src={selected.photo_url} alt="" className="w-20 h-20 rounded-full object-cover shadow-md" />
              ) : (
                <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-md"
                  style={{ background: selected.is_active ? "linear-gradient(135deg, #262262, #92278F)" : "#9ca3af" }}>
                  {getInitials(selected.full_name)}
                </div>
              )}
              <h3 className="text-[15px] font-bold text-[var(--text-strong)] mt-3 text-center">{selected.full_name}</h3>
              <p className="text-[12px] text-[var(--text-muted)]">@{selected.username}</p>
              {(() => { const rs = ROLE_STYLE[selected.role] ?? { bg: "#f3f4f6", text: "#374151" }; return (
                <span className="mt-1.5 flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: rs.bg, color: rs.text }}>
                  <ShieldCheck size={10} /> {ROLES.find((r) => r.value === selected.role)?.label ?? selected.role}
                </span>
              ); })()}
              {!selected.is_active && <span className="mt-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--neutral-100)] text-[var(--text-muted)]">Inactive</span>}

              {/* Contact icons */}
              <div className="flex gap-2 mt-3">
                {selected.phone && <a href={`tel:${selected.phone}`} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#ede9fe" }}><Phone size={13} className="text-[#5b21b6]" /></a>}
                <button className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#dbeafe" }}><Mail size={13} className="text-[#1e40af]" /></button>
                <button className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#d1fae5" }}><MessageSquare size={13} className="text-[#065f46]" /></button>
              </div>
            </div>

            {/* About */}
            <div className="border-t border-[var(--border)] px-4 py-3">
              <p className="text-[12px] font-bold text-[var(--text-strong)] mb-1.5">About</p>
              <p className="text-[12px] text-[var(--text-muted)] leading-relaxed">
                {selected.full_name} is a {ROLES.find((r) => r.value === selected.role)?.label ?? selected.role} at this school.
                {selected.phone ? ` Reachable at ${selected.phone}.` : ""}
              </p>
            </div>

            {/* Details */}
            <div className="border-t border-[var(--border)] px-4 py-3">
              <p className="text-[12px] font-bold text-[var(--text-strong)] mb-2">Details</p>
              <div className="grid grid-cols-2 gap-3 text-[12px]">
                <div><p className="text-[var(--text-muted)]">Username</p><p className="font-bold text-[var(--text-strong)]">@{selected.username}</p></div>
                <div><p className="text-[var(--text-muted)]">Status</p><p className="font-bold text-[var(--text-strong)] capitalize">{selected.is_active ? "Active" : "Inactive"}</p></div>
                <div><p className="text-[var(--text-muted)]">Joined</p><p className="font-bold text-[var(--text-strong)]">{formatDate(selected.created_at)}</p></div>
                {selected.phone && <div><p className="text-[var(--text-muted)]">Phone</p><p className="font-bold text-[var(--text-strong)]">{selected.phone}</p></div>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add staff member">
        <div className="flex gap-1 bg-[var(--neutral-100)] rounded-xl p-1 mb-5">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setAddTab(t.key)}
              className={`flex-1 py-1.5 rounded-lg text-[13px] font-semibold transition-all ${addTab === t.key ? "bg-white text-[#262262] shadow-sm" : "text-[var(--text-muted)]"}`}>
              {t.label}
            </button>
          ))}
        </div>
        <form onSubmit={addStaff} className="space-y-4">
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
                <Input label="Password" type={showPwd ? "text" : "password"} value={form.password} onChange={(e) => f("password", e.target.value)} required placeholder="Min. 6 characters" />
                <button type="button" onClick={() => setShowPwd((v) => !v)} className="absolute right-3 top-9 text-[var(--text-muted)]">
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </>
          )}
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
          {addTab === "bank" && (
            <>
              <p className="text-[13px] font-bold text-[var(--text-strong)] flex items-center gap-1.5"><Landmark size={14} /> Bank Account</p>
              <Input label="Bank name" value={form.bank_name} onChange={(e) => f("bank_name", e.target.value)} placeholder="e.g. GCB Bank, Absa" />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Account number" value={form.bank_account_number} onChange={(e) => f("bank_account_number", e.target.value)} placeholder="0000000000" />
                <Input label="Branch" value={form.bank_branch} onChange={(e) => f("bank_branch", e.target.value)} placeholder="e.g. Kumasi Main" />
              </div>
              <Input label="Account name" value={form.bank_account_name} onChange={(e) => f("bank_account_name", e.target.value)} placeholder="Name on the account" />
              <p className="text-[13px] font-bold text-[var(--text-strong)] flex items-center gap-1.5 mt-2"><CreditCard size={14} /> Mobile Money</p>
              <Input label="MoMo number" value={form.momo_number} onChange={(e) => f("momo_number", e.target.value)} placeholder="+233 …" />
            </>
          )}
          {err && <p className="text-[14px] text-[var(--danger)]">{err}</p>}
          <div className="flex gap-2 justify-between pt-1">
            <div className="flex gap-2">
              {addTab !== "basic" && <Button type="button" variant="secondary" onClick={() => setAddTab(addTab === "bank" ? "personal" : "basic")}>← Back</Button>}
              {addTab !== "bank" && <Button type="button" onClick={() => setAddTab(addTab === "basic" ? "personal" : "bank")}>Next →</Button>}
            </div>
            {addTab === "bank" ? <Button type="submit" loading={saving}>Create account</Button>
              : addTab === "basic" && <Button type="button" variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>}
          </div>
        </form>
      </Modal>

      {/* Edit */}
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
            <Input label="Phone" value={form.phone} onChange={(e) => f("phone", e.target.value)} />
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
        message={confirmDeactivate?.is_active ? `${confirmDeactivate?.full_name} will lose system access.` : `${confirmDeactivate?.full_name} will regain system access.`}
        confirmLabel={confirmDeactivate?.is_active ? "Deactivate" : "Activate"}
        danger={confirmDeactivate?.is_active}
        onConfirm={() => confirmDeactivate && toggleActive(confirmDeactivate)}
        onCancel={() => setConfirmDeactivate(null)}
      />
    </div>
  );
}
