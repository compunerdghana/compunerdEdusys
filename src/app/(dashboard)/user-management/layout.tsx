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

const subNavItems: SubNavItem[] = [
  { href: "/user-management",             label: "Dashboard",       icon: LayoutDashboard },
  { href: "/user-management/users",       label: "All Users",       icon: Users },
  { href: "/user-management/students",     label: "Students",        icon: GraduationCap },
  { href: "/user-management/parents",      label: "Parents",         icon: Users },
  { href: "/user-management/teachers",     label: "Teachers",        icon: UserCog },
  { href: "/user-management/staff",        label: "Staff Directory", icon: UserCheck },
  { href: "/user-management/roles",        label: "User Roles",      icon: Shield },
  { href: "/user-management/permissions",  label: "Permissions",     icon: ScrollText },
  { href: "/user-management/features",     label: "Feature Access",  icon: Zap },
  { href: "/user-management/groups",       label: "User Groups",     icon: UserCog },
  { href: "/user-management/parent-ward",  label: "Parent-Ward Links",icon: ArrowRightLeft },
  { href: "/user-management/login-history",label: "Login History",   icon: History },
  { href: "/user-management/activity-logs",label: "Activity Logs",   icon: ScrollText },
  { href: "/user-management/archived",     label: "Archived Users",  icon: UserMinus },
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
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <AlertTriangle size={18} />
            </div>
            <div className="flex-1">
              <h4 className="font-extrabold text-amber-950 text-[14px] flex items-center gap-2">
                Database Schema Setup Required
              </h4>
              <p className="text-amber-800 text-[12px] font-semibold mt-1">
                New user management tables are missing from your database. Please run the SQL migration script in your Supabase SQL editor to create them.
              </p>
            </div>
            <button
              onClick={() => setShowSql(!showSql)}
              className="px-4 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-[12px] font-bold transition-all shrink-0"
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

      {/* Grid structure */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Sub-Sidebar (Desktop) / Dropdown Selector (Mobile) */}
        <div className="lg:w-64 shrink-0">
          <div className="bg-white rounded-2xl border border-[#e8e4f3] shadow-sm p-4 space-y-3 sticky top-4">
            <div className="flex items-center justify-between pb-1">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <Database size={11} className="text-violet-500" />
                User Modules
              </p>
              {checkingDb && <Loader2 size={12} className="animate-spin text-slate-400" />}
            </div>

            {/* Sub Nav Links */}
            <div className="space-y-0.5 max-h-[70vh] overflow-y-auto scrollbar-hide pr-1">
              {subNavItems.map((item) => {
                const active = pathname === item.href || (item.href !== "/user-management" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all text-[12.5px]",
                      active
                        ? "bg-violet-50 border border-violet-100 text-violet-700 font-bold"
                        : "hover:bg-slate-50 text-slate-700 font-semibold"
                    )}
                  >
                    <item.icon size={14} className={cn("shrink-0", active ? "text-violet-600" : "text-slate-400")} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Content Panel */}
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
    </div>
  );
}
