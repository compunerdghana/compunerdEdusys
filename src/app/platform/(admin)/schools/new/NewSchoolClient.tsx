"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, ArrowRight, ArrowLeft, RefreshCw, Loader2, School, Building2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

type Plan = "starter" | "standard" | "premium" | "enterprise";
type BillingCycle = "monthly" | "annual";

interface FormData {
  name: string;
  code: string;
  type: string;
  proprietorName: string;
  email: string;
  phone: string;
  website: string;
  region: string;
  district: string;
  address: string;
  gpsAddress: string;
  plan: Plan;
  billingCycle: BillingCycle;
  startDate: string;
  trialEnabled: boolean;
}

const REGIONS = [
  "Greater Accra", "Ashanti", "Western", "Eastern", "Central",
  "Northern", "Upper East", "Upper West", "Volta", "Brong-Ahafo",
  "Western North", "Ahafo", "Bono East", "North East", "Savannah", "Oti",
];

const DISTRICTS: Record<string, string[]> = {
  "Greater Accra": ["Accra Metropolitan", "Tema Metropolitan", "Ga East", "Ga West", "Ga South", "Ga Central", "Adentan", "Ayawaso Central", "Ayawaso East", "Ayawaso North", "Ayawaso West Wuogon", "La Dade-Kotopon", "La Nkwantanang-Madina", "Ledzokuku", "Krowor", "Ashaiman", "Shai-Osudoku", "Ningo-Prampram", "Ada East", "Ada West", "Dangme East", "Dangme West"],
  "Ashanti": ["Kumasi Metropolitan", "Oforikrom", "Kwadaso", "Suame", "Nhyiaeso", "Bosomtwe", "Kwabre East", "Afigya-Kwabre", "Ahafo-Ano North", "Ahafo-Ano South", "Amansie Central", "Amansie East", "Amansie West", "Asante Akim Central", "Asante Akim North", "Asante Akim South", "Asokore Mampong", "Atwima Kwanwoma", "Atwima Mponua", "Atwima Nwabiagya", "Bekwai", "Bosome-Freho", "Ejisu", "Ejura-Sekyedumase", "Juaben", "Kumasi Metropolitan", "Kwabre East", "Mampong", "Obuasi", "Offinso North", "Offinso South", "Sekyere Afram Plains", "Sekyere Central", "Sekyere East", "Sekyere Kumawu", "Sekyere South"],
  "Western": ["Sekondi-Takoradi Metropolitan", "Ahanta West", "Effia-Kwesimintsim", "Ellembelle", "Jomoro", "Mpohor", "Nzema East", "Prestea-Huni Valley", "Shama", "Tarkwa-Nsuaem", "Wassa Amenfi Central", "Wassa Amenfi East", "Wassa Amenfi West", "Wassa East"],
  "Eastern": ["New Juaben South", "New Juaben North", "Akuapim North", "Akuapim South", "Akyemansa", "Asuogyaman", "Atiwa East", "Atiwa West", "Ayensuano", "Birim Central", "Birim North", "Birim South", "Denkyembour", "Fanteakwa North", "Fanteakwa South", "Kwahu Afram Plains North", "Kwahu Afram Plains South", "Kwahu East", "Kwahu South", "Kwahu West", "Lower Manya Krobo", "Nsawam-Adoagyiri", "Suhum", "Upper Manya Krobo", "West Akim", "Yilo Krobo"],
  "Central": ["Cape Coast Metropolitan", "Agona East", "Agona West", "Ajumako-Enyan-Esiam", "Asikuma-Odoben-Brakwa", "Assin Central", "Assin North", "Assin South", "Awutu Senya East", "Awutu Senya West", "Effutu", "Ekumfi", "Gomoa Central", "Gomoa East", "Gomoa West", "Hemang Lower Denkyira", "Komenda-Edina-Eguafo-Abrem", "Mfantseman", "Twifo-Atti Morkwa", "Twifo Hemang Lower Denkyira", "Upper Denkyira East", "Upper Denkyira West"],
  "Northern": ["Tamale Metropolitan", "Bole", "Central Gonja", "East Gonja", "East Mamprusi", "Gushegu", "Karaga", "Kpandai", "Kumbungu", "Mamprugu-Moagduri", "Mion", "Nanumba North", "Nanumba South", "Nanton", "North Gonja", "Saboba", "Sagnarigu", "Savelugu", "Tatale-Sanguli", "Tolon", "West Gonja", "West Mamprusi", "Yendi", "Zabzugu"],
  "Upper East": ["Bolgatanga Municipal", "Bawku Municipal", "Bawku West", "Binduri", "Bolgatanga East", "Bongo", "Builsa North", "Builsa South", "Garu", "Kassena-Nankana East", "Kassena-Nankana West", "Nabdam", "Pusiga", "Talensi", "Tempane"],
  "Upper West": ["Wa Municipal", "Daffiama-Bussie-Issa", "Jirapa", "Lambussie-Karni", "Lawra", "Nadowli-Kaleo", "Nandom", "Sissala East", "Sissala West", "Wa East", "Wa West"],
  "Volta": ["Ho Municipal", "Adaklu", "Afadjato South", "Agotime-Ziope", "Akatsi North", "Akatsi South", "Anloga", "Central Tongu", "Ho West", "Hohoe", "Keta Municipal", "Kpando", "Kpedze-Klefe", "Krachi East", "Krachi Nchumuru", "Krachi West", "Nkwanta North", "Nkwanta South", "North Dayi", "North Tongu", "South Dayi", "South Tongu"],
  "Brong-Ahafo": ["Sunyani Municipal", "Banda", "Berekum East", "Berekum West", "Dormaa Central", "Dormaa East", "Dormaa West", "Jaman North", "Jaman South", "Kintampo North", "Kintampo South", "Nkoranza North", "Nkoranza South", "Pru East", "Pru West", "Sene East", "Sene West", "Tain", "Techiman Municipal", "Techiman North", "Wenchi"],
  "Western North": ["Aowin", "Bibiani-Anhwiaso-Bekwai", "Bia East", "Bia West", "Bodi", "Juaboso", "Sefwi Akontombra", "Sefwi-Wiawso", "Suaman"],
  "Ahafo": ["Asunafo North", "Asunafo South", "Asutifi North", "Asutifi South", "Tano North", "Tano South"],
  "Bono East": ["Atebubu-Amantin", "Kintampo North", "Kintampo South", "Nkoranza North", "Nkoranza South", "Pru East", "Pru West", "Sene East", "Sene West", "Techiman Municipal", "Techiman North"],
  "North East": ["Bunkpurugu-Nakpayili", "Chereponi", "East Mamprusi", "Mamprugu-Moagduri", "Nalerigu-Gambaga", "Yunyoo-Nasuan"],
  "Savannah": ["Bole", "Central Gonja", "East Gonja", "North Gonja", "Sawla-Tuna-Kalba", "West Gonja"],
  "Oti": ["Guan", "Jasikan", "Kadjebi", "Krachi East", "Krachi Nchumuru", "Krachi West", "Nkwanta North", "Nkwanta South"],
};

