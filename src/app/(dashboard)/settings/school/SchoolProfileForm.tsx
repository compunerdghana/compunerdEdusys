"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";

const LEVELS = [
  { value: "daycare", label: "Day Care" },
  { value: "nursery", label: "Nursery" },
  { value: "kg", label: "Kindergarten (KG)" },
  { value: "primary", label: "Primary" },
  { value: "jhs", label: "Junior High (JHS)" },
];

interface School {
  id: string;
  name: string;
  motto?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  region?: string | null;
  district?: string | null;
  levels?: string[] | null;
  ges_code?: string | null;
  logo_url?: string | null;
}

interface Props {
  school: School | null;
  schoolId: string | null;
}

export function SchoolProfileForm({ school, schoolId }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState({
    name: school?.name ?? "",
    motto: school?.motto ?? "",
    address: school?.address ?? "",
    phone: school?.phone ?? "",
    email: school?.email ?? "",
    region: school?.region ?? "",
    district: school?.district ?? "",
    ges_code: school?.ges_code ?? "",
    levels: school?.levels ?? [] as string[],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setSuccess(false);
  }

  function toggleLevel(v: string) {
    setForm((f) => ({
      ...f,
      levels: f.levels.includes(v) ? f.levels.filter((l) => l !== v) : [...f.levels, v],
    }));
    setSuccess(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      motto: form.motto.trim() || null,
      address: form.address.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      region: form.region.trim() || null,
      district: form.district.trim() || null,
      ges_code: form.ges_code.trim() || null,
      levels: form.levels,
    };

    let err;
    if (schoolId) {
      const res = await supabase.from("schools").update(payload).eq("id", schoolId);
      err = res.error;
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const res = await supabase.from("schools").insert({ ...payload, created_by: user!.id }).select("id").single();
      err = res.error;
      if (!err && res.data) {
        await supabase.from("profiles").update({ school_id: res.data.id }).eq("id", user!.id);
      }
    }

    setSaving(false);
    if (err) { setError(err.message); return; }
    setSuccess(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      <div>
        <h3 className="text-base font-bold text-[var(--text-strong)]">School profile</h3>
        <p className="text-sm text-[var(--text-muted)]">Basic information displayed across the system.</p>
      </div>

      <Card>
        <div className="space-y-4">
          <Input label="School name" value={form.name} onChange={(e) => set("name", e.target.value)} required placeholder="e.g. Adisco Basic School" />
          <Input label="School motto" value={form.motto} onChange={(e) => set("motto", e.target.value)} placeholder="e.g. Excellence in Education" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Phone" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="024 000 0000" />
            <Input label="Email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="school@example.com" />
          </div>
          <Input label="Address" value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="P.O. Box …, Kumasi" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Region" value={form.region} onChange={(e) => set("region", e.target.value)} placeholder="Ashanti Region" />
            <Input label="District" value={form.district} onChange={(e) => set("district", e.target.value)} placeholder="Kumasi Metro" />
          </div>
          <Input label="GES school code" value={form.ges_code} onChange={(e) => set("ges_code", e.target.value)} placeholder="Optional" />
        </div>
      </Card>

      <Card>
        <p className="text-sm font-semibold text-[var(--text-strong)] mb-3">School levels offered</p>
        <p className="text-xs text-[var(--text-muted)] mb-4">Select all levels your school runs.</p>
        <div className="flex flex-wrap gap-2">
          {LEVELS.map((l) => (
            <button
              key={l.value}
              type="button"
              onClick={() => toggleLevel(l.value)}
              className={`px-3 py-1.5 rounded-[8px] text-sm font-medium border transition-all ${
                form.levels.includes(l.value)
                  ? "bg-[var(--brand)] text-white border-[var(--brand)]"
                  : "bg-white text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--ring)]"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </Card>

      {error && <p className="text-sm text-[var(--danger)] bg-[var(--danger-bg)] px-4 py-3 rounded-[10px]">{error}</p>}
      {success && <p className="text-sm text-[var(--success)] bg-[var(--success-bg)] px-4 py-3 rounded-[10px]">School profile saved.</p>}

      <Button type="submit" loading={saving}>Save school profile</Button>
    </form>
  );
}
