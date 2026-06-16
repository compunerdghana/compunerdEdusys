"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Phone,
  Briefcase,
  Building2,
  Lock,
  Unlock,
  RotateCcw,
  Edit2,
  Loader2,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { SlidePanel } from "@/components/ui/SlidePanel";

interface PlatformUser {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  role: string;
  status?: string;
  department?: string;
  position?: string;
  username?: string;
  last_sign_in_at?: string;
  created_at?: string;
}

type TabKey = "overview" | "permissions" | "activity" | "login_history" | "groups";

const roleBadge: Record<string, string> = {
  super_admin: "bg-violet-100 text-violet-800 border-violet-200",
  platform_manager: "bg-blue-100 text-blue-800 border-blue-200",
  finance_officer: "bg-emerald-100 text-emerald-800 border-emerald-200",
  support_officer: "bg-cyan-100 text-cyan-800 border-cyan-200",
  sales_officer: "bg-amber-100 text-amber-800 border-amber-200",
  implementation_officer: "bg-purple-100 text-purple-800 border-purple-200",
  read_only_auditor: "bg-slate-100 text-slate-700 border-slate-200",
  manager: "bg-blue-100 text-blue-800 border-blue-200",
  support: "bg-cyan-100 text-cyan-800 border-cyan-200",
  sales: "bg-amber-100 text-amber-800 border-amber-200",
  finance: "bg-emerald-100 text-emerald-800 border-emerald-200",
  implementation: "bg-purple-100 text-purple-800 border-purple-200",
};

const statusBadge: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  inactive: "bg-slate-50 text-slate-600 border-slate-200",
  suspended: "bg-red-50 text-red-700 border-red-200",
  locked: "bg-amber-50 text-amber-700 border-amber-200",
};

