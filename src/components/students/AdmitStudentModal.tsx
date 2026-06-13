"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { queueOperation } from "@/lib/offline/db";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { UserPlus, ArrowRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClassRoom { id: string; name: string; level: string; }

interface Props {
  open: boolean;
  onClose: () => void;
  schoolId: string;
}

type Step = 1 | 2 | 3;

const RELATIONSHIPS = ["Father","Mother","Guardian","Uncle","Aunt","Grandparent","Other"];

export function AdmitStudentModal({ open, onClose, schoolId }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    // Personal
    first_name: "", middle_name: "", last_name: "",
    date_of_birth: "", gender: "male",
    // Academic
    student_type: "new", // "new" | "transfer"
    class_id: "", admission_date: new Date().toISOString().slice(0, 10),
    previous_school: "", medical_notes: "",
    // Parent
    parent_name: "", parent_phone: "", parent_relationship: "Father",
    parent_email: "", parent_occupation: "",
  });

  useEffect(() => {
    if (!open) return;
    createClient().from("classrooms").select("id, name, level").eq("school_id", schoolId).order("name").then(({ data }) => setClasses(data ?? []));
  }, [open, schoolId]);

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); setError(null); }

  function validateStep(): string | null {
    if (step === 1) {
      if (!form.first_name.trim()) return "First name is required.";
      if (!form.last_name.trim()) return "Last name is required.";
      if (!form.gender) return "Please select a gender.";
    }
    if (step === 2) {
      if (!form.class_id) return "Please assign a class.";
    }
    if (step === 3) {
      if (form.parent_name && !form.parent_phone) return "Parent phone number is required.";
    }
    return null;
  }

  function next() {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError(null);
    setStep((s) => (s < 3 ? (s + 1) as Step : s));
  }

  function back() { setError(null); setStep((s) => (s > 1 ? (s - 1) as Step : s)); }

  async function submit() {
    const err = validateStep();
    if (err) { setError(err); return; }
    setSaving(true);
    setError(null);
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
      date_of_birth: form.date_of_birth || null,
      gender: form.gender,
      class_id: form.class_id || null,
      status: "active",
      admission_date: form.admission_date,
      previous_school: form.previous_school.trim() || null,
      medical_notes: form.medical_notes.trim() || null,
    };

    if (navigator.onLine) {
      const { data: student, error: sErr } = await supabase.from("students").insert(studentPayload).select().single();
      if (sErr) { setError(sErr.message); setSaving(false); return; }
      if (form.parent_name.trim() && form.parent_phone.trim()) {
        await supabase.from("parents").insert({
          school_id: schoolId,
          student_id: student.id,
          relationship: form.parent_relationship,
          full_name: form.parent_name.trim(),
          phone: form.parent_phone.trim(),
          email: form.parent_email.trim() || null,
          occupation: form.parent_occupation.trim() || null,
          is_primary: true,
        });
      }
      setSaving(false);
      onClose();
      resetForm();
      router.push(`/students/${student.id}`);
    } else {
      const offlineId = crypto.randomUUID();
      await queueOperation("students", "insert", { id: offlineId, ...studentPayload });
      setSaving(false);
      onClose();
      resetForm();
      router.refresh();
    }
  }

  function resetForm() {
    setStep(1);
    setForm({
      first_name: "", middle_name: "", last_name: "",
      date_of_birth: "", gender: "male",
      student_type: "new", class_id: "", admission_date: new Date().toISOString().slice(0, 10),
      previous_school: "", medical_notes: "",
      parent_name: "", parent_phone: "", parent_relationship: "Father",
      parent_email: "", parent_occupation: "",
    });
  }

  const steps = ["Personal info", "Academic details", "Parent / Guardian"];

  return (
    <Modal
      open={open}
      onClose={() => { onClose(); resetForm(); }}
      title="Admit student"
      subtitle={`Step ${step} of 3 — ${steps[step - 1]}`}
      size="lg"
    >
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-7">
        {steps.map((label, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all",
              i + 1 === step ? "text-white shadow-md" : i + 1 < step ? "text-white" : "bg-[var(--neutral-100)] text-[var(--text-muted)]",
            )} style={i + 1 <= step ? { background: "var(--gradient-brand)" } : {}}>
              {i + 1}
            </div>
            <span className={cn("text-sm font-medium hidden sm:block", i + 1 === step ? "text-[var(--text-strong)]" : "text-[var(--text-muted)]")}>
              {label}
            </span>
            {i < 2 && <div className={cn("flex-1 h-0.5 rounded-full", i + 1 < step ? "bg-[var(--brand)]" : "bg-[var(--neutral-200)]")} />}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Date of birth" type="date" value={form.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} />
            <Select label="Gender *" value={form.gender} onChange={(e) => set("gender", e.target.value)} options={[{ value: "male", label: "Male" }, { value: "female", label: "Female" }]} />
          </div>
        </div>
      )}

      {/* Step 2 — Academic */}
      {step === 2 && (
        <div className="space-y-5">
          {/* New or Transfer */}
          <div>
            <p className="text-[15px] font-semibold text-[var(--text-strong)] mb-3">Student type</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "new", label: "New student", desc: "First time enrolling in any school" },
                { value: "transfer", label: "Transfer student", desc: "Coming from another school" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set("student_type", opt.value)}
                  className={cn(
                    "text-left p-4 rounded-xl border-2 transition-all",
                    form.student_type === opt.value
                      ? "border-[var(--brand)] bg-[var(--brand-subtle)]"
                      : "border-[var(--border)] hover:border-[var(--ring)] bg-white",
                  )}
                >
                  <p className={cn("text-[15px] font-bold", form.student_type === opt.value ? "text-[var(--brand)]" : "text-[var(--text-strong)]")}>{opt.label}</p>
                  <p className="text-sm text-[var(--text-muted)] mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[15px] font-semibold text-[var(--text-strong)]">Class *</label>
              <select
                value={form.class_id}
                onChange={(e) => set("class_id", e.target.value)}
                className="h-11 rounded-[10px] border border-[var(--border)] bg-white px-3.5 text-[15px] text-[var(--text-strong)] outline-none focus:border-[var(--ring)] focus:shadow-[var(--shadow-focus)]"
              >
                <option value="">— Select class —</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.level})</option>)}
              </select>
            </div>
            <Input label="Date of admission" type="date" value={form.admission_date} onChange={(e) => set("admission_date", e.target.value)} />
          </div>

          {form.student_type === "transfer" && (
            <Input label="Previous school *" value={form.previous_school} onChange={(e) => set("previous_school", e.target.value)} placeholder="Name of previous school" />
          )}

          <div>
            <label className="text-[15px] font-semibold text-[var(--text-strong)] block mb-1.5">Medical notes</label>
            <textarea
              rows={3}
              className="w-full rounded-[10px] border border-[var(--border)] bg-white px-3.5 py-2.5 text-[15px] text-[var(--text-strong)] outline-none focus:border-[var(--ring)] focus:shadow-[var(--shadow-focus)] resize-none placeholder:text-[var(--text-subtle)]"
              placeholder="Allergies, conditions, or special needs… (optional)"
              value={form.medical_notes}
              onChange={(e) => set("medical_notes", e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Step 3 — Parent */}
      {step === 3 && (
        <div className="space-y-5">
          <p className="text-sm text-[var(--text-muted)] -mt-1">You can add more parents/guardians later from the student profile.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Full name" value={form.parent_name} onChange={(e) => set("parent_name", e.target.value)} placeholder="e.g. Kofi Mensah" />
            <Input label="Phone number" type="tel" value={form.parent_phone} onChange={(e) => set("parent_phone", e.target.value)} placeholder="024 000 0000" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[15px] font-semibold text-[var(--text-strong)]">Relationship</label>
              <select
                value={form.parent_relationship}
                onChange={(e) => set("parent_relationship", e.target.value)}
                className="h-11 rounded-[10px] border border-[var(--border)] bg-white px-3.5 text-[15px] text-[var(--text-strong)] outline-none focus:border-[var(--ring)] focus:shadow-[var(--shadow-focus)]"
              >
                {RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <Input label="Email" type="email" value={form.parent_email} onChange={(e) => set("parent_email", e.target.value)} placeholder="Optional" />
          </div>
          <Input label="Occupation" value={form.parent_occupation} onChange={(e) => set("parent_occupation", e.target.value)} placeholder="Optional" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-5 px-4 py-3 rounded-xl bg-[var(--danger-bg)] text-[var(--danger)] text-sm font-medium">
          {error}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-7 pt-5 border-t border-[var(--border)]">
        <div>
          {step > 1 && (
            <Button variant="secondary" onClick={back}>
              <ArrowLeft size={15} /> Back
            </Button>
          )}
        </div>
        <div className="flex gap-3">
          {step < 3
            ? <Button onClick={next}>Next <ArrowRight size={15} /></Button>
            : <Button loading={saving} onClick={submit}><UserPlus size={15} /> Admit student</Button>
          }
        </div>
      </div>
    </Modal>
  );
}
