"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, ArrowRight, ArrowLeft, RefreshCw, Loader2, School, Building2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

const PLATFORM_GRADIENT = "linear-gradient(135deg, #1a0533, #2d1b69, #6b1f8a)";

type Plan = "starter" | "standard" | "premium" | "enterprise";
type BillingCycle = "monthly" | "annual";

interface FormData {
  // Step 1
  name: string;
  code: string;
  type: string;
  proprietorName: string;
  email: string;
  phone: string;
  website: string;
  // Step 2
  region: string;
  district: string;
  address: string;
  gpsAddress: string;
  // Step 3
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

const PLANS: { id: Plan; label: string; price: number; desc: string }[] = [
  { id: "starter", label: "Starter", price: 299, desc: "Up to 200 students, basic features" },
  { id: "standard", label: "Standard", price: 599, desc: "Up to 800 students, full features" },
  { id: "premium", label: "Premium", price: 999, desc: "Up to 2000 students, priority support" },
  { id: "enterprise", label: "Enterprise", price: 1999, desc: "Unlimited students, dedicated support" },
];

function generateCode(name: string) {
  const parts = name.trim().toUpperCase().split(/\s+/);
  const abbr = parts.map(p => p[0]).join("").slice(0, 4);
  const year = new Date().getFullYear();
  return `${abbr}-GH-${year}`;
}

const steps = ["School Info", "Location", "Subscription", "Review & Create"];

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
        body: JSON.stringify(form),
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
      <div className="max-w-lg mx-auto">
        <div className="rounded-2xl p-8 text-white text-center mb-6"
          style={{ background: PLATFORM_GRADIENT }}>
          <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center mx-auto mb-4">
            <Check size={28} className="text-white" />
          </div>
          <h2 className="text-2xl font-extrabold">School Created!</h2>
          <p className="text-white/70 font-semibold mt-1">{credentials.schoolName} has been set up successfully.</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-4">
          <h3 className="font-extrabold text-slate-900 mb-4">Login Credentials</h3>
          <div className="space-y-3 font-mono text-sm">
            <div className="flex justify-between items-center bg-slate-50 rounded-xl px-4 py-3">
              <span className="text-slate-500 font-sans font-semibold">School</span>
              <span className="font-bold text-slate-900">{credentials.schoolName}</span>
            </div>
            <div className="flex justify-between items-center bg-slate-50 rounded-xl px-4 py-3">
              <span className="text-slate-500 font-sans font-semibold">Email</span>
              <span className="font-bold text-slate-900">{credentials.email}</span>
            </div>
            <div className="flex justify-between items-center bg-slate-50 rounded-xl px-4 py-3">
              <span className="text-slate-500 font-sans font-semibold">Temp Password</span>
              <span className="font-bold text-purple-700">{credentials.tempPassword}</span>
            </div>
          </div>
          <button
            onClick={copyCredentials}
            className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
          >
            {copied ? <><Check size={14} className="text-emerald-600" /> Copied!</> : <><Copy size={14} /> Copy Credentials</>}
          </button>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => { setCredentials(null); setStep(0); setForm(f => ({ ...f, name: "", code: "", email: "" })); }}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
          >
            Create Another
          </button>
          <button
            onClick={() => router.push("/platform/schools")}
            className="flex-1 py-3 rounded-xl text-white text-sm font-bold transition-all"
            style={{ background: PLATFORM_GRADIENT }}
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
      <div className="rounded-2xl px-8 py-6 text-white" style={{ background: PLATFORM_GRADIENT }}>
        <h1 className="text-2xl font-extrabold">Create New School</h1>
        <p className="text-white/60 font-semibold mt-1">Set up a new school on the platform in 4 steps.</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0">
        {steps.map((label, i) => (
          <div key={i} className="flex items-center flex-1">
            <div className={`flex items-center gap-2 ${i <= step ? "opacity-100" : "opacity-40"}`}>
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-extrabold shrink-0 ${
                  i < step ? "text-white" : i === step ? "text-white" : "bg-slate-200 text-slate-500"
                }`}
                style={i <= step ? { background: PLATFORM_GRADIENT } : {}}
              >
                {i < step ? <Check size={14} /> : i + 1}
              </div>
              <span className={`text-xs font-bold whitespace-nowrap hidden sm:block ${i === step ? "text-slate-900" : "text-slate-400"}`}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className="flex-1 mx-2 h-0.5 bg-slate-200">
                <div className="h-full transition-all" style={{ width: i < step ? "100%" : "0%", background: PLATFORM_GRADIENT }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Form card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
        {/* Step 1: School Info */}
        {step === 0 && (
          <div className="space-y-5">
            <h2 className="text-lg font-extrabold text-slate-900">School Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-1.5">School Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => { set("name", e.target.value); if (e.target.value) set("code", generateCode(e.target.value)); }}
                  placeholder="e.g. Sunshine International School"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 outline-none focus:border-purple-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">School Code <span className="text-red-500">*</span></label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.code}
                    onChange={e => set("code", e.target.value)}
                    placeholder="e.g. SIS-GH-2025"
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 outline-none focus:border-purple-400 transition-colors font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => set("code", generateCode(form.name || "SCH"))}
                    className="px-3 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                    title="Auto-generate"
                  >
                    <RefreshCw size={15} />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">School Type</label>
                <select
                  value={form.type}
                  onChange={e => set("type", e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 outline-none focus:border-purple-400 transition-colors bg-white"
                >
                  <option value="private">Private</option>
                  <option value="public">Public</option>
                  <option value="international">International</option>
                  <option value="mission">Mission</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Proprietor Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.proprietorName}
                  onChange={e => set("proprietorName", e.target.value)}
                  placeholder="e.g. Mr. Emmanuel Asante"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 outline-none focus:border-purple-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Email <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => set("email", e.target.value)}
                  placeholder="admin@sunshineschool.edu.gh"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 outline-none focus:border-purple-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Phone <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => set("phone", e.target.value)}
                  placeholder="+233 24 xxx xxxx"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 outline-none focus:border-purple-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Website</label>
                <input
                  type="url"
                  value={form.website}
                  onChange={e => set("website", e.target.value)}
                  placeholder="https://sunshineschool.edu.gh"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 outline-none focus:border-purple-400 transition-colors"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Location */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-extrabold text-slate-900">Location Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Region <span className="text-red-500">*</span></label>
                <select
                  value={form.region}
                  onChange={e => set("region", e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 outline-none focus:border-purple-400 transition-colors bg-white"
                >
                  <option value="">Select region…</option>
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">District</label>
                <input
                  type="text"
                  value={form.district}
                  onChange={e => set("district", e.target.value)}
                  placeholder="e.g. Accra Metropolitan"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 outline-none focus:border-purple-400 transition-colors"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Address <span className="text-red-500">*</span></label>
                <textarea
                  value={form.address}
                  onChange={e => set("address", e.target.value)}
                  placeholder="Full physical address of the school"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 outline-none focus:border-purple-400 transition-colors resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">GPS / Digital Address</label>
                <input
                  type="text"
                  value={form.gpsAddress}
                  onChange={e => set("gpsAddress", e.target.value)}
                  placeholder="e.g. GA-123-4567"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 outline-none focus:border-purple-400 transition-colors"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Subscription */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-extrabold text-slate-900">Subscription Setup</h2>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-3">Plan</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PLANS.map(plan => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => set("plan", plan.id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      form.plan === plan.id
                        ? "border-purple-500 bg-purple-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-slate-900">{plan.label}</span>
                      <span className="text-sm font-extrabold text-purple-700">GHS {plan.price}/mo</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-500">{plan.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-3">Billing Cycle</label>
              <div className="flex gap-3">
                {(["monthly", "annual"] as BillingCycle[]).map(cycle => (
                  <button
                    key={cycle}
                    type="button"
                    onClick={() => set("billingCycle", cycle)}
                    className={`flex-1 py-3 rounded-xl border-2 font-bold capitalize text-sm transition-all ${
                      form.billingCycle === cycle
                        ? "border-purple-500 bg-purple-50 text-purple-800"
                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {cycle}
                    {cycle === "annual" && <span className="ml-1.5 text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-extrabold">Save 20%</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Start Date</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={e => set("startDate", e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 outline-none focus:border-purple-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Trial Period</label>
                <button
                  type="button"
                  onClick={() => set("trialEnabled", !form.trialEnabled)}
                  className={`mt-1 flex items-center gap-3 px-4 py-3 rounded-xl border-2 font-bold text-sm transition-all ${
                    form.trialEnabled
                      ? "border-blue-400 bg-blue-50 text-blue-800"
                      : "border-slate-200 text-slate-500"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${form.trialEnabled ? "bg-blue-500 border-blue-500" : "border-slate-300"}`}>
                    {form.trialEnabled && <Check size={12} className="text-white" />}
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
            <h2 className="text-lg font-extrabold text-slate-900">Review & Create</h2>

            <div className="space-y-3">
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
                <div key={label} className="flex items-start gap-4 py-2.5 border-b border-slate-100 last:border-0">
                  <span className="text-sm font-bold text-slate-500 w-32 shrink-0">{label}</span>
                  <span className="text-sm font-semibold text-slate-900 flex-1">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ArrowLeft size={15} />
            Back
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={() => { if (validateStep()) setStep(s => s + 1); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold transition-all"
              style={{ background: PLATFORM_GRADIENT }}
            >
              Next
              <ArrowRight size={15} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCreate}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-bold transition-all disabled:opacity-60"
              style={{ background: PLATFORM_GRADIENT }}
            >
              {loading ? <><Loader2 size={15} className="animate-spin" /> Creating…</> : <><School size={15} /> Create School</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
