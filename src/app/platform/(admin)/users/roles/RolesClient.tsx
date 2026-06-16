"use client";

import { useState } from "react";
import { Plus, Loader2, Shield, Edit2, Settings2 } from "lucide-react";
import { SlidePanel } from "@/components/ui/SlidePanel";
import { useToast } from "@/components/ui/Toast";

interface Role {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  color?: string;
  hierarchy_level?: number;
  is_system?: boolean;
  permission_count?: number;
  user_count?: number;
}

const MODULES = [
  "Dashboard",
  "Schools",
  "Subscriptions",
  "Users",
  "Roles",
  "Permissions",
  "Finance",
  "Support",
  "Announcements",
  "Audit Logs",
  "Features",
  "Reports",
];

const ACTIONS = ["View", "Create", "Edit", "Delete", "Approve", "Export", "Manage"];

const ROLE_COLORS = [
  { label: "Violet", value: "#7c3aed" },
  { label: "Blue", value: "#2563eb" },
  { label: "Emerald", value: "#059669" },
  { label: "Amber", value: "#d97706" },
  { label: "Red", value: "#dc2626" },
  { label: "Slate", value: "#475569" },
];

const inputClass =
  "w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white";

function slugify(s: string) {
  return s.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

export function RolesClient({ roles: initialRoles }: { roles: Role[] }) {
  const { success, error: toastError } = useToast();
  const [roles, setRoles] = useState<Role[]>(initialRoles);
  const [createOpen, setCreateOpen] = useState(false);
  const [matrixOpen, setMatrixOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Matrix state: module -> action -> checked
  const [matrix, setMatrix] = useState<Record<string, Record<string, boolean>>>({});

  const [form, setForm] = useState({
    display_name: "",
    name: "",
    description: "",
    color: "#7c3aed",
    hierarchy_level: 10,
  });

  function setF(k: string, v: string | number) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function openMatrix(role: Role) {
    setSelectedRole(role);
    // Initialize empty matrix
    const m: Record<string, Record<string, boolean>> = {};
    MODULES.forEach((mod) => {
      m[mod] = {};
      ACTIONS.forEach((act) => {
        m[mod][act] = false;
      });
    });
    setMatrix(m);
    setMatrixOpen(true);
  }

  async function handleCreate() {
    if (!form.display_name) {
      toastError("Display name is required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/platform/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, name: form.name || slugify(form.display_name) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create role");
      success("Role created successfully.");
      setRoles((prev) => [...prev, data]);
      setCreateOpen(false);
      setForm({ display_name: "", name: "", description: "", color: "#7c3aed", hierarchy_level: 10 });
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Failed to create role");
    } finally {
      setLoading(false);
    }
  }

  async function handleSavePermissions() {
    if (!selectedRole) return;
    setSaving(true);
    try {
      const permissions: Array<{ module: string; action: string }> = [];
      MODULES.forEach((mod) => {
        ACTIONS.forEach((act) => {
          if (matrix[mod]?.[act]) permissions.push({ module: mod, action: act });
        });
      });
      const res = await fetch(`/api/platform/roles/${selectedRole.id}/permissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save permissions");
      success("Permissions saved.");
      setMatrixOpen(false);
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Failed to save permissions");
    } finally {
      setSaving(false);
    }
  }

  function toggleCell(mod: string, act: string) {
    setMatrix((prev) => ({
      ...prev,
      [mod]: { ...(prev[mod] ?? {}), [act]: !prev[mod]?.[act] },
    }));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-extrabold text-slate-900 leading-tight">Roles & Access Levels</h1>
          <p className="text-slate-500 text-[14px] font-semibold mt-1">{roles.length} roles configured</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-bold transition-all shadow-sm"
          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
        >
          <Plus size={15} />
          Create Role
        </button>
      </div>

      {/* Roles Grid */}
      {roles.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#e8e4f3] py-20 flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center">
            <Shield size={26} className="text-violet-400" />
          </div>
          <p className="text-slate-400 font-semibold text-[14px]">No roles configured yet.</p>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-[13px] font-bold"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
          >
            <Plus size={13} /> Create first role
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => (
            <div
              key={role.id}
              className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] overflow-hidden"
            >
              <div
                className="h-1.5"
                style={{ background: role.color ?? "#7c3aed" }}
              />
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-[15px] font-extrabold text-slate-900 truncate">
                        {role.display_name}
                      </h3>
                      {role.is_system && (
                        <span className="rounded-full text-[10px] font-bold px-2 py-0.5 border bg-slate-100 text-slate-600 border-slate-200 shrink-0">
                          System
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-slate-400 font-semibold mt-0.5 truncate">{role.name}</p>
                  </div>
                  {role.hierarchy_level !== undefined && (
                    <span
                      className="rounded-full text-[10px] font-bold px-2 py-0.5 border shrink-0"
                      style={{
                        background: (role.color ?? "#7c3aed") + "15",
                        color: role.color ?? "#7c3aed",
                        borderColor: (role.color ?? "#7c3aed") + "40",
                      }}
                    >
                      Level {role.hierarchy_level}
                    </span>
                  )}
                </div>

                {role.description && (
                  <p className="text-[12px] text-slate-500 font-semibold mb-4 leading-relaxed line-clamp-2">
                    {role.description}
                  </p>
                )}

                <div className="flex items-center gap-4 mb-4 text-[12px] font-semibold text-slate-400">
                  <span>{role.permission_count ?? 0} permissions</span>
                  <span>·</span>
                  <span>{role.user_count ?? 0} users</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openMatrix(role)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors"
                  >
                    <Settings2 size={12} />
                    Edit Permissions
                  </button>
                  <button
                    disabled={role.is_system}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Edit2 size={12} />
                    Edit Role
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Role Panel */}
      <SlidePanel
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Role"
        subtitle="Define a new access level"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">
              Display Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.display_name}
              onChange={(e) => {
                setF("display_name", e.target.value);
                setF("name", slugify(e.target.value));
              }}
              placeholder="Finance Officer"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">System Name (slug)</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setF("name", slugify(e.target.value))}
              placeholder="finance_officer"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setF("description", e.target.value)}
              placeholder="Manages financial records and payment processing…"
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white resize-none"
            />
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-2">Color</label>
            <div className="flex gap-2 flex-wrap">
              {ROLE_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setF("color", c.value)}
                  className="w-8 h-8 rounded-full border-2 transition-all"
                  style={{
                    background: c.value,
                    borderColor: form.color === c.value ? "#1e1b4b" : "transparent",
                    transform: form.color === c.value ? "scale(1.2)" : "scale(1)",
                  }}
                  title={c.label}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">
              Hierarchy Level
              <span className="text-slate-400 font-semibold ml-1">(higher = more access)</span>
            </label>
            <input
              type="number"
              value={form.hierarchy_level}
              onChange={(e) => setF("hierarchy_level", Number(e.target.value))}
              min={1}
              max={100}
              className={inputClass}
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-[13px] transition-all disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
          >
            {loading ? <><Loader2 size={14} className="animate-spin" /> Creating…</> : "Create Role"}
          </button>
        </div>
      </SlidePanel>

      {/* Permission Matrix Modal */}
      <SlidePanel
        open={matrixOpen}
        onClose={() => setMatrixOpen(false)}
        title={`Permissions — ${selectedRole?.display_name ?? ""}`}
        subtitle="Configure what this role can access"
        width="xl"
      >
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-[#e8e4f3]">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-[#faf9ff] border-b border-[#f0edf8]">
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest min-w-[130px]">
                    Module
                  </th>
                  {ACTIONS.map((act) => (
                    <th
                      key={act}
                      className="px-3 py-3 text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest"
                    >
                      {act}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5f3fc]">
                {MODULES.map((mod) => (
                  <tr key={mod} className="hover:bg-[#faf9ff] transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-700 text-[13px]">{mod}</td>
                    {ACTIONS.map((act) => (
                      <td key={act} className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={!!matrix[mod]?.[act]}
                          onChange={() => toggleCell(mod, act)}
                          className="w-4 h-4 rounded accent-violet-600 cursor-pointer"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleSavePermissions}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-[13px] transition-all disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
          >
            {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : "Save Permissions"}
          </button>
        </div>
      </SlidePanel>
    </div>
  );
}
