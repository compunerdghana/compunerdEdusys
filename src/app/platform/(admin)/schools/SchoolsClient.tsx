"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Plus, ExternalLink, Building2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface School {
  id: string;
  name: string;
  code: string;
  type: string;
  region: string;
  status: string;
  created_at: string;
  school_subscriptions?: { plan_name: string; expires_at: string; status: string }[];
  students?: { count: number }[];
  staff?: { count: number }[];
}

const STATUS_TABS = ["all", "active", "trial", "suspended", "expired", "archived"];

const statusBadge: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  trial: "bg-blue-50 text-blue-700 border border-blue-100",
  suspended: "bg-red-50 text-red-700 border border-red-100",
  expired: "bg-amber-50 text-amber-700 border border-amber-100",
  archived: "bg-slate-50 text-slate-500 border border-slate-100",
};

const planBadge: Record<string, string> = {
  starter: "bg-slate-50 text-slate-600 border border-slate-100",
  standard: "bg-blue-50 text-blue-700 border border-blue-100",
  premium: "bg-violet-50 text-violet-700 border border-violet-100",
  enterprise: "bg-indigo-50 text-indigo-700 border border-indigo-100",
};

export function SchoolsClient({ schools, activeFilter }: { schools: School[]; activeFilter: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [impersonating, setImpersonating] = useState<string | null>(null);

  const filtered = schools.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.code?.toLowerCase().includes(search.toLowerCase()) ||
    s.region?.toLowerCase().includes(search.toLowerCase())
  );

  async function handleImpersonate(schoolId: string, schoolName: string) {
    setImpersonating(schoolId);
    try {
      const res = await fetch("/api/platform/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to impersonate");
      window.open(data.url, "_blank");
      toast(`Impersonating ${schoolName}`, "info");
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to impersonate school", "error");
    } finally {
      setImpersonating(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold text-slate-900 leading-tight">Schools</h1>
          <p className="text-slate-500 text-[13px] font-semibold mt-1">{schools.length} schools registered on the platform</p>
        </div>
        <Link
          href="/platform/schools/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-bold transition-all shadow-sm"
          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
        >
          <Plus size={15} />
          Create School
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] overflow-hidden">
        {/* Filter tabs + search */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 border-b border-[#f0edf8]">
          <div className="flex items-center gap-1 bg-[#f5f3fc] rounded-xl p-1 flex-wrap">
            {STATUS_TABS.map(tab => (
              <button
                key={tab}
                onClick={() => router.push(`/platform/schools${tab !== "all" ? `?status=${tab}` : ""}`)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold capitalize transition-all ${
                  activeFilter === tab
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-xs ml-auto">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search schools..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-700 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all"
            />
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center">
              <Building2 size={28} className="text-violet-400" />
            </div>
            <div className="text-center">
              <p className="text-slate-700 font-bold text-[15px]">No schools found</p>
              <p className="text-slate-400 text-[13px] font-semibold mt-1">Try adjusting your search or filters</p>
            </div>
            <Link
              href="/platform/schools/new"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-bold transition-all"
              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
            >
              <Plus size={14} />
              Create First School
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#faf9ff] border-b border-[#f0edf8]">
                  {["School", "Type", "Region", "Plan", "Students", "Status", "Expiry", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-extrabold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5f3fc]">
                {filtered.map(school => {
                  const sub = school.school_subscriptions?.[0];
                  const studentCount = school.students?.[0]?.count ?? 0;
                  return (
                    <tr key={school.id} className="hover:bg-[#faf9ff] transition-colors group">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center shrink-0 font-extrabold text-violet-700 text-[11px]">
                            {school.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-[13px] max-w-[200px] truncate">{school.name}</p>
                            <p className="text-slate-400 text-[11px] font-mono font-semibold">{school.code ?? ""}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-[13px] font-semibold text-slate-500 capitalize">{school.type ?? "—"}</td>
                      <td className="px-4 py-3.5 text-[13px] font-semibold text-slate-500">{school.region ?? "—"}</td>
                      <td className="px-4 py-3.5">
                        {sub?.plan_name ? (
                          <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${planBadge[sub.plan_name] ?? "bg-slate-50 text-slate-500"}`}>
                            {sub.plan_name}
                          </span>
                        ) : <span className="text-slate-400 text-[13px]">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-[13px] font-bold text-slate-700">{studentCount.toLocaleString()}</td>
                      <td className="px-4 py-3.5">
                        <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${statusBadge[school.status] ?? "bg-slate-50 text-slate-500"}`}>
                          {school.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-[12px] font-semibold text-slate-400 whitespace-nowrap">
                        {sub?.expires_at ? new Date(sub.expires_at).toLocaleDateString("en-GH") : "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/platform/schools/${school.id}`}
                            className="px-2.5 py-1.5 rounded-lg bg-violet-50 text-violet-700 text-[11px] font-bold hover:bg-violet-100 transition-colors border border-violet-100"
                          >
                            View
                          </Link>
                          <button
                            onClick={() => handleImpersonate(school.id, school.name)}
                            disabled={impersonating === school.id}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-[11px] font-bold hover:bg-amber-100 transition-colors border border-amber-100 disabled:opacity-50"
                          >
                            <ExternalLink size={10} />
                            {impersonating === school.id ? "…" : "Impersonate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
