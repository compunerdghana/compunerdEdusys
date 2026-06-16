"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Loader2, Users } from "lucide-react";
import { SlidePanel } from "@/components/ui/SlidePanel";
import { useToast } from "@/components/ui/Toast";

const roleBadge: Record<string, string> = {
  super_admin: "bg-violet-100 text-violet-800 border border-violet-200",
  manager: "bg-blue-50 text-blue-700 border border-blue-100",
  support: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  sales: "bg-amber-50 text-amber-700 border border-amber-100",
  finance: "bg-cyan-50 text-cyan-700 border border-cyan-100",
  implementation: "bg-orange-50 text-orange-700 border border-orange-100",
};

const ROLES = ["super_admin", "manager", "support", "sales", "finance", "implementation"];

interface PlatformUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  phone?: string;
  status?: string;
  last_sign_in_at?: string;
}

export function UsersClient({ users }: { users: PlatformUser[] }) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [panelOpen, setPanelOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", role: "support", temp_password: "",
  });

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function handleCreate() {
    if (!form.full_name || !form.email || !form.temp_password) {
      toastError("Full name, email and password are required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/platform/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create user");
      success("Platform user created successfully.");
      setPanelOpen(false);
      setForm({ full_name: "", email: "", phone: "", role: "support", temp_password: "" });
      router.refresh();
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setLoading(false);
    }
  }

  const initials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const inputClass = "w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold text-slate-900 leading-tight">Platform Users</h1>
          <p className="text-slate-500 text-[13px] font-semibold mt-1">{users.length} admin users</p>
        </div>
        <button
          onClick={() => setPanelOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-bold transition-all shadow-sm"
          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
        >
          <UserPlus size={15} />
          Add Platform User
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#faf9ff] border-b border-[#f0edf8]">
                {["User", "Email", "Role", "Phone", "Status", "Last Login", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-extrabold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5f3fc]">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center">
                        <Users size={22} className="text-violet-400" />
                      </div>
                      <p className="text-slate-400 font-semibold text-[13px]">No platform users found.</p>
                    </div>
                  </td>
                </tr>
              ) : users.map(user => (
                <tr key={user.id} className="hover:bg-[#faf9ff] transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-[11px] font-extrabold shrink-0"
                        style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
                      >
                        {initials(user.full_name ?? "?")}
                      </div>
                      <span className="font-bold text-slate-900 text-[13px]">{user.full_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 font-semibold text-[13px]">{user.email}</td>
                  <td className="px-4 py-3.5">
                    <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${roleBadge[user.role] ?? "bg-slate-50 text-slate-500"}`}>
                      {user.role?.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-400 font-semibold text-[13px]">{user.phone ?? "—"}</td>
                  <td className="px-4 py-3.5">
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                      user.status === "active"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                        : "bg-slate-50 text-slate-500 border border-slate-100"
                    }`}>
                      {user.status ?? "active"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-400 font-semibold text-[12px]">
                    {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : "Never"}
                  </td>
                  <td className="px-4 py-3.5">
                    <button className="text-[12px] font-bold text-violet-600 hover:text-violet-800 hover:underline transition-colors">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <SlidePanel open={panelOpen} onClose={() => setPanelOpen(false)} title="Add Platform User" subtitle="Create a new admin portal account">
        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Full Name <span className="text-red-500">*</span></label>
            <input type="text" value={form.full_name} onChange={e => set("full_name", e.target.value)} placeholder="e.g. Kwame Mensah" className={inputClass} />
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Email <span className="text-red-500">*</span></label>
            <input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="kwame@compunerd.com" className={inputClass} />
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Phone</label>
            <input type="tel" value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+233 24 xxx xxxx" className={inputClass} />
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Role</label>
            <select value={form.role} onChange={e => set("role", e.target.value)} className={inputClass}>
              {ROLES.map(r => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Temporary Password <span className="text-red-500">*</span></label>
            <input type="text" value={form.temp_password} onChange={e => set("temp_password", e.target.value)} placeholder="Temp@123" className={inputClass} />
          </div>
          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-[13px] transition-all disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
          >
            {loading ? <><Loader2 size={14} className="animate-spin" /> Creating…</> : "Create Platform User"}
          </button>
        </div>
      </SlidePanel>
    </div>
  );
}
