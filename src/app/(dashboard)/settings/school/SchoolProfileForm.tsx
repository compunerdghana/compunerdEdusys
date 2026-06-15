"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Upload, School, CheckCircle2, PenLine } from "lucide-react";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { uploadAsset } from "@/lib/uploadAsset";
import { PhotoCropModal } from "@/components/ui/PhotoCropModal";

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

function ReceiptPreviewModal({ templateId, schoolName, logoUrl, onClose }: {
  templateId: number;
  schoolName: string;
  logoUrl: string | null;
  onClose: () => void;
}) {
  const sample = {
    studentName: "Ama Mensah",
    admNo: "2024/001",
    className: "JHS 2A",
    amount: "GHS 850.00",
    method: "Mobile Money",
    date: new Date().toLocaleDateString("en-GH", { day: "2-digit", month: "long", year: "numeric" }),
    ref: "PAY-20240615-001",
    items: [
      { label: "School Fees (Term 2)", amount: "GHS 700.00" },
      { label: "Sports Levy", amount: "GHS 100.00" },
      { label: "PTA Dues", amount: "GHS 50.00" },
    ],
  };

  const receipts: Record<number, () => React.ReactNode> = {
    1: () => ( // Classic Ghana
      <div style={{ fontFamily: "serif", border: "2px solid #222", padding: "24px", minWidth: "320px", maxWidth: "400px", background: "#fff" }}>
        <div style={{ textAlign: "center", borderBottom: "2px solid #222", paddingBottom: "12px", marginBottom: "12px" }}>
          {logoUrl && <img src={logoUrl} alt="" style={{ height: "56px", margin: "0 auto 8px", display: "block", objectFit: "contain" }} />}
          <div style={{ fontSize: "16px", fontWeight: "bold", textTransform: "uppercase" }}>{schoolName}</div>
          <div style={{ fontSize: "12px", marginTop: "2px" }}>Official Fee Receipt</div>
        </div>
        <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse" }}>
          <tbody>
            <tr><td style={{ padding: "3px 0", color: "#555" }}>Student</td><td style={{ textAlign: "right", fontWeight: "600" }}>{sample.studentName}</td></tr>
            <tr><td style={{ padding: "3px 0", color: "#555" }}>Admission No.</td><td style={{ textAlign: "right" }}>{sample.admNo}</td></tr>
            <tr><td style={{ padding: "3px 0", color: "#555" }}>Class</td><td style={{ textAlign: "right" }}>{sample.className}</td></tr>
            <tr><td style={{ padding: "3px 0", color: "#555" }}>Date</td><td style={{ textAlign: "right" }}>{sample.date}</td></tr>
            <tr><td style={{ padding: "3px 0", color: "#555" }}>Method</td><td style={{ textAlign: "right" }}>{sample.method}</td></tr>
          </tbody>
        </table>
        <div style={{ borderTop: "1px solid #ccc", borderBottom: "1px solid #ccc", margin: "12px 0", padding: "8px 0" }}>
          {sample.items.map((it, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "2px 0" }}>
              <span>{it.label}</span><span>{it.amount}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "14px" }}>
          <span>TOTAL</span><span>{sample.amount}</span>
        </div>
        <div style={{ textAlign: "center", fontSize: "11px", marginTop: "16px", color: "#666" }}>Ref: {sample.ref}</div>
      </div>
    ),
    2: () => ( // Modern Blue
      <div style={{ fontFamily: "sans-serif", borderRadius: "12px", overflow: "hidden", minWidth: "320px", maxWidth: "400px", boxShadow: "0 4px 24px rgba(0,0,0,.12)" }}>
        <div style={{ background: "linear-gradient(135deg,#262262,#92278F)", padding: "20px 24px", color: "#fff" }}>
          {logoUrl && <img src={logoUrl} alt="" style={{ height: "40px", marginBottom: "8px", objectFit: "contain", filter: "brightness(0) invert(1)" }} />}
          <div style={{ fontSize: "16px", fontWeight: "700" }}>{schoolName}</div>
          <div style={{ fontSize: "11px", opacity: 0.75, marginTop: "2px" }}>Payment Receipt · {sample.date}</div>
        </div>
        <div style={{ background: "#fff", padding: "20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
            <div><div style={{ fontSize: "11px", color: "#888" }}>Student</div><div style={{ fontWeight: "600", fontSize: "14px" }}>{sample.studentName}</div></div>
            <div style={{ textAlign: "right" }}><div style={{ fontSize: "11px", color: "#888" }}>Class</div><div style={{ fontWeight: "600", fontSize: "14px" }}>{sample.className}</div></div>
          </div>
          {sample.items.map((it, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f0f0f0", fontSize: "13px" }}>
              <span style={{ color: "#444" }}>{it.label}</span><span style={{ fontWeight: "500" }}>{it.amount}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px", background: "#f5f3ff", borderRadius: "8px", padding: "10px 12px" }}>
            <span style={{ fontWeight: "700", color: "#262262" }}>Total Paid</span>
            <span style={{ fontWeight: "800", color: "#262262", fontSize: "15px" }}>{sample.amount}</span>
          </div>
          <div style={{ textAlign: "center", fontSize: "11px", color: "#aaa", marginTop: "12px" }}>Ref: {sample.ref}</div>
        </div>
      </div>
    ),
    3: () => ( // GES Official
      <div style={{ fontFamily: "serif", border: "3px double #1a5c1a", padding: "24px", minWidth: "320px", maxWidth: "400px", background: "#fff" }}>
        <div style={{ textAlign: "center", marginBottom: "16px" }}>
          <div style={{ fontSize: "11px", letterSpacing: "2px", color: "#1a5c1a", textTransform: "uppercase", fontWeight: "bold" }}>Republic of Ghana</div>
          <div style={{ fontSize: "11px", color: "#1a5c1a" }}>Ghana Education Service</div>
          <div style={{ width: "100%", borderTop: "2px solid #1a5c1a", margin: "8px 0" }} />
          {logoUrl && <img src={logoUrl} alt="" style={{ height: "48px", margin: "8px auto", display: "block", objectFit: "contain" }} />}
          <div style={{ fontSize: "15px", fontWeight: "bold", textTransform: "uppercase" }}>{schoolName}</div>
          <div style={{ fontSize: "11px", marginTop: "2px", color: "#333" }}>OFFICIAL FEE COLLECTION RECEIPT</div>
        </div>
        <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse" }}>
          <tbody>
            {[["Name of Student", sample.studentName],["Admission No.", sample.admNo],["Class/Form", sample.className],["Date", sample.date],["Mode of Payment", sample.method]].map(([l,v],i) => (
              <tr key={i}><td style={{ border: "1px solid #ccc", padding: "4px 6px", background: "#f9f9f9", fontWeight: "600", width: "45%" }}>{l}</td><td style={{ border: "1px solid #ccc", padding: "4px 6px" }}>{v}</td></tr>
            ))}
          </tbody>
        </table>
        <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse", marginTop: "8px" }}>
          <thead><tr style={{ background: "#1a5c1a", color: "#fff" }}><th style={{ padding: "4px 6px", textAlign: "left", fontWeight: "600" }}>Item</th><th style={{ padding: "4px 6px", textAlign: "right", fontWeight: "600" }}>Amount</th></tr></thead>
          <tbody>
            {sample.items.map((it,i) => <tr key={i}><td style={{ border: "1px solid #ccc", padding: "4px 6px" }}>{it.label}</td><td style={{ border: "1px solid #ccc", padding: "4px 6px", textAlign: "right" }}>{it.amount}</td></tr>)}
            <tr style={{ background: "#e8f5e8" }}><td style={{ border: "1px solid #ccc", padding: "4px 6px", fontWeight: "700" }}>TOTAL</td><td style={{ border: "1px solid #ccc", padding: "4px 6px", textAlign: "right", fontWeight: "700" }}>{sample.amount}</td></tr>
          </tbody>
        </table>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "24px", fontSize: "11px" }}>
          <div style={{ textAlign: "center" }}><div style={{ borderTop: "1px solid #333", paddingTop: "4px", marginTop: "20px" }}>Cashier Signature</div></div>
          <div style={{ textAlign: "center" }}><div style={{ borderTop: "1px solid #333", paddingTop: "4px", marginTop: "20px" }}>Head Teacher</div></div>
        </div>
      </div>
    ),
    4: () => ( // Corporate
      <div style={{ fontFamily: "sans-serif", minWidth: "320px", maxWidth: "400px", background: "#fff", boxShadow: "0 2px 16px rgba(0,0,0,.1)" }}>
        <div style={{ display: "flex", height: "8px" }}><div style={{ flex: 1, background: "#262262" }} /><div style={{ flex: 1, background: "#5b21b6" }} /><div style={{ flex: 1, background: "#92278F" }} /></div>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #eee", display: "flex", alignItems: "center", gap: "12px" }}>
          {logoUrl && <img src={logoUrl} alt="" style={{ height: "40px", width: "40px", objectFit: "contain", borderRadius: "6px", border: "1px solid #eee" }} />}
          <div><div style={{ fontWeight: "700", fontSize: "14px", color: "#111" }}>{schoolName}</div><div style={{ fontSize: "11px", color: "#888" }}>Fee Payment Receipt</div></div>
          <div style={{ marginLeft: "auto", background: "#f5f3ff", borderRadius: "8px", padding: "6px 12px", textAlign: "right" }}><div style={{ fontSize: "11px", color: "#6b21a8" }}>Total</div><div style={{ fontWeight: "800", fontSize: "16px", color: "#262262" }}>{sample.amount}</div></div>
        </div>
        <div style={{ padding: "16px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "12px" }}>
          {[["Student",sample.studentName],["Adm. No.",sample.admNo],["Class",sample.className],["Date",sample.date],["Method",sample.method],["Ref",sample.ref]].map(([l,v],i) => (
            <div key={i}><div style={{ color: "#888", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>{l}</div><div style={{ fontWeight: "600", color: "#222" }}>{v}</div></div>
          ))}
        </div>
        <div style={{ margin: "0 24px", borderTop: "1px solid #eee", paddingTop: "12px", paddingBottom: "16px" }}>
          {sample.items.map((it,i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "3px 0", color: "#444" }}>
              <span>{it.label}</span><span style={{ fontWeight: "500" }}>{it.amount}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", height: "4px" }}><div style={{ flex: 1, background: "#262262" }} /><div style={{ flex: 1, background: "#5b21b6" }} /><div style={{ flex: 1, background: "#92278F" }} /></div>
      </div>
    ),
    5: () => ( // Thermal / POS
      <div style={{ fontFamily: "monospace", minWidth: "260px", maxWidth: "300px", background: "#fff", border: "1px solid #ddd", padding: "16px 12px", fontSize: "12px" }}>
        <div style={{ textAlign: "center", borderBottom: "1px dashed #bbb", paddingBottom: "10px", marginBottom: "10px" }}>
          {logoUrl && <img src={logoUrl} alt="" style={{ height: "32px", margin: "0 auto 4px", display: "block", objectFit: "contain" }} />}
          <div style={{ fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px" }}>{schoolName}</div>
          <div style={{ fontSize: "10px", marginTop: "2px", color: "#555" }}>*** PAYMENT RECEIPT ***</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {[["Student:",sample.studentName],["Adm No:",sample.admNo],["Class:",sample.className],["Date:",sample.date],["Method:",sample.method]].map(([l,v],i)=>(
            <div key={i} style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#555" }}>{l}</span><span style={{ fontWeight: "600" }}>{v}</span></div>
          ))}
        </div>
        <div style={{ borderTop: "1px dashed #bbb", borderBottom: "1px dashed #bbb", margin: "10px 0", padding: "8px 0" }}>
          {sample.items.map((it,i)=>(
            <div key={i} style={{ display: "flex", justifyContent: "space-between" }}><span>{it.label}</span><span>{it.amount}</span></div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "13px" }}>
          <span>TOTAL</span><span>{sample.amount}</span>
        </div>
        <div style={{ textAlign: "center", fontSize: "10px", marginTop: "12px", color: "#888", borderTop: "1px dashed #bbb", paddingTop: "8px" }}>
          <div>Ref: {sample.ref}</div>
          <div style={{ marginTop: "2px" }}>Thank you!</div>
        </div>
      </div>
    ),
  };

  const NAMES = ["", "Classic Ghana", "Modern Blue", "GES Official", "Corporate", "Thermal / POS"];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div className="bg-[var(--bg)] rounded-2xl shadow-2xl p-6 max-w-lg w-full flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-[16px] font-bold text-[var(--text-strong)]">Template {templateId} — {NAMES[templateId]}</h3>
          <button type="button" onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-strong)] text-xl leading-none">×</button>
        </div>
        <div className="overflow-auto max-h-[70vh] flex justify-center">
          {receipts[templateId]?.()}
        </div>
        <p className="text-[12px] text-[var(--text-muted)] text-center">This is a preview with sample data. Close and select to use this template.</p>
      </div>
    </div>
  );
}

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
  headmaster_signature_url?: string | null;
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
  const [sigUrl, setSigUrl] = useState<string | null>(school?.headmaster_signature_url ?? null);
  const [receiptTemplate, setReceiptTemplate] = useState<number>(() => {
    if (typeof window !== "undefined" && schoolId) {
      return Number(localStorage.getItem(`receipt_template_${schoolId}`) ?? "1");
    }
    return 1;
  });
  const sigRef = useRef<HTMLInputElement>(null);
  const [uploadingSig, setUploadingSig] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  useUnsavedChanges(isDirty && !success);

  const availableDistricts = form.region ? (DISTRICTS_BY_REGION[form.region] ?? []) : [];

  function set(field: string, value: string) { setForm((f) => ({ ...f, [field]: value })); setSuccess(false); setIsDirty(true); }
  function toggleLevel(v: string) {
    setForm((f) => ({ ...f, levels: f.levels.includes(v) ? f.levels.filter((l) => l !== v) : [...f.levels, v] }));
    setSuccess(false); setIsDirty(true);
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("Logo must be under 5 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function handleCropConfirm(blob: Blob) {
    setCropSrc(null);
    setUploading(true); setError(null);
    try {
      const file = new File([blob], `logo-${Date.now()}.png`, { type: "image/png" });
      const path = `logos/${schoolId ?? "new"}-${Date.now()}.png`;
      const publicUrl = await uploadAsset(file, path);
      setLogoUrl(publicUrl);
      if (schoolId) await fetch("/api/admin/save-school", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ schoolId, payload: { logo_url: publicUrl } }) });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
    setUploading(false);
  }

  async function handleSignatureUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError("Signature image must be under 2 MB."); return; }
    setUploadingSig(true); setError(null);
    try {
      const ext = file.name.split(".").pop();
      const path = `signatures/${schoolId ?? "new"}-sig-${Date.now()}.${ext}`;
      const publicUrl = await uploadAsset(file, path);
      setSigUrl(publicUrl);
      if (schoolId) await fetch("/api/admin/save-school", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ schoolId, payload: { headmaster_signature_url: publicUrl } }) });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
    setUploadingSig(false);
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

    const res = await fetch("/api/admin/save-school", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schoolId: schoolId ?? null, payload: { ...basePayload, ...extPayload } }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) { setError(json.error ?? "Save failed"); return; }
    // Save receipt template preference to localStorage
    if (schoolId) localStorage.setItem(`receipt_template_${schoolId}`, String(receiptTemplate));
    setSuccess(true);
    setIsDirty(false);
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
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={logoUrl} alt="School logo" className="w-full h-full object-contain" />
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

      {/* Headmaster signature */}
      <Card>
        <p className="text-[15px] font-semibold text-[var(--text-strong)] mb-1">Headmaster signature</p>
        <p className="text-sm text-[var(--text-muted)] mb-4">Printed on report cards. Upload a clear image of the signature on a white background.</p>
        <div className="flex items-center gap-5">
          <div className="w-40 h-16 rounded-xl border-2 border-dashed border-[var(--border)] flex items-center justify-center overflow-hidden bg-[var(--neutral-50)] shrink-0">
            {sigUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={sigUrl} alt="Signature" className="w-full h-full object-contain p-1" />
              : <PenLine size={22} className="text-[var(--text-subtle)]" />
            }
          </div>
          <div>
            <p className="text-[15px] font-medium text-[var(--text-body)] mb-1">
              {sigUrl ? "Signature uploaded ✓" : "No signature uploaded yet"}
            </p>
            <p className="text-sm text-[var(--text-muted)] mb-3">PNG only (transparent or white background), max 2 MB.</p>
            <input ref={sigRef} type="file" accept="image/png" className="hidden" onChange={handleSignatureUpload} />
            <Button type="button" size="sm" variant="secondary" loading={uploadingSig} onClick={() => sigRef.current?.click()}>
              <Upload size={14} /> {sigUrl ? "Change signature" : "Upload signature"}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Phone" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="024 000 0000" />
            <Input label="Email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="school@example.com" />
          </div>
          <Input label="Address" value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="P.O. Box …, Kumasi" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

      {/* Receipt Template */}
      <Card>
        <p className="text-[15px] font-semibold text-[var(--text-strong)] mb-1">Fee Receipt Template</p>
        <p className="text-sm text-[var(--text-muted)] mb-4">Choose the receipt style shown after recording a payment. Click <strong>Preview</strong> to see a sample.</p>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {[
            { id: 1, name: "Classic Ghana", desc: "Traditional bordered receipt with school header" },
            { id: 2, name: "Modern Blue",   desc: "Gradient header, clean card-style layout" },
            { id: 3, name: "GES Official",  desc: "Ghana Education Service official format" },
            { id: 4, name: "Corporate",     desc: "Color stripe, professional two-column" },
            { id: 5, name: "Thermal",       desc: "Compact receipt-paper / POS style" },
          ].map(t => {
            const active = receiptTemplate === t.id;
            return (
              <div key={t.id} className={`rounded-xl border-2 text-left transition-all overflow-hidden ${active ? "border-[#262262] bg-indigo-50" : "border-[var(--border)] hover:border-[var(--ring)]"}`}>
                <button type="button" onClick={() => setReceiptTemplate(t.id)} className="p-3 w-full text-left">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[13px] font-black mb-2 ${active ? "text-white" : "bg-gray-100 text-gray-500"}`}
                    style={active ? { background: "linear-gradient(135deg,#262262,#92278F)" } : {}}>
                    {t.id}
                  </div>
                  <p className={`text-[12px] font-bold ${active ? "text-[#262262]" : "text-[var(--text-strong)]"}`}>{t.name}</p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-snug">{t.desc}</p>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTemplate(t.id)}
                  className={`w-full text-[11px] font-semibold py-1.5 border-t transition-colors ${active ? "border-indigo-200 text-[#262262] hover:bg-indigo-100" : "border-[var(--border)] text-[var(--text-muted)] hover:bg-gray-50"}`}
                >
                  Preview
                </button>
              </div>
            );
          })}
        </div>
      </Card>

      {error && <p className="text-[15px] text-[var(--danger)] bg-[var(--danger-bg)] px-5 py-4 rounded-xl">{error}</p>}
      {success && <p className="text-[15px] text-[var(--success)] bg-[var(--success-bg)] px-5 py-4 rounded-xl">School profile saved successfully.</p>}

      <Button type="submit" size="lg" loading={saving}>Save school profile</Button>

      {/* Logo crop modal */}
      {cropSrc && (
        <PhotoCropModal
          src={cropSrc}
          aspectRatio={1}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropSrc(null)}
        />
      )}

      {/* Receipt preview modal */}
      {previewTemplate !== null && (
        <ReceiptPreviewModal
          templateId={previewTemplate}
          schoolName={form.name || "School Name"}
          logoUrl={logoUrl}
          onClose={() => setPreviewTemplate(null)}
        />
      )}
    </form>
  );
}
