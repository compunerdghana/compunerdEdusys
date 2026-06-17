"use client";

import { useState, useEffect } from "react";
import { Zap, RefreshCw, Loader2, Check, ShieldAlert } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface SchoolFeature {
  name: string;
  label: string;
  description: string;
  isCore: boolean;
  status: boolean;
}

export default function FeatureAccessBoard() {
  const { error: toastError } = useToast();
  const [features, setFeatures] = useState<SchoolFeature[]>([]);
  const [loading, setLoading] = useState(true);

  // Default platforms modules representation mapping
  const platformFeatures = [
    { name: "students", label: "Student Directory", description: "Register, modify and update student profile attributes.", isCore: true },
    { name: "admissions", label: "Admissions Management", description: "Process online/offline registrations and onboarding checks.", isCore: true },
    { name: "academics", label: "Academics", description: "Setup term durations, reopening periods, class arms, and timetables.", isCore: true },
    { name: "attendance", label: "Attendance Tracker", description: "Mark and verify daily student and staff sign-ins.", isCore: false },
    { name: "exams", label: "Examinations Center", description: "Submit score sheets, approve C.A and lock academic results.", isCore: false },
    { name: "report_cards", label: "Report Cards Generation", description: "Compute averages and print official student report booklets.", isCore: false },
    { name: "finance", label: "Finance & Wallet", description: "Setup term fee items, budget limits, wallets, and cashbooks.", isCore: false },
    { name: "payroll", label: "Human Resource & Payroll", description: "Track exit cycles, leaves, training events and monthly payslips.", isCore: false },
    { name: "communications", label: "Communications Broadcast", description: "Send automated WhatsApp notifications, SMS broadcasts, and logs.", isCore: false },
  ];

  async function loadFeatures() {
    setLoading(true);
    try {
      const res = await fetch("/api/school/user-management/current-permissions");
      const data = await res.json();
      
      const enabledFeaturesList = data.features || [];
      const mapped = platformFeatures.map(f => ({
        ...f,
        status: f.isCore || enabledFeaturesList.includes(f.name)
      }));

      setFeatures(mapped);
    } catch {
      toastError("Failed to load platform features list.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadFeatures(); }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[20px] font-extrabold text-slate-900 leading-tight">Feature Access Board</h1>
        <p className="text-slate-500 text-[12px] font-semibold mt-0.5">Assigned platforms features enabled by the Super Admin for your school subscription.</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 shadow-inner">
        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
          <ShieldAlert size={16} />
        </div>
        <div>
          <h4 className="font-extrabold text-amber-950 text-[13px]">Read-Only Governance</h4>
          <p className="text-amber-800 text-[11px] font-semibold mt-0.5">
            Module assignments are controlled by your active subscription plan. If a feature is disabled, its pages, menu listings, and API access are blocked automatically across all school portal users.
          </p>
        </div>
      </div>

      {/* Toggles Grid */}
      {loading ? (
        <div className="py-20 text-center">
          <Loader2 size={24} className="animate-spin text-violet-600 mx-auto" />
          <p className="text-slate-400 text-[12px] font-semibold mt-2">Loading feature statuses...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {features.map((f) => (
            <div
              key={f.name}
              className={`p-5 rounded-2xl border transition-all flex items-start justify-between bg-white ${
                f.status
                  ? "border-violet-100 shadow-sm"
                  : "border-slate-100 opacity-60"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-slate-900 text-[14px]">{f.label}</h3>
                  {f.isCore && (
                    <span className="text-[9px] font-extrabold text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded border border-violet-100">
                      Core Feature
                    </span>
                  )}
                </div>
                <p className="text-slate-400 text-[11px] font-semibold max-w-sm">{f.description}</p>
              </div>

              {/* Status Switcher indicator */}
              <div className="flex items-center gap-2 shrink-0 ml-4">
                <div className={`w-8 h-5 rounded-full relative transition-all ${f.status ? "bg-violet-600" : "bg-slate-200"}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${f.status ? "left-3.5" : "left-0.5"}`} />
                </div>
                <span className={`text-[10px] font-extrabold uppercase ${f.status ? "text-violet-700" : "text-slate-400"}`}>
                  {f.status ? "Active" : "Disabled"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