const PLANS: { id: Plan; label: string; price: number; desc: string; color: string }[] = [
  { id: "starter", label: "Starter", price: 299, desc: "Up to 200 students, basic features", color: "border-slate-300 bg-slate-50" },
  { id: "standard", label: "Standard", price: 599, desc: "Up to 800 students, full features", color: "border-blue-300 bg-blue-50" },
  { id: "premium", label: "Premium", price: 999, desc: "Up to 2000 students, priority support", color: "border-violet-300 bg-violet-50" },
  { id: "enterprise", label: "Enterprise", price: 1999, desc: "Unlimited students, dedicated support", color: "border-indigo-300 bg-indigo-50" },
];

function generateCode(name: string) {
  const parts = name.trim().toUpperCase().split(/\s+/);
  const abbr = parts.map(p => p[0]).join("").slice(0, 4);
  const year = new Date().getFullYear();
  return `${abbr}-GH-${year}`;
}

const steps = ["School Info", "Location", "Subscription", "Review & Create"];

const inputClass = "w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white";
const labelClass = "block text-[13px] font-bold text-slate-700 mb-1.5";

export function NewSchoolClient() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState<{ schoolName: string; email: string; tempPassword: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState<FormData>({
    name: "", code: "", type: "private", proprietorName: "", email: "", phone: "", website: "",
    region: "", district: "", address: "", gpsAddress: "",
    plan: "standard", billingCycle: "monthly", startDate: new Date().toISOString().split("T")[0], trialEnabled: false,
  });

  function set(field: keyof FormData, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function validateStep() {
    if (step === 0) {
      if (!form.name || !form.code || !form.proprietorName || !form.email || !form.phone) {
        toastError("Please fill in all required fields.");
        return false;
      }
    }
    if (step === 1) {
      if (!form.region || !form.address) {
        toastError("Region and address are required.");
        return false;
      }
    }
    return true;
  }

  async function handleCreate() {
    setLoading(true);
    try {
      const res = await fetch("/api/platform/schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          school_code: form.code,
          school_type: form.type,
          proprietor_name: form.proprietorName,
          owner_name: form.proprietorName,
          owner_email: form.email,
          owner_phone: form.phone,
          phone: form.phone,
          website: form.website,
          region: form.region,
          district: form.district,
          address: form.address,
          gps_address: form.gpsAddress,
          billing_cycle: form.billingCycle,
          trial_days: form.trialEnabled ? 30 : 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create school");
      setCredentials({ schoolName: form.name, email: form.email, tempPassword: data.tempPassword ?? "Welcome@123" });
      success("School created successfully!");
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Failed to create school");
    } finally {
      setLoading(false);
    }
  }

  function copyCredentials() {
    if (!credentials) return;
    const text = `School: ${credentials.schoolName}\nEmail: ${credentials.email}\nTemporary Password: ${credentials.tempPassword}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (credentials) {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <div
          className="rounded-2xl p-8 text-white text-center"
          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
        >
          <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center mx-auto mb-4">
            <Check size={28} className="text-white" />
          </div>
          <h2 className="text-2xl font-extrabold">School Created!</h2>
          <p className="text-white/70 font-semibold mt-1">{credentials.schoolName} has been set up successfully.</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e8e4f3]">
          <h3 className="font-extrabold text-slate-900 mb-4 text-[15px]">Login Credentials</h3>
          <div className="space-y-2.5">
            {[
              { label: "School", value: credentials.schoolName },
              { label: "Email", value: credentials.email },
              { label: "Temp Password", value: credentials.tempPassword, mono: true, highlight: true },
            ].map(({ label, value, mono, highlight }) => (
              <div key={label} className="flex justify-between items-center bg-[#faf9ff] rounded-xl px-4 py-3 border border-[#f0edf8]">
                <span className="text-slate-500 text-[13px] font-semibold">{label}</span>
                <span className={`text-[13px] font-bold ${highlight ? "text-violet-700" : "text-slate-900"} ${mono ? "font-mono" : ""}`}>{value}</span>
              </div>
            ))}
          </div>
          <button
            onClick={copyCredentials}
            className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#e0daf0] text-[13px] font-bold text-slate-600 hover:bg-slate-50 transition-all"
          >
            {copied ? <><Check size={13} className="text-emerald-600" /> Copied!</> : <><Copy size={13} /> Copy Credentials</>}
          </button>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => { setCredentials(null); setStep(0); setForm(f => ({ ...f, name: "", code: "", email: "" })); }}
            className="flex-1 py-3 rounded-xl border border-[#e0daf0] text-[13px] font-bold text-slate-600 hover:bg-slate-50 transition-all"
          >
            Create Another
          </button>
          <button
            onClick={() => router.push("/platform/schools")}
            className="flex-1 py-3 rounded-xl text-white text-[13px] font-bold transition-all"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
          >
            Go to Schools
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-extrabold text-slate-900">Create New School</h1>
        <p className="text-slate-500 text-[13px] font-semibold mt-1">Set up a new school on the platform in 4 steps.</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center">
        {steps.map((label, i) => (
          <div key={i} className="flex items-center flex-1">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-[13px] font-extrabold shrink-0 transition-all ${
                  i < step
                    ? "text-white"
                    : i === step
                    ? "text-white shadow-md"
                    : "bg-slate-100 text-slate-400"
                }`}
                style={i <= step ? { background: "linear-gradient(135deg, #4f46e5, #7c3aed)" } : {}}
              >
                {i < step ? <Check size={14} /> : i + 1}
              </div>
              <span className={`text-[11px] font-bold whitespace-nowrap hidden sm:block ${i === step ? "text-slate-900" : "text-slate-400"}`}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className="flex-1 mx-3 h-0.5 bg-slate-100 rounded-full">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: i < step ? "100%" : "0%",
                    background: "linear-gradient(90deg, #4f46e5, #7c3aed)",
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Form card */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] p-8">
        {/* Step 1: School Info */}
        {step === 0 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
                <Building2 size={16} className="text-white" />
              </div>
              <div>
                <h2 className="text-[16px] font-extrabold text-slate-900">School Information</h2>
                <p className="text-slate-400 text-[11px] font-semibold">Basic details about the school</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={labelClass}>School Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => { set("name", e.target.value); if (e.target.value) set("code", generateCode(e.target.value)); }}
                  placeholder="e.g. Sunshine International School"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>School Code <span className="text-red-500">*</span></label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.code}
                    onChange={e => set("code", e.target.value)}
                    placeholder="e.g. SIS-GH-2025"
                    className={`${inputClass} font-mono flex-1`}
                  />
                  <button
                    type="button"
                    onClick={() => set("code", generateCode(form.name || "SCH"))}
                    className="px-3 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors shrink-0"
                    title="Auto-generate"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>
              <div>
                <label className={labelClass}>School Type</label>
                <select value={form.type} onChange={e => set("type", e.target.value)} className={inputClass}>
                  <option value="private">Private</option>
                  <option value="public">Public</option>
                  <option value="international">International</option>
                  <option value="mission">Mission</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Proprietor Name <span className="text-red-500">*</span></label>
                <input type="text" value={form.proprietorName} onChange={e => set("proprietorName", e.target.value)} placeholder="e.g. Mr. Emmanuel Asante" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Email <span className="text-red-500">*</span></label>
                <input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="admin@sunshineschool.edu.gh" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Phone <span className="text-red-500">*</span></label>
                <input type="tel" value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+233 24 xxx xxxx" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Website</label>
                <input type="url" value={form.website} onChange={e => set("website", e.target.value)} placeholder="https://sunshineschool.edu.gh" className={inputClass} />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Location */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-[16px] font-extrabold text-slate-900 mb-6">Location Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Region <span className="text-red-500">*</span></label>
                <select value={form.region} onChange={e => { set("region", e.target.value); set("district", ""); }} className={inputClass}>
                  <option value="">Select region…</option>
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>District</label>
                <select
                  value={form.district}
                  onChange={e => set("district", e.target.value)}
                  className={inputClass}
                  disabled={!form.region}
                >
                  <option value="">{form.region ? "Select district…" : "Select region first"}</option>
                  {(DISTRICTS[form.region] ?? []).map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Address <span className="text-red-500">*</span></label>
                <textarea
                  value={form.address}
                  onChange={e => set("address", e.target.value)}
                  placeholder="Full physical address of the school"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white resize-none"
                />
              </div>
              <div>
                <label className={labelClass}>GPS / Digital Address</label>
                <input type="text" value={form.gpsAddress} onChange={e => set("gpsAddress", e.target.value)} placeholder="e.g. GA-123-4567" className={inputClass} />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Subscription */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-[16px] font-extrabold text-slate-900 mb-6">Subscription Setup</h2>
            <div>
              <label className={labelClass}>Select Plan</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PLANS.map(plan => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => set("plan", plan.id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      form.plan === plan.id
                        ? "border-violet-500 bg-violet-50"
                        : "border-[#e8e4f3] hover:border-[#d0c9ef] bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-slate-900 text-[13px]">{plan.label}</span>
                      <span className="text-[12px] font-extrabold text-violet-700">GHS {plan.price}/mo</span>
                    </div>
                    <p className="text-[11px] font-semibold text-slate-500">{plan.desc}</p>
                    {form.plan === plan.id && (
                      <div className="mt-2 flex items-center gap-1">
                        <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
                          <Check size={10} className="text-white" />
                        </div>
                        <span className="text-[10px] font-extrabold text-violet-700">Selected</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelClass}>Billing Cycle</label>
              <div className="flex gap-3">
                {(["monthly", "annual"] as BillingCycle[]).map(cycle => (
                  <button
                    key={cycle}
                    type="button"
                    onClick={() => set("billingCycle", cycle)}
                    className={`flex-1 py-2.5 rounded-xl border-2 font-bold capitalize text-[13px] transition-all ${
                      form.billingCycle === cycle
                        ? "border-violet-500 bg-violet-50 text-violet-800"
                        : "border-[#e8e4f3] text-slate-600 hover:border-[#d0c9ef]"
                    }`}
                  >
                    {cycle}
                    {cycle === "annual" && (
                      <span className="ml-2 text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-extrabold">Save 20%</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Start Date</label>
                <input type="date" value={form.startDate} onChange={e => set("startDate", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Trial Period</label>
                <button
                  type="button"
                  onClick={() => set("trialEnabled", !form.trialEnabled)}
                  className={`mt-0 h-10 flex items-center gap-3 px-4 w-full rounded-xl border-2 font-bold text-[13px] transition-all ${
                    form.trialEnabled
                      ? "border-blue-400 bg-blue-50 text-blue-800"
                      : "border-[#e8e4f3] text-slate-500"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${form.trialEnabled ? "bg-blue-500 border-blue-500" : "border-slate-300"}`}>
                    {form.trialEnabled && <Check size={11} className="text-white" />}
                  </div>
                  30-day trial
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-[16px] font-extrabold text-slate-900 mb-6">Review & Create</h2>
            <div className="divide-y divide-[#f5f3fc]">
              {[
                { label: "School Name", value: form.name },
                { label: "Code", value: form.code },
                { label: "Type", value: form.type },
                { label: "Proprietor", value: form.proprietorName },
                { label: "Email", value: form.email },
                { label: "Phone", value: form.phone },
                { label: "Region", value: form.region },
                { label: "District", value: form.district },
                { label: "Address", value: form.address },
                { label: "GPS Address", value: form.gpsAddress || "—" },
                { label: "Plan", value: PLANS.find(p => p.id === form.plan)?.label ?? form.plan },
                { label: "Billing", value: form.billingCycle },
                { label: "Start Date", value: form.startDate },
                { label: "Trial", value: form.trialEnabled ? "30-day trial enabled" : "No trial" },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-start gap-4 py-3">
                  <span className="text-[13px] font-bold text-slate-400 w-32 shrink-0">{label}</span>
                  <span className="text-[13px] font-semibold text-slate-900 flex-1">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-[#f0edf8]">
          <button
            type="button"
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#e0daf0] text-[13px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ArrowLeft size={14} />
            Back
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={() => { if (validateStep()) setStep(s => s + 1); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-[13px] font-bold transition-all shadow-sm"
              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
            >
              Next
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCreate}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-[13px] font-bold transition-all shadow-sm disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
            >
              {loading ? <><Loader2 size={14} className="animate-spin" /> Creating…</> : <><School size={14} /> Create School</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