function initials(name: string) {
  return (name ?? "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

const inputClass =
  "w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white";

export function UserProfileClient({ user }: { user: PlatformUser | null }) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [editOpen, setEditOpen] = useState(false);
  const [locking, setLocking] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<PlatformUser | null>(user);

  const [form, setForm] = useState({
    full_name: user?.full_name ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
    position: user?.position ?? "",
    department: user?.department ?? "",
    role: user?.role ?? "",
    status: user?.status ?? "active",
  });

  function setF(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleEdit() {
    if (!currentUser) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/platform/users/${currentUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update user");
      setCurrentUser((prev) => prev ? { ...prev, ...form } : prev);
      success("User updated.");
      setEditOpen(false);
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setEditLoading(false);
    }
  }

  async function handleLockToggle() {
    if (!currentUser) return;
    const newStatus = currentUser.status === "locked" ? "active" : "locked";
    setLocking(true);
    try {
      const res = await fetch(`/api/platform/users/${currentUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update status");
      setCurrentUser((prev) => prev ? { ...prev, status: newStatus } : prev);
      success(newStatus === "locked" ? "Account locked." : "Account unlocked.");
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setLocking(false);
    }
  }

  async function handleResetPassword() {
    if (!currentUser) return;
    setResetting(true);
    try {
      const res = await fetch(`/api/platform/users/${currentUser.id}/reset-password`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to reset password");
      success("Password reset email sent.");
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setResetting(false);
    }
  }

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-slate-400 font-semibold text-[14px]">User not found.</p>
        <Link href="/platform/users" className="text-violet-600 font-bold text-[13px] hover:underline">
          Back to Users
        </Link>
      </div>
    );
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "permissions", label: "Permissions" },
    { key: "activity", label: "Activity" },
    { key: "login_history", label: "Login History" },
    { key: "groups", label: "Groups" },
  ];

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href="/platform/users"
        className="flex items-center gap-2 text-slate-400 hover:text-violet-600 font-bold text-[13px] transition-colors w-fit"
      >
        <ArrowLeft size={14} />
        Back to Users
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left panel */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] p-6">
            {/* Avatar */}
            <div className="flex flex-col items-center text-center mb-6">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-[28px] font-extrabold mb-3"
                style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
              >
                {initials(currentUser.full_name)}
              </div>
              <h2 className="text-[18px] font-extrabold text-slate-900">{currentUser.full_name}</h2>
              <p className="text-slate-400 font-semibold text-[13px] mt-0.5">{currentUser.email}</p>
              {currentUser.phone && (
                <p className="text-slate-400 font-semibold text-[12px]">{currentUser.phone}</p>
              )}

              <div className="flex gap-2 mt-3 flex-wrap justify-center">
                <span
                  className={`rounded-full text-[11px] font-bold px-2.5 py-0.5 border ${roleBadge[currentUser.role] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}
                >
                  {(currentUser.role ?? "—").replace(/_/g, " ")}
                </span>
                <span
                  className={`rounded-full text-[11px] font-bold px-2.5 py-0.5 border ${statusBadge[currentUser.status ?? "active"] ?? "bg-slate-50 text-slate-500 border-slate-100"}`}
                >
                  {currentUser.status ?? "active"}
                </span>
              </div>
            </div>

            {/* Info rows */}
            <div className="space-y-3 border-t border-[#f0edf8] pt-5 mb-5">
              {currentUser.position && (
                <div className="flex items-center gap-3 text-[13px]">
                  <Briefcase size={14} className="text-violet-400 shrink-0" />
                  <span className="font-semibold text-slate-700">{currentUser.position}</span>
                </div>
              )}
              {currentUser.department && (
                <div className="flex items-center gap-3 text-[13px]">
                  <Building2 size={14} className="text-violet-400 shrink-0" />
                  <span className="font-semibold text-slate-700">{currentUser.department}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-[13px]">
                <Mail size={14} className="text-violet-400 shrink-0" />
                <span className="font-semibold text-slate-500 truncate">{currentUser.email}</span>
              </div>
              {currentUser.phone && (
                <div className="flex items-center gap-3 text-[13px]">
                  <Phone size={14} className="text-violet-400 shrink-0" />
                  <span className="font-semibold text-slate-500">{currentUser.phone}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button
                onClick={() => setEditOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white font-bold text-[13px] transition-all"
                style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
              >
                <Edit2 size={13} />
                Edit User
              </button>
              <button
                onClick={handleLockToggle}
                disabled={locking}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-[13px] transition-all disabled:opacity-60 ${
                  currentUser.status === "locked"
                    ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    : "bg-red-50 text-red-700 hover:bg-red-100"
                }`}
              >
                {locking ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : currentUser.status === "locked" ? (
                  <><Unlock size={13} /> Unlock Account</>
                ) : (
                  <><Lock size={13} /> Lock Account</>
                )}
              </button>
              <button
                onClick={handleResetPassword}
                disabled={resetting}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-[13px] transition-all bg-slate-50 text-slate-700 hover:bg-slate-100 disabled:opacity-60"
              >
                {resetting ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                Reset Password
              </button>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-[#f0edf8] overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-5 py-3.5 text-[13px] font-bold whitespace-nowrap border-b-2 transition-all ${
                    activeTab === tab.key
                      ? "border-violet-600 text-violet-700"
                      : "border-transparent text-slate-400 hover:text-slate-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-6">
              {activeTab === "overview" && (
                <div className="space-y-4">
                  <h3 className="text-[14px] font-extrabold text-slate-800">Personal Details</h3>
                  {[
                    { label: "Full Name", value: currentUser.full_name },
                    { label: "Email", value: currentUser.email },
                    { label: "Phone", value: currentUser.phone ?? "—" },
                    { label: "Position", value: currentUser.position ?? "—" },
                    { label: "Department", value: currentUser.department ?? "—" },
                    { label: "Username", value: currentUser.username ?? "—" },
                    { label: "Role", value: (currentUser.role ?? "—").replace(/_/g, " ") },
                    { label: "Status", value: currentUser.status ?? "active" },
                    { label: "Last Login", value: currentUser.last_sign_in_at ? new Date(currentUser.last_sign_in_at).toLocaleString() : "Never" },
                    { label: "Account Created", value: currentUser.created_at ? new Date(currentUser.created_at).toLocaleDateString() : "—" },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-start py-3 border-b border-[#f5f3fc] last:border-0">
                      <span className="w-36 text-[12px] font-bold text-slate-400 uppercase tracking-wide shrink-0">{label}</span>
                      <span className="text-[14px] font-semibold text-slate-800">{value}</span>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "permissions" && (
                <div className="space-y-3">
                  <h3 className="text-[14px] font-extrabold text-slate-800 mb-4">
                    Permissions via <span className="text-violet-700">{(currentUser.role ?? "—").replace(/_/g, " ")}</span> role
                  </h3>
                  <div className="bg-[#faf9ff] rounded-xl border border-[#e8e4f3] p-4">
                    <p className="text-[13px] text-slate-500 font-semibold">
                      This user inherits all permissions assigned to the{" "}
                      <strong>{(currentUser.role ?? "—").replace(/_/g, " ")}</strong> role.
                      Visit the{" "}
                      <Link href="/platform/users/roles" className="text-violet-600 hover:underline font-bold">
                        Roles page
                      </Link>{" "}
                      to view or modify role permissions.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === "activity" && (
                <div>
                  <h3 className="text-[14px] font-extrabold text-slate-800 mb-4">Recent Activity</h3>
                  <p className="text-slate-400 font-semibold text-[13px]">
                    Activity logs for this user are tracked in the{" "}
                    <Link href="/platform/users/activity" className="text-violet-600 hover:underline font-bold">
                      Activity Logs
                    </Link>{" "}
                    section.
                  </p>
                </div>
              )}

              {activeTab === "login_history" && (
                <div>
                  <h3 className="text-[14px] font-extrabold text-slate-800 mb-4">Login History</h3>
                  <div className="text-center py-8">
                    <p className="text-slate-400 font-semibold text-[13px]">
                      View all login records in{" "}
                      <Link href="/platform/users/login-history" className="text-violet-600 hover:underline font-bold">
                        Login History
                      </Link>.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === "groups" && (
                <div>
                  <h3 className="text-[14px] font-extrabold text-slate-800 mb-4">Group Memberships</h3>
                  <div className="text-center py-8">
                    <p className="text-slate-400 font-semibold text-[13px]">
                      Manage group memberships in{" "}
                      <Link href="/platform/users/groups" className="text-violet-600 hover:underline font-bold">
                        User Groups
                      </Link>.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit User Panel */}
      <SlidePanel
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit User"
        subtitle={`Editing ${currentUser.full_name}`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Full Name</label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setF("full_name", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setF("email", e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setF("phone", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Position</label>
              <input
                type="text"
                value={form.position}
                onChange={(e) => setF("position", e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Department</label>
              <input
                type="text"
                value={form.department}
                onChange={(e) => setF("department", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Status</label>
              <select
                value={form.status}
                onChange={(e) => setF("status", e.target.value)}
                className={inputClass}
              >
                {["active", "inactive", "suspended", "locked"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Role</label>
            <select
              value={form.role}
              onChange={(e) => setF("role", e.target.value)}
              className={inputClass}
            >
              {[
                "super_admin",
                "platform_manager",
                "finance_officer",
                "support_officer",
                "sales_officer",
                "implementation_officer",
                "read_only_auditor",
              ].map((r) => (
                <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleEdit}
            disabled={editLoading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-[13px] transition-all disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
          >
            {editLoading ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : "Save Changes"}
          </button>
        </div>
      </SlidePanel>
    </div>
  );
}
