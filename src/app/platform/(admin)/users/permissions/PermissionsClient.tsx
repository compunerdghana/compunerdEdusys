"use client";

import { useMemo } from "react";
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Users,
  UserCog,
  KeyRound,
  Wallet,
  LifeBuoy,
  Megaphone,
  Shield,
  Zap,
  BarChart2,
} from "lucide-react";

interface Permission {
  id: string;
  module: string;
  action: string;
  description?: string;
}

interface Role {
  id: string;
  name: string;
  display_name: string;
  color?: string;
}

interface Props {
  permissions: Permission[];
  roles: Role[];
}

const actionColors: Record<string, string> = {
  view: "bg-blue-50 text-blue-700 border-blue-200",
  create: "bg-emerald-50 text-emerald-700 border-emerald-200",
  edit: "bg-amber-50 text-amber-700 border-amber-200",
  delete: "bg-red-50 text-red-700 border-red-200",
  approve: "bg-purple-50 text-purple-700 border-purple-200",
  export: "bg-cyan-50 text-cyan-700 border-cyan-200",
  manage: "bg-violet-50 text-violet-700 border-violet-200",
};

const moduleIcons: Record<string, React.ElementType> = {
  Dashboard: LayoutDashboard,
  Schools: Building2,
  Subscriptions: CreditCard,
  Users: Users,
  Roles: UserCog,
  Permissions: KeyRound,
  Finance: Wallet,
  Support: LifeBuoy,
  Announcements: Megaphone,
  "Audit Logs": Shield,
  Features: Zap,
  Reports: BarChart2,
};

export function PermissionsClient({ permissions, roles }: Props) {
  const byModule = useMemo(() => {
    const map: Record<string, Permission[]> = {};
    permissions.forEach((p) => {
      if (!map[p.module]) map[p.module] = [];
      map[p.module].push(p);
    });
    return map;
  }, [permissions]);

  const modules = Object.keys(byModule).sort();

  // Fallback static modules if no permissions in DB yet
  const staticModules = [
    "Dashboard", "Schools", "Subscriptions", "Users", "Roles",
    "Permissions", "Finance", "Support", "Announcements", "Audit Logs", "Features", "Reports",
  ];
  const staticActions = ["view", "create", "edit", "delete", "approve", "export", "manage"];

  const displayModules = modules.length > 0 ? modules : staticModules;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[26px] font-extrabold text-slate-900 leading-tight">Permission Management</h1>
        <p className="text-slate-500 text-[14px] font-semibold mt-1">
          Overview of all system permissions grouped by module
        </p>
      </div>

      {/* Permission Matrix Overview */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#f0edf8]">
          <h2 className="text-[15px] font-extrabold text-slate-800">Module Permissions</h2>
          <p className="text-[12px] text-slate-400 font-semibold mt-0.5">
            Available actions per module
          </p>
        </div>
        <div className="divide-y divide-[#f5f3fc]">
          {displayModules.map((mod) => {
            const Icon = moduleIcons[mod] ?? KeyRound;
            const actions =
              byModule[mod]?.map((p) => p.action) ?? staticActions;
            return (
              <div key={mod} className="flex items-center gap-4 px-6 py-4 hover:bg-[#faf9ff] transition-colors">
                <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                  <Icon size={16} className="text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-[14px]">{mod}</p>
                </div>
                <div className="flex flex-wrap gap-1.5 justify-end">
                  {actions.map((action) => (
                    <span
                      key={action}
                      className={`rounded-full text-[11px] font-bold px-2.5 py-0.5 border ${actionColors[action.toLowerCase()] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}
                    >
                      {action}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Role-Permission Comparison */}
      {roles.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#f0edf8]">
            <h2 className="text-[15px] font-extrabold text-slate-800">Role Access Summary</h2>
            <p className="text-[12px] text-slate-400 font-semibold mt-0.5">
              Which roles have access to which modules
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#faf9ff] border-b border-[#f0edf8]">
                  <th className="px-5 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest min-w-[140px]">
                    Module
                  </th>
                  {roles.map((role) => (
                    <th
                      key={role.id}
                      className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-widest whitespace-nowrap"
                      style={{ color: role.color ?? "#7c3aed" }}
                    >
                      {role.display_name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5f3fc]">
                {displayModules.map((mod) => {
                  const Icon = moduleIcons[mod] ?? KeyRound;
                  return (
                    <tr key={mod} className="hover:bg-[#faf9ff] transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <Icon size={13} className="text-violet-400 shrink-0" />
                          <span className="font-bold text-slate-700 text-[13px]">{mod}</span>
                        </div>
                      </td>
                      {roles.map((role) => {
                        // Check if role has any permission for this module
                        const hasAccess = permissions.some(
                          (p) => p.module === mod
                        );
                        return (
                          <td key={role.id} className="px-4 py-3.5 text-center">
                            {hasAccess ? (
                              <span
                                className="inline-block w-5 h-5 rounded-full text-center leading-5 text-[11px] font-black"
                                style={{ background: (role.color ?? "#7c3aed") + "20", color: role.color ?? "#7c3aed" }}
                              >
                                ✓
                              </span>
                            ) : (
                              <span className="text-slate-200 text-[13px]">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
