"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search, Plus, ExternalLink, Building2, Download, ChevronDown,
  MoreVertical, Eye, Edit, Ban, CheckCircle, Archive, Filter,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface School {
  id: string;
  name: string;
  code: string;
  type: string;
  region: string;
  status: string;
  created_at: string;
  health_score?: number;
  school_subscriptions?: { plan_name: string; expires_at: string; status: string }[];
  students?: { count: number }[];
  staff?: { count: number }[];
}

const STATUS_TABS = ["all", "active", "trial", "expired", "suspended", "archived"];

const statusBadge: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  trial: "bg-blue-50 text-blue-700 border-blue-200",
  suspended: "bg-red-50 text-red-700 border-red-200",
  expired: "bg-amber-50 text-amber-700 border-amber-200",
  archived: "bg-slate-50 text-slate-500 border-slate-200",
};

const planBadge: Record<string, string> = {
  starter: "bg-slate-50 text-slate-600 border-slate-200",
  standard: "bg-blue-50 text-blue-700 border-blue-200",
  premium: "bg-violet-50 text-violet-700 border-violet-200",
  enterprise: "bg-amber-50 text-amber-700 border-amber-200",
};

const typeBadge: Record<string, string> = {
  basic: "bg-slate-50 text-slate-600 border-slate-200",
  jhs: "bg-teal-50 text-teal-700 border-teal-200",
  shs: "bg-indigo-50 text-indigo-700 border-indigo-200",
  combined: "bg-violet-50 text-violet-700 border-violet-200",
  international: "bg-amber-50 text-amber-700 border-amber-200",
};

const PAGE_SIZE = 20;

const REGIONS = [
  "Greater Accra", "Ashanti", "Central", "Eastern", "Western",
  "Northern", "Upper East", "Upper West", "Volta", "Brong-Ahafo",
  "Oti", "Ahafo", "Bono East", "North East", "Savannah", "Western North",
];
const SCHOOL_TYPES = ["basic", "jhs", "shs", "combined", "international"];
const PLANS = ["starter", "standard", "premium", "enterprise"];

function HealthDot({ score }: { score?: number }) {
  if (score === undefined || score === null) return <span className="text-slate-300 text-[13px]">-</span>;
  const color = score >= 75 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444";
  const label = score >= 75 ? "Healthy" : score >= 40 ? "Warning" : "Critical";
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
      <span className="text-[12px] font-bold" style={{ color }}>{score}</span>
      <span className="text-[10px] text-slate-400 font-semibold hidden sm:inline">{label}</span>
    </div>
  );
}

function ActionsMenu({ school, onAction }: { school: School; onAction: (action: string, school: School) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors" onBlur={() => setTimeout(() => setOpen(false), 150)}>
        <MoreVertical size={14} className="text-slate-400" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-lg border border-[#e8e4f3] z-20 overflow-hidden">
          <Link href={`/platform/schools/${school.id}`} className="flex items-center gap-2.5 px-3.5 py-2.5 text-[12px] font-semibold text-slate-700 hover:bg-[#faf9ff] transition-colors">
            <Eye size={13} className="text-slate-400" /> View Profile
          </Link>
          <Link href={`/platform/schools/${school.id}/edit`} className="flex items-center gap-2.5 px-3.5 py-2.5 text-[12px] font-semibold text-slate-700 hover:bg-[#faf9ff] transition-colors">
            <Edit size={13} className="text-slate-400" /> Edit
          </Link>
          <button
            onClick={() => { onAction(school.status === "suspended" ? "activate" : "suspend", school); setOpen(false); }}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[12px] font-semibold hover:bg-[#faf9ff] transition-colors ${school.status === "suspended" ? "text-emerald-700" : "text-red-700"}`}
          >
            {school.status === "suspended" ? <><CheckCircle size={13} /> Activate</> : <><Ban size={13} /> Suspend</>}
          </button>
          <button onClick={() => { onAction("impersonate", school); setOpen(false); }} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[12px] font-semibold text-amber-700 hover:bg-amber-50 transition-colors">
            <ExternalLink size={13} /> Impersonate
          </button>
          <button onClick={() => { onAction("archive", school); setOpen(false); }} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[12px] font-semibold text-slate-500 hover:bg-slate-50 transition-colors border-t border-slate-100">
            <Archive size={13} /> Archive
          </button>
        </div>
      )}
    </div>
  );
}

