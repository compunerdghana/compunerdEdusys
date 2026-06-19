"use client";

import { useState, useEffect } from "react";
import {
  Users, GraduationCap, ExternalLink, Ban, CheckCircle,
  Loader2, ArrowLeft, Calendar, StickyNote, FileText,
  ClockIcon, Pin, Trash2, Plus, Upload, Download, Key, Lock, Edit2, ShieldAlert
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";

const TABS = ["Overview", "Subscription", "Features", "Onboarding", "Portal Logins", "Support", "Audit", "Notes", "Documents", "Analytics", "Status History"];

const statusBadge: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  trial: "bg-blue-50 text-blue-700 border border-blue-100",
  suspended: "bg-red-50 text-red-700 border border-red-100",
  expired: "bg-amber-50 text-amber-700 border border-amber-100",
  archived: "bg-slate-50 text-slate-500 border border-slate-100",
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
  "School Created",
  "Academic Year",
  "Classes",
  "Fee Structure",
  "Staff Added",
  "Students Added",
  "Parent Accounts",
  "Communication Setup",
  "Go Live",
];

interface Note {
  id: string;
  content: string;
  author: string;
  pinned: boolean;
  created_at: string;
}

interface Document {
  id: string;
  name: string;
  type: string;
  url: string;
  uploaded_at: string;
}

interface StatusHistoryItem {
  id: string;
  old_status: string;
  new_status: string;
  reason: string;
  changed_by: string;
  created_at: string;
}

