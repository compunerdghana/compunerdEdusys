"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, Check, Building2, User, CreditCard, Eye,
  Loader2, CheckCircle2, Copy, ExternalLink, ChevronRight,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";

const inputClass = "w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white";
const labelClass = "block text-[13px] font-bold text-slate-700 mb-1.5";

const REGIONS = [
  "Greater Accra", "Ashanti", "Western", "Eastern", "Central",
  "Northern", "Upper East", "Upper West", "Volta", "Brong-Ahafo",
  "Western North", "Ahafo", "Bono East", "North East", "Savannah", "Oti",
];

const DISTRICTS: Record<string, string[]> = {
  "Greater Accra": ["Accra Metropolitan", "Tema Metropolitan", "Ga East", "Ga West", "Ga South", "Ga Central", "Adentan", "Ayawaso Central", "Ayawaso East", "Ayawaso North", "Ayawaso West Wuogon", "La Dade-Kotopon", "La Nkwantanang-Madina", "Ledzokuku", "Krowor", "Ashaiman", "Shai-Osudoku", "Ningo-Prampram", "Ada East", "Ada West"],
  "Ashanti": ["Kumasi Metropolitan", "Oforikrom", "Kwadaso", "Suame", "Nhyiaeso", "Bosomtwe", "Kwabre East", "Afigya-Kwabre", "Ahafo-Ano North", "Asante Akim Central", "Asante Akim North", "Asokore Mampong", "Ejisu", "Juaben", "Mampong", "Obuasi", "Offinso North", "Sekyere Central"],
  "Western": ["Sekondi-Takoradi Metropolitan", "Ahanta West", "Effia-Kwesimintsim", "Ellembelle", "Jomoro", "Mpohor", "Nzema East", "Prestea-Huni Valley", "Shama", "Tarkwa-Nsuaem"],
  "Eastern": ["New Juaben South", "New Juaben North", "Akuapim North", "Akuapim South", "Birim Central", "Birim North", "Nsawam-Adoagyiri", "Suhum", "West Akim", "Yilo Krobo"],
  "Central": ["Cape Coast Metropolitan", "Agona East", "Agona West", "Assin Central", "Assin North", "Effutu", "Gomoa East", "Gomoa West", "Mfantseman"],
  "Northern": ["Tamale Metropolitan", "Bole", "Central Gonja", "East Gonja", "Gushegu", "Karaga", "Kumbungu", "Nanumba North", "Nanton", "Savelugu", "Yendi", "Zabzugu"],
  "Upper East": ["Bolgatanga Municipal", "Bawku Municipal", "Bawku West", "Binduri", "Bongo", "Builsa North", "Builsa South", "Garu", "Kassena-Nankana East", "Talensi"],
  "Upper West": ["Wa Municipal", "Jirapa", "Lambussie-Karni", "Lawra", "Nadowli-Kaleo", "Nandom", "Sissala East", "Sissala West", "Wa East", "Wa West"],
  "Volta": ["Ho Municipal", "Adaklu", "Afadjato South", "Agotime-Ziope", "Akatsi North", "Akatsi South", "Anloga", "Ho West", "Hohoe", "Keta Municipal"],
  "Brong-Ahafo": ["Sunyani Municipal", "Banda", "Berekum East", "Dormaa Central", "Dormaa East", "Jaman North", "Kintampo North", "Nkoranza North", "Techiman Municipal", "Wenchi"],
  "Western North": ["Aowin", "Bibiani-Anhwiaso-Bekwai", "Bia East", "Bia West", "Bodi", "Juaboso", "Sefwi Akontombra", "Sefwi-Wiawso", "Suaman"],
  "Ahafo": ["Asunafo North", "Asunafo South", "Asutifi North", "Asutifi South", "Tano North", "Tano South"],
  "Bono East": ["Atebubu-Amantin", "Kintampo North", "Nkoranza North", "Pru East", "Pru West", "Sene East", "Techiman Municipal", "Techiman North"],
  "North East": ["Bunkpurugu-Nakpayili", "Chereponi", "East Mamprusi", "Mamprugu-Moagduri", "Nalerigu-Gambaga", "Yunyoo-Nasuan"],
  "Savannah": ["Bole", "Central Gonja", "East Gonja", "North Gonja", "Sawla-Tuna-Kalba", "West Gonja"],
  "Oti": ["Guan", "Jasikan", "Kadjebi", "Krachi East", "Krachi Nchumuru", "Krachi West", "Nkwanta North", "Nkwanta South"],
};

type Plan = "starter" | "standard" | "premium" | "enterprise";
type BillingCycle = "monthly" | "annual";

