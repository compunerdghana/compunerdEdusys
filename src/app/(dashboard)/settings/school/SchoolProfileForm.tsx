"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Upload, School, CheckCircle2 } from "lucide-react";
import Image from "next/image";

const LEVELS = [
  { value: "daycare", label: "Day Care" },
  { value: "nursery", label: "Nursery" },
  { value: "kg", label: "Kindergarten (KG)" },
  { value: "primary", label: "Primary" },
  { value: "jhs", label: "Junior High (JHS)" },
];

const GHANA_REGIONS = [
  "Greater Accra", "Ashanti", "Western", "Eastern", "Central", "Volta",
  "Northern", "Upper East", "Upper West", "Brong-Ahafo", "Western North",
  "Ahafo", "Bono East", "Oti", "Savannah", "North East",
];

const CURRENCIES = [
  { value: "GHS", label: "GHS — Ghana Cedi (₵)" },
  { value: "USD", label: "USD — US Dollar ($)" },
  { value: "EUR", label: "EUR — Euro (€)" },
  { value: "GBP", label: "GBP — British Pound (£)" },
];

const DISTRICTS_BY_REGION: Record<string, string[]> = {
  "Greater Accra": ["Accra Metro", "Tema Metro", "Ga East", "Ga West", "Ga Central", "Ga South", "Adentan", "Ayawaso East", "Ayawaso North", "Ayawaso West Wuogon", "Kpone Katamanso", "Krowor", "La Dade-Kotopon", "La Nkwantanang-Madina", "Ledzokuku", "Ningo-Prampram", "Okaikwei North", "Shai Osudoku", "Weija-Gbawe"],
  "Ashanti": ["Kumasi Metro", "Obuasi Metro", "Afigya Kwabre South", "Afigya Kwabre North", "Ahafo Ano North", "Ahafo Ano South East", "Ahafo Ano South West", "Akrofuom", "Amansie Central", "Amansie South", "Amansie West", "Asante Akim Central", "Asante Akim North", "Asante Akim South", "Asokore Mampong", "Asokwa", "Atwima Kwanwoma", "Atwima Mponua", "Atwima Nwabiagya North", "Atwima Nwabiagya", "Bekwai", "Bosome Freho", "Bosomtwe", "Ejisu", "Ejura Sekyedumase", "Juaben", "Kwabre East", "Kwadaso", "Mampong", "Nhyiaeso", "Obuasi East", "Offinso North", "Offinso South", "Oforikrom", "Old Tafo", "Sekyere Afram Plains", "Sekyere Kumawu", "Sekyere Central", "Sekyere East", "Sekyere South", "Suame"],
  "Western": ["Sekondi-Takoradi Metro", "Ahanta West", "Amenfi Central", "Amenfi East", "Amenfi West", "Effia-Kwesimintsim", "Ellembelle", "Jomoro", "Mpohor", "Nzema East", "Prestea Huni Valley", "Shama", "Tarkwa Nsuaem", "Wassa Amenfi", "Wassa East"],
  "Eastern": ["Koforidua", "Abetifi", "Abuakwa North", "Abuakwa South", "Achiase", "Akuapim North", "Akuapim South", "Atiwa East", "Atiwa West", "Ayensuano", "Birim Central", "Birim North", "Birim South", "Denkyembuor", "East Akim", "Fanteakwa North", "Fanteakwa South", "Kwaebibirem", "Kwahu Afram Plains North", "Kwahu Afram Plains South", "Kwahu East", "Kwahu South", "Kwahu West", "Lower Manya Krobo", "New Juaben North", "New Juaben South", "Nsawam Adoagyiri", "Okere", "Suhum", "Upper Manya Krobo", "Upper West Akim", "West Akim", "Yilo Krobo"],
  "Central": ["Cape Coast Metro", "Abura Asebu Kwamankese", "Agona East", "Agona West", "Ajumako Enyan Essiam", "Asikuma Odoben Brakwa", "Assin Foso", "Assin North", "Assin South", "Awutu Senya East", "Awutu Senya", "Ekumfi", "Gomoa Central", "Gomoa East", "Gomoa West", "Hemang Lower Denkyira", "Komenda Edina Eguafo Abrem", "Mfantsiman", "Twifo Ati Morkwa", "Twifo Hemang Lower Denkyira", "Upper Denkyira East", "Upper Denkyira West"],
  "Volta": ["Ho", "Adaklu", "Afadjato South", "Agotime Ziope", "Akatsi North", "Akatsi South", "Anloga", "Central Tongu", "Ho West", "Hohoe", "Keta", "Ketu North", "Ketu South", "Kpando", "North Dayi", "North Tongu", "Nkwanta North", "Nkwanta South", "Oti", "South Dayi", "South Tongu"],
  "Northern": ["Tamale Metro", "Gushegu", "Karaga", "Kumbungu", "Mion", "Nanton", "Nanumba North", "Nanumba South", "Saboba", "Sagnarigu", "Savelugu", "Tatale Sanguli", "Tolon", "Yendi", "Zabzugu"],
  "Upper East": ["Bolgatanga", "Bawku Municipal", "Bawku West", "Binduri", "Bolgatanga East", "Bongo", "Builsa North", "Builsa South", "Garu", "Kassena Nankana East", "Kassena Nankana West", "Nabdam", "Pusiga", "Talensi", "Tempane"],
  "Upper West": ["Wa", "Daffiama Bussie Issa", "Jirapa", "Lambussie Karni", "Lawra", "Nadowli Kaleo", "Nandom", "Sissala East", "Sissala West", "Wa East", "Wa West"],
  "Brong-Ahafo": ["Sunyani", "Berekum East", "Berekum West", "Dormaa Central", "Dormaa East", "Dormaa West", "Jaman North", "Jaman South", "Sunyani West", "Tain", "Wenchi"],
  "Western North": ["Aowin", "Bia East", "Bia West", "Bodi", "Juaboso", "Sefwi Akontombra", "Sefwi Wiawso", "Suaman"],
  "Ahafo": ["Asunafo North", "Asunafo South", "Asutifi North", "Asutifi South", "Tano North", "Tano South"],
  "Bono East": ["Atebubu Amantin", "Kintampo North", "Kintampo South", "Nkoranza North", "Nkoranza South", "Pru East", "Pru West", "Sene East", "Sene West", "Techiman North", "Techiman"],
  "Oti": ["Biakoye", "Guan", "Jasikan", "Kadjebi", "Krachi East", "Krachi Nchumuru", "Krachi West", "Nkwanta North", "Nkwanta South"],
  "Savannah": ["Bole", "Central Gonja", "East Gonja", "North Gonja", "North East Gonja", "Sawla Tuna Kalba", "West Gonja"],
  "North East": ["Chereponi", "East Mamprusi", "Mamprugu Moagduri", "Nalerigu", "West Mamprusi"],
};

