"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, AlertTriangle, CreditCard } from "lucide-react";
import { formatCurrency, getInitials } from "@/lib/utils";

interface ClassRoom { id: string; name: string }
interface OwingStudent {
  student_id: string;
  outstanding: number;
  total_billed: number;
  total_paid: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  student: Record<string, any> | null;
}

interface Props {
  owingStudents: OwingStudent[];
  classes: ClassRoom[];
  isFinance: boolean;
}

export function FinanceOwingSection({ owingStudents, classes, isFinance }: Props) {
  const [classFilter, setClassFilter] = useState("");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return owingStudents.filter(w => {
      const s = w.student;
      if (!s) return false;
      if (classFilter && s.classrooms?.id !== classFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !s.first_name?.toLowerCase().includes(q) &&
          !s.last_name?.toLowerCase().includes(q) &&
          !s.admission_number?.toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [owingStudents, classFilter, search]);

  const totalOwing = filtered.reduce((s, w) => s + w.outstanding, 0);

  return (
    <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[0_1px_6px_rgba(0,0,0,0.05)] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--border)]" style={{ background: "#FFF7ED" }}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#FED7AA" }}>
              <AlertTriangle size={18} style={{ color: "#C2410C" }} />
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-[var(--text-strong)]">Students Owing</h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                {owingStudents.length} student{owingStudents.length !== 1 ? "s" : ""} with outstanding balance ·
                <span className="font-bold text-red-600 ml-1">{formatCurrency(owingStudents.reduce((s,w) => s+w.outstanding,0))} total</span>
              </p>
            </div>
          </div>
          {/* Filters */}
          <div className="flex items-center gap-2">
            <select value={classFilter} onChange={e => setClassFilter(e.target.value)}
              className="h-9 rounded-xl border border-[var(--border)] bg-white px-3 text-[12px] outline-none focus:border-[var(--ring)]">
              <option value="">All classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student…"
                className="h-9 pl-8 pr-3 w-44 rounded-xl border border-[var(--border)] bg-white text-[12px] outline-none focus:border-[var(--ring)]" />
            </div>
          </div>
        </div>
        {(classFilter || search) && (
          <p className="text-[11px] text-[var(--text-muted)] mt-2">
            Showing {filtered.length} result{filtered.length !== 1 ? "s" : ""} ·
            <span className="font-bold text-red-600 ml-1">{formatCurrency(totalOwing)} outstanding</span>
          </p>
        )}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <AlertTriangle size={28} className="text-[var(--text-muted)] opacity-30 mx-auto mb-2" />
          <p className="text-[13px] text-[var(--text-muted)]">
            {owingStudents.length === 0 ? "No outstanding balances. All fees are settled!" : "No students match the filter."}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {filtered.map((w) => {
            const s = w.student;
            const pct = w.total_billed > 0 ? Math.round((w.total_paid / w.total_billed) * 100) : 0;
            return (
              <div key={w.student_id} className="flex items-center gap-3 px-5 py-3 hover:bg-orange-50 transition-colors group">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                  style={{ background: "linear-gradient(135deg,#C2410C,#D97706)" }}>
                  {s ? getInitials(`${s.first_name} ${s.last_name}`) : "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/students/${w.student_id}`}
                    className="text-[13px] font-semibold text-[var(--text-strong)] hover:underline truncate block">
                    {s ? `${s.first_name} ${s.last_name}` : "—"}
                  </Link>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-[var(--text-muted)] truncate">
                      {s?.admission_number} · {s?.classrooms?.name ?? "—"}
                    </span>
                  </div>
                  {/* Mini progress bar */}
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] shrink-0">{pct}% paid</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[15px] font-extrabold text-red-600">{formatCurrency(w.outstanding)}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">of {formatCurrency(w.total_billed)}</p>
                </div>
                {isFinance && (
                  <Link href={`/finance/record-payment?student_id=${w.student_id}`}
                    className="ml-1 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: "#262262" }}>
                    <CreditCard size={11} /> Pay
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
