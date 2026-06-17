"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { UserPlus, Search, Lock, Unlock, RefreshCw, Loader2, Users, Download, ShieldAlert, Key, UsersRound } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { SlidePanel } from "@/components/ui/SlidePanel";

interface User {
  id: string;
  full_name: string;
  username: string;
  email?: string;
  phone?: string;
  role: string;
  is_active: boolean;
  user_roles?: Array<{
    role: { id: string; name: string; display_name: string };
  }>;
}

const roleBadge: Record<string, string> = {
  school_admin: "bg-violet-100 text-violet-800 border-violet-200",
  headmaster: "bg-blue-100 text-blue-800 border-blue-200",
  accountant: "bg-emerald-100 text-emerald-800 border-emerald-200",
  teacher: "bg-amber-100 text-amber-800 border-amber-200",
  librarian: "bg-cyan-100 text-cyan-800 border-cyan-200",
  parent: "bg-indigo-100 text-indigo-800 border-indigo-200",
  student: "bg-purple-100 text-purple-800 border-purple-200",
};

const inputClass =
  "w-full px-4 h-11 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white";

export default function AllUsersDirectory() {
  const { success, error: toastError } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [resetOpen, setResetOpen] = useState(false);
  const [resettingUser, setResettingUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  // Bulk Operations State
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState("");
  const [bulkVal, setBulkVal] = useState("");
  const [processingBulk, setProcessingBulk] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/school/user-management/users");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setUsers(data.users ?? []);
    } catch {
      toastError("Failed to load users directory.");
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function handleToggleStatus(user: User) {
    try {
      const nextStatus = !user.is_active;
      const res = await fetch("/api/school/user-management/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, is_active: nextStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_active: nextStatus } : u))
      );
      success(`User account has been ${nextStatus ? "activated" : "suspended"}.`);
    } catch {
      toastError("Failed to change user status.");
    }
  }

  async function handleResetPassword() {
    if (!resettingUser || !newPassword) return;
    setResetting(true);
    try {
      const res = await fetch(`/api/school/user-management/users/${resettingUser.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword })
      });
      if (!res.ok) throw new Error();
      success(`Password reset for ${resettingUser.full_name} successfully.`);
      setResetOpen(false);
      setNewPassword("");
    } catch {
      toastError("Failed to reset password.");
    } finally {
      setResetting(false);
    }
  }

  // Handle Checkbox Selection
  function handleSelectAll(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.checked) {
      setSelectedUserIds(filtered.map(u => u.id));
    } else {
      setSelectedUserIds([]);
    }
  }

  function handleSelectUser(userId: string, checked: boolean) {
    if (checked) {
      setSelectedUserIds(prev => [...prev, userId]);
    } else {
      setSelectedUserIds(prev => prev.filter(id => id !== userId));
    }
  }

  // Trigger Bulk Operations
  async function handleBulkOperation() {
    if (selectedUserIds.length === 0 || !bulkAction) return;
    setProcessingBulk(true);
    try {
      const payload: Record<string, any> = {
        action: bulkAction,
        user_ids: selectedUserIds
      };
      if (bulkAction === "reset-password") {
        if (!bulkVal || bulkVal.length < 6) {
          toastError("New password must be at least 6 characters.");
          setProcessingBulk(false);
          return;
        }
        payload.password = bulkVal;
      }

      const res = await fetch("/api/school/user-management/bulk-ops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");

      success(`Bulk operation '${bulkAction}' completed for ${data.updatedCount} accounts.`);
      setSelectedUserIds([]);
      setBulkAction("");
      setBulkVal("");
      loadUsers();
    } catch (err: any) {
      toastError(err.message || "Failed to process bulk operation.");
    } finally {
      setProcessingBulk(false);
    }
  }

  // Export CSV
  function handleExportCSV() {
    const csvRows = [
      ["Full Name", "Username", "Email", "Phone", "Role", "Status"],
      ...filtered.map(u => [
        u.full_name,
        u.username,
        u.email || "",
        u.phone || "",
        u.role,
        u.is_active ? "Active" : "Suspended"
      ])
    ];
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + csvRows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `school_users_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    if (q && !u.full_name?.toLowerCase().includes(q) && !u.username?.toLowerCase().includes(q) && !u.email?.toLowerCase().includes(q)) return false;
    if (roleFilter && u.role !== roleFilter) return false;
    if (statusFilter && (u.is_active ? "active" : "suspended") !== statusFilter) return false;
    return true;
  });

  const filterSelect =
    "h-11 px-3 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-700 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 bg-white transition-all";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-extrabold text-slate-900 leading-tight tracking-tight flex items-center gap-2">
            All Users Directory
          </h1>
          <p className="text-slate-500 text-[13px] font-medium mt-1">
            Overview list of all school portal users (students, parents, teachers, and staff).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#e0daf0] bg-white text-[13px] font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
          >
            <Download size={15} />
            Export CSV
          </button>
          <Link
            href="/user-management/new"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-bold transition-all shadow-sm"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
          >
            <UserPlus size={15} />
            Create User Account
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, username, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputClass} pl-9`}
          />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={filterSelect}>
          <option value="">All Roles</option>
          <option value="school_admin">School Admin</option>
          <option value="headmaster">Headmaster</option>
          <option value="accountant">Accountant</option>
          <option value="teacher">Teacher</option>
          <option value="librarian">Librarian</option>
          <option value="parent">Parent</option>
          <option value="student">Student</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={filterSelect}>
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        <button onClick={loadUsers} className="flex items-center gap-2 px-4 h-11 rounded-xl text-[12px] font-bold border border-[#e0daf0] text-slate-600 hover:bg-slate-50 transition-all bg-white">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Bulk Operations Toolbar */}
      {selectedUserIds.length > 0 && (
        <div className="bg-violet-50/50 border border-violet-100 rounded-xl p-4 flex flex-wrap gap-3 items-center justify-between animate-fade-in shadow-inner">
          <span className="text-[13px] font-bold text-violet-800">
            {selectedUserIds.length} accounts selected
          </span>
          <div className="flex items-center gap-2">
            <select
              value={bulkAction}
              onChange={(e) => { setBulkAction(e.target.value); setBulkVal(""); }}
              className="h-9 px-3 rounded-lg border border-violet-200 text-[12px] font-semibold text-slate-700 outline-none bg-white focus:border-violet-500"
            >
              <option value="">Choose batch action...</option>
              <option value="activate">Activate Accounts</option>
              <option value="suspend">Suspend Accounts</option>
              <option value="reset-password">Mass Password Reset</option>
            </select>
            
            {bulkAction === "reset-password" && (
              <input
                type="text"
                placeholder="New password..."
                value={bulkVal}
                onChange={(e) => setBulkVal(e.target.value)}
                className="h-9 px-3 rounded-lg border border-violet-200 text-[12px] font-semibold text-slate-800 bg-white"
              />
            )}

            <button
              onClick={handleBulkOperation}
              disabled={processingBulk || !bulkAction}
              className="px-4 h-9 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-[12px] font-bold transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              {processingBulk ? <Loader2 size={12} className="animate-spin" /> : <ShieldAlert size={12} />}
              Apply Action
            </button>
          </div>
        </div>
      )}

      {/* Directory Grid */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#faf9ff] border-b border-[#f0edf8]">
                <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest w-12">
                  <input
                    type="checkbox"
                    checked={selectedUserIds.length > 0 && selectedUserIds.length === filtered.length}
                    onChange={handleSelectAll}
                    className="rounded border-[#e0daf0] text-[#7c3aed] focus:ring-[#7c3aed]"
                  />
                </th>
                {["User Details", "Role", "Username / Email", "Phone", "Status", "Actions"].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5f3fc]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <Loader2 size={24} className="animate-spin text-violet-600 mx-auto" />
                    <p className="text-slate-400 text-[12px] font-semibold mt-2">Loading directory...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
                      <UsersRound size={28} className="text-slate-300" />
                    </div>
                    <p className="text-slate-700 font-bold text-[14px]">No accounts found</p>
                    <p className="text-slate-400 text-[12px] font-medium mt-1">Try adjusting your search or filter options.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((u) => {
                  const initials = u.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
                  const isChecked = selectedUserIds.includes(u.id);
                  return (
                    <tr key={u.id} className="hover:bg-[#faf9ff]/50 transition-colors">
                      <td className="px-6 py-5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => handleSelectUser(u.id, e.target.checked)}
                          className="rounded border-[#e0daf0] text-[#7c3aed] focus:ring-[#7c3aed]"
                        />
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-[11px] font-extrabold shrink-0 shadow ring-2 ring-white"
                            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
                          >
                            {initials}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-[13.5px]">{u.full_name}</p>
                            <p className="text-slate-400 font-semibold text-[11px] capitalize">{u.role.replace("_", " ")}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`rounded-full text-[11px] font-bold px-2.5 py-0.5 border capitalize ${roleBadge[u.role] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
                          {u.user_roles?.[0]?.role?.display_name || u.role.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-slate-700 font-semibold text-[13.5px]">{u.username}</p>
                        {u.email && <p className="text-slate-400 font-medium text-[11px]">{u.email}</p>}
                      </td>
                      <td className="px-6 py-5 text-slate-500 font-semibold text-[13.5px]">{u.phone || "—"}</td>
                      <td className="px-6 py-5">
                        <span className={`rounded-full text-[10px] font-extrabold uppercase px-2.5 py-0.5 border ${
                          u.is_active
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : "bg-red-50 text-red-700 border-red-100"
                        }`}>
                          {u.is_active ? "Active" : "Suspended"}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setResettingUser(u);
                              setResetOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors animate-all"
                            title="Reset Password"
                          >
                            <Lock size={14} />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(u)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              u.is_active
                                ? "text-slate-400 hover:text-red-600 hover:bg-red-50"
                                : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                            }`}
                            title={u.is_active ? "Suspend Account" : "Activate Account"}
                          >
                            {u.is_active ? <Unlock size={14} /> : <Lock size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Password Reset SlidePanel */}
      <SlidePanel
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset User Password"
        subtitle={`Set new password credentials for ${resettingUser?.full_name ?? ""}`}
      >
        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-[12px] font-bold text-slate-700 mb-1.5">New Password</label>
            <input
              type="password"
              placeholder="Min 6 characters..."
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass}
            />
          </div>
          <button
            onClick={handleResetPassword}
            disabled={resetting || newPassword.length < 6}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-[13px] transition-all disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
          >
            {resetting ? <Loader2 size={13} className="animate-spin" /> : <Key size={13} />}
            Confirm Reset
          </button>
        </div>
      </SlidePanel>
    </div>
  );
}
