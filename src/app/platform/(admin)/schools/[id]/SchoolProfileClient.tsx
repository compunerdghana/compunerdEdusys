"use client";

import { useState } from "react";
import { Building2, Users, GraduationCap, ExternalLink, Ban, CheckCircle, RefreshCw, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

const PLATFORM_GRADIENT = "linear-gradient(135deg, #1a0533, #2d1b69, #6b1f8a)";

const TABS = ["Overview", "Subscription", "Features", "Onboarding", "Support", "Audit"];

const statusBadge: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  trial: "bg-blue-100 text-blue-700",
  suspended: "bg-red-100 text-red-700",
  expired: "bg-amber-100 text-amber-700",
  archived: "bg-slate-100 text-slate-500",
};

const ALL_FEATURES = [
  { key: "students", label: "Students Management", desc: "Manage student records and profiles" },
  { key: "admissions", label: "Admissions", desc: "Application and enrollment workflows" },
  { key: "finance", label: "Finance & Fees", desc: "Fee collection and financial tracking" },
  { key: "attendance", label: "Attendance", desc: "Daily student and staff attendance" },
  { key: "academics", label: "Academics", desc: "Subjects, classes and term management" },
  { key: "exams", label: "Exams & Reports", desc: "Exam scheduling and mark entry" },
  { key: "report_cards", label: "Report Cards", desc: "Auto-generate and print report cards" },
  { key: "communications", label: "Communications", desc: "SMS/WhatsApp to parents and staff" },
  { key: "payroll", label: "Payroll", desc: "Staff salary and payslip management" },
  { key: "inventory", label: "Inventory", desc: "Track school assets and supplies", comingSoon: true },
  { key: "transport", label: "Transport", desc: "Bus routes and student transport", comingSoon: true },
  { key: "hostel", label: "Hostel", desc: "Dormitory and boarding management", comingSoon: true },
];

const ONBOARDING_STEPS = [
  "School profile completed",
  "Admin user created",
  "School logo uploaded",
  "Academic year configured",
  "Classes & streams set up",
  "Subjects configured",
  "Students imported",
  "Staff added",
  "First term started",
];

interface Props {
  school: Record<string, unknown>;
  subscription: Record<string, unknown> | null;
  features: Record<string, unknown> | null;
  tickets: Record<string, unknown>[];
  auditLogs: Record<string, unknown>[];
  studentCount: number;
  staffCount: number;
}

