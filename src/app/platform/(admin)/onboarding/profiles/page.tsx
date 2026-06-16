"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Building2, Search, Filter, Eye, Edit2, X, User, Mail, Phone,
  MapPin, CreditCard, Globe, CheckCircle2, XCircle, Clock,
} from "lucide-react";
import { SlidePanel } from "@/components/ui/SlidePanel";
import { useToast } from "@/components/ui/Toast";

interface OnboardingRecord {
  id: string;
  school_name: string;
  school_code: string;
  region: string;
  stage: string;
  verification_status: string;
  assigned_officer: string;
  progress: number;
  school_type?: string;
  school_category?: string;
  district?: string;
  address?: string;
  school_email?: string;
  school_phone?: string;
  website?: string;
  contact_name?: string;
  contact_position?: string;
  contact_email?: string;
  contact_phone?: string;
  plan?: string;
  billing_cycle?: string;
  student_population?: number;
  staff_population?: number;
  go_live_date?: string;
  created_at: string;
  notes?: string;
}

const STAGE_BADGE: Record<string, string> = {
  registered: "bg-indigo-100 text-indigo-700 border-indigo-200",
  "verification pending": "bg-amber-100 text-amber-700 border-amber-200",
  verified: "bg-cyan-100 text-cyan-700 border-cyan-200",
  setup: "bg-violet-100 text-violet-700 border-violet-200",
  training: "bg-blue-100 text-blue-700 border-blue-200",
  testing: "bg-orange-100 text-orange-700 border-orange-200",
  "go-live ready": "bg-emerald-100 text-emerald-700 border-emerald-200",
  active: "bg-green-100 text-green-700 border-green-200",
};

const VERIFICATION_BADGE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  verified: "bg-emerald-100 text-emerald-700 border-emerald-200",
  approved: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
};

type ProfileTab = "info" | "contact" | "subscription" | "branding" | "verification" | "notes";

