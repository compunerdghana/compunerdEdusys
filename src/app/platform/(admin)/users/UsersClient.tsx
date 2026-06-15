"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Loader2 } from "lucide-react";
import { SlidePanel } from "@/components/ui/SlidePanel";
import { useToast } from "@/components/ui/Toast";

const PLATFORM_GRADIENT = "linear-gradient(135deg, #1a0533, #2d1b69, #6b1f8a)";

const roleBadge: Record<string, string> = {
  super_admin: "bg-purple-100 text-purple-800",
  manager: "bg-blue-100 text-blue-700",
  support: "bg-emerald-100 text-emerald-700",
  sales: "bg-amber-100 text-amber-700",
  finance: "bg-cyan-100 text-cyan-700",
  implementation: "bg-orange-100 text-orange-700",
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

  return (
    <div className="space-y-6">
      <div className="rounded-2xl px-8 py-6 text-white flex items-center justify-between" style={{ background: PLATFORM_GRADIENT }}>
        <div>
          <h1 className="text-2xl font-extrabold">Platform Users</h1>
          <p className="text-white/60 font-semibold mt-1">{users.length} admin users</p>
        </div>
        <button
          onClick={() => setPanelOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-sm transition-all border border-white/20"
        >
          <UserPlus size={16} />
          Add Platform User
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                {["User", "Email", "Role", "Phone", "Status", "Last Login", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-extrabold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 font-semibold">No platform users found.</td>
                </tr>
              ) : users.map(user => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-extrabold shrink-0"
                        style={{ background: PLATFORM_GRADIENT }}>
                        {initials(user.full_name ?? "?")}
                      </div>
                      <span className="font-bold text-slate-900">{user.full_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 font-semibold">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${roleBadge[user.role] ?? "bg-slate-100 text-slate-500"}`}>
                      {user.role?.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 font-semibold">{user.phone ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${user.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {user.status ?? "active"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 font-semibold text-xs">
                    {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    <button className="text-xs font-bold text-purple-700 hover:underline">Edit</button>
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
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Full Name <span className="text-red-500">*</span></label>
            <input type="text" value={form.full_name} onChange={e => set("full_name", e.target.value)} placeholder="e.g. Kwame Mensah"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold outline-none focus:border-purple-400 transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Email <span className="text-red-500">*</span></label>
            <input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="kwame@compunerd.com"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold outline-none focus:border-purple-400 transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Phone</label>
            <input type="tel" value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+233 24 xxx xxxx"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold outline-none focus:border-purple-400 transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Role</label>
            <select value={form.role} onChange={e => set("role", e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold outline-none focus:border-purple-400 transition-colors bg-white">
              {ROLES.map(r => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Temporary Password <span className="text-red-500">*</span></label>
            <input type="text" value={form.temp_password} onChange={e => set("temp_password", e.target.value)} placeholder="Temp@123"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold outline-none focus:border-purple-400 transition-colors" />
          </div>
          <button onClick={handleCreate} disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-60"
            style={{ background: PLATFORM_GRADIENT }}>
            {loading ? <><Loader2 size={15} className="animate-spin" /> Creating…</> : "Create Platform User"}
          </button>
        </div>
      </SlidePanel>
    </div>
  );
}
