"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { queueOperation } from "@/lib/offline/db";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface ClassRoom { id: string; name: string }

export default function NewStudentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [form, setForm] = useState({
    first_name: "", middle_name: "", last_name: "",
    date_of_birth: "", gender: "male",
    class_id: "", admission_date: new Date().toISOString().slice(0, 10),
    previous_school: "", medical_notes: "",
    parent_name: "", parent_phone: "", parent_relationship: "Father",
  });

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("school_id").eq("id", user.id).single();
      if (!profile?.school_id) return;
      const { data } = await supabase.from("classrooms").select("id, name").eq("school_id", profile.school_id).order("name");
      setClasses(data ?? []);
    }
    load();
  }, []);

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase.from("profiles").select("school_id").eq("id", user.id).single();
    const schoolId = profile?.school_id;

    // Generate admission number from sequence
    const { count } = await supabase.from("students").select("id", { count: "exact" }).eq("school_id", schoolId);
    const seq = (count ?? 0) + 1;
    const year = new Date().getFullYear();
    const admissionNumber = `ADM/${year}/${String(seq).padStart(4, "0")}`;

    const studentPayload = {
      school_id: schoolId,
      admission_number: admissionNumber,
      first_name: form.first_name,
      middle_name: form.middle_name || null,
      last_name: form.last_name,
      date_of_birth: form.date_of_birth || null,
      gender: form.gender,
      class_id: form.class_id || null,
      status: "active",
      admission_date: form.admission_date,
      previous_school: form.previous_school || null,
      medical_notes: form.medical_notes || null,
    };

    if (navigator.onLine) {
      const { data: student, error } = await supabase.from("students").insert(studentPayload).select().single();
      if (error) {
        alert("Could not save student: " + error.message);
        setLoading(false);
        return;
      }
      // Save parent
      if (form.parent_name && form.parent_phone) {
        await supabase.from("parents").insert({
          school_id: schoolId,
          student_id: student.id,
          relationship: form.parent_relationship,
          full_name: form.parent_name,
          phone: form.parent_phone,
          is_primary: true,
        });
      }
      router.push(`/students/${student.id}`);
    } else {
      // Offline — queue for sync
      const offlineId = crypto.randomUUID();
      await queueOperation("students", "insert", { id: offlineId, ...studentPayload });
      router.push("/students");
    }
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/students">
          <Button variant="ghost" size="sm"><ArrowLeft size={14} /> Back</Button>
        </Link>
        <div>
          <h2 className="text-xl font-bold text-[var(--text-strong)]">Admit student</h2>
          <p className="text-sm text-[var(--text-muted)]">Fill in the student&apos;s details below</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Personal information */}
        <Card>
          <h3 className="text-sm font-semibold text-[var(--text-strong)] mb-4">Personal information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="First name" required value={form.first_name} onChange={(e) => update("first_name", e.target.value)} />
            <Input label="Middle name" value={form.middle_name} onChange={(e) => update("middle_name", e.target.value)} />
            <Input label="Last name" required value={form.last_name} onChange={(e) => update("last_name", e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <Input label="Date of birth" type="date" value={form.date_of_birth} onChange={(e) => update("date_of_birth", e.target.value)} />
            <Select
              label="Gender"
              value={form.gender}
              onChange={(e) => update("gender", e.target.value)}
              options={[{ value: "male", label: "Male" }, { value: "female", label: "Female" }]}
            />
            <Input label="Date of admission" type="date" required value={form.admission_date} onChange={(e) => update("admission_date", e.target.value)} />
          </div>
        </Card>

        {/* Academic */}
        <Card>
          <h3 className="text-sm font-semibold text-[var(--text-strong)] mb-4">Academic details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Class"
              value={form.class_id}
              onChange={(e) => update("class_id", e.target.value)}
              placeholder="Select class"
              options={classes.map((c) => ({ value: c.id, label: c.name }))}
            />
            <Input label="Previous school" value={form.previous_school} onChange={(e) => update("previous_school", e.target.value)} />
          </div>
          <div className="mt-4">
            <label className="text-sm font-semibold text-[var(--text-strong)] block mb-1.5">Medical notes</label>
            <textarea
              className="w-full rounded-[10px] border border-[var(--border)] p-3 text-sm outline-none focus:border-[var(--ring)] focus:shadow-[var(--shadow-focus)] resize-none"
              rows={2}
              placeholder="Allergies, conditions, or special needs…"
              value={form.medical_notes}
              onChange={(e) => update("medical_notes", e.target.value)}
            />
          </div>
        </Card>

        {/* Parent */}
        <Card>
          <h3 className="text-sm font-semibold text-[var(--text-strong)] mb-4">Primary parent / guardian</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Full name" value={form.parent_name} onChange={(e) => update("parent_name", e.target.value)} />
            <Input label="Phone number" type="tel" placeholder="024 000 0000" value={form.parent_phone} onChange={(e) => update("parent_phone", e.target.value)} />
            <Select
              label="Relationship"
              value={form.parent_relationship}
              onChange={(e) => update("parent_relationship", e.target.value)}
              options={["Father","Mother","Guardian","Uncle","Aunt","Grandparent","Other"].map((r) => ({ value: r, label: r }))}
            />
          </div>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" loading={loading} size="lg">Save student</Button>
          <Link href="/students"><Button type="button" variant="secondary" size="lg">Cancel</Button></Link>
        </div>
      </form>
    </div>
  );
}