export function SchoolProfileClient({ school, subscription, features, tickets, auditLogs, studentCount, staffCount }: Props) {
  const { success, error: toastError } = useToast();
  const [activeTab, setActiveTab] = useState("Overview");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [featureToggles, setFeatureToggles] = useState<Record<string, boolean>>(() => {
    const f = features ?? {};
    return Object.fromEntries(ALL_FEATURES.map(({ key }) => [key, Boolean((f as Record<string, unknown>)[key])]));
  });

  const schoolId = String(school.id);
  const schoolName = String(school.name ?? "School");
  const schoolStatus = String(school.status ?? "active");

  async function handleAction(action: "suspend" | "activate") {
    setActionLoading(action);
    try {
      const res = await fetch(`/api/platform/schools/${schoolId}/${action}`, { method: "POST" });
      if (!res.ok) throw new Error("Action failed");
      success(`School ${action === "suspend" ? "suspended" : "activated"} successfully.`);
      setTimeout(() => window.location.reload(), 800);
    } catch {
      toastError("Action failed. Please try again.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleImpersonate() {
    setActionLoading("impersonate");
    try {
      const res = await fetch("/api/platform/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      window.open(data.url, "_blank");
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Failed to impersonate");
    } finally {
      setActionLoading(null);
    }
  }

  async function toggleFeature(key: string, enabled: boolean) {
    if (ALL_FEATURES.find(f => f.key === key)?.comingSoon) return;
    const prev = featureToggles[key];
    setFeatureToggles(f => ({ ...f, [key]: enabled }));
    try {
      const res = await fetch("/api/platform/features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId, feature: key, enabled }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setFeatureToggles(f => ({ ...f, [key]: prev }));
      toastError("Failed to update feature.");
    }
  }

  const expiresAt = subscription?.expires_at ? new Date(String(subscription.expires_at)) : null;
  const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / 86400000) : null;

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <div className="rounded-2xl px-8 py-5 text-white" style={{ background: PLATFORM_GRADIENT }}>
        <div className="flex items-center gap-2 text-white/60 text-xs font-semibold mb-1">
          <a href="/platform/schools" className="hover:text-white transition-colors">Schools</a>
          <span>/</span>
          <span className="text-white">{schoolName}</span>
        </div>
        <h1 className="text-2xl font-extrabold">{schoolName}</h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Info card */}
        <div className="lg:w-80 shrink-0 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center mb-3">
                <Building2 size={28} className="text-purple-700" />
              </div>
              <h2 className="font-extrabold text-slate-900 text-lg">{schoolName}</h2>
              <p className="text-slate-500 text-sm font-semibold font-mono">{String(school.code ?? "")}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
                <span className={`text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full ${statusBadge[schoolStatus] ?? "bg-slate-100 text-slate-500"}`}>
                  {schoolStatus}
                </span>
                {subscription?.plan_name ? (
                  <span className="text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-purple-100 text-purple-700">
                    {String(subscription.plan_name)}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 py-2 border-b border-slate-100">
                <GraduationCap size={15} className="text-slate-400 shrink-0" />
                <span className="text-slate-500 font-semibold">Students</span>
                <span className="ml-auto font-extrabold text-slate-900">{studentCount.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-3 py-2 border-b border-slate-100">
                <Users size={15} className="text-slate-400 shrink-0" />
                <span className="text-slate-500 font-semibold">Staff</span>
                <span className="ml-auto font-extrabold text-slate-900">{staffCount.toLocaleString()}</span>
              </div>
              {daysLeft !== null && (
                <div className="flex items-center gap-3 py-2">
                  <span className="text-slate-500 font-semibold">Expires in</span>
                  <span className={`ml-auto font-extrabold ${daysLeft < 14 ? "text-red-600" : "text-slate-900"}`}>
                    {daysLeft < 0 ? "Expired" : `${daysLeft}d`}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-5 space-y-2">
              <button
                onClick={handleImpersonate}
                disabled={!!actionLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-bold transition-all disabled:opacity-60"
                style={{ background: PLATFORM_GRADIENT }}
              >
                <ExternalLink size={14} />
                Impersonate
              </button>
              {schoolStatus !== "suspended" ? (
                <button
                  onClick={() => handleAction("suspend")}
                  disabled={!!actionLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-50 text-red-700 text-sm font-bold hover:bg-red-100 transition-all disabled:opacity-60"
                >
                  {actionLoading === "suspend" ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
                  Suspend School
                </button>
              ) : (
                <button
                  onClick={() => handleAction("activate")}
                  disabled={!!actionLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-bold hover:bg-emerald-100 transition-all disabled:opacity-60"
                >
                  {actionLoading === "activate" ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                  Activate School
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right: Tabs */}
        <div className="flex-1 min-w-0 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {/* Tab header */}
          <div className="flex overflow-x-auto border-b border-slate-100 px-4 pt-4 gap-1">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 rounded-t-xl text-sm font-bold whitespace-nowrap transition-all border-b-2 -mb-px ${
                  activeTab === tab
                    ? "text-purple-700 border-purple-600 bg-purple-50"
                    : "text-slate-500 border-transparent hover:text-slate-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Overview tab */}
            {activeTab === "Overview" && (
              <div className="space-y-4">
                {[
                  ["School Name", school.name],
                  ["Code", school.code],
                  ["Type", school.type],
                  ["Proprietor", school.proprietor_name],
                  ["Email", school.email],
                  ["Phone", school.phone],
                  ["Region", school.region],
                  ["District", school.district],
                  ["Address", school.address],
                  ["GPS Address", school.gps_address],
                  ["Website", school.website],
                  ["Created", school.created_at ? new Date(String(school.created_at)).toLocaleDateString() : "—"],
                ].map(([label, value]) => (
                  <div key={String(label)} className="flex items-start gap-4 py-2.5 border-b border-slate-50 last:border-0">
                    <span className="text-sm font-bold text-slate-400 w-36 shrink-0">{String(label ?? "")}</span>
                    <span className="text-sm font-semibold text-slate-800">{String(value ?? "—")}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Subscription tab */}
            {activeTab === "Subscription" && (
              <div className="space-y-4">
                {subscription ? (
                  <>
                    <div className="rounded-xl p-4 text-white" style={{ background: PLATFORM_GRADIENT }}>
                      <p className="text-white/60 text-xs font-bold uppercase tracking-wide mb-1">Current Plan</p>
                      <p className="text-2xl font-extrabold capitalize">{String(subscription.plan_name ?? "—")}</p>
                      <p className="text-white/60 text-sm font-semibold mt-1">
                        {subscription.expires_at ? `Expires ${new Date(String(subscription.expires_at)).toLocaleDateString("en-GH")}` : "No expiry set"}
                      </p>
                    </div>
                    {[
                      ["Plan", subscription.plan_name],
                      ["Status", subscription.status],
                      ["Started", subscription.started_at ? new Date(String(subscription.started_at)).toLocaleDateString() : "—"],
                      ["Expires", subscription.expires_at ? new Date(String(subscription.expires_at)).toLocaleDateString() : "—"],
                      ["Amount", `GHS ${subscription.amount ?? "—"}`],
                      ["Billing", subscription.billing_cycle],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="flex justify-between py-2.5 border-b border-slate-50">
                        <span className="text-sm font-bold text-slate-400">{String(label)}</span>
                        <span className="text-sm font-semibold text-slate-800 capitalize">{String(value ?? "—")}</span>
                      </div>
                    ))}
                    <div className="flex gap-3 pt-2">
                      <button className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold" style={{ background: PLATFORM_GRADIENT }}>
                        Renew Subscription
                      </button>
                      <button className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-all">
                        Change Plan
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="text-slate-400 font-semibold text-center py-8">No subscription found.</p>
                )}
              </div>
            )}

            {/* Features tab */}
            {activeTab === "Features" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ALL_FEATURES.map(({ key, label, desc, comingSoon }) => (
                  <div
                    key={key}
                    className={`flex items-center justify-between p-4 rounded-xl border ${comingSoon ? "opacity-50 bg-slate-50" : "border-slate-100 hover:border-slate-200"} transition-all`}
                  >
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{label}</p>
                      <p className="text-slate-400 text-xs font-semibold mt-0.5">{desc}</p>
                      {comingSoon && <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">Coming soon</span>}
                    </div>
                    <button
                      disabled={comingSoon}
                      onClick={() => toggleFeature(key, !featureToggles[key])}
                      className={`w-11 h-6 rounded-full relative transition-all shrink-0 ml-4 ${
                        featureToggles[key] && !comingSoon ? "bg-purple-600" : "bg-slate-200"
                      } disabled:cursor-not-allowed`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${featureToggles[key] && !comingSoon ? "left-6" : "left-1"}`} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Onboarding tab */}
            {activeTab === "Onboarding" && (
              <div className="space-y-3">
                <p className="text-slate-500 text-sm font-semibold mb-4">School setup progress</p>
                {ONBOARDING_STEPS.map((step, i) => {
                  const done = i < 3;
                  return (
                    <div key={i} className={`flex items-center gap-3 p-3.5 rounded-xl ${done ? "bg-emerald-50 border border-emerald-100" : "bg-slate-50 border border-slate-100"}`}>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${done ? "bg-emerald-100" : "bg-slate-200"}`}>
                        {done
                          ? <CheckCircle size={15} className="text-emerald-600" />
                          : <span className="text-xs font-extrabold text-slate-400">{i + 1}</span>}
                      </div>
                      <span className={`text-sm font-semibold ${done ? "text-emerald-800" : "text-slate-500"}`}>{step}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Support tab */}
            {activeTab === "Support" && (
              <div className="divide-y divide-slate-100">
                {tickets.length === 0 ? (
                  <p className="text-slate-400 text-sm font-semibold text-center py-8">No support tickets.</p>
                ) : tickets.map(t => (
                  <div key={String(t.id)} className="py-3.5">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-slate-900 text-sm">{String(t.subject ?? "")}</p>
                      <span className="text-[10px] font-bold text-slate-400">#{String(t.ticket_number ?? "")}</span>
                    </div>
                    <p className="text-slate-400 text-xs font-semibold mt-0.5">
                      {t.created_at ? new Date(String(t.created_at)).toLocaleDateString() : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Audit tab */}
            {activeTab === "Audit" && (
              <div className="divide-y divide-slate-100">
                {auditLogs.length === 0 ? (
                  <p className="text-slate-400 text-sm font-semibold text-center py-8">No audit logs.</p>
                ) : auditLogs.map(log => (
                  <div key={String(log.id)} className="py-3.5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center shrink-0 text-xs font-extrabold text-purple-700">
                      {String(log.action ?? "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{String(log.action ?? "")} on {String(log.target ?? "")}</p>
                      <p className="text-xs font-semibold text-slate-400">
                        {log.created_at ? new Date(String(log.created_at)).toLocaleString() : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