const PLANS: { id: Plan; label: string; price: number; desc: string; color: string; border: string }[] = [
  { id: "starter", label: "Starter", price: 299, desc: "Up to 200 students, basic features", color: "bg-slate-50", border: "border-slate-300" },
  { id: "standard", label: "Standard", price: 599, desc: "Up to 800 students, full features", color: "bg-blue-50", border: "border-blue-300" },
  { id: "premium", label: "Premium", price: 999, desc: "Up to 2000 students, priority support", color: "bg-violet-50", border: "border-violet-300" },
  { id: "enterprise", label: "Enterprise", price: 1999, desc: "Unlimited students, dedicated support", color: "bg-indigo-50", border: "border-indigo-300" },
];

const STEPS = ["School Info", "Contact Person", "Subscription", "Review"];

interface FormData {
  // Step 1
  schoolName: string;
  schoolCode: string;
  schoolType: string;
  schoolCategory: string;
  region: string;
  district: string;
  address: string;
  gpsAddress: string;
  schoolEmail: string;
  schoolPhone: string;
  website: string;
  // Step 2
  contactName: string;
  contactPosition: string;
  contactEmail: string;
  contactPhone: string;
  // Step 3
  plan: Plan;
  billingCycle: BillingCycle;
  studentPopulation: string;
  staffPopulation: string;
  expectedStartDate: string;
}

function generateCode(name: string) {
  const parts = name.trim().toUpperCase().split(/\s+/);
  const abbr = parts.map(p => p[0]).join("").slice(0, 4);
  const year = new Date().getFullYear();
  return `${abbr}-GH-${year}`;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 mb-4">{children}</p>;
}

function ReviewRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-[#f0edf8] last:border-none">
      <span className="text-[12px] font-bold text-slate-500">{label}</span>
      <span className="text-[12px] font-semibold text-slate-800 text-right max-w-[60%]">{value || <span className="text-slate-300">—</span>}</span>
    </div>
  );
}

