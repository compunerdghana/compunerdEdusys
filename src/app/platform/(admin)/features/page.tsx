"use client";

import { useState, useEffect } from "react";
import { Zap, Search, CheckCircle } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

const ALL_FEATURES = [
  { key: "students", label: "Students Management", desc: "Manage student records, profiles, and enrollment", icon: "👨‍🎓" },
  { key: "admissions", label: "Admissions", desc: "Application forms and enrollment workflows", icon: "📋" },
  { key: "finance", label: "Finance & Fees", desc: "Fee collection, invoices, and financial tracking", icon: "💰" },
  { key: "attendance", label: "Attendance", desc: "Daily student and staff attendance tracking", icon: "✅" },
  { key: "academics", label: "Academics", desc: "Subjects, classes, timetable and term management", icon: "📚" },
  { key: "exams", label: "Exams & Reports", desc: "Exam scheduling, mark entry and result processing", icon: "📝" },
  { key: "report_cards", label: "Report Cards", desc: "Auto-generate and print student report cards", icon: "📄" },
  { key: "communications", label: "Communications", desc: "SMS and WhatsApp to parents and staff", icon: "💬" },
  { key: "payroll", label: "Payroll", desc: "Staff salary processing and payslip generation", icon: "💼" },
  { key: "inventory", label: "Inventory", desc: "Track school assets and supplies", icon: "📦", comingSoon: true },
  { key: "transport", label: "Transport", desc: "Bus routes and student transport tracking", icon: "🚌", comingSoon: true },
  { key: "hostel", label: "Hostel", desc: "Dormitory and boarding student management", icon: "🏠", comingSoon: true },
];

interface School {
  id: string;
  name: string;
  code: string;
}

interface FeatureMap {
  [key: string]: boolean;
}

export default function FeaturesPage() {
  const { success, error: toastError } = useToast();
  const [schools, setSchools] = useState<School[]>([]);
  const [search, setSearch] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [features, setFeatures] = useState<FeatureMap>({});
  const [loadingFeatures, setLoadingFeatures] = useState(false);

  useEffect(() => {
    fetch("/api/platform/schools")
      .then(r => r.json())
      .then(d => setSchools(d.schools ?? []))
      .catch(() => {});
  }, []);

  async function loadFeatures(school: School) {
    setSelectedSchool(school);
    setLoadingFeatures(true);
    try {
      const res = await fetch(`/api/platform/schools/${school.id}/features`);
      const data = await res.json();
      setFeatures(data.features ?? {});
    } catch {
      setFeatures({});
    } finally {
      setLoadingFeatures(false);
    }
  }

  async function toggleFeature(key: string, enabled: boolean) {
    if (!selectedSchool) return;
    const prev = features[key];
    setFeatures(f => ({ ...f, [key]: enabled }));
    try {
      const res = await fetch("/api/platform/features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId: selectedSchool.id, feature: key, enabled }),
      });
      if (!res.ok) throw new Error();
      success(`${ALL_FEATURES.find(f => f.key === key)?.label} ${enabled ? "enabled" : "disabled"}`);
    } catch {
      setFeatures(f => ({ ...f, [key]: prev }));
      toastError("Failed to update feature.");
    }
  }

  const filteredSchools = schools.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.code?.toLowerCase().includes(search.toLowerCase())
  );

  const enabledCount = Object.values(features).filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-extrabold text-slate-900 leading-tight">Feature Toggles</h1>
        <p className="text-slate-500 text-[13px] font-semibold mt-1">Enable or disable module features per school.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        {/* School selector */}
        <div className="lg:w-[260px] shrink-0 bg-white rounded-2xl shadow-sm border border-[#e8e4f3] overflow-hidden">
          <div className="p-4 border-b border-[#f0edf8]">
            <p className="text-[13px] font-extrabold text-slate-800 mb-3">Select School</p>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search schools…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 h-9 rounded-xl border border-[#e0daf0] text-[12px] font-semibold text-slate-700 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-[60vh]">
            {filteredSchools.length === 0 ? (
              <p className="text-slate-400 text-[12px] font-semibold text-center py-8">No schools found.</p>
            ) : filteredSchools.map(school => (
              <button
                key={school.id}
                onClick={() => loadFeatures(school)}
                className={`w-full text-left px-4 py-3 border-b border-[#f5f3fc] transition-colors ${
                  selectedSchool?.id === school.id
                    ? "bg-violet-50"
                    : "hover:bg-[#faf9ff]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-extrabold ${
                      selectedSchool?.id === school.id ? "text-white" : "bg-slate-100 text-slate-500"
                    }`}
                    style={selectedSchool?.id === school.id ? { background: "linear-gradient(135deg, #4f46e5, #7c3aed)" } : {}}
                  >
                    {school.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className={`text-[13px] font-bold ${selectedSchool?.id === school.id ? "text-violet-900" : "text-slate-900"}`}>{school.name}</p>
                    <p className="text-[10px] font-mono text-slate-400">{school.code}</p>
                  </div>
                  {selectedSchool?.id === school.id && (
                    <CheckCircle size={13} className="text-violet-600 ml-auto shrink-0" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Features panel */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-[#e8e4f3] overflow-hidden">
          {!selectedSchool ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center">
                <Zap size={24} className="text-violet-500" />
              </div>
              <div className="text-center">
                <p className="text-slate-700 font-bold text-[15px]">Select a school</p>
                <p className="text-slate-400 text-[13px] font-semibold mt-1">Choose a school from the left to manage its features</p>
              </div>
            </div>
          ) : (
            <>
              <div className="px-6 py-4 border-b border-[#f0edf8] flex items-center justify-between">
                <div>
                  <h2 className="font-extrabold text-slate-900 text-[15px]">{selectedSchool.name}</h2>
                  <p className="text-slate-400 text-[11px] font-mono">{selectedSchool.code}</p>
                </div>
                {!loadingFeatures && (
                  <div className="text-right">
                    <p className="text-[22px] font-extrabold text-slate-900">{enabledCount}</p>
                    <p className="text-slate-400 text-[11px] font-semibold">features on</p>
                  </div>
                )}
              </div>
              {loadingFeatures ? (
                <div className="flex items-center justify-center py-16">
                  <div
                    className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                    style={{ borderColor: "#e0daf0", borderTopColor: "#7c3aed" }}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-5">
                  {ALL_FEATURES.map(({ key, label, desc, comingSoon, icon }) => (
                    <div
                      key={key}
                      className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                        comingSoon
                          ? "opacity-50 bg-slate-50 border-slate-100"
                          : features[key]
                          ? "border-violet-200 bg-violet-50/50"
                          : "border-[#e8e4f3] hover:border-[#d0c9ef]"
                      }`}
                    >
                      <span className="text-xl shrink-0">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900 text-[13px] leading-tight">{label}</p>
                          {comingSoon && (
                            <span className="text-[9px] font-extrabold uppercase bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full">Soon</span>
                          )}
                        </div>
                        <p className="text-slate-400 text-[11px] font-semibold mt-0.5 leading-tight">{desc}</p>
                      </div>
                      <button
                        disabled={comingSoon}
                        onClick={() => toggleFeature(key, !features[key])}
                        className={`w-11 h-6 rounded-full relative transition-all shrink-0 disabled:cursor-not-allowed ${
                          features[key] && !comingSoon ? "bg-violet-600" : "bg-slate-200"
                        }`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${features[key] && !comingSoon ? "left-6" : "left-1"}`} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
