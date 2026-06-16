"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus, Loader2, Users, Search, Edit2, Lock, Eye } from "lucide-react";
import { SlidePanel } from "@/components/ui/SlidePanel";
import { useToast } from "@/components/ui/Toast";

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

const ROLES = [
  "super_admin",
  "platform_manager",
  "finance_officer",
  "support_officer",
  "sales_officer",
  "implementation_officer",
  "read_only_auditor",
];

const STATUSES = ["active", "inactive", "suspended", "locked"];

const DEPARTMENTS = [
  "Engineering",
  "Finance",
  "Support",
  "Sales",
  "Operations",
  "Management",
  "Implementation",
];

interface PlatformUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  phone?: string;
  status?: string;
  department?: string;
  position?: string;
  last_sign_in_at?: string;
}

function initials(name: string) {
  return (name ?? "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

const inputClass =
  "w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white";

export function UsersClient({ users }: { users: PlatformUser[] }) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [panelOpen, setPanelOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    position: "",
    department: "",
    role: "support_officer",
    username: "",
    temp_password: "",
    status: "active",
  });

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleCreate() {
    if (!form.first_name || !form.last_name || !form.email || !form.temp_password) {
      toastError("First name, last name, email and password are required.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        full_name: `${form.first_name} ${form.last_name}`.trim(),
        email: form.email,
        phone: form.phone,
        position: form.position,
        department: form.department,
        role: form.role,
        username: form.username,
        temp_password: form.temp_password,
        status: form.status,
      };
      const res = await fetch("/api/platform/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create user");
      success("Platform user created successfully.");
      setPanelOpen(false);
      setForm({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        position: "",
        department: "",
        role: "support_officer",
        username: "",
        temp_password: "",
        status: "active",
      });
      router.refresh();
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const q = search.toLowerCase();
      if (q && !u.full_name?.toLowerCase().includes(q) && !u.email?.toLowerCase().includes(q)) return false;
      if (roleFilter && u.role !== roleFilter) return false;
      if (statusFilter && (u.status ?? "active") !== statusFilter) return false;
      if (deptFilter && u.department !== deptFilter) return false;
      return true;
    });
  }, [users, search, roleFilter, statusFilter, deptFilter]);

  const filterSelect =
    "h-10 px-3 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-700 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 bg-white transition-all";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-extrabold text-slate-900 leading-tight">Platform Users</h1>
          <p className="text-slate-500 text-[14px] font-semibold mt-1">
            {users.length} {users.length === 1 ? "user" : "users"} total
          </p>
        </div>
        <button
          onClick={() => setPanelOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-bold transition-all shadow-sm"
          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
        >
          <UserPlus size={15} />
          Add User
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputClass} pl-9`}
          />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={filterSelect}>
          <option value="">All Roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={filterSelect}>
          <option value="">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className={filterSelect}>
          <option value="">All Departments</option>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#faf9ff] border-b border-[#f0edf8]">
                {["User", "Role", "Department", "Phone", "Status", "Last Login", "Actions"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5f3fc]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center">
                        <Users size={22} className="text-violet-400" />
                      </div>
                      <p className="text-slate-400 font-semibold text-[13px]">No users match your filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-[#faf9ff] transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-[11px] font-extrabold shrink-0"
                          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
                        >
                          {initials(user.full_name)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-[13px]">{user.full_name}</p>
                          <p className="text-slate-400 font-semibold text-[11px]">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`rounded-full text-[11px] font-bold px-2.5 py-0.5 border ${roleBadge[user.role] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}
                      >
                        {(user.role ?? "—").replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 font-semibold text-[13px]">
                      {user.department ?? "—"}
                    </td>
                    <td className="px-4 py-3.5 text-slate-400 font-semibold text-[13px]">
                      {user.phone ?? "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`rounded-full text-[11px] font-bold px-2.5 py-0.5 border ${statusBadge[user.status ?? "active"] ?? "bg-slate-50 text-slate-500 border-slate-100"}`}
                      >
                        {user.status ?? "active"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-400 font-semibold text-[12px]">
                      {user.last_sign_in_at
                        ? new Date(user.last_sign_in_at).toLocaleDateString()
                        : "Never"}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/platform/users/${user.id}`}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-all"
                          title="View"
                        >
                          <Eye size={13} />
                        </Link>
                        <button
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                          title="Edit"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all"
                          title={user.status === "locked" ? "Unlock" : "Lock"}
                        >
                          <Lock size={13} />
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

      {/* Add User SlidePanel */}
      <SlidePanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title="Add Platform User"
        subtitle="Create a new admin portal account"
        width="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.first_name}
                onChange={(e) => set("first_name", e.target.value)}
                placeholder="Kwame"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.last_name}
                onChange={(e) => set("last_name", e.target.value)}
                placeholder="Mensah"
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="kwame@compunerd.com"
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+233 24 xxx xxxx"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Position</label>
              <input
                type="text"
                value={form.position}
                onChange={(e) => set("position", e.target.value)}
                placeholder="Senior Support Officer"
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Department</label>
              <select
                value={form.department}
                onChange={(e) => set("department", e.target.value)}
                className={inputClass}
              >
                <option value="">Select department</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Role</label>
              <select
                value={form.role}
                onChange={(e) => set("role", e.target.value)}
                className={inputClass}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Username</label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => set("username", e.target.value)}
                placeholder="kwame.mensah"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Status</label>
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                className={inputClass}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">
              Temporary Password <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.temp_password}
              onChange={(e) => set("temp_password", e.target.value)}
              placeholder="Temp@123"
              className={inputClass}
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-[13px] transition-all disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Creating…
              </>
            ) : (
              "Create Platform User"
            )}
          </button>
        </div>
      </SlidePanel>
    </div>
  );
}
