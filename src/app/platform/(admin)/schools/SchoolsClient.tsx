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
  active: "bg-emerald-100 text-emerald-700",
  trial: "bg-blue-100 text-blue-700",
  suspended: "bg-red-100 text-red-700",
  expired: "bg-amber-100 text-amber-700",
  archived: "bg-slate-100 text-slate-500",
};

const PLATFORM_GRADIENT = "linear-gradient(135deg, #1a0533, #2d1b69, #6b1f8a)";

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
      <div className="rounded-2xl px-8 py-6 text-white flex items-center justify-between"
        style={{ background: PLATFORM_GRADIENT }}>
        <div>
          <h1 className="text-2xl font-extrabold">Schools</h1>
          <p className="text-white/60 font-semibold mt-1">{schools.length} schools registered on the platform</p>
        </div>
        <Link
          href="/platform/schools/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-sm transition-all border border-white/20"
        >
          <Plus size={16} />
          Create School
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Filter tabs + search */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 flex-wrap">
            {STATUS_TABS.map(tab => (
              <button
                key={tab}
                onClick={() => router.push(`/platform/schools${tab !== "all" ? `?status=${tab}` : ""}`)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
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
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search schools..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 outline-none focus:border-purple-400 transition-colors"
            />
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Building2 size={28} className="text-slate-400" />
            </div>
            <p className="text-slate-500 font-bold">No schools found</p>
            <Link
              href="/platform/schools/new"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold transition-all"
              style={{ background: PLATFORM_GRADIENT }}
            >
              <Plus size={15} />
              Create First School
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  {["School", "Code", "Type", "Region", "Plan", "Students", "Staff", "Status", "Expiry", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-extrabold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(school => {
                  const sub = school.school_subscriptions?.[0];
                  const studentCount = school.students?.[0]?.count ?? 0;
                  const staffCount = school.staff?.[0]?.count ?? 0;
                  return (
                    <tr key={school.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                            <Building2 size={14} className="text-purple-700" />
                          </div>
                          <span className="font-bold text-slate-900 max-w-[200px] truncate">{school.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg">{school.code ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-600 capitalize">{school.type ?? "—"}</td>
                      <td className="px-4 py-3 font-semibold text-slate-600">{school.region ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold text-purple-700 capitalize">{sub?.plan_name ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-700">{studentCount.toLocaleString()}</td>
                      <td className="px-4 py-3 font-bold text-slate-700">{staffCount.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${statusBadge[school.status] ?? "bg-slate-100 text-slate-500"}`}>
                          {school.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">
                        {sub?.expires_at ? new Date(sub.expires_at).toLocaleDateString("en-GH") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/platform/schools/${school.id}`}
                            className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 text-xs font-bold hover:bg-purple-100 transition-colors"
                          >
                            View
                          </Link>
                          <button
                            onClick={() => handleImpersonate(school.id, school.name)}
                            disabled={impersonating === school.id}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 transition-colors disabled:opacity-50"
                          >
                            <ExternalLink size={11} />
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