function ProfilePanel({ rec, onClose }: { rec: OnboardingRecord; onClose: () => void }) {
  const [tab, setTab] = useState<ProfileTab>("info");
  const tabs: { key: ProfileTab; label: string }[] = [
    { key: "info", label: "Info" },
    { key: "contact", label: "Contact" },
    { key: "subscription", label: "Subscription" },
    { key: "branding", label: "Branding" },
    { key: "verification", label: "Verification" },
    { key: "notes", label: "Notes" },
  ];
  return (
    <SlidePanel open title={rec.school_name} subtitle={rec.school_code} onClose={onClose} width="xl">
      <div>
        <div className="flex gap-1 mb-6 bg-[#faf9ff] p-1 rounded-xl">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 h-8 rounded-lg text-[12px] font-bold transition-all ${tab === t.key ? "text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              style={tab === t.key ? { background: "linear-gradient(135deg,#4f46e5,#7c3aed)" } : {}}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "info" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "School Name", value: rec.school_name },
                { label: "School Code", value: rec.school_code },
                { label: "Type", value: rec.school_type },
                { label: "Category", value: rec.school_category },
                { label: "Region", value: rec.region },
                { label: "District", value: rec.district },
                { label: "Email", value: rec.school_email },
                { label: "Phone", value: rec.school_phone },
                { label: "Website", value: rec.website },
                { label: "Address", value: rec.address },
              ].map(({ label, value }) => (
                <div key={label} className="bg-[#faf9ff] rounded-xl p-3 border border-[#e8e4f3]">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
                  <p className="text-[13px] font-semibold text-slate-800">{value || <span className="text-slate-300">—</span>}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <span className={`rounded-full text-[11px] font-bold px-2.5 py-0.5 border ${STAGE_BADGE[(rec.stage ?? "").toLowerCase()] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}>
                {rec.stage ?? "—"}
              </span>
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-2 rounded-full" style={{ width: `${rec.progress ?? 0}%`, background: "linear-gradient(90deg,#4f46e5,#7c3aed)" }} />
              </div>
              <span className="text-[11px] font-bold text-slate-500">{rec.progress ?? 0}%</span>
            </div>
          </div>
        )}

        {tab === "contact" && (
          <div className="space-y-4">
            {[
              { icon: User, label: "Full Name", value: rec.contact_name },
              { icon: Building2, label: "Position", value: rec.contact_position },
              { icon: Mail, label: "Email", value: rec.contact_email },
              { icon: Phone, label: "Phone", value: rec.contact_phone },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 p-3 bg-[#faf9ff] rounded-xl border border-[#e8e4f3]">
                <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                  <Icon size={15} className="text-violet-600" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
                  <p className="text-[13px] font-semibold text-slate-800">{value || "—"}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "subscription" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Plan", value: rec.plan },
                { label: "Billing Cycle", value: rec.billing_cycle },
                { label: "Students", value: rec.student_population?.toString() },
                { label: "Staff", value: rec.staff_population?.toString() },
                { label: "Go-Live Date", value: rec.go_live_date ? new Date(rec.go_live_date).toLocaleDateString() : undefined },
              ].map(({ label, value }) => (
                <div key={label} className="bg-[#faf9ff] rounded-xl p-3 border border-[#e8e4f3]">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
                  <p className="text-[13px] font-semibold text-slate-800">{value || <span className="text-slate-300">—</span>}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "branding" && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Globe size={24} className="text-slate-300" />
            </div>
            <p className="text-[13px] font-semibold text-slate-400">No branding assets uploaded yet</p>
            <p className="text-[12px] text-slate-300 mt-1">Logo, colors, and theme will appear here once configured</p>
          </div>
        )}

        {tab === "verification" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <span className={`rounded-full text-[11px] font-bold px-2.5 py-0.5 border ${VERIFICATION_BADGE[(rec.verification_status ?? "pending").toLowerCase()] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}>
                {rec.verification_status ?? "Pending"}
              </span>
            </div>
            {[
              "School Information Verified",
              "Contact Person Verified",
              "Subscription Confirmed",
              "Payment Confirmed",
              "School Logo Uploaded",
              "Administrator Account Created",
              "Portal Created",
              "Setup Completed",
            ].map(item => (
              <div key={item} className="flex items-center gap-3 p-3 bg-[#faf9ff] rounded-xl border border-[#e8e4f3]">
                <div className="w-5 h-5 rounded border-2 border-[#e0daf0] flex items-center justify-center shrink-0">
                  {rec.verification_status === "verified" || rec.verification_status === "approved" ? (
                    <CheckCircle2 size={12} className="text-emerald-500" />
                  ) : null}
                </div>
                <span className="text-[13px] font-semibold text-slate-700">{item}</span>
              </div>
            ))}
          </div>
        )}

        {tab === "notes" && (
          <div>
            {rec.notes ? (
              <div className="bg-[#faf9ff] rounded-xl p-4 border border-[#e8e4f3]">
                <p className="text-[13px] font-semibold text-slate-700 whitespace-pre-wrap">{rec.notes}</p>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-[13px] font-semibold text-slate-400">No notes added yet</p>
              </div>
            )}
          </div>
        )}
      </div>
    </SlidePanel>
  );
}

export default function ProfilesPage() {
  const searchParams = useSearchParams();
  const { error: toastError } = useToast();
  const [records, setRecords] = useState<OnboardingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [selected, setSelected] = useState<OnboardingRecord | null>(null);

  useEffect(() => {
    fetch("/api/platform/onboarding")
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => {
        const list: OnboardingRecord[] = d.onboardings ?? d.data ?? d ?? [];
        setRecords(list);
        const viewId = searchParams.get("view");
        if (viewId) {
          const found = list.find(r => r.id === viewId);
          if (found) setSelected(found);
        }
      })
      .catch(() => toastError("Failed to load profiles"))
      .finally(() => setLoading(false));
  }, [toastError, searchParams]);

  const filtered = records.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.school_name?.toLowerCase().includes(q) || r.school_code?.toLowerCase().includes(q);
    const matchStage = !stageFilter || (r.stage ?? "").toLowerCase() === stageFilter;
    const matchRegion = !regionFilter || r.region === regionFilter;
    return matchSearch && matchStage && matchRegion;
  });

  const regions = [...new Set(records.map(r => r.region).filter(Boolean))];
  const stages = [...new Set(records.map(r => r.stage).filter(Boolean))];

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <div className="max-w-screen-xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[26px] font-extrabold text-slate-900">Onboarding School Profiles</h1>
            <p className="text-[13px] text-slate-500 mt-0.5">{loading ? "Loading…" : `${records.length} schools`}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full pl-9 pr-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
              placeholder="Search schools..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select className="px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-700 bg-white outline-none focus:border-[#7c3aed] transition-all"
            value={stageFilter} onChange={e => setStageFilter(e.target.value)}>
            <option value="">All Stages</option>
            {stages.map(s => <option key={s} value={(s ?? "").toLowerCase()}>{s}</option>)}
          </select>
          <select className="px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-700 bg-white outline-none focus:border-[#7c3aed] transition-all"
            value={regionFilter} onChange={e => setRegionFilter(e.target.value)}>
            <option value="">All Regions</option>
            {regions.map(r => <option key={r}>{r}</option>)}
          </select>
          {(search || stageFilter || regionFilter) && (
            <button onClick={() => { setSearch(""); setStageFilter(""); setRegionFilter(""); }}
              className="h-10 w-10 rounded-xl border border-[#e0daf0] flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-white transition-all">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#faf9ff]">
                  {["School", "Code", "Region", "Stage", "Verification", "Officer", "Progress", "Actions"].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-slate-400 uppercase tracking-widest text-[11px] font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0edf8]">
                {loading ? (
                  [1, 2, 3].map(i => (
                    <tr key={i}>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(j => (
                        <td key={j} className="px-5 py-3.5"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-14 text-center">
                      <Building2 size={32} className="text-slate-200 mx-auto mb-3" />
                      <p className="text-[13px] font-semibold text-slate-400">No school profiles found</p>
                      <p className="text-[12px] text-slate-300 mt-1">Try adjusting filters or register new schools</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map(rec => (
                    <tr key={rec.id} className="hover:bg-[#faf9ff] transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-[12px] font-extrabold shrink-0"
                            style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}>
                            {rec.school_name?.slice(0, 2).toUpperCase() ?? "SC"}
                          </div>
                          <div>
                            <p className="text-[13px] font-bold text-slate-800">{rec.school_name}</p>
                            <p className="text-[11px] text-slate-400 font-semibold">{rec.school_type ?? "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-[12px] font-bold text-indigo-600">{rec.school_code}</td>
                      <td className="px-5 py-3.5 text-[12px] font-semibold text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <MapPin size={11} className="text-slate-300" />
                          {rec.region ?? "—"}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`rounded-full text-[11px] font-bold px-2.5 py-0.5 border ${STAGE_BADGE[(rec.stage ?? "").toLowerCase()] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}>
                          {rec.stage ?? "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          {rec.verification_status === "verified" || rec.verification_status === "approved"
                            ? <CheckCircle2 size={13} className="text-emerald-500" />
                            : rec.verification_status === "rejected"
                              ? <XCircle size={13} className="text-red-500" />
                              : <Clock size={13} className="text-amber-500" />}
                          <span className={`rounded-full text-[11px] font-bold px-2.5 py-0.5 border ${VERIFICATION_BADGE[(rec.verification_status ?? "pending").toLowerCase()] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}>
                            {rec.verification_status ?? "Pending"}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-[12px] font-semibold text-slate-600">{rec.assigned_officer ?? "—"}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2 min-w-[100px]">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-2 rounded-full" style={{ width: `${rec.progress ?? 0}%`, background: "linear-gradient(90deg,#4f46e5,#7c3aed)" }} />
                          </div>
                          <span className="text-[11px] font-bold text-slate-500">{rec.progress ?? 0}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setSelected(rec)}
                            className="inline-flex items-center gap-1.5 px-3 h-7 rounded-lg text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 transition-colors">
                            <Eye size={11} /> View
                          </button>
                          <button className="inline-flex items-center gap-1.5 px-3 h-7 rounded-lg text-[11px] font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors">
                            <Edit2 size={11} /> Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selected && <ProfilePanel rec={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
