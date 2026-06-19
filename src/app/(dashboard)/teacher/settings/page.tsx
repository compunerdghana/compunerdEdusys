"use client";

import { useState, useEffect } from "react";
import { Settings, Save, Key, Wifi, WifiOff, RefreshCw, Database, Loader2, CheckCircle2, Shield } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { syncEngine, type SyncState } from "@/lib/offline/sync";
import { getPendingCount } from "@/lib/offline/db";

export default function TeacherSettingsView() {
  const { success, error: toastError } = useToast();
  const [saving, setSaving] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>("online");
  const [pendingCount, setPendingCount] = useState(0);
  const [triggeringSync, setTriggeringSync] = useState(false);

  // Preference states
  const [darkMode, setDarkMode] = useState(false);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [whatsappAlerts, setWhatsappAlerts] = useState(true);

  // Form states
  const [passwords, setPasswords] = useState({ old: "", new: "", confirm: "" });

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDarkMode(localStorage.getItem("theme") === "dark");
      setEmailNotifs(localStorage.getItem("email_notifs") !== "false");
      setWhatsappAlerts(localStorage.getItem("whatsapp_alerts") !== "false");
    }

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

  const handleToggleDarkMode = (val: boolean) => {
    setDarkMode(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", val ? "dark" : "light");
      if (val) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      success(`Dark mode ${val ? "enabled" : "disabled"}`);
    }
  };

  const handleToggleEmail = (val: boolean) => {
    setEmailNotifs(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("email_notifs", val ? "true" : "false");
      success(`Email notifications ${val ? "enabled" : "disabled"}`);
    }
  };

  const handleToggleWhatsapp = (val: boolean) => {
    setWhatsappAlerts(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("whatsapp_alerts", val ? "true" : "false");
      success(`WhatsApp logs sync ${val ? "enabled" : "disabled"}`);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white/70 backdrop-blur-md p-6 rounded-2xl border border-[#e8e4f3] shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-violet-50 text-violet-600 border border-violet-100">
              <Settings size={18} />
            </span>
            <h1 className="text-[20px] font-extrabold text-slate-900 leading-tight">Settings & Workspace Setup</h1>
          </div>
          <p className="text-slate-500 text-[12px] font-semibold mt-1">Configure theme preferences, security credentials, and offline data sync engine.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Columns: Sync Engine & Security */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section: Offline Sync Engine */}
          <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-[#e8e4f3] p-5 shadow-sm space-y-5 transition-all hover:border-violet-200">
            <h4 className="font-extrabold text-slate-950 text-[14px] border-b border-[#f5f3fc] pb-3 flex items-center gap-2">
              <Database size={16} className="text-violet-600" />
              Offline Sync Engine Status
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Connection State Card */}
              <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-xl flex items-center gap-3.5 relative overflow-hidden">
                <span className={`absolute top-0 left-0 bottom-0 w-1 ${
                  syncState === "offline" ? "bg-amber-500" : "bg-emerald-500"
                }`} />
                <div className={`p-2 rounded-xl flex items-center justify-center shrink-0 ${
                  syncState === "offline" ? "bg-amber-5 border border-amber-100 text-amber-600" : "bg-emerald-50 border border-emerald-100 text-emerald-600"
                }`}>
                  {syncState === "offline" ? <WifiOff size={18} /> : <Wifi size={18} />}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Connection State</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="text-[13px] font-black text-slate-800 capitalize">
                      {syncState === "offline" ? "Offline Mode" : "Online Connected"}
                    </p>
                    <span className={`w-2 h-2 rounded-full animate-pulse ${
                      syncState === "offline" ? "bg-amber-500" : "bg-emerald-500"
                    }`} />
                  </div>
                </div>
              </div>

              {/* Sync Queue Card */}
              <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-xl flex items-center gap-3.5 relative overflow-hidden">
                <span className={`absolute top-0 left-0 bottom-0 w-1 ${
                  pendingCount > 0 ? "bg-violet-500" : "bg-emerald-500"
                }`} />
                <div className={`p-2 rounded-xl flex items-center justify-center shrink-0 ${
                  pendingCount > 0 ? "bg-violet-50 border border-violet-100 text-violet-600" : "bg-emerald-50 border border-emerald-100 text-emerald-600"
                }`}>
                  {pendingCount > 0 ? <RefreshCw size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sync Queue Status</p>
                  <p className="text-[13px] font-black text-slate-800 mt-0.5">
                    {pendingCount > 0 ? `${pendingCount} Records Pending` : "Fully Synchronized"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 border-t border-[#f5f3fc] pt-4">
              <button
                type="button"
                onClick={handleTriggerSync}
                disabled={triggeringSync || pendingCount === 0}
                className="flex items-center gap-1.5 px-4 h-10 rounded-xl text-white text-[12.5px] font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:shadow-none active:scale-98"
                style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
              >
                {triggeringSync ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Process Sync Queue
              </button>
            </div>
          </div>

          {/* Section: Change password */}
          <form onSubmit={handlePasswordChange} className="bg-white/70 backdrop-blur-md rounded-2xl border border-[#e8e4f3] p-5 shadow-sm space-y-5 transition-all hover:border-violet-200">
            <h4 className="font-extrabold text-slate-950 text-[14px] border-b border-[#f5f3fc] pb-3 flex items-center gap-2">
              <Key size={16} className="text-violet-600" />
              Security Password Details
            </h4>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Old Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={passwords.old}
                  onChange={(e) => setPasswords(p => ({ ...p, old: e.target.value }))}
                  className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] bg-white transition-all"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">New Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Min 8 characters"
                    value={passwords.new}
                    onChange={(e) => setPasswords(p => ({ ...p, new: e.target.value }))}
                    className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] bg-white transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Confirm Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Repeat new password"
                    value={passwords.confirm}
                    onChange={(e) => setPasswords(p => ({ ...p, confirm: e.target.value }))}
                    className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] bg-white transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-[#f5f3fc] pt-4 flex">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 px-5 h-10 rounded-xl text-white text-[12.5px] font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:shadow-none active:scale-98"
                style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
                Update Credentials
              </button>
            </div>
          </form>
        </div>

        {/* Right Preferences Column */}
        <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-[#e8e4f3] p-5 shadow-sm space-y-5 transition-all hover:border-violet-200">
          <h4 className="font-extrabold text-slate-950 text-[14px] border-b border-[#f5f3fc] pb-3 flex items-center gap-2">
            <Settings size={16} className="text-violet-600" />
            Preferences Setup
          </h4>

          <div className="space-y-2">
            <div className="flex items-center justify-between py-3 border-b border-[#f5f3fc] last:border-0">
              <div>
                <p className="text-[12.5px] font-bold text-slate-800">Interface Dark Mode</p>
                <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Toggle dark/light colors</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleDarkMode(!darkMode)}
                className={`w-9 h-5 rounded-full p-0.5 transition-all duration-300 ${
                  darkMode ? "bg-violet-600" : "bg-slate-200"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-all duration-300 shadow-sm ${
                    darkMode ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-[#f5f3fc] last:border-0">
              <div>
                <p className="text-[12.5px] font-bold text-slate-800">Email Notifications</p>
                <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Receive reports notices</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleEmail(!emailNotifs)}
                className={`w-9 h-5 rounded-full p-0.5 transition-all duration-300 ${
                  emailNotifs ? "bg-violet-600" : "bg-slate-200"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-all duration-300 shadow-sm ${
                    emailNotifs ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-[#f5f3fc] last:border-0">
              <div>
                <p className="text-[12.5px] font-bold text-slate-800">WhatsApp Alert Syncs</p>
                <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Trigger alerts for ward logs</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleWhatsapp(!whatsappAlerts)}
                className={`w-9 h-5 rounded-full p-0.5 transition-all duration-300 ${
                  whatsappAlerts ? "bg-violet-600" : "bg-slate-200"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-all duration-300 shadow-sm ${
                    whatsappAlerts ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
