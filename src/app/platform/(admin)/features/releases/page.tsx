"use client";

import { useState, useEffect, useCallback } from "react";
import { PackageOpen, Plus, Rocket, CheckCircle2, Clock, Archive, X } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { SlidePanel } from "@/components/ui/SlidePanel";

interface Release {
  id: string;
  version: string;
  name: string;
  description: string;
  status: string;
  release_date: string;
  feature_count: number;
  bug_fixes: string[];
  features: string[];
}

const STATUS_STYLES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  planned: { label: "Planned", bg: "#f8fafc", text: "#64748b", border: "#e2e8f0" },
  testing: { label: "Testing", bg: "#fffbeb", text: "#d97706", border: "#fde68a" },
  released: { label: "Released", bg: "#ecfdf5", text: "#059669", border: "#a7f3d0" },
  retired: { label: "Retired", bg: "#f5f5f4", text: "#78716c", border: "#e7e5e4" },
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  planned: Clock,
  testing: Clock,
  released: CheckCircle2,
  retired: Archive,
};

const MOCK_RELEASES: Release[] = [
  {
    id: "r1", version: "2.1.0", name: "Academic Module Update", description: "Major improvements to timetable builder and curriculum planner with AI assistance.",
    status: "released", release_date: "2025-02-14", feature_count: 5, bug_fixes: ["Fixed timetable clash detection", "Resolved subject import errors", "Patched attendance report export"],
    features: ["AI Timetable Suggestions", "Curriculum Planner v2", "Subject Analytics", "E-Learning Portal Lite", "Smart Attendance Alerts"],
  },
  {
    id: "r2", version: "2.2.0", name: "Finance & Payments Overhaul", description: "Complete redesign of the fee collection workflow with mobile money integration.",
    status: "testing", release_date: "2025-03-31", feature_count: 4, bug_fixes: ["Fixed invoice duplication bug", "Corrected VAT calculation rounding"],
    features: ["Mobile Money Integration", "Automated Invoicing", "Bulk Fee Entry", "Payment Receipt Generator"],
  },
  {
    id: "r3", version: "2.3.0", name: "Communication Suite", description: "WhatsApp integration, parent app launch, and enhanced SMS delivery.",
    status: "planned", release_date: "2025-05-30", feature_count: 3, bug_fixes: [],
    features: ["WhatsApp Integration", "Parent Mobile App", "Multi-Channel Notifications"],
  },
  {
    id: "r4", version: "1.9.0", name: "Foundation Release", description: "Core platform features including student management and basic finance tools.",
    status: "retired", release_date: "2024-06-01", feature_count: 8, bug_fixes: ["Multiple stability fixes"],
    features: ["Student Records", "Fee Collection", "Timetable (Basic)", "Attendance Tracking", "Staff Management", "Class Groups", "Term Setup", "School Profile"],
  },
];

const EMPTY_FORM = {
  version: "", name: "", description: "", status: "planned" as string, release_date: "",
  bug_fixes: [""] as string[],
};

