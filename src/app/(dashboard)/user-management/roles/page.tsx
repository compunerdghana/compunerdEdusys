"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Shield, Loader2, Save, RefreshCw, Copy } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { SlidePanel } from "@/components/ui/SlidePanel";

interface SchoolRole {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  is_system: boolean;
  sync_policy: string;
}

interface Permission {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  feature_code?: string;
  granted?: boolean;
}

const inputClass =
  "w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white";

export default function SchoolRolesPage() {
  const { success, error: toastError } = useToast();
  const [roles, setRoles] = useState<SchoolRole[]>([]);
  const [selectedRole, setSelectedRole] = useState<SchoolRole | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [fetchingPerms, setFetchingPerms] = useState(false);
  const [savingPerms, setSavingPerms] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ display_name: "", description: "", source_role_id: "" });

  const loadRoles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/school/user-management/roles");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setRoles(data.roles ?? []);
      if (data.roles && data.roles.length > 0 && !selectedRole) {
        setSelectedRole(data.roles[0]);
      }
    } catch {
      toastError("Failed to load school roles.");
    } finally {
      setLoading(false);
    }
  }, [selectedRole, toastError]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const loadPermissions = useCallback(async () => {
    if (!selectedRole) return;
    setFetchingPerms(true);
    try {
      const res = await fetch(`/api/school/user-management/roles/${selectedRole.id}/permissions`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setPermissions(data.permissions ?? []);
    } catch {
      toastError("Failed to load permissions.");
    } finally {
      setFetchingPerms(false);
    }
  }, [selectedRole, toastError]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  async function handleCreateRole() {
    if (!form.display_name) {
      toastError("Display name is required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/school/user-management/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      success(`School role ${form.display_name} created successfully.`);
      setRoles((prev) => [...prev, data]);
      setSelectedRole(data);
      setShowCreate(false);
      setForm({ display_name: "", description: "", source_role_id: "" });
    } catch (err: any) {
      toastError(err.message || "Failed to create role.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSavePermissions() {
    if (!selectedRole) return;
    setSavingPerms(true);
    try {
      const permission_ids = permissions.filter((p) => p.granted).map((p) => p.id);
      const res = await fetch(`/api/school/user-management/roles/${selectedRole.id}/permissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permission_ids })
      });
      if (!res.ok) throw new Error("Failed");
      success("Permissions assigned to role successfully.");
      
      // If system default role was edited, change its sync policy locally to ignored
      if (selectedRole.sync_policy === "auto_sync") {
        setRoles(prev => prev.map(r => r.id === selectedRole.id ? { ...r, sync_policy: "ignored" } : r));
        setSelectedRole(prev => prev ? { ...prev, sync_policy: "ignored" } : null);
      }
    } catch {
      toastError("Failed to save permissions.");
    } finally {
      setSavingPerms(false);
    }
  }

  function togglePermission(index: number) {
    setPermissions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], granted: !next[index].granted };
      return next;
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold text-slate-900 leading-tight flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white bg-violet-600 shadow-md">
              <Shield size={16} />
            </div>
            Roles & Permissions Matrix
          </h1>
          <p className="text-slate-500 text-[13px] font-semibold mt-1">
            Customize staff roles and configure exact feature permissions for your school portal.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-bold transition-all shadow-sm"
          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
        >
          <Plus size={15} />
          Create Custom Role
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left List */}
        <div className="lg:w-80 shrink-0 space-y-4">
          <div className="bg-white rounded-2xl border border-[#e8e4f3] shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Available Roles</p>
              <button onClick={loadRoles} className="p-1 text-slate-400 hover:text-slate-600 transition-colors">
                <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              </button>
            </div>

            <div className="space-y-1">
              {roles.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRole(r)}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all flex flex-col gap-0.5 ${
                    selectedRole?.id === r.id
                      ? "bg-violet-50 border border-violet-100 text-violet-700 font-bold"
                      : "hover:bg-slate-50 text-slate-700 font-semibold"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[13px]">{r.display_name}</span>
                    {r.is_system && (
                      <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full border border-slate-200">
                        Default
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono font-medium">{r.name}</span>
                </button>
              ))}
            </div>
          </div>

          {showCreate && (
            <div className="bg-white rounded-2xl border border-dashed border-violet-200 p-5 space-y-4">
              <p className="text-[13px] font-extrabold text-violet-700 flex items-center gap-2"><Plus size={14} /> Add Role</p>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Display Name</label>
                <input
                  type="text"
                  placeholder="e.g. Discipline Master"
                  value={form.display_name}
                  onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Duplicate Permissions From</label>
                <select
                  value={form.source_role_id}
                  onChange={(e) => setForm((f) => ({ ...f, source_role_id: e.target.value }))}
                  className={inputClass}
                >
                  <option value="">Do not duplicate...</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.display_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Description</label>
                <textarea
                  placeholder="Role description..."
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 text-[12px] border border-[#e0daf0] rounded-xl outline-none focus:border-[#7c3aed] resize-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreateRole}
                  disabled={loading}
                  className="px-4 py-2 rounded-xl text-white text-[12px] font-bold transition-all disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
                >
                  Save
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 rounded-xl border border-[#e0daf0] text-slate-600 text-[12px] font-bold hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Matrix */}
        <div className="flex-1 bg-white rounded-2xl border border-[#e8e4f3] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#f0edf8] flex items-center justify-between bg-[#faf9ff]">
            <div>
              <h3 className="font-extrabold text-slate-900 text-[14px]">
                {selectedRole ? `Permissions Matrix — ${selectedRole.display_name}` : "Select a Role"}
              </h3>
              <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                {selectedRole?.sync_policy === "ignored"
                  ? "Customized locally for this school"
                  : "Synced with platform default role template"}
              </p>
            </div>

            {selectedRole && (
              <button
                onClick={handleSavePermissions}
                disabled={savingPerms || fetchingPerms}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-[12px] font-bold transition-all disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
              >
                {savingPerms ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Save configuration
              </button>
            )}
          </div>

          {fetchingPerms ? (
            <div className="py-20 flex flex-col items-center gap-3">
              <Loader2 size={24} className="text-violet-600 animate-spin" />
              <p className="text-slate-400 text-[12px] font-semibold">Loading role capabilities...</p>
            </div>
          ) : (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {permissions.map((perm, idx) => (
                  <div
                    key={perm.id}
                    onClick={() => togglePermission(idx)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start justify-between ${
                      perm.granted
                        ? "border-violet-100 bg-violet-50/20 hover:border-violet-300"
                        : "border-[#e8e4f3] hover:border-[#d0c9ef]"
                    }`}
                  >
                    <div>
                      <p className="font-bold text-slate-800 text-[13px]">{perm.display_name}</p>
                      <p className="text-[11px] text-slate-400 font-semibold mt-0.5">{perm.description || "No description provided."}</p>
                      {perm.feature_code && (
                        <span className="text-[9px] font-bold text-violet-600 bg-violet-50 border border-violet-100/50 px-1.5 py-0.5 rounded-full mt-1.5 inline-block">
                          Category: {perm.feature_code.split("_")[0]}
                        </span>
                      )}
                    </div>

                    <input
                      type="checkbox"
                      checked={perm.granted}
                      readOnly
                      className="w-5 h-5 rounded border-[#e0daf0] text-violet-600 focus:ring-violet-500 shrink-0 ml-4 accent-violet-600 cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
