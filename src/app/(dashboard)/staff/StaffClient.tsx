"use client";

import { useState, useRef, useCallback } from "react";
import { PhotoCropModal } from "@/components/ui/PhotoCropModal";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/ui/Modal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { getInitials, formatDate } from "@/lib/utils";
import { UserPlus, Search, Phone, Mail, MessageSquare, X, Pencil, UserX, UserCheck, Eye, EyeOff, ShieldCheck, MapPin, Landmark, CreditCard, ChevronRight, SlidersHorizontal, Camera, FileDown, Check } from "lucide-react";

const ROLES = [
  { value: "teacher", label: "Teacher" },
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
  phone: string | null; is_active: boolean; created_at: string; photo_url?: string | null; bio?: string | null;
}

interface Props { initialStaff: StaffMember[]; schoolId: string; isHeadmaster: boolean; }

const EMPTY = {
  full_name: "", username: "", role: "teacher", password: "", phone: "",
  gender: "", date_of_birth: "", address: "", qualification: "", date_joined: "",
  bank_name: "", bank_account_number: "", bank_account_name: "", bank_branch: "", momo_number: "",
};
type FormTab = "basic" | "personal" | "bank";

export function StaffClient({ initialStaff, schoolId, isHeadmaster }: Props) {
  const router = useRouter();
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
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [bioText, setBioText] = useState("");
  const [savingBio, setSavingBio] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  function f(k: string, v: string) { setForm((p) => ({ ...p, [k]: v })); }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setCropSrc(URL.createObjectURL(file));
    e.target.value = "";
  }

  const handleCropConfirm = useCallback((blob: Blob) => {
    const url = URL.createObjectURL(blob);
    setPhotoPreview(url);
    setPhotoFile(new File([blob], photoFile?.name ?? "photo.jpg", { type: "image/jpeg" }));
    setCropSrc(null);
  }, [photoFile]);

  async function uploadPhoto(staffId: string, file: File): Promise<string | null> {
    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `staff/${staffId}-photo.${ext}`;
    await fetch("/api/admin/setup-storage", { method: "POST" });
    const { error } = await supabase.storage.from("school-assets").upload(path, file, { upsert: true });
    if (error) return null;
    const { data } = supabase.storage.from("school-assets").getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleProfilePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!selected) return;
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    const url = await uploadPhoto(selected.id, file);
    if (url) {
      await supabase.from("profiles").update({ photo_url: url }).eq("id", selected.id);
      const updated = { ...selected, photo_url: url };
      setStaff((s) => s.map((x) => x.id === selected.id ? updated : x));
      setSelected(updated);
    }
    setUploadingPhoto(false);
  }

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
    if (np) {
      let staffEntry = { ...np, photo_url: null as string | null };
      if (photoFile) {
        const url = await uploadPhoto(json.id, photoFile);
        if (url) {
          await supabase.from("profiles").update({ photo_url: url }).eq("id", json.id);
          staffEntry = { ...staffEntry, photo_url: url };
        }
      }
      setStaff((s) => [...s, staffEntry].sort((a, b) => a.full_name.localeCompare(b.full_name)));
    }
    setShowAdd(false); setForm(EMPTY); setPhotoFile(null); setPhotoPreview(null);
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

  async function saveBio() {
    if (!selected) return;
    setSavingBio(true);
    await supabase.from("profiles").update({ bio: bioText } as never).eq("id", selected.id);
    const updated = { ...selected, bio: bioText };
    setStaff((s) => s.map((x) => x.id === selected.id ? updated : x));
    setSelected(updated);
    setSavingBio(false);
    setEditingBio(false);
  }

  async function exportStaffPDF(member: StaffMember) {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const margin = 20;
    let y = margin;

    // Header bar
    doc.setFillColor(38, 34, 98);
    doc.rect(0, 0, 210, 32, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Staff Profile", margin, 14);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated ${new Date().toLocaleDateString("en-GH")}`, margin, 22);
    y = 44;

    // Name & role
    doc.setTextColor(38, 34, 98);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(member.full_name, margin, y); y += 7;
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    const roleLabel = ROLES.find((r) => r.value === member.role)?.label ?? member.role;
    doc.text(`${roleLabel}  ·  @${member.username}`, margin, y); y += 12;

    // Divider
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, 190, y); y += 8;

    // Details
    const fields: [string, string][] = [
      ["Role", roleLabel],
      ["Username", `@${member.username}`],
      ["Phone", member.phone ?? "—"],
      ["Status", member.is_active ? "Active" : "Inactive"],
      ["Joined", new Date(member.created_at).toLocaleDateString("en-GH")],
    ];
    doc.setFontSize(10);
    fields.forEach(([label, value]) => {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(80, 80, 80);
      doc.text(label + ":", margin, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 30, 30);
      doc.text(value, margin + 32, y);
      y += 7;
    });

    if (member.bio) {
      y += 4;
      doc.line(margin, y, 190, y); y += 8;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(80, 80, 80);
      doc.text("About:", margin, y); y += 6;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 30, 30);
      const lines = doc.splitTextToSize(member.bio, 160);
      doc.text(lines, margin, y);
    }

    doc.save(`staff_${member.username}.pdf`);
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
            <Link href="/staff/new"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold text-white hover:opacity-90 shadow-sm"
              style={{ background: "#262262" }}>
              <UserPlus size={14} /> Add Staff
            </Link>
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

      {/* Staff table */}
      <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-[14px] font-semibold text-[var(--text-strong)]">No staff found</p>
            <p className="text-[13px] text-[var(--text-muted)] mt-1">{search ? "Try a different search." : isHeadmaster ? 'Click "Add Staff" to get started.' : ""}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--neutral-50)]">
                  <th className="text-left px-5 py-3 font-semibold text-[var(--text-muted)] w-10">#</th>
                  <th className="text-left px-4 py-3 font-semibold text-[var(--text-muted)]">Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-[var(--text-muted)] hidden sm:table-cell">Role</th>
                  <th className="text-left px-4 py-3 font-semibold text-[var(--text-muted)] hidden md:table-cell">Username</th>
                  <th className="text-left px-4 py-3 font-semibold text-[var(--text-muted)] hidden lg:table-cell">Phone</th>
                  <th className="text-left px-4 py-3 font-semibold text-[var(--text-muted)]">Status</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map((member, idx) => {
                  const rs = ROLE_STYLE[member.role] ?? { bg: "#f3f4f6", text: "#374151" };
                  return (
                    <tr key={member.id}
                      onClick={() => router.push(`/staff/${member.id}`)}
                      className={`hover:bg-[var(--neutral-50)] cursor-pointer transition-colors ${!member.is_active ? "opacity-50" : ""}`}>
                      <td className="px-5 py-3 text-[var(--text-subtle)] font-mono text-[12px]">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {member.photo_url ? (
                            <img src={member.photo_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold text-white shrink-0"
                              style={{ background: member.is_active ? "linear-gradient(135deg, #262262, #92278F)" : "#9ca3af" }}>
                              {getInitials(member.full_name)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-[var(--text-strong)] truncate">{member.full_name}</p>
                            <p className="text-[11px] text-[var(--text-muted)] sm:hidden">
                              {ROLES.find((r) => r.value === member.role)?.label ?? member.role}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: rs.bg, color: rs.text }}>
                          {ROLES.find((r) => r.value === member.role)?.label ?? member.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--text-muted)] hidden md:table-cell">@{member.username}</td>
                      <td className="px-4 py-3 text-[var(--text-muted)] hidden lg:table-cell">{member.phone ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${member.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {member.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <ChevronRight size={15} className="text-[var(--text-subtle)]" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Photo crop */}
      {cropSrc && (
        <PhotoCropModal
          src={cropSrc}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropSrc(null)}
        />
      )}

      {/* Add Staff Modal */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); setPhotoFile(null); setPhotoPreview(null); }} title="Add staff member">
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
              {/* Photo upload */}
              <div className="flex flex-col items-center gap-2 mb-2">
                <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                <button type="button" onClick={() => photoInputRef.current?.click()}
                  className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-dashed border-[var(--border)] hover:border-[#262262] transition-colors flex items-center justify-center group"
                  style={photoPreview ? {} : { background: "var(--neutral-100)" }}>
                  {photoPreview
                    ? <img src={photoPreview} alt="" className="w-full h-full object-cover" />
                    : <Camera size={22} className="text-[var(--text-muted)] group-hover:text-[#262262]" />
                  }
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                    <Camera size={16} className="text-white" />
                  </div>
                </button>
                <p className="text-[11px] text-[var(--text-muted)]">Staff photo (optional)</p>
              </div>
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
