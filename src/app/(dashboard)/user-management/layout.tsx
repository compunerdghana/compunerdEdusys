"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, GraduationCap, Shield, ScrollText,
  Zap, UserCog, UserCheck, ArrowRightLeft, History, UserMinus,
  AlertTriangle, Copy, Check, Loader2, Database
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface SubNavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const navGroups: { label: string; items: SubNavItem[] }[] = [
  {
    label: "People",
    items: [
      { href: "/user-management",             label: "Dashboard",       icon: LayoutDashboard },
      { href: "/user-management/users",       label: "All Users",       icon: Users },
      { href: "/user-management/students",     label: "Students",        icon: GraduationCap },
      { href: "/user-management/parents",      label: "Parents",         icon: Users },
      { href: "/user-management/teachers",     label: "Teachers",        icon: UserCog },
      { href: "/user-management/staff",        label: "Staff Directory", icon: UserCheck },
    ],
  },
  {
    label: "Access Control",
    items: [
      { href: "/user-management/roles",        label: "User Roles",      icon: Shield },
      { href: "/user-management/permissions",  label: "Permissions",     icon: ScrollText },
      { href: "/user-management/features",     label: "Feature Access",  icon: Zap },
      { href: "/user-management/groups",        label: "User Groups",     icon: UserCog },
      { href: "/user-management/parent-ward",  label: "Parent-Ward Links",icon: ArrowRightLeft },
    ],
  },
  {
    label: "Records",
    items: [
      { href: "/user-management/login-history",label: "Login History",   icon: History },
      { href: "/user-management/activity-logs",label: "Activity Logs",   icon: ScrollText },
      { href: "/user-management/archived",     label: "Archived Users",  icon: UserMinus },
    ],
  },
];

export default function UserManagementLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { success, error: toastError } = useToast();

  const [dbOk, setDbOk] = useState<boolean | null>(null);
  const [checkingDb, setCheckingDb] = useState(true);
  const [sqlCode, setSqlCode] = useState("");
  const [showSql, setShowSql] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function checkDb() {
      try {
        const res = await fetch("/api/school/user-management/setup-database", { method: "POST" });
        const data = await res.json();
        setDbOk(data.ok);
        if (!data.ok && data.sql) {
          setSqlCode(data.sql);
        }
      } catch (err) {
        console.error("Database check failed", err);
        setDbOk(false);
      } finally {
        setCheckingDb(false);
      }
    }
    checkDb();
  }, []);

  function copySql() {
    navigator.clipboard.writeText(sqlCode);
    setCopied(true);
    success("SQL script copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col space-y-5">
      {/* DB Setup Warning Banner */}
      {!checkingDb && dbOk === false && (
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div className="flex-1">
              <h4 className="font-extrabold text-amber-950 text-[15px] flex items-center gap-2">
                Database Schema Setup Required
              </h4>
              <p className="text-amber-800/90 text-[13px] font-medium mt-1.5 leading-relaxed">
                New user management tables are missing from your database. Please run the SQL migration script in your Supabase SQL editor to create them.
              </p>
            </div>
            <button
              onClick={() => setShowSql(!showSql)}
              className="px-4 py-2.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-[12.5px] font-bold transition-all shrink-0"
            >
              {showSql ? "Hide SQL" : "Show SQL Code"}
            </button>
          </div>

          {showSql && (
            <div className="bg-[#121020] rounded-xl p-4 border border-[#2a264a] mt-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-white/60 text-[10px] font-mono">20260617_user_management.sql</span>
                <button
                  onClick={copySql}
                  className="flex items-center gap-1 text-[11px] font-bold text-violet-400 hover:text-white transition-colors"
                >
                  {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  {copied ? "Copied" : "Copy Code"}
                </button>
              </div>
              <pre className="text-[11px] font-mono text-slate-300 max-h-60 overflow-y-auto whitespace-pre-wrap p-2 bg-black/30 rounded border border-white/5 scrollbar-hide">
                {sqlCode}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Horizontal Pill Tab Navigation */}
      <div className="bg-white rounded-2xl border border-[#e8e4f3] shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <Database size={11} className="text-violet-500" />
            User Management Modules
          </p>
          {checkingDb && <Loader2 size={12} className="animate-spin text-slate-400" />}
        </div>

        <div className="flex items-stretch gap-5 overflow-x-auto scrollbar-hide pb-1">
          {navGroups.map((group, gIdx) => (
            <div key={group.label} className="flex items-start gap-3 shrink-0">
              {gIdx > 0 && <div className="w-px self-stretch bg-[#ece8f7] mx-1" />}
              <div className="flex flex-col gap-2 shrink-0">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 pl-1">
                  {group.label}
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {group.items.map((item) => {
                    const active = pathname === item.href || (item.href !== "/user-management" && pathname.startsWith(item.href));
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all text-[13px] font-bold whitespace-nowrap",
                          active
                            ? "text-white shadow-sm"
                            : "text-slate-600 hover:bg-slate-50"
                        )}
                        style={active ? { background: "linear-gradient(135deg, #4f46e5, #7c3aed)" } : undefined}
                      >
                        <item.icon size={15} className={cn("shrink-0", active ? "text-white" : "text-slate-400")} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Content Panel */}
      <div className="min-w-0">
        {children}
      </div>
    </div>
  );
}
