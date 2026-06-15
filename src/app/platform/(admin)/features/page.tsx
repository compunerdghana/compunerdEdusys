"use client";

import { useState, useEffect } from "react";
import { Zap, Search } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

const PLATFORM_GRADIENT = "linear-gradient(135deg, #1a0533, #2d1b69, #6b1f8a)";

const ALL_FEATURES = [
  { key: "students", label: "Students Management", desc: "Manage student records, profiles, and enrollment" },
  { key: "admissions", label: "Admissions", desc: "Application forms and enrollment workflows" },
  { key: "finance", label: "Finance & Fees", desc: "Fee collection, invoices, and financial tracking" },
  { key: "attendance", label: "Attendance", desc: "Daily student and staff attendance tracking" },
  { key: "academics", label: "Academics", desc: "Subjects, classes, timetable and term management" },
  { key: "exams", label: "Exams & Reports", desc: "Exam scheduling, mark entry and result processing" },
  { key: "report_cards", label: "Report Cards", desc: "Auto-generate and print student report cards" },
  { key: "communications", label: "Communications", desc: "SMS and WhatsApp to parents and staff" },
  { key: "payroll", label: "Payroll", desc: "Staff salary processing and payslip generation" },
  { key: "inventory", label: "Inventory", desc: "Track school assets and supplies", comingSoon: true },
  { key: "transport", label: "Transport", desc: "Bus routes and student transport tracking", comingSoon: true },
  { key: "hostel", label: "Hostel", desc: "Dormitory and boarding student management", comingSoon: true },
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

  return (
    <div className="space-y-6">
      <div className="rounded-2xl px-8 py-6 text-white" style={{ background: PLATFORM_GRADIENT }}>
        <h1 className="text-2xl font-extrabold">Feature Toggles</h1>
        <p className="text-white/60 font-semibold mt-1">Enable or disable module features per school.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* School selector */}
        <div className="lg:w-72 shrink-0 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search schools…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 outline-none focus:border-purple-400 transition-colors"
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-[60vh]">
            {filteredSchools.length === 0 ? (
              <p className="text-slate-400 text-sm font-semibold text-center py-8">No schools found.</p>
            ) : filteredSchools.map(school => (
              <button
                key={school.id}
                onClick={() => loadFeatures(school)}
                className={`w-full text-left px-4 py-3 border-b border-slate-50 transition-colors ${
                  selectedSchool?.id === school.id ? "bg-purple-50" : "hover:bg-slate-50"
                }`}
              >
                <p className={`text-sm font-bold ${selectedSchool?.id === school.id ? "text-purple-900" : "text-slate-900"}`}>{school.name}</p>
                <p className="text-xs font-mono text-slate-400">{school.code}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Features panel */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100">
          {!selectedSchool ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center">
                <Zap size={22} className="text-purple-700" />
              </div>
              <p className="text-slate-500 font-bold">Select a school to manage features</p>
            </div>
          ) : (
            <div>
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="font-extrabold text-slate-900">{selectedSchool.name}</h2>
                <p className="text-slate-400 text-xs font-semibold">{selectedSchool.code}</p>
              </div>
              {loadingFeatures ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-purple-300 border-t-purple-700 rounded-full animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-6">
                  {ALL_FEATURES.map(({ key, label, desc, comingSoon }) => (
                    <div
                      key={key}
                      className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                        comingSoon ? "opacity-50 bg-slate-50 border-slate-100" : "border-slate-100 hover:border-slate-200"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900 text-sm">{label}</p>
                          {comingSoon && (
                            <span className="text-[9px] font-extrabold uppercase bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full">Soon</span>
                          )}
                        </div>
                        <p className="text-slate-400 text-xs font-semibold mt-0.5">{desc}</p>
                      </div>
                      <button
                        disabled={comingSoon}
                        onClick={() => toggleFeature(key, !features[key])}
                        className={`w-11 h-6 rounded-full relative transition-all shrink-0 ml-4 disabled:cursor-not-allowed ${
                          features[key] && !comingSoon ? "bg-purple-600" : "bg-slate-200"
                        }`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${features[key] && !comingSoon ? "left-6" : "left-1"}`} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