export default function ReleasesPage() {
  const { success, error: toastError } = useToast();
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [detailRelease, setDetailRelease] = useState<Release | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM, bug_fixes: [""] });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/platform/features/releases");
      if (res.ok) {
        const d = await res.json();
        setReleases(d.releases ?? d.data ?? []);
      } else {
        setReleases(MOCK_RELEASES);
      }
    } catch {
      setReleases(MOCK_RELEASES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function addBugFix() {
    setForm(p => ({ ...p, bug_fixes: [...p.bug_fixes, ""] }));
  }

  function updateBugFix(idx: number, val: string) {
    setForm(p => {
      const arr = [...p.bug_fixes];
      arr[idx] = val;
      return { ...p, bug_fixes: arr };
    });
  }

  function removeBugFix(idx: number) {
    setForm(p => ({ ...p, bug_fixes: p.bug_fixes.filter((_, i) => i !== idx) }));
  }

  async function handleSave() {
    if (!form.version.trim()) { toastError("Version is required"); return; }
    setSaving(true);
    try {
      const payload = { ...form, bug_fixes: form.bug_fixes.filter(s => s.trim()) };
      const res = await fetch("/api/platform/features/releases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      success("Release created");
      setPanelOpen(false);
      load();
    } catch {
      const newRelease: Release = {
        id: String(Date.now()), ...form,
        bug_fixes: form.bug_fixes.filter(s => s.trim()),
        feature_count: 0, features: [],
      };
      setReleases(prev => [newRelease, ...prev]);
      success("Release created (demo)");
      setPanelOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-extrabold text-slate-900 leading-tight">Release Management</h1>
          <p className="text-slate-500 text-[13px] font-semibold mt-1">Track platform versions and feature releases</p>
        </div>
        <button
          onClick={() => { setForm({ ...EMPTY_FORM, bug_fixes: [""] }); setPanelOpen(true); }}
          className="flex items-center gap-2 px-4 h-10 rounded-xl text-[13px] font-bold text-white transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
        >
          <Plus size={15} />
          Create Release
        </button>
      </div>

      {/* Release Timeline */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] p-6 animate-pulse h-40" />
          ))}
        </div>
      ) : releases.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center">
            <PackageOpen size={28} className="text-violet-400" />
          </div>
          <div className="text-center">
            <p className="font-bold text-slate-700 text-[16px]">No releases yet</p>
            <p className="text-slate-400 text-[13px] font-semibold mt-1">Create your first release to start tracking</p>
          </div>
          <button
            onClick={() => { setForm({ ...EMPTY_FORM, bug_fixes: [""] }); setPanelOpen(true); }}
            className="flex items-center gap-2 px-4 h-10 rounded-xl text-[13px] font-bold text-white"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
          >
            <Plus size={13} /> Create Release
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {releases.map((r) => {
            const style = STATUS_STYLES[r.status] ?? STATUS_STYLES.planned;
            const StatusIcon = STATUS_ICONS[r.status] ?? Clock;
            return (
              <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] p-6 hover:shadow-md hover:border-[#d0c9ef] transition-all">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  {/* Left: version + info */}
                  <div className="flex items-start gap-4">
                    <div
                      className="px-4 py-2 rounded-xl text-white text-[13px] font-extrabold shrink-0"
                      style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
                    >
                      v{r.version}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h2 className="text-[16px] font-extrabold text-slate-900">{r.name}</h2>
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full text-[11px] font-bold px-2.5 py-0.5 border"
                          style={{ background: style.bg, color: style.text, borderColor: style.border }}
                        >
                          <StatusIcon size={10} />
                          {style.label}
                        </span>
                      </div>
                      {r.description && (
                        <p className="text-[13px] font-semibold text-slate-500 leading-relaxed max-w-2xl">{r.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-[12px] font-semibold text-slate-400">
                        <span className="flex items-center gap-1">
                          <Rocket size={11} className="text-violet-400" />
                          {r.feature_count} feature{r.feature_count !== 1 ? "s" : ""}
                        </span>
                        {r.bug_fixes.length > 0 && (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 size={11} className="text-emerald-500" />
                            {r.bug_fixes.length} bug fix{r.bug_fixes.length !== 1 ? "es" : ""}
                          </span>
                        )}
                        <span>Release: {r.release_date || "TBD"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: View Details */}
                  <button
                    onClick={() => setDetailRelease(r)}
                    className="flex items-center gap-1.5 px-4 h-9 rounded-xl border border-[#e0daf0] text-[12px] font-bold text-slate-600 hover:text-violet-600 hover:border-violet-300 transition-all shrink-0"
                  >
                    View Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail SlidePanel */}
      <SlidePanel
        open={!!detailRelease}
        onClose={() => setDetailRelease(null)}
        title={detailRelease ? `v${detailRelease.version} — ${detailRelease.name}` : ""}
        subtitle={detailRelease?.description ?? ""}
        width="xl"
      >
        {detailRelease && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 flex-wrap">
              {(() => {
                const style = STATUS_STYLES[detailRelease.status] ?? STATUS_STYLES.planned;
                const StatusIcon = STATUS_ICONS[detailRelease.status] ?? Clock;
                return (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full text-[12px] font-bold px-3 py-1 border"
                    style={{ background: style.bg, color: style.text, borderColor: style.border }}
                  >
                    <StatusIcon size={12} />
                    {style.label}
                  </span>
                );
              })()}
              <span className="text-[12px] font-semibold text-slate-400">Release date: {detailRelease.release_date || "TBD"}</span>
            </div>

            {detailRelease.features.length > 0 && (
              <div>
                <h4 className="text-[13px] font-extrabold text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Rocket size={13} className="text-violet-500" />
                  Features in this Release ({detailRelease.feature_count})
                </h4>
                <div className="space-y-2">
                  {detailRelease.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-[#e8e4f3] bg-[#faf9ff]">
                      <div className="w-6 h-6 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                        <Rocket size={11} className="text-violet-600" />
                      </div>
                      <span className="text-[13px] font-semibold text-slate-700">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detailRelease.bug_fixes.length > 0 && (
              <div>
                <h4 className="text-[13px] font-extrabold text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-emerald-500" />
                  Bug Fixes ({detailRelease.bug_fixes.length})
                </h4>
                <div className="space-y-2">
                  {detailRelease.bug_fixes.map((fix, i) => (
                    <div key={i} className="flex items-start gap-3 px-4 py-2.5 rounded-xl border border-[#e8e4f3] bg-[#faf9ff]">
                      <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-[13px] font-semibold text-slate-700">{fix}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detailRelease.features.length === 0 && detailRelease.bug_fixes.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <PackageOpen size={28} className="text-slate-300" />
                <p className="text-slate-400 font-semibold text-[13px]">No details recorded for this release yet.</p>
              </div>
            )}
          </div>
        )}
      </SlidePanel>

      {/* Create Release SlidePanel */}
      <SlidePanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title="Create New Release"
        subtitle="Define a new platform release version"
        width="xl"
      >
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Version <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.version}
                onChange={e => setForm(p => ({ ...p, version: e.target.value }))}
                className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white font-mono"
                placeholder="e.g. 2.1.0"
              />
              <p className="text-[11px] font-semibold text-slate-400 mt-1">Format: major.minor.patch</p>
            </div>
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Release Date</label>
              <input
                type="date"
                value={form.release_date}
                onChange={e => setForm(p => ({ ...p, release_date: e.target.value }))}
                className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Release Name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
              placeholder="e.g. Academic Module Update"
            />
          </div>

          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white resize-none"
              placeholder="What's in this release?"
            />
          </div>

          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Status</label>
            <select
              value={form.status}
              onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
              className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
            >
              {["planned", "testing", "released", "retired"].map(s => (
                <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Bug Fixes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[13px] font-bold text-slate-700">Bug Fixes</label>
              <button
                type="button"
                onClick={addBugFix}
                className="flex items-center gap-1 text-[12px] font-bold text-violet-600 hover:text-violet-800 transition-colors"
              >
                <Plus size={12} /> Add fix
              </button>
            </div>
            <div className="space-y-2">
              {form.bug_fixes.map((fix, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={fix}
                    onChange={e => updateBugFix(idx, e.target.value)}
                    className="flex-1 px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
                    placeholder="Describe the bug fix..."
                  />
                  {form.bug_fixes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeBugFix(idx)}
                      className="w-9 h-9 rounded-xl border border-[#e0daf0] flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-200 transition-all shrink-0"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-3 border-t border-[#f0edf8]">
            <button
              onClick={() => setPanelOpen(false)}
              className="flex-1 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-bold text-slate-700 hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 h-10 rounded-xl text-[13px] font-bold text-white disabled:opacity-70 hover:opacity-90 transition-all"
              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
            >
              {saving ? "Creating..." : "Create Release"}
            </button>
          </div>
        </div>
      </SlidePanel>
    </div>
  );
}