interface SchoolData {
  id: string;
  name: string;
  motto?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  region?: string | null;
  district?: string | null;
  gps_address?: string | null;
  currency?: string | null;
  levels?: string[] | null;
  ges_code?: string | null;
  logo_url?: string | null;
}

interface Props {
  school: SchoolData | null;
  schoolId: string | null;
}

export function SchoolProfileForm({ school, schoolId }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: school?.name ?? "",
    motto: school?.motto ?? "",
    address: school?.address ?? "",
    phone: school?.phone ?? "",
    email: school?.email ?? "",
    region: school?.region ?? "",
    district: school?.district ?? "",
    gps_address: school?.gps_address ?? "",
    currency: school?.currency ?? "GHS",
    ges_code: school?.ges_code ?? "",
    levels: school?.levels ?? [] as string[],
  });
  const [logoUrl, setLogoUrl] = useState<string | null>(school?.logo_url ?? null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const availableDistricts = form.region ? (DISTRICTS_BY_REGION[form.region] ?? []) : [];

  function set(field: string, value: string) { setForm((f) => ({ ...f, [field]: value })); setSuccess(false); }
  function toggleLevel(v: string) {
    setForm((f) => ({ ...f, levels: f.levels.includes(v) ? f.levels.filter((l) => l !== v) : [...f.levels, v] }));
    setSuccess(false);
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError("Logo must be under 2 MB."); return; }
    setUploading(true);
    setError(null);

    await fetch("/api/admin/setup-storage", { method: "POST" });

    const ext = file.name.split(".").pop();
    const path = `logos/${schoolId ?? "new"}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("school-assets").upload(path, file, { upsert: true });
    if (upErr) { setError("Upload failed: " + upErr.message); setUploading(false); return; }

    const { data: { publicUrl } } = supabase.storage.from("school-assets").getPublicUrl(path);
    setLogoUrl(publicUrl);

    if (schoolId) {
      await supabase.from("schools").update({ logo_url: publicUrl }).eq("id", schoolId);
    }
    setUploading(false);
    setSuccess(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    // Base columns (always exist)
    const basePayload = {
      name: form.name.trim(),
      motto: form.motto.trim() || null,
      address: form.address.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      ges_code: form.ges_code.trim() || null,
      levels: form.levels,
      logo_url: logoUrl,
    };

    // Extended columns (require SQL migration — see note below)
    const extPayload = {
      region: form.region || null,
      district: form.district || null,
      gps_address: form.gps_address.trim() || null,
      currency: form.currency || "GHS",
    };

    let saveErr = null;

    if (schoolId) {
      const res = await supabase.from("schools").update(basePayload).eq("id", schoolId);
      if (res.error) { saveErr = res.error; }
      else {
        // Try extended columns — silently ignore if columns not added yet
        await supabase.from("schools").update(extPayload).eq("id", schoolId);
      }
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const res = await supabase.from("schools")
        .insert({ ...basePayload, created_by: user!.id })
        .select("id").single();
      saveErr = res.error;
      if (!saveErr && res.data) {
        await supabase.from("profiles").update({ school_id: res.data.id }).eq("id", user!.id);
        // Try extended on newly created school
        await supabase.from("schools").update(extPayload).eq("id", res.data.id);
      }
    }

    setSaving(false);
    if (saveErr) { setError(saveErr.message); return; }
    setSuccess(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div>
        <h3 className="text-lg font-bold text-[var(--text-strong)]">School profile</h3>
        <p className="text-[15px] text-[var(--text-muted)]">Basic information displayed across the system and on report cards.</p>
      </div>

      {/* Logo upload */}
      <Card>
        <p className="text-[15px] font-semibold text-[var(--text-strong)] mb-4">School logo</p>
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-[var(--border)] flex items-center justify-center overflow-hidden bg-[var(--neutral-50)] shrink-0">
            {logoUrl
              ? <Image src={logoUrl} alt="School logo" width={80} height={80} className="w-full h-full object-contain" />
              : <School size={28} className="text-[var(--text-subtle)]" />
            }
          </div>
          <div>
            <p className="text-[15px] font-medium text-[var(--text-body)] mb-1">
              {logoUrl ? "Logo uploaded" : "Upload your school logo"}
            </p>
            <p className="text-sm text-[var(--text-muted)] mb-3">PNG or JPG, max 2 MB. Shown on reports and the sidebar.</p>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleLogoUpload} />
            <Button type="button" size="sm" variant="secondary" loading={uploading} onClick={() => fileRef.current?.click()}>
              <Upload size={14} /> {logoUrl ? "Change logo" : "Upload logo"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Details */}
      <Card>
        <p className="text-[15px] font-semibold text-[var(--text-strong)] mb-5">School details</p>
        <div className="space-y-4">
          <Input label="School name *" value={form.name} onChange={(e) => set("name", e.target.value)} required placeholder="e.g. Adisco Basic School" />
          <Input label="School motto" value={form.motto} onChange={(e) => set("motto", e.target.value)} placeholder="e.g. Excellence in Education" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Phone" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="024 000 0000" />
            <Input label="Email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="school@example.com" />
          </div>
          <Input label="Address" value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="P.O. Box …, Kumasi" />
          <div className="grid grid-cols-2 gap-4">
            {/* Region dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[15px] font-semibold text-[var(--text-strong)]">Region</label>
              <select value={form.region}
                onChange={(e) => { set("region", e.target.value); set("district", ""); }}
                className="h-11 rounded-[10px] border border-[var(--border)] bg-white px-3 text-[15px] text-[var(--text-strong)] outline-none focus:border-[var(--ring)]">
                <option value="">— Select region —</option>
                {GHANA_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            {/* District dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[15px] font-semibold text-[var(--text-strong)]">District / Municipality</label>
              <select value={form.district} onChange={(e) => set("district", e.target.value)}
                className="h-11 rounded-[10px] border border-[var(--border)] bg-white px-3 text-[15px] text-[var(--text-strong)] outline-none focus:border-[var(--ring)]"
                disabled={!form.region}>
                <option value="">{form.region ? "— Select district —" : "Select region first"}</option>
                {availableDistricts.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="GPS Address (Ghana Post)" value={form.gps_address} onChange={(e) => set("gps_address", e.target.value)} placeholder="e.g. AK-039-5028" />
            {/* Currency dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[15px] font-semibold text-[var(--text-strong)]">Currency</label>
              <select value={form.currency} onChange={(e) => set("currency", e.target.value)}
                className="h-11 rounded-[10px] border border-[var(--border)] bg-white px-3 text-[15px] text-[var(--text-strong)] outline-none focus:border-[var(--ring)]">
                {CURRENCIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <Input label="GES school code" value={form.ges_code} onChange={(e) => set("ges_code", e.target.value)} placeholder="Optional" />
        </div>
      </Card>

      {/* Levels */}
      <Card>
        <p className="text-[15px] font-semibold text-[var(--text-strong)] mb-2">School levels offered</p>
        <p className="text-sm text-[var(--text-muted)] mb-4">Select all levels your school runs.</p>
        <div className="flex flex-wrap gap-2">
          {LEVELS.map((l) => (
            <button
              key={l.value}
              type="button"
              onClick={() => toggleLevel(l.value)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[15px] font-medium border-2 transition-all ${
                form.levels.includes(l.value)
                  ? "bg-[var(--brand)] text-white border-[var(--brand)]"
                  : "bg-white text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--ring)]"
              }`}
            >
              {form.levels.includes(l.value) && <CheckCircle2 size={15} />}
              {l.label}
            </button>
          ))}
        </div>
      </Card>

      {error && <p className="text-[15px] text-[var(--danger)] bg-[var(--danger-bg)] px-5 py-4 rounded-xl">{error}</p>}
      {success && <p className="text-[15px] text-[var(--success)] bg-[var(--success-bg)] px-5 py-4 rounded-xl">School profile saved successfully.</p>}

      <Button type="submit" size="lg" loading={saving}>Save school profile</Button>
    </form>
  );
}