export function SchoolsClient({ schools, activeFilter }: { schools: School[]; activeFilter: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("");
  const [type, setType] = useState("");
  const [plan, setPlan] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [impersonating, setImpersonating] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return schools.filter((s) => {
      const q = search.toLowerCase();
      const matchSearch = !search || s.name.toLowerCase().includes(q) || (s.code ?? "").toLowerCase().includes(q) || (s.region ?? "").toLowerCase().includes(q);
      const matchRegion = !region || s.region === region;
      const matchType = !type || s.type === type;
      const sub = s.school_subscriptions?.[0];
      const matchPlan = !plan || (sub?.plan_name ?? "").toLowerCase() === plan;
      return matchSearch && matchRegion && matchType && matchPlan;
    });
  }, [schools, search, region, type, plan]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const startIdx = (page - 1) * PAGE_SIZE + 1;
  const endIdx = Math.min(page * PAGE_SIZE, filtered.length);

  function exportCSV() {
    const rows = [
      ["Name", "Code", "Type", "Region", "Plan", "Students", "Staff", "Status", "Expiry"],
      ...filtered.map((s) => {
        const sub = s.school_subscriptions?.[0];
        return [s.name, s.code ?? "", s.type ?? "", s.region ?? "", sub?.plan_name ?? "", String(s.students?.[0]?.count ?? 0), String(s.staff?.[0]?.count ?? 0), s.status, sub?.expires_at ? new Date(sub.expires_at).toLocaleDateString("en-GH") : ""];
      }),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "schools.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleAction(action: string, school: School) {
    if (action === "impersonate") {
      setImpersonating(school.id);
      try {
        const res = await fetch("/api/platform/impersonate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ schoolId: school.id }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to impersonate");
        window.open(data.url, "_blank");
        toast(`Impersonating ${school.name}`, "info");
      } catch (err: unknown) {
        toast(err instanceof Error ? err.message : "Failed to impersonate school", "error");
      } finally { setImpersonating(null); }
      return;
    }
    if (action === "suspend" || action === "activate") {
      try {
        const res = await fetch(`/api/platform/schools/${school.id}/${action}`, { method: "POST" });
        if (!res.ok) throw new Error("Action failed");
        toast(`School ${action === "suspend" ? "suspended" : "activated"} successfully`, "success");
        router.refresh();
      } catch { toast("Action failed. Please try again.", "error"); }
      return;
    }
    if (action === "archive") {
      try {
        const res = await fetch(`/api/platform/schools/${school.id}/archive`, { method: "POST" });
        if (!res.ok) throw new Error();
        toast("School archived", "success"); router.refresh();
      } catch { toast("Failed to archive school.", "error"); }
    }
  }

  function isExpiringSoon(expiresAt?: string) {
    if (!expiresAt) return false;
    const diff = (new Date(expiresAt).getTime() - Date.now()) / 86400000;
    return diff >= 0 && diff < 30;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-[24px] font-extrabold text-slate-900 leading-tight">Schools</h1>
          <span className="bg-violet-100 text-violet-700 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border border-violet-200">{schools.length}</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#e0daf0] text-slate-700 text-[13px] font-bold hover:bg-slate-50 transition-all">
            <Download size={14} /> Export CSV
          </button>
          <Link href="/platform/schools/new" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-bold transition-all shadow-sm" style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
            <Plus size={15} /> Create School
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] overflow-hidden">
        {/* Filters */}
        <div className="px-5 py-4 border-b border-[#f0edf8] space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 bg-[#f5f3fc] rounded-xl p-1 flex-wrap">
              {STATUS_TABS.map((tab) => (
                <button key={tab} onClick={() => { router.push(`/platform/schools${tab !== "all" ? `?status=${tab}` : ""}`); setPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold capitalize transition-all ${activeFilter === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                  {tab}
                </button>
              ))}
            </div>
            <div className="relative flex-1 max-w-xs ml-auto">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Search name, code, region..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-700 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all" />
            </div>
            <button onClick={() => setShowFilters((v) => !v)}
              className={`flex items-center gap-2 px-3 h-10 rounded-xl border text-[13px] font-bold transition-all ${showFilters ? "border-violet-300 bg-violet-50 text-violet-700" : "border-[#e0daf0] text-slate-600 hover:bg-slate-50"}`}>
              <Filter size={14} /> Filters <ChevronDown size={12} className={`transition-transform ${showFilters ? "rotate-180" : ""}`} />
            </button>
          </div>
          {showFilters && (
            <div className="flex flex-wrap gap-3 pt-1">
              <select value={region} onChange={(e) => { setRegion(e.target.value); setPage(1); }} className="h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-700 px-3 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 bg-white">
                <option value="">All Regions</option>
                {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} className="h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-700 px-3 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 bg-white">
                <option value="">All Types</option>
                {SCHOOL_TYPES.map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
              </select>
              <select value={plan} onChange={(e) => { setPlan(e.target.value); setPage(1); }} className="h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-700 px-3 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 bg-white">
                <option value="">All Plans</option>
                {PLANS.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
              {(region || type || plan) && (
                <button onClick={() => { setRegion(""); setType(""); setPlan(""); setPage(1); }} className="h-10 px-3 rounded-xl text-[12px] font-bold text-red-600 hover:bg-red-50 border border-red-100 transition-all">
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Table or empty state */}
        {paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center">
              <Building2 size={28} className="text-violet-400" />
            </div>
            <div className="text-center">
              <p className="text-slate-700 font-bold text-[15px]">No schools found</p>
              <p className="text-slate-400 text-[13px] font-semibold mt-1">Try adjusting your search or filters</p>
            </div>
            <Link href="/platform/schools/new" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-bold transition-all" style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
              <Plus size={14} /> Create First School
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#faf9ff] border-b border-[#f0edf8]">
                    {["School", "Region", "Type", "Plan", "Students", "Staff", "Status", "Expiry", "Health", ""].map((h, i) => (
                      <th key={i} className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f5f3fc]">
                  {paginated.map((school) => {
                    const sub = school.school_subscriptions?.[0];
                    const studentCount = school.students?.[0]?.count ?? 0;
                    const staffCount = school.staff?.[0]?.count ?? 0;
                    const expiringSoon = isExpiringSoon(sub?.expires_at);
                    const lowerType = (school.type ?? "").toLowerCase();
                    const lowerPlan = (sub?.plan_name ?? "").toLowerCase();
                    return (
                      <tr key={school.id} className="hover:bg-[#faf9ff] transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-extrabold text-violet-700 text-[11px]" style={{ background: "linear-gradient(135deg, #ede9fe, #ddd6fe)" }}>
                              {school.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-[13px] max-w-[180px] truncate">{school.name}</p>
                              <p className="text-slate-400 text-[11px] font-mono font-semibold">{school.code ?? ""}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-[13px] font-semibold text-slate-500 whitespace-nowrap">{school.region ?? "-"}</td>
                        <td className="px-4 py-3.5">
                          {school.type ? <span className={`rounded-full text-[11px] font-bold px-2.5 py-0.5 border uppercase ${typeBadge[lowerType] ?? "bg-slate-50 text-slate-500 border-slate-200"}`}>{school.type}</span> : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="px-4 py-3.5">
                          {sub?.plan_name ? <span className={`rounded-full text-[11px] font-bold px-2.5 py-0.5 border capitalize ${planBadge[lowerPlan] ?? "bg-slate-50 text-slate-500 border-slate-200"}`}>{sub.plan_name}</span> : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="px-4 py-3.5 text-[13px] font-bold text-slate-700">{studentCount.toLocaleString()}</td>
                        <td className="px-4 py-3.5 text-[13px] font-bold text-slate-700">{staffCount.toLocaleString()}</td>
                        <td className="px-4 py-3.5">
                          <span className={`rounded-full text-[11px] font-bold px-2.5 py-0.5 border ${statusBadge[school.status] ?? "bg-slate-50 text-slate-500 border-slate-200"}`}>{school.status}</span>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className={`text-[12px] font-semibold ${expiringSoon ? "text-red-600 font-bold" : "text-slate-400"}`}>
                            {sub?.expires_at ? new Date(sub.expires_at).toLocaleDateString("en-GH") : "-"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5"><HealthDot score={school.health_score} /></td>
                        <td className="px-4 py-3.5">
                          <ActionsMenu school={school} onAction={handleAction} />
                          {impersonating === school.id && <span className="text-[10px] text-amber-600 font-bold ml-1">...</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filtered.length > PAGE_SIZE && (
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-[#f0edf8]">
                <p className="text-[12px] font-semibold text-slate-400">Showing {startIdx}-{endIdx} of {filtered.length} schools</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e0daf0] text-[12px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                    <ChevronLeft size={13} /> Prev
                  </button>
                  <span className="text-[12px] font-bold text-slate-500 px-2">{page} / {totalPages}</span>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e0daf0] text-[12px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                    Next <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