export default function NewOnboardingPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [result, setResult] = useState<{ schoolCode: string; schoolName: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState<FormData>({
    schoolName: "", schoolCode: "", schoolType: "", schoolCategory: "",
    region: "", district: "", address: "", gpsAddress: "",
    schoolEmail: "", schoolPhone: "", website: "",
    contactName: "", contactPosition: "", contactEmail: "", contactPhone: "",
    plan: "standard", billingCycle: "monthly",
    studentPopulation: "", staffPopulation: "", expectedStartDate: "",
  });

  function set(field: keyof FormData, value: string) {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === "schoolName") next.schoolCode = generateCode(value);
      if (field === "region") next.district = "";
      return next;
    });
  }

  async function submit() {
    setLoading(true);
    try {
      const res = await fetch("/api/platform/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to register school");
      success("School registered successfully!");
      setResult({ schoolCode: data.school_code ?? form.schoolCode, schoolName: form.schoolName });
      setDone(true);
    } catch (e: unknown) {
      toastError(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  function canAdvance() {
    if (step === 0) return !!(form.schoolName && form.schoolEmail && form.schoolPhone);
    if (step === 1) return !!(form.contactName && form.contactEmail && form.contactPhone);
    return true;
  }

  if (done && result) {
    return (
      <div className="min-h-screen bg-[#f8f7ff] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-emerald-600" />
          </div>
          <h2 className="text-[22px] font-extrabold text-slate-900 mb-2">School Registered!</h2>
          <p className="text-[13px] text-slate-500 mb-6">{result.schoolName} has been added to the onboarding pipeline.</p>
          <div className="bg-[#faf9ff] border border-[#e8e4f3] rounded-xl p-4 mb-6">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">School Code</p>
            <div className="flex items-center justify-center gap-2">
              <p className="text-[20px] font-extrabold text-indigo-600">{result.schoolCode}</p>
              <button onClick={() => { navigator.clipboard.writeText(result.schoolCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                className="p-1.5 rounded-lg hover:bg-indigo-50 transition-colors">
                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} className="text-slate-400" />}
              </button>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => router.push("/platform/onboarding/pipeline")}
              className="flex-1 h-10 rounded-xl text-[13px] font-bold text-white transition-opacity hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
              View Pipeline
            </button>
            <button onClick={() => { setDone(false); setStep(0); setForm({ schoolName: "", schoolCode: "", schoolType: "", schoolCategory: "", region: "", district: "", address: "", gpsAddress: "", schoolEmail: "", schoolPhone: "", website: "", contactName: "", contactPosition: "", contactEmail: "", contactPhone: "", plan: "standard", billingCycle: "monthly", studentPopulation: "", staffPopulation: "", expectedStartDate: "" }); }}
              className="flex-1 h-10 rounded-xl text-[13px] font-bold text-slate-700 border border-[#e0daf0] hover:bg-[#f8f7ff] transition-colors">
              Register Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => router.back()} className="w-9 h-9 rounded-xl border border-[#e0daf0] flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-white transition-all">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-[26px] font-extrabold text-slate-900">New School Registration</h1>
            <p className="text-[13px] text-slate-500">Register a school into the onboarding pipeline</p>
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-extrabold transition-all ${
                  i < step ? "text-white" : i === step ? "text-white" : "bg-[#f0edf8] text-slate-400"
                }`} style={i <= step ? { background: "linear-gradient(135deg, #4f46e5, #7c3aed)" } : {}}>
                  {i < step ? <Check size={13} /> : i + 1}
                </div>
                <span className={`text-[12px] font-bold hidden sm:block ${i === step ? "text-slate-800" : i < step ? "text-indigo-600" : "text-slate-400"}`}>{s}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-3 rounded-full transition-all ${i < step ? "bg-indigo-500" : "bg-[#e8e4f3]"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] p-8">
          {/* Step 1 */}
          {step === 0 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}>
                  <Building2 size={18} className="text-white" />
                </div>
                <div>
                  <h2 className="text-[18px] font-extrabold text-slate-900">School Information</h2>
                  <p className="text-[12px] text-slate-400">Basic details about the school</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelClass}>School Name <span className="text-red-500">*</span></label>
                  <input className={inputClass} placeholder="e.g. Accra Academy School" value={form.schoolName} onChange={e => set("schoolName", e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>School Code</label>
                  <input className={inputClass} value={form.schoolCode} onChange={e => set("schoolCode", e.target.value)} placeholder="Auto-generated" />
                </div>
                <div>
                  <label className={labelClass}>School Type</label>
                  <select className={inputClass} value={form.schoolType} onChange={e => set("schoolType", e.target.value)}>
                    <option value="">Select type</option>
                    {["Private", "Public", "International", "Mission"].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>School Category</label>
                  <select className={inputClass} value={form.schoolCategory} onChange={e => set("schoolCategory", e.target.value)}>
                    <option value="">Select category</option>
                    {["Basic", "JHS", "SHS", "Tertiary", "Vocational"].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Region</label>
                  <select className={inputClass} value={form.region} onChange={e => set("region", e.target.value)}>
                    <option value="">Select region</option>
                    {REGIONS.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>District</label>
                  <select className={inputClass} value={form.district} onChange={e => set("district", e.target.value)} disabled={!form.region}>
                    <option value="">Select district</option>
                    {(DISTRICTS[form.region] ?? []).map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Address</label>
                  <textarea className={`${inputClass} h-20 py-2.5 resize-none`} placeholder="Physical address" value={form.address} onChange={e => set("address", e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>GPS Address</label>
                  <input className={inputClass} placeholder="e.g. GS-0182-4729" value={form.gpsAddress} onChange={e => set("gpsAddress", e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>School Email <span className="text-red-500">*</span></label>
                  <input className={inputClass} type="email" placeholder="school@example.com" value={form.schoolEmail} onChange={e => set("schoolEmail", e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>School Phone <span className="text-red-500">*</span></label>
                  <input className={inputClass} type="tel" placeholder="+233 XX XXX XXXX" value={form.schoolPhone} onChange={e => set("schoolPhone", e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Website</label>
                  <input className={inputClass} placeholder="https://school.edu.gh" value={form.website} onChange={e => set("website", e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}>
                  <User size={18} className="text-white" />
                </div>
                <div>
                  <h2 className="text-[18px] font-extrabold text-slate-900">Contact Person</h2>
                  <p className="text-[12px] text-slate-400">Primary contact for onboarding</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelClass}>Full Name <span className="text-red-500">*</span></label>
                  <input className={inputClass} placeholder="Contact person's full name" value={form.contactName} onChange={e => set("contactName", e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Position</label>
                  <input className={inputClass} placeholder="e.g. Headmaster, Principal" value={form.contactPosition} onChange={e => set("contactPosition", e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Email Address <span className="text-red-500">*</span></label>
                  <input className={inputClass} type="email" placeholder="contact@school.edu.gh" value={form.contactEmail} onChange={e => set("contactEmail", e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Phone Number <span className="text-red-500">*</span></label>
                  <input className={inputClass} type="tel" placeholder="+233 XX XXX XXXX" value={form.contactPhone} onChange={e => set("contactPhone", e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}>
                  <CreditCard size={18} className="text-white" />
                </div>
                <div>
                  <h2 className="text-[18px] font-extrabold text-slate-900">Subscription</h2>
                  <p className="text-[12px] text-slate-400">Choose a plan and configuration</p>
                </div>
              </div>

              <div>
                <label className={labelClass}>Subscription Plan</label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {PLANS.map(p => (
                    <button key={p.id} type="button" onClick={() => set("plan", p.id)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${form.plan === p.id ? "border-indigo-500 bg-indigo-50" : `${p.border} ${p.color} opacity-70 hover:opacity-100`}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[13px] font-extrabold text-slate-800">{p.label}</span>
                        {form.plan === p.id && <Check size={14} className="text-indigo-600" />}
                      </div>
                      <p className="text-[20px] font-extrabold text-slate-900">${p.price}<span className="text-[12px] text-slate-400 font-semibold">/mo</span></p>
                      <p className="text-[11px] text-slate-500 mt-1">{p.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelClass}>Billing Cycle</label>
                <div className="flex gap-3">
                  {(["monthly", "annual"] as BillingCycle[]).map(c => (
                    <button key={c} type="button" onClick={() => set("billingCycle", c)}
                      className={`flex-1 h-10 rounded-xl border text-[13px] font-bold transition-all capitalize ${form.billingCycle === c ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-[#e0daf0] text-slate-500 hover:border-indigo-300"}`}>
                      {c} {c === "annual" && <span className="text-emerald-600 text-[11px]">Save 20%</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Student Population</label>
                  <input className={inputClass} type="number" placeholder="0" value={form.studentPopulation} onChange={e => set("studentPopulation", e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Staff Population</label>
                  <input className={inputClass} type="number" placeholder="0" value={form.staffPopulation} onChange={e => set("staffPopulation", e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Expected Start Date</label>
                  <input className={inputClass} type="date" value={form.expectedStartDate} onChange={e => set("expectedStartDate", e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* Step 4 — Review */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}>
                  <Eye size={18} className="text-white" />
                </div>
                <div>
                  <h2 className="text-[18px] font-extrabold text-slate-900">Review & Register</h2>
                  <p className="text-[12px] text-slate-400">Confirm all details before registering</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#faf9ff] rounded-xl p-4 border border-[#e8e4f3]">
                  <SectionLabel>School Information</SectionLabel>
                  <ReviewRow label="Name" value={form.schoolName} />
                  <ReviewRow label="Code" value={form.schoolCode} />
                  <ReviewRow label="Type" value={form.schoolType} />
                  <ReviewRow label="Category" value={form.schoolCategory} />
                  <ReviewRow label="Region" value={form.region} />
                  <ReviewRow label="District" value={form.district} />
                  <ReviewRow label="Email" value={form.schoolEmail} />
                  <ReviewRow label="Phone" value={form.schoolPhone} />
                  <ReviewRow label="Website" value={form.website} />
                </div>
                <div className="space-y-4">
                  <div className="bg-[#faf9ff] rounded-xl p-4 border border-[#e8e4f3]">
                    <SectionLabel>Contact Person</SectionLabel>
                    <ReviewRow label="Name" value={form.contactName} />
                    <ReviewRow label="Position" value={form.contactPosition} />
                    <ReviewRow label="Email" value={form.contactEmail} />
                    <ReviewRow label="Phone" value={form.contactPhone} />
                  </div>
                  <div className="bg-[#faf9ff] rounded-xl p-4 border border-[#e8e4f3]">
                    <SectionLabel>Subscription</SectionLabel>
                    <ReviewRow label="Plan" value={form.plan} />
                    <ReviewRow label="Billing" value={form.billingCycle} />
                    <ReviewRow label="Students" value={form.studentPopulation} />
                    <ReviewRow label="Staff" value={form.staffPopulation} />
                    <ReviewRow label="Start Date" value={form.expectedStartDate} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-[#f0edf8]">
            <button onClick={() => setStep(s => s - 1)} disabled={step === 0}
              className="inline-flex items-center gap-2 px-5 h-10 rounded-xl text-[13px] font-bold border border-[#e0daf0] text-slate-600 hover:bg-[#f8f7ff] disabled:opacity-30 disabled:cursor-not-allowed transition-all">
              <ArrowLeft size={14} /> Previous
            </button>
            {step < 3 ? (
              <button onClick={() => setStep(s => s + 1)} disabled={!canAdvance()}
                className="inline-flex items-center gap-2 px-5 h-10 rounded-xl text-[13px] font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
                style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}>
                Next <ArrowRight size={14} />
              </button>
            ) : (
              <button onClick={submit} disabled={loading}
                className="inline-flex items-center gap-2 px-6 h-10 rounded-xl text-[13px] font-bold text-white disabled:opacity-60 transition-opacity hover:opacity-90"
                style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}>
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {loading ? "Registering..." : "Register School"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
