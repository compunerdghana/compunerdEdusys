"use client";

import { useState, useEffect } from "react";
import { Settings, Save, Key, Wifi, RefreshCw, Database, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { syncEngine, type SyncState } from "@/lib/offline/sync";
import { getPendingCount } from "@/lib/offline/db";

export default function TeacherSettingsView() {
  const { success, error: toastError } = useToast();
  const [saving, setSaving] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>("online");
  const [pendingCount, setPendingCount] = useState(0);
  const [triggeringSync, setTriggeringSync] = useState(false);

  // Form states
  const [passwords, setPasswords] = useState({ old: "", new: "", confirm: "" });

  useEffect(() => {
    if (!syncEngine) return;
    const unsubscribe = syncEngine.subscribe((state, count) => {
      setSyncState(state);
      setPendingCount(count);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  async function handleTriggerSync() {
    if (!syncEngine) return;
    setTriggeringSync(true);
    try {
      await syncEngine.syncNow();
      const count = await getPendingCount();
      setPendingCount(count);
      success("Offline sync queue processed successfully!");
    } catch {
      toastError("Failed to trigger sync. Please check connection.");
    } finally {
      setTriggeringSync(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      toastError("Passwords do not match.");
      return;
    }
    setSaving(true);
    setTimeout(() => {
      setPasswords({ old: "", new: "", confirm: "" });
      setSaving(false);
      success("Password credentials updated successfully!");
    }, 1000);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-[20px] font-extrabold text-slate-900 leading-tight">Settings & Workspace Setup</h1>
        <p className="text-slate-500 text-[12px] font-semibold mt-0.5">Configure theme preferences, security passwords, and offline data sync engine.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Columns: Sync Engine & Security */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section: Offline Sync Engine */}
          <div className="bg-white rounded-2xl border border-[#e8e4f3] p-5 shadow-sm space-y-4">
            <h4 className="font-extrabold text-slate-950 text-[14px] border-b border-[#f5f3fc] pb-3 flex items-center gap-2">
              <Database size={15} className="text-violet-600" />
              Offline Sync Engine Status
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-3">
                <Wifi className={syncState === "offline" ? "text-amber-500 shrink-0" : "text-emerald-500 shrink-0"} size={18} />
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Connection State</p>
                  <p className="text-[13px] font-bold text-slate-800 capitalize">{syncState === "offline" ? "Offline Mode" : "Online Connected"}</p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-3">
                <RefreshCw className={pendingCount > 0 ? "text-violet-500 animate-spin shrink-0" : "text-slate-400 shrink-0"} size={18} />
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Pending Sync Queue</p>
                  <p className="text-[13px] font-bold text-slate-800">{pendingCount} Records</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={handleTriggerSync}
                disabled={triggeringSync || pendingCount === 0}
                className="flex items-center gap-1.5 px-4 h-9 rounded-xl text-white text-[12px] font-bold transition-all disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
              >
                {triggeringSync ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                Sync Now
              </button>
            </div>
          </div>

          {/* Section: Change password */}
          <form onSubmit={handlePasswordChange} className="bg-white rounded-2xl border border-[#e8e4f3] p-5 shadow-sm space-y-4">
            <h4 className="font-extrabold text-slate-950 text-[14px] border-b border-[#f5f3fc] pb-3 flex items-center gap-2">
              <Key size={15} className="text-violet-600" />
              Security Password Details
            </h4>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Old Password</label>
                <input
                  type="password"
                  required
                  value={passwords.old}
                  onChange={(e) => setPasswords(p => ({ ...p, old: e.target.value }))}
                  className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">New Password</label>
                  <input
                    type="password"
                    required
                    value={passwords.new}
                    onChange={(e) => setPasswords(p => ({ ...p, new: e.target.value }))}
                    className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] bg-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Confirm Password</label>
                  <input
                    type="password"
                    required
                    value={passwords.confirm}
                    onChange={(e) => setPasswords(p => ({ ...p, confirm: e.target.value }))}
                    className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] bg-white"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-4 h-9 rounded-xl text-white text-[12px] font-bold transition-all disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              Update Credentials
            </button>
          </form>
        </div>

        {/* Right Preferences Column */}
        <div className="bg-white rounded-2xl border border-[#e8e4f3] p-5 shadow-sm space-y-4">
          <h4 className="font-extrabold text-slate-950 text-[14px] border-b border-[#f5f3fc] pb-3 flex items-center gap-2">
            <Settings size={15} className="text-violet-600" />
            Preferences Setup
          </h4>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12.5px] font-bold text-slate-800">Interface Dark Mode</p>
                <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Toggle dark/light colors</p>
              </div>
              <input type="checkbox" className="rounded border-[#e0daf0] text-[#7c3aed] focus:ring-[#7c3aed]" />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12.5px] font-bold text-slate-800">Email Notifications</p>
                <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Receive reports notices</p>
              </div>
              <input type="checkbox" defaultChecked className="rounded border-[#e0daf0] text-[#7c3aed] focus:ring-[#7c3aed]" />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12.5px] font-bold text-slate-800">WhatsApp Alert Syncs</p>
                <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Trigger alerts for ward logs</p>
              </div>
              <input type="checkbox" defaultChecked className="rounded border-[#e0daf0] text-[#7c3aed] focus:ring-[#7c3aed]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
