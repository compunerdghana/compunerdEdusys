"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { queueOperation } from "@/lib/offline/db";
import { Modal } from "@/components/ui/Modal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { UserPlus, ArrowRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClassRoom { id: string; name: string; level: string; }
interface Props { open: boolean; onClose: () => void; schoolId: string; }
type Step = 1 | 2 | 3 | 4;

const RELATIONSHIPS = ["Father","Mother","Guardian","Uncle","Aunt","Grandparent","Sibling","Other"];
const RELIGIONS = ["Christianity","Islam","Traditional","Other"];
const NATIONALITIES = ["Ghanaian","Nigerian","Togolese","Ivorian","Other"];
const BLOOD_GROUPS = ["A+","A-","B+","B-","AB+","AB-","O+","O-","Unknown"];

const STEPS = ["Personal info", "Health & documents", "Academic details", "Parent / Guardian"];

export function AdmitStudentModal({ open, onClose, schoolId }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);

  const [form, setForm] = useState({
    // Step 1 — Personal
    first_name: "", middle_name: "", last_name: "",
    date_of_birth: "", gender: "male",
    nationality: "Ghanaian", religion: "", hometown: "",
    residential_address: "",
    // Step 2 — Health & documents
    nhis_number: "", birth_cert_number: "", blood_group: "",
    medical_notes: "",
    // Step 3 — Academic
    student_type: "new",
    class_id: "", admission_date: new Date().toISOString().slice(0, 10),
    previous_school: "",
    // Step 4 — Parent
    parent_name: "", parent_phone: "", parent_relationship: "Father",
    parent_email: "", parent_occupation: "", parent_address: "",
    emergency_name: "", emergency_phone: "", emergency_relationship: "Uncle",
  });

  useEffect(() => {
    if (!open) return;
    createClient().from("classrooms").select("id, name, level").eq("school_id", schoolId).order("name")
      .then(({ data }) => setClasses(data ?? []));
  }, [open, schoolId]);

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); setError(null); }

  function isDirty() {
    return form.first_name || form.last_name || form.parent_name || form.class_id;
  }

  function handleClose() {
    if (isDirty()) { setConfirmClose(true); } else { doClose(); }
  }

  function doClose() {
    setConfirmClose(false);
    onClose();
    resetForm();
  }

  function validateStep(): string | null {
    if (step === 1) {
      if (!form.first_name.trim()) return "First name is required.";
      if (!form.last_name.trim()) return "Last name is required.";
      if (!form.date_of_birth) return "Date of birth is required.";
      if (!form.gender) return "Gender is required.";
      if (!form.nationality) return "Nationality is required.";
      if (!form.hometown.trim()) return "Hometown is required.";
      if (!form.residential_address.trim()) return "Residential address is required.";
    }
    if (step === 3) {
      if (!form.class_id) return "Please assign a class.";
      if (!form.admission_date) return "Admission date is required.";
      if (form.student_type === "transfer" && !form.previous_school.trim()) return "Previous school is required for transfer students.";
    }
    if (step === 4) {
      if (!form.parent_name.trim()) return "Parent / guardian name is required.";
      if (!form.parent_phone.trim()) return "Parent / guardian phone is required.";
    }
    return null;
  }

  function next() {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError(null);
    setStep((s) => (s < 4 ? (s + 1) as Step : s));
  }

  function back() { setError(null); setStep((s) => (s > 1 ? (s - 1) as Step : s)); }

  async function submit() {
    const err = validateStep();
    if (err) { setError(err); return; }
    setSaving(true); setError(null);
    const supabase = createClient();

    const { count } = await supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", schoolId);
    const seq = (count ?? 0) + 1;
    const prefix = form.student_type === "transfer" ? "TRF" : "ADM";
    const admissionNumber = `${prefix}/${new Date().getFullYear()}/${String(seq).padStart(4, "0")}`;

    const studentPayload = {
      school_id: schoolId,
      admission_number: admissionNumber,
      first_name: form.first_name.trim(),
      middle_name: form.middle_name.trim() || null,
      last_name: form.last_name.trim(),
      date_of_birth: form.date_of_birth,
      gender: form.gender,
      class_id: form.class_id || null,
      status: "active",
      admission_date: form.admission_date,
      previous_school: form.previous_school.trim() || null,
      medical_notes: [
        form.nhis_number ? `NHIS: ${form.nhis_number}` : "",
        form.birth_cert_number ? `Birth Cert: ${form.birth_cert_number}` : "",
        form.blood_group ? `Blood Group: ${form.blood_group}` : "",
        form.medical_notes,
      ].filter(Boolean).join(" | ") || null,
    };

    if (navigator.onLine) {
      const { data: student, error: sErr } = await supabase.from("students").insert(studentPayload).select().single();
      if (sErr) { setError(sErr.message); setSaving(false); return; }
      if (form.parent_name.trim()) {
        await supabase.from("parents").insert({
          school_id: schoolId, student_id: student.id,
          relationship: form.parent_relationship,
          full_name: form.parent_name.trim(), phone: form.parent_phone.trim(),
          email: form.parent_email.trim() || null,
          occupation: form.parent_occupation.trim() || null,
          address: form.parent_address.trim() || null, is_primary: true,
        });
      }
      setSaving(false); doClose();
      router.push(`/students/${student.id}`);
    } else {
      await queueOperation("students", "insert", { id: crypto.randomUUID(), ...studentPayload });
      setSaving(false); doClose(); router.refresh();
    }
  }

  function resetForm() {
    setStep(1);
    setForm({
      first_name: "", middle_name: "", last_name: "",
      date_of_birth: "", gender: "male",
      nationality: "Ghanaian", religion: "", hometown: "", residential_address: "",
      nhis_number: "", birth_cert_number: "", blood_group: "", medical_notes: "",
      student_type: "new", class_id: "", admission_date: new Date().toISOString().slice(0, 10),
      previous_school: "",
      parent_name: "", parent_phone: "", parent_relationship: "Father",
      parent_email: "", parent_occupation: "", parent_address: "",
      emergency_name: "", emergency_phone: "", emergency_relationship: "Uncle",
    });
  }

  const selectCls = "h-11 w-full rounded-[10px] border border-[var(--border)] bg-white px-3.5 text-[15px] text-[var(--text-strong)] outline-none focus:border-[var(--ring)] focus:shadow-[var(--shadow-focus)]";

  return (
    <>
      <Modal open={open} onClose={handleClose} title="Admit student" subtitle={`Step ${step} of 4 — ${STEPS[step - 1]}`} size="xl">
        {/* Step indicator */}
        <div className="flex items-center gap-1.5 mb-7">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center gap-1.5 flex-1">
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all",
                i + 1 <= step ? "text-white" : "bg-[var(--neutral-100)] text-[var(--text-muted)]",
              )} style={i + 1 <= step ? { background: "var(--gradient-brand)" } : {}}>
                {i + 1}
              </div>
              <span className={cn("text-sm font-medium hidden sm:block truncate", i + 1 === step ? "text-[var(--text-strong)]" : "text-[var(--text-muted)]")}>{label}</span>
              {i < 3 && <div className={cn("flex-1 h-0.5 rounded-full min-w-[8px]", i + 1 < step ? "bg-[var(--brand)]" : "bg-[var(--neutral-200)]")} />}
            </div>
          ))}
        </div>

        {/* Step 1 — Personal */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input label="First name *" value={form.first_name} onChange={(e) => set("first_name", e.target.value)} placeholder="e.g. Ama" autoFocus />
              <Input label="Middle name" value={form.middle_name} onChange={(e) => set("middle_name", e.target.value)} placeholder="Optional" />
              <Input label="Last name *" value={form.last_name} onChange={(e) => set("last_name", e.target.value)} placeholder="e.g. Mensah" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input label="Date of birth *" type="date" value={form.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} />
              <div className="flex flex-col gap-1.5">
                <label className="text-[15px] font-semibold text-[var(--text-strong)]">Gender *</label>
                <select value={form.gender} onChange={(e) => set("gender", e.target.value)} className={selectCls}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[15px] font-semibold text-[var(--text-strong)]">Religion</label>
                <select value={form.religion} onChange={(e) => set("religion", e.target.value)} className={selectCls}>
                  <option value="">— Select —</option>
                  {RELIGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[15px] font-semibold text-[var(--text-strong)]">Nationality *</label>
                <select value={form.nationality} onChange={(e) => set("nationality", e.target.value)} className={selectCls}>
                  {NATIONALITIES.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <Input label="Hometown *" value={form.hometown} onChange={(e) => set("hometown", e.target.value)} placeholder="e.g. Kumasi" />
            </div>
            <div>
              <label className="text-[15px] font-semibold text-[var(--text-strong)] block mb-1.5">Residential address *</label>
              <textarea rows={2} className="w-full rounded-[10px] border border-[var(--border)] bg-white px-3.5 py-2.5 text-[15px] outline-none focus:border-[var(--ring)] resize-none placeholder:text-[var(--text-subtle)]"
                placeholder="House number, street, area…" value={form.residential_address} onChange={(e) => set("residential_address", e.target.value)} />
            </div>
          </div>
        )}

        {/* Step 2 — Health & documents */}
        {step === 2 && (
          <div className="space-y-5">
            <p className="text-sm text-[var(--text-muted)] -mt-1">Fill in document numbers and health information. These help with identification and medical care.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="NHIS card number" value={form.nhis_number} onChange={(e) => set("nhis_number", e.target.value)} placeholder="e.g. GH-12345678" />
              <Input label="Birth certificate number" value={form.birth_cert_number} onChange={(e) => set("birth_cert_number", e.target.value)} placeholder="e.g. BRN/2015/001234" />
            </div>
            <div className="flex flex-col gap-1.5 max-w-xs">
              <label className="text-[15px] font-semibold text-[var(--text-strong)]">Blood group</label>
              <select value={form.blood_group} onChange={(e) => set("blood_group", e.target.value)} className={selectCls}>
                <option value="">— Select —</option>
                {BLOOD_GROUPS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[15px] font-semibold text-[var(--text-strong)] block mb-1.5">Medical notes / special needs</label>
              <textarea rows={4} className="w-full rounded-[10px] border border-[var(--border)] bg-white px-3.5 py-2.5 text-[15px] outline-none focus:border-[var(--ring)] resize-none placeholder:text-[var(--text-subtle)]"
                placeholder="Allergies, chronic conditions, disabilities, medications…"
                value={form.medical_notes} onChange={(e) => set("medical_notes", e.target.value)} />
            </div>
          </div>
        )}

        {/* Step 3 — Academic */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <p className="text-[15px] font-semibold text-[var(--text-strong)] mb-3">Student type *</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "new", label: "New student", desc: "First time enrolling in any school" },
                  { value: "transfer", label: "Transfer student", desc: "Coming from another school" },
                ].map((opt) => (
                  <button key={opt.value} type="button" onClick={() => set("student_type", opt.value)}
                    className={cn("text-left p-4 rounded-xl border-2 transition-all",
                      form.student_type === opt.value ? "border-[var(--brand)] bg-[var(--brand-subtle)]" : "border-[var(--border)] hover:border-[var(--ring)] bg-white",
                    )}>
                    <p className={cn("text-[15px] font-bold", form.student_type === opt.value ? "text-[var(--brand)]" : "text-[var(--text-strong)]")}>{opt.label}</p>
                    <p className="text-sm text-[var(--text-muted)] mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[15px] font-semibold text-[var(--text-strong)]">Class *</label>
                <select value={form.class_id} onChange={(e) => set("class_id", e.target.value)} className={selectCls}>
                  <option value="">— Select class —</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.level})</option>)}
                </select>
              </div>
              <Input label="Date of admission *" type="date" value={form.admission_date} onChange={(e) => set("admission_date", e.target.value)} />
            </div>
            {form.student_type === "transfer" && (
              <Input label="Previous school *" value={form.previous_school} onChange={(e) => set("previous_school", e.target.value)} placeholder="Name of previous school" />
            )}
          </div>
        )}

        {/* Step 4 — Parent */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <p className="text-[15px] font-semibold text-[var(--text-strong)] mb-4">Primary parent / guardian *</p>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Full name *" value={form.parent_name} onChange={(e) => set("parent_name", e.target.value)} placeholder="e.g. Kofi Mensah" />
                  <Input label="Phone number *" type="tel" value={form.parent_phone} onChange={(e) => set("parent_phone", e.target.value)} placeholder="024 000 0000" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[15px] font-semibold text-[var(--text-strong)]">Relationship</label>
                    <select value={form.parent_relationship} onChange={(e) => set("parent_relationship", e.target.value)} className={selectCls}>
                      {RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <Input label="Email" type="email" value={form.parent_email} onChange={(e) => set("parent_email", e.target.value)} placeholder="Optional" />
                  <Input label="Occupation" value={form.parent_occupation} onChange={(e) => set("parent_occupation", e.target.value)} placeholder="Optional" />
                </div>
                <div>
                  <label className="text-[15px] font-semibold text-[var(--text-strong)] block mb-1.5">Parent address</label>
                  <textarea rows={2} className="w-full rounded-[10px] border border-[var(--border)] bg-white px-3.5 py-2.5 text-[15px] outline-none focus:border-[var(--ring)] resize-none placeholder:text-[var(--text-subtle)]"
                    placeholder="Optional" value={form.parent_address} onChange={(e) => set("parent_address", e.target.value)} />
                </div>
              </div>
            </div>

            <div className="border-t border-[var(--border)] pt-5">
              <p className="text-[15px] font-semibold text-[var(--text-strong)] mb-4">Emergency contact (if different)</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input label="Full name" value={form.emergency_name} onChange={(e) => set("emergency_name", e.target.value)} placeholder="Optional" />
                <Input label="Phone" type="tel" value={form.emergency_phone} onChange={(e) => set("emergency_phone", e.target.value)} placeholder="Optional" />
                <div className="flex flex-col gap-1.5">
                  <label className="text-[15px] font-semibold text-[var(--text-strong)]">Relationship</label>
                  <select value={form.emergency_relationship} onChange={(e) => set("emergency_relationship", e.target.value)} className={selectCls}>
                    {RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-5 px-4 py-3 rounded-xl bg-[var(--danger-bg)] text-[var(--danger)] text-[15px] font-medium">{error}</div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-7 pt-5 border-t border-[var(--border)]">
          <Button variant="secondary" onClick={step > 1 ? back : handleClose}>
            <ArrowLeft size={15} /> {step > 1 ? "Back" : "Cancel"}
          </Button>
          <div className="flex gap-3">
            {step < 4
              ? <Button onClick={next}>Next <ArrowRight size={15} /></Button>
              : <Button loading={saving} onClick={submit}><UserPlus size={15} /> Admit student</Button>
            }
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={confirmClose}
        title="Discard admission?"
        message="You have unsaved information. Are you sure you want to close without admitting the student?"
        confirmLabel="Discard"
        danger
        onConfirm={doClose}
        onCancel={() => setConfirmClose(false)}
      />
    </>
  );
}