function HealthScoreWidget({ score }: { score?: number }) {
  const s = score ?? 0;
  const color = s >= 75 ? "#10b981" : s >= 40 ? "#f59e0b" : "#ef4444";
  const label = s >= 75 ? "Healthy" : s >= 40 ? "Warning" : "Critical";
  const subScores = [
    { label: "Subscription", score: Math.min(25, Math.round(s * 0.3)) },
    { label: "Login Activity", score: Math.min(25, Math.round(s * 0.25)) },
    { label: "Students", score: Math.min(25, Math.round(s * 0.25)) },
    { label: "Data Completeness", score: Math.min(25, Math.round(s * 0.2)) },
  ];
  return (
    <div className="px-5 py-5">
      <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-3">Health Score</p>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-14 h-14 rounded-full border-4 flex items-center justify-center shrink-0 font-extrabold text-[20px]" style={{ borderColor: color, color }}>
          {s}
        </div>
        <div>
          <p className="font-extrabold text-[13px]" style={{ color }}>{label}</p>
          <p className="text-[11px] text-slate-400 font-semibold">out of 100</p>
        </div>
      </div>
      <div className="space-y-2">
        {subScores.map(({ label: l, score: ss }) => (
          <div key={l}>
            <div className="flex justify-between mb-0.5">
              <span className="text-[11px] font-semibold text-slate-500">{l}</span>
              <span className="text-[11px] font-bold text-slate-700">{ss}/25</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${(ss / 25) * 100}%`, background: color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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

  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [showDocForm, setShowDocForm] = useState(false);
  const [docForm, setDocForm] = useState({ name: "", type: "contract", url: "" });
  const [savingDoc, setSavingDoc] = useState(false);
  const [statusHistory] = useState<StatusHistoryItem[]>([]);

  interface AdminUser {
    id: string;
    full_name: string;
    email: string;
    username: string;
    role: string;
    is_active: boolean;
    created_at?: string;
  }

  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [resettingAdmin, setResettingAdmin] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resettingPasswordLoading, setResettingPasswordLoading] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: "", email: "", username: "", role: "", is_active: true });
  const [savingAdminLoading, setSavingAdminLoading] = useState(false);

  const fetchAdmins = async () => {
    setLoadingAdmins(true);
    try {
      const res = await fetch(`/api/platform/schools/${school.id}/admins`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAdmins(data.admins);
    } catch {
      toastError("Failed to load school administrators.");
    } finally {
      setLoadingAdmins(false);
    }
  };

  useEffect(() => {
    if (activeTab === "Portal Logins") {
      fetchAdmins();
    }
  }, [activeTab]);

  const handleSaveAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;
    setSavingAdminLoading(true);
    try {
      const res = await fetch(`/api/platform/schools/${school.id}/admins`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_id: editingAdmin.id, ...editForm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      success("Admin profile updated successfully.");
      setEditingAdmin(null);
      fetchAdmins();
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Failed to update admin profile.");
    } finally {
      setSavingAdminLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingAdmin) return;
    setResettingPasswordLoading(true);
    try {
      const res = await fetch(`/api/platform/schools/${school.id}/admins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_id: resettingAdmin.id, action: "reset-password", password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      success("Password reset successfully.");
      setResettingAdmin(null);
      setNewPassword("");
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Failed to reset password.");
    } finally {
      setResettingPasswordLoading(false);
    }
  };

  const handleToggleAdminStatus = async (adminUser: AdminUser) => {
    try {
      const nextActive = !adminUser.is_active;
      const res = await fetch(`/api/platform/schools/${school.id}/admins`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_id: adminUser.id, is_active: nextActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      success(`User ${nextActive ? "activated" : "suspended"} successfully.`);
      fetchAdmins();
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Failed to update user status.");
    }
  };

  const schoolId = String(school.id);
  const schoolName = String(school.name ?? "School");
  const schoolStatus = String(school.status ?? "active");
  const healthScore = typeof school.health_score === "number" ? school.health_score : undefined;

  const onboardingStepsDone = 3;
  const onboardingPct = Math.round((onboardingStepsDone / ONBOARDING_STEPS.length) * 100);

  const monthlyData = [40, 65, 55, 80, 95, 110];
  const revenueData = [1200, 1800, 1500, 2200, 2600, 3000];
  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const maxM = Math.max(...monthlyData);
  const maxR = Math.max(...revenueData);

  async function handleAction(action: "suspend" | "activate") {
    setActionLoading(action);
    try {
      const res = await fetch(`/api/platform/schools/${schoolId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error ?? "Action failed");
      }
      success(`School ${action === "suspend" ? "suspended" : "activated"} successfully.`);
      setTimeout(() => window.location.reload(), 800);
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Action failed. Please try again.");
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
        body: JSON.stringify({ school_id: schoolId }),
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

  async function submitNote() {
    if (!newNote.trim()) return;
    setSavingNote(true);
    try {
      const res = await fetch(`/api/platform/schools/${schoolId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      setNotes((prev) => [data.note ?? { id: Date.now().toString(), content: newNote, author: "Admin", pinned: false, created_at: new Date().toISOString() }, ...prev]);
      setNewNote(""); setAddingNote(false);
      success("Note added.");
    } catch { toastError("Failed to save note."); }
    finally { setSavingNote(false); }
  }

  async function submitDocument() {
    if (!docForm.name || !docForm.url) return;
    setSavingDoc(true);
    try {
      const res = await fetch(`/api/platform/schools/${schoolId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(docForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      setDocuments((prev) => [...prev, data.document ?? { id: Date.now().toString(), ...docForm, uploaded_at: new Date().toISOString() }]);
      setDocForm({ name: "", type: "contract", url: "" }); setShowDocForm(false);
      success("Document added.");
    } catch { toastError("Failed to save document."); }
    finally { setSavingDoc(false); }
  }

  const expiresAt = subscription?.expires_at ? new Date(String(subscription.expires_at)) : null;
  const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / 86400000) : null;

  return (
    <div className="space-y-5">
      {/* Back + breadcrumb */}
      <div className="flex items-center gap-3">
        <a
          href="/platform/schools"
          className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft size={14} />
          Schools
        </a>
        <span className="text-slate-300">/</span>
        <span className="text-[13px] font-bold text-slate-800">{schoolName}</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Left: Info card */}
        <div className="lg:w-72 shrink-0 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] overflow-hidden">

            {/* Gradient header */}
            <div
              className="px-6 pt-6 pb-8 text-white"
              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mb-3 text-white font-extrabold text-2xl">
                  {schoolName.charAt(0).toUpperCase()}
                </div>
                <h2 className="font-extrabold text-white text-[16px] leading-tight">{schoolName}</h2>
                <p className="text-white/60 text-[11px] font-semibold font-mono mt-1">{String(school.code ?? "")}</p>
              </div>
            </div>

            {/* Status badges */}
            <div className="flex items-center justify-center gap-2 -mt-3.5 relative z-10 mb-4">
              <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full shadow-sm ${statusBadge[schoolStatus] ?? "bg-slate-50 text-slate-500"}`}>
                {schoolStatus}
              </span>
              {subscription?.plan_name ? (
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full shadow-sm bg-violet-50 text-violet-700 border border-violet-100">
                  {String(subscription.plan_name)}
                </span>
              ) : null}
            </div>

            {/* Quick stats */}
            <div className="px-5 pb-5 space-y-0 divide-y divide-[#f5f3fc]">
              <div className="flex items-center gap-3 py-3">
                <GraduationCap size={14} className="text-slate-400 shrink-0" />
                <span className="text-slate-500 text-[13px] font-semibold">Students</span>
                <span className="ml-auto font-extrabold text-slate-900 text-[13px]">{studentCount.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-3 py-3">
                <Users size={14} className="text-slate-400 shrink-0" />
                <span className="text-slate-500 text-[13px] font-semibold">Staff</span>
                <span className="ml-auto font-extrabold text-slate-900 text-[13px]">{staffCount.toLocaleString()}</span>
              </div>
              {daysLeft !== null && (
                <div className="flex items-center gap-3 py-3">
                  <Calendar size={14} className="text-slate-400 shrink-0" />
                  <span className="text-slate-500 text-[13px] font-semibold">Expires</span>
                  <span className={`ml-auto font-extrabold text-[13px] ${daysLeft < 14 ? "text-red-600" : "text-slate-900"}`}>
                    {daysLeft < 0 ? "Expired" : `${daysLeft}d`}
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="px-5 pb-5 space-y-2">
              <button
                onClick={handleImpersonate}
                disabled={!!actionLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-[13px] font-bold transition-all disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
              >
                <ExternalLink size={13} />
                Impersonate School
              </button>
              {schoolStatus !== "suspended" ? (
                <button
                  onClick={() => handleAction("suspend")}
                  disabled={!!actionLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-50 text-red-700 text-[13px] font-bold hover:bg-red-100 transition-all disabled:opacity-60 border border-red-100"
                >
                  {actionLoading === "suspend" ? <Loader2 size={13} className="animate-spin" /> : <Ban size={13} />}
                  Suspend School
                </button>
              ) : (
                <button
                  onClick={() => handleAction("activate")}
                  disabled={!!actionLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-[13px] font-bold hover:bg-emerald-100 transition-all disabled:opacity-60 border border-emerald-100"
                >
                  {actionLoading === "activate" ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                  Activate School
                </button>
              )}
            </div>
          </div>

          {/* Health Score */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] overflow-hidden">
            <HealthScoreWidget score={healthScore} />
          </div>
        </div>

        {/* Right: Tabs */}
        <div className="flex-1 min-w-0 bg-white rounded-2xl shadow-sm border border-[#e8e4f3] overflow-hidden">
          {/* Tab header */}
          <div className="flex overflow-x-auto border-b border-[#f0edf8] px-4 pt-0 gap-0">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-4 text-[13px] font-bold whitespace-nowrap transition-all border-b-2 -mb-px ${
                  activeTab === tab
                    ? "text-violet-700 border-violet-600"
                    : "text-slate-400 border-transparent hover:text-slate-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Overview tab */}
            {activeTab === "Overview" && (
              <div className="space-y-0 divide-y divide-[#f5f3fc]">
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
                  <div key={String(label)} className="flex items-start gap-4 py-3">
                    <span className="text-[13px] font-bold text-slate-400 w-36 shrink-0">{String(label ?? "")}</span>
                    <span className="text-[14px] font-semibold text-slate-800">{String(value ?? "—")}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Subscription tab */}
            {activeTab === "Subscription" && (
              <div className="space-y-4">
                {subscription ? (
                  <>
                    <div
                      className="rounded-2xl p-5 text-white"
                      style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
                    >
                      <p className="text-white/60 text-[10px] font-extrabold uppercase tracking-widest mb-1">Current Plan</p>
                      <p className="text-2xl font-extrabold capitalize">{String(subscription.plan_name ?? "—")}</p>
                      <p className="text-white/60 text-[13px] font-semibold mt-1">
                        {subscription.expires_at ? `Expires ${new Date(String(subscription.expires_at)).toLocaleDateString("en-GH")}` : "No expiry set"}
                      </p>
                    </div>
                    <div className="space-y-0 divide-y divide-[#f5f3fc]">
                      {[
                        ["Plan", subscription.plan_name],
                        ["Status", subscription.status],
                        ["Started", subscription.started_at ? new Date(String(subscription.started_at)).toLocaleDateString() : "—"],
                        ["Expires", subscription.expires_at ? new Date(String(subscription.expires_at)).toLocaleDateString() : "—"],
                        ["Amount", `GHS ${subscription.amount ?? "—"}`],
                        ["Billing", subscription.billing_cycle],
                      ].map(([label, value]) => (
                        <div key={String(label)} className="flex justify-between py-3">
                          <span className="text-[13px] font-bold text-slate-400">{String(label)}</span>
                          <span className="text-[13px] font-semibold text-slate-800 capitalize">{String(value ?? "—")}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        className="flex-1 py-2.5 rounded-xl text-white text-[13px] font-bold"
                        style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
                      >
                        Renew Subscription
                      </button>
                      <button className="flex-1 py-2.5 rounded-xl border border-[#e0daf0] text-slate-700 text-[13px] font-bold hover:bg-slate-50 transition-all">
                        Change Plan
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="text-slate-400 font-semibold text-center py-10 text-[13px]">No subscription found.</p>
                )}
              </div>
            )}

            {/* Features tab */}
            {activeTab === "Features" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ALL_FEATURES.map(({ key, label, desc, comingSoon }) => (
                  <div
                    key={key}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                      comingSoon ? "opacity-50 bg-slate-50 border-slate-100" : "border-[#e8e4f3] hover:border-[#d0c9ef]"
                    }`}
                  >
                    <div>
                      <p className="font-bold text-slate-900 text-[13px]">{label}</p>
                      <p className="text-slate-400 text-[11px] font-semibold mt-0.5">{desc}</p>
                      {comingSoon && (
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide bg-slate-100 px-1.5 py-0.5 rounded-full mt-1 inline-block">
                          Coming soon
                        </span>
                      )}
                    </div>
                    <button
                      disabled={comingSoon}
                      onClick={() => toggleFeature(key, !featureToggles[key])}
                      className={`w-11 h-6 rounded-full relative transition-all shrink-0 ml-4 ${
                        featureToggles[key] && !comingSoon ? "bg-violet-600" : "bg-slate-200"
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
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-slate-700 font-bold text-[13px]">Setup Progress</p>
                    <span className="text-[13px] font-extrabold text-violet-700">{onboardingPct}%</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${onboardingPct}%`, background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }} />
                  </div>
                  <p className="text-[11px] text-slate-400 font-semibold mt-1">{onboardingStepsDone} of {ONBOARDING_STEPS.length} steps completed</p>
                </div>
                {ONBOARDING_STEPS.map((step, i) => {
                  const done = i < onboardingStepsDone;
                  return (
                    <div key={i} className={`flex items-center gap-3 p-3.5 rounded-xl border ${done ? "bg-emerald-50 border-emerald-100" : "bg-slate-50 border-slate-100"}`}>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${done ? "bg-emerald-100" : "bg-slate-200"}`}>
                        {done ? <CheckCircle size={14} className="text-emerald-600" /> : <span className="text-[11px] font-extrabold text-slate-400">{i + 1}</span>}
                      </div>
                      <span className={`text-[13px] font-semibold ${done ? "text-emerald-800" : "text-slate-500"}`}>{step}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Portal Logins tab */}
            {activeTab === "Portal Logins" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-[15px] leading-none">Portal Logins</h3>
                    <p className="text-[11px] text-slate-400 font-semibold mt-1">Configure and manage administrative accounts of the school</p>
                  </div>
                </div>

                {loadingAdmins ? (
                  <div className="flex flex-col items-center py-16 gap-3">
                    <Loader2 size={24} className="text-violet-600 animate-spin" />
                    <p className="text-slate-400 text-[13px] font-semibold">Loading administrators...</p>
                  </div>
                ) : admins.length === 0 ? (
                  <div className="flex flex-col items-center py-16 gap-3 border border-dashed border-[#e8e4f3] rounded-2xl bg-slate-50/50">
                    <ShieldAlert size={32} className="text-slate-300" />
                    <p className="text-slate-400 text-[13px] font-semibold">No administrator profiles found.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {admins.map((adminUser) => (
                      <div key={adminUser.id} className="bg-white rounded-2xl border border-[#e8e4f3] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-violet-200 transition-all shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0 font-extrabold text-violet-700 text-[14px]">
                            {adminUser.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-900 text-[13px]">{adminUser.full_name}</p>
                              <span className="rounded-full text-[9px] font-bold px-2 py-0.5 bg-violet-100 text-violet-700 border border-violet-200 uppercase tracking-wide">
                                {adminUser.role.replace("_", " ")}
                              </span>
                              <span className={`rounded-full text-[9px] font-bold px-2 py-0.5 border ${adminUser.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-red-50 text-red-700 border-red-100"}`}>
                                {adminUser.is_active ? "Active" : "Suspended"}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-[11px] font-semibold text-slate-400 font-mono">
                              <span className="flex items-center gap-1">
                                <span className="text-slate-300">Username:</span>
                                <span className="text-slate-600 font-bold">{adminUser.username || "—"}</span>
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="text-slate-300">Email:</span>
                                <span className="text-slate-600 font-bold">{adminUser.email || "—"}</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 md:self-center">
                          <button
                            onClick={() => {
                              setEditingAdmin(adminUser);
                              setEditForm({
                                full_name: adminUser.full_name,
                                email: adminUser.email,
                                username: adminUser.username,
                                role: adminUser.role,
                                is_active: adminUser.is_active,
                              });
                            }}
                            className="px-3 py-1.5 rounded-lg border border-[#e0daf0] text-slate-600 text-[11px] font-bold hover:bg-slate-50 transition-colors flex items-center gap-1"
                          >
                            <Edit2 size={11} /> Edit Details
                          </button>
                          <button
                            onClick={() => setResettingAdmin(adminUser)}
                            className="px-3 py-1.5 rounded-lg border border-[#e0daf0] text-violet-600 hover:bg-violet-50 hover:border-violet-200 text-[11px] font-bold transition-colors flex items-center gap-1"
                          >
                            <Key size={11} /> Reset PW
                          </button>
                          <button
                            onClick={() => handleToggleAdminStatus(adminUser)}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors flex items-center gap-1 ${
                              adminUser.is_active
                                ? "bg-red-50 text-red-700 border-red-100 hover:bg-red-100"
                                : "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100"
                            }`}
                          >
                            {adminUser.is_active ? <><Ban size={11} /> Suspend</> : <><CheckCircle size={11} /> Activate</>}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Edit details modal */}
                {editingAdmin && (
                  <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl border border-[#e8e4f3] p-6 w-full max-w-md shadow-xl animate-in fade-in duration-200">
                      <h3 className="font-extrabold text-slate-900 text-[16px] mb-4 flex items-center gap-1.5"><Edit2 size={16} className="text-violet-600" /> Edit Portal Login Details</h3>
                      <form onSubmit={handleSaveAdmin} className="space-y-4">
                        <div>
                          <label className="block text-[12px] font-bold text-slate-500 mb-1">Full Name</label>
                          <input type="text" value={editForm.full_name} onChange={(e) => setEditForm(f => ({ ...f, full_name: e.target.value }))} required
                            className="w-full h-10 px-3 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-700 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all" />
                        </div>
                        <div>
                          <label className="block text-[12px] font-bold text-slate-500 mb-1">Username</label>
                          <input type="text" value={editForm.username} onChange={(e) => setEditForm(f => ({ ...f, username: e.target.value.trim().toLowerCase() }))} required
                            className="w-full h-10 px-3 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-700 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all" />
                        </div>
                        <div>
                          <label className="block text-[12px] font-bold text-slate-500 mb-1">Email</label>
                          <input type="email" value={editForm.email} onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value.trim() }))} required
                            className="w-full h-10 px-3 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-700 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all" />
                        </div>
                        <div>
                          <label className="block text-[12px] font-bold text-slate-500 mb-1">Role</label>
                          <select value={editForm.role} onChange={(e) => setEditForm(f => ({ ...f, role: e.target.value }))} required
                            className="w-full h-10 px-3 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-700 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white">
                            <option value="owner">Owner</option>
                            <option value="admin">Admin</option>
                            <option value="school_admin">School Admin</option>
                            <option value="headmaster">Headmaster</option>
                          </select>
                        </div>
                        <div className="flex gap-2 pt-2 justify-end">
                          <button type="button" onClick={() => setEditingAdmin(null)} className="px-4 py-2 rounded-xl border border-[#e0daf0] text-slate-600 text-[12px] font-bold hover:bg-slate-100 transition-all">Cancel</button>
                          <button type="submit" disabled={savingAdminLoading} className="px-4 py-2 rounded-xl text-white text-[12px] font-bold disabled:opacity-50 transition-all flex items-center justify-center gap-1.5" style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
                            {savingAdminLoading && <Loader2 size={13} className="animate-spin" />} Save Changes
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* Reset password modal */}
                {resettingAdmin && (
                  <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl border border-[#e8e4f3] p-6 w-full max-w-md shadow-xl animate-in fade-in duration-200">
                      <h3 className="font-extrabold text-slate-900 text-[16px] mb-1 flex items-center gap-1.5"><Lock size={16} className="text-violet-600" /> Reset Password</h3>
                      <p className="text-[12px] text-slate-400 font-semibold mb-4">Set a new password for <span className="font-bold text-slate-700">{resettingAdmin.full_name}</span> ({resettingAdmin.username})</p>
                      <form onSubmit={handleResetPassword} className="space-y-4">
                        <div>
                          <label className="block text-[12px] font-bold text-slate-500 mb-1">New Password</label>
                          <input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} placeholder="Minimum 6 characters"
                            className="w-full h-10 px-3 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-700 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all" />
                        </div>
                        <div className="flex gap-2 pt-2 justify-end">
                          <button type="button" onClick={() => { setResettingAdmin(null); setNewPassword(""); }} className="px-4 py-2 rounded-xl border border-[#e0daf0] text-slate-600 text-[12px] font-bold hover:bg-slate-100 transition-all">Cancel</button>
                          <button type="submit" disabled={resettingPasswordLoading || newPassword.length < 6} className="px-4 py-2 rounded-xl text-white text-[12px] font-bold disabled:opacity-50 transition-all flex items-center justify-center gap-1.5" style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
                            {resettingPasswordLoading && <Loader2 size={13} className="animate-spin" />} Update Password
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Support tab */}
            {activeTab === "Support" && (
              <div className="divide-y divide-[#f5f3fc]">
                {tickets.length === 0 ? (
                  <p className="text-slate-400 text-[13px] font-semibold text-center py-10">No support tickets.</p>
                ) : tickets.map(t => (
                  <div key={String(t.id)} className="py-3.5">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-slate-900 text-[13px]">{String(t.subject ?? "")}</p>
                      <span className="text-[10px] font-bold text-slate-400">#{String(t.ticket_number ?? "")}</span>
                    </div>
                    <p className="text-slate-400 text-[11px] font-semibold mt-0.5">
                      {t.created_at ? new Date(String(t.created_at)).toLocaleDateString() : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Audit tab */}
            {activeTab === "Audit" && (
              <div className="divide-y divide-[#f5f3fc]">
                {auditLogs.length === 0 ? (
                  <p className="text-slate-400 text-[13px] font-semibold text-center py-10">No audit logs.</p>
                ) : auditLogs.map((log) => (
                  <div key={String(log.id)} className="py-3.5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white text-[11px] font-extrabold" style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
                      {String(log.action ?? "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-slate-800">{String(log.action ?? "")} on {String(log.target ?? "")}</p>
                      <p className="text-[11px] font-semibold text-slate-400">{log.created_at ? new Date(String(log.created_at)).toLocaleString() : ""}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Notes tab */}
            {activeTab === "Notes" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-slate-900 text-[15px]">Internal Notes</h3>
                  <button onClick={() => setAddingNote((v) => !v)} className="flex items-center gap-2 px-3 py-2 rounded-xl text-white text-[12px] font-bold transition-all" style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
                    <Plus size={13} /> Add Note
                  </button>
                </div>
                {addingNote && (
                  <div className="bg-slate-50 rounded-xl border border-[#e8e4f3] p-4 space-y-3">
                    <textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} rows={3} placeholder="Write an internal note..."
                      className="w-full rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-700 p-3 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 resize-none" />
                    <div className="flex gap-2">
                      <button onClick={submitNote} disabled={savingNote || !newNote.trim()} className="px-4 py-2 rounded-xl text-white text-[12px] font-bold disabled:opacity-50 transition-all" style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
                        {savingNote ? "Saving..." : "Save Note"}
                      </button>
                      <button onClick={() => { setAddingNote(false); setNewNote(""); }} className="px-4 py-2 rounded-xl border border-[#e0daf0] text-slate-600 text-[12px] font-bold hover:bg-slate-100 transition-all">Cancel</button>
                    </div>
                  </div>
                )}
                {notes.length === 0 && !addingNote ? (
                  <div className="flex flex-col items-center py-12 gap-3">
                    <StickyNote size={32} className="text-slate-300" />
                    <p className="text-slate-400 text-[13px] font-semibold">No notes yet. Add one above.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[...notes].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)).map((note) => (
                      <div key={note.id} className={`p-4 rounded-xl border ${note.pinned ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-[#e8e4f3]"}`}>
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-[13px] font-semibold text-slate-800 flex-1">{note.content}</p>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => setNotes((prev) => prev.map((n) => n.id === note.id ? { ...n, pinned: !n.pinned } : n))}
                              className={`p-1.5 rounded-lg transition-colors ${note.pinned ? "text-amber-600 bg-amber-100" : "text-slate-400 hover:bg-slate-200"}`}>
                              <Pin size={12} />
                            </button>
                            <button onClick={() => setNotes((prev) => prev.filter((n) => n.id !== note.id))} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                        <p className="text-[11px] font-semibold text-slate-400 mt-2">{note.author} &middot; {new Date(note.created_at).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Documents tab */}
            {activeTab === "Documents" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-slate-900 text-[15px]">Documents</h3>
                  <button onClick={() => setShowDocForm((v) => !v)} className="flex items-center gap-2 px-3 py-2 rounded-xl text-white text-[12px] font-bold transition-all" style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
                    <Upload size={13} /> Upload Document
                  </button>
                </div>
                {showDocForm && (
                  <div className="bg-slate-50 rounded-xl border border-[#e8e4f3] p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <input value={docForm.name} onChange={(e) => setDocForm((p) => ({ ...p, name: e.target.value }))} placeholder="Document name"
                        className="h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-700 px-3 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20" />
                      <select value={docForm.type} onChange={(e) => setDocForm((p) => ({ ...p, type: e.target.value }))}
                        className="h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-700 px-3 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 bg-white">
                        {["contract", "agreement", "license", "invoice", "report", "other"].map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                      </select>
                    </div>
                    <input value={docForm.url} onChange={(e) => setDocForm((p) => ({ ...p, url: e.target.value }))} placeholder="Document URL"
                      className="w-full h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-700 px-3 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20" />
                    <div className="flex gap-2">
                      <button onClick={submitDocument} disabled={savingDoc || !docForm.name || !docForm.url} className="px-4 py-2 rounded-xl text-white text-[12px] font-bold disabled:opacity-50 transition-all" style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
                        {savingDoc ? "Saving..." : "Save Document"}
                      </button>
                      <button onClick={() => setShowDocForm(false)} className="px-4 py-2 rounded-xl border border-[#e0daf0] text-slate-600 text-[12px] font-bold hover:bg-slate-100 transition-all">Cancel</button>
                    </div>
                  </div>
                )}
                {documents.length === 0 && !showDocForm ? (
                  <div className="flex flex-col items-center py-12 gap-3">
                    <FileText size={32} className="text-slate-300" />
                    <p className="text-slate-400 text-[13px] font-semibold">No documents uploaded yet.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#f5f3fc]">
                    {documents.map((doc) => (
                      <div key={doc.id} className="flex items-center gap-3 py-3.5">
                        <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                          <FileText size={16} className="text-violet-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 text-[13px] truncate">{doc.name}</p>
                          <p className="text-[11px] text-slate-400 font-semibold">{new Date(doc.uploaded_at).toLocaleDateString()}</p>
                        </div>
                        <span className="rounded-full text-[10px] font-bold px-2.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 capitalize">{doc.type}</span>
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg text-violet-600 hover:bg-violet-50 transition-colors">
                          <Download size={14} />
                        </a>
                        <button onClick={() => setDocuments((prev) => prev.filter((d) => d.id !== doc.id))} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Analytics tab */}
            {activeTab === "Analytics" && (
              <div className="space-y-8">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-[15px] mb-1">Student Growth</h3>
                  <p className="text-slate-400 text-[12px] font-semibold mb-4">Last 6 months</p>
                  <div className="flex items-end gap-3 h-32">
                    {monthlyData.map((v, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                        <div className="w-full rounded-t-lg" style={{ height: `${(v / maxM) * 112}px`, background: "linear-gradient(180deg, #7c3aed, #4f46e5)" }} />
                        <span className="text-[10px] font-bold text-slate-400">{monthLabels[i]}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-[15px] mb-1">Revenue History</h3>
                  <p className="text-slate-400 text-[12px] font-semibold mb-4">Last 6 months (GHS)</p>
                  <div className="flex items-end gap-3 h-32">
                    {revenueData.map((v, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                        <span className="text-[10px] font-bold text-emerald-700">{v}</span>
                        <div className="w-full rounded-t-lg" style={{ height: `${(v / maxR) * 100}px`, background: "linear-gradient(180deg, #10b981, #059669)" }} />
                        <span className="text-[10px] font-bold text-slate-400">{monthLabels[i]}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-[15px] mb-4">Recent Activity</h3>
                  <div className="relative pl-5 space-y-4">
                    <div className="absolute left-2 top-0 bottom-0 w-px bg-[#f0edf8]" />
                    {auditLogs.slice(0, 10).map((log, i) => (
                      <div key={i} className="relative">
                        <div className="absolute -left-3 top-1 w-2.5 h-2.5 rounded-full border-2 border-violet-400 bg-white" />
                        <p className="text-[13px] font-semibold text-slate-800">{String(log.action ?? "")} on {String(log.target ?? "")}</p>
                        <p className="text-[11px] text-slate-400 font-semibold">{log.created_at ? new Date(String(log.created_at)).toLocaleString() : ""}</p>
                      </div>
                    ))}
                    {auditLogs.length === 0 && <p className="text-slate-400 text-[13px] font-semibold">No recent activity.</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Status History tab */}
            {activeTab === "Status History" && (
              <div className="space-y-4">
                <h3 className="font-extrabold text-slate-900 text-[15px]">Status Change History</h3>
                {statusHistory.length === 0 ? (
                  <div className="flex flex-col items-center py-12 gap-3">
                    <ClockIcon size={32} className="text-slate-300" />
                    <p className="text-slate-400 text-[13px] font-semibold">No status changes recorded yet.</p>
                  </div>
                ) : (
                  <div className="relative pl-5 space-y-4">
                    <div className="absolute left-2 top-0 bottom-0 w-px bg-[#f0edf8]" />
                    {statusHistory.map((item) => (
                      <div key={item.id} className="relative">
                        <div className="absolute -left-3 top-1 w-2.5 h-2.5 rounded-full border-2 border-violet-400 bg-white" />
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`rounded-full text-[10px] font-bold px-2.5 py-0.5 border ${statusBadge[item.old_status] ?? "bg-slate-50 text-slate-500 border-slate-100"}`}>{item.old_status}</span>
                          <span className="text-slate-400 text-[12px]">to</span>
                          <span className={`rounded-full text-[10px] font-bold px-2.5 py-0.5 border ${statusBadge[item.new_status] ?? "bg-slate-50 text-slate-500 border-slate-100"}`}>{item.new_status}</span>
                        </div>
                        {item.reason && <p className="text-[12px] text-slate-600 font-semibold mt-1">Reason: {item.reason}</p>}
                        <p className="text-[11px] text-slate-400 font-semibold mt-0.5">By {item.changed_by} &middot; {new Date(item.created_at).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
