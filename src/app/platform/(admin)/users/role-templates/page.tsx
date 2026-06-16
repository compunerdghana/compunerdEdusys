"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Shield, Loader2, Save, RefreshCw, Key } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface Template {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  created_at: string;
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

export default function RoleTemplatesPage() {
  const { success, error: toastError } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingPerms, setFetchingPerms] = useState(false);
  const [savingPerms, setSavingPerms] = useState(false);
  
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ display_name: "", description: "" });

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/platform/role-templates");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setTemplates(data.templates ?? []);
      if (data.templates && data.templates.length > 0 && !selectedTemplate) {
        setSelectedTemplate(data.templates[0]);
      }
    } catch {
      toastError("Failed to load templates.");
    } finally {
      setLoading(false);
    }
  }, [selectedTemplate, toastError]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const loadPermissions = useCallback(async () => {
    if (!selectedTemplate) return;
    setFetchingPerms(true);
    try {
      const res = await fetch(`/api/platform/role-templates/${selectedTemplate.id}/permissions`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setPermissions(data.permissions ?? []);
    } catch {
      toastError("Failed to load permissions.");
    } finally {
      setFetchingPerms(false);
    }
  }, [selectedTemplate, toastError]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  async function handleCreateTemplate() {
    if (!form.display_name) {
      toastError("Display name is required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/platform/role-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      success("Role template created successfully.");
      setTemplates((prev) => [...prev, data]);
      setSelectedTemplate(data);
      setShowCreate(false);
      setForm({ display_name: "", description: "" });
    } catch (err: any) {
      toastError(err.message || "Failed to create template.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSavePermissions() {
    if (!selectedTemplate) return;
    setSavingPerms(true);
    try {
      const permission_ids = permissions.filter((p) => p.granted).map((p) => p.id);
      const res = await fetch(`/api/platform/role-templates/${selectedTemplate.id}/permissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permission_ids })
      });
      if (!res.ok) throw new Error("Failed to save.");
      success("Default template permissions saved successfully.");
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
          <h1 className="text-[26px] font-extrabold text-slate-900 leading-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white bg-violet-600 shadow-md">
              <Shield size={20} />
            </div>
            School Role Templates
          </h1>
          <p className="text-slate-500 text-[14px] font-semibold mt-1">
            Define global master roles and their default permission mappings inherited by schools.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-bold transition-all shadow-sm"
          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
        >
          <Plus size={15} />
          Create Template
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Templates list */}
        <div className="lg:w-80 shrink-0 space-y-4">
          <div className="bg-white rounded-2xl border border-[#e8e4f3] shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Master Templates</p>
              <button onClick={loadTemplates} className="p-1 text-slate-400 hover:text-slate-600 transition-colors">
                <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              </button>
            </div>

            <div className="space-y-1">
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => setSelectedTemplate(tpl)}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all flex flex-col gap-0.5 ${
                    selectedTemplate?.id === tpl.id
                      ? "bg-violet-50 border border-violet-100 text-violet-700 font-bold"
                      : "hover:bg-slate-50 text-slate-700 font-semibold"
                  }`}
                >
                  <span className="text-[13px]">{tpl.display_name}</span>
                  <span className="text-[10px] text-slate-400 font-mono font-medium">{tpl.name}</span>
                </button>
              ))}
            </div>
          </div>

          {showCreate && (
            <div className="bg-white rounded-2xl border border-dashed border-violet-200 p-5 space-y-4">
              <p className="text-[13px] font-extrabold text-violet-700 flex items-center gap-2"><Plus size={14} /> Add Template</p>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Display Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sports Coordinator"
                  value={form.display_name}
                  onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Description</label>
                <textarea
                  placeholder="Role template description..."
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 text-[12px] border border-[#e0daf0] rounded-xl outline-none focus:border-[#7c3aed] resize-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreateTemplate}
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

        {/* Right: Permissions Grid Matrix */}
        <div className="flex-1 bg-white rounded-2xl border border-[#e8e4f3] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#f0edf8] flex items-center justify-between bg-[#faf9ff]">
            <div>
              <h3 className="font-extrabold text-slate-900 text-[14px]">
                {selectedTemplate ? `Permissions Configuration — ${selectedTemplate.display_name}` : "Select a Template"}
              </h3>
              <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Toggle default capabilities for schools</p>
            </div>

            {selectedTemplate && (
              <button
                onClick={handleSavePermissions}
                disabled={savingPerms || fetchingPerms}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-[12px] font-bold transition-all disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
              >
                {savingPerms ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Save default rules
              </button>
            )}
          </div>

          {fetchingPerms ? (
            <div className="py-20 flex flex-col items-center gap-3">
              <Loader2 size={24} className="text-violet-600 animate-spin" />
              <p className="text-slate-400 text-[12px] font-semibold">Fetching template rules...</p>
            </div>
          ) : (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          Feature: {perm.feature_code}
                        </span>
                      )}
                    </div>

                    <div
                      className={`w-9 h-5 rounded-full relative transition-all shrink-0 ml-4 ${
                        perm.granted ? "bg-violet-600" : "bg-slate-200"
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                          perm.granted ? "left-4.5" : "left-0.5"
                        }`}
                      />
                    </div>
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
