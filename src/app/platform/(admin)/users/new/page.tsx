"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

const ROLES = [
  "super_admin",
  "platform_manager",
  "finance_officer",
  "support_officer",
  "sales_officer",
  "implementation_officer",
  "read_only_auditor",
];

const DEPARTMENTS = [
  "Engineering",
  "Finance",
  "Support",
  "Sales",
  "Operations",
  "Management",
  "Implementation",
];

const inputClass =
  "w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white";

export default function NewUserPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    position: "",
    department: "",
    role: "support_officer",
    username: "",
    temp_password: "",
    status: "active",
  });

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.first_name || !form.last_name || !form.email || !form.temp_password) {
      toastError("First name, last name, email and password are required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/platform/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: `${form.first_name} ${form.last_name}`.trim(),
          email: form.email,
          phone: form.phone,
          position: form.position,
          department: form.department,
          role: form.role,
          username: form.username,
          temp_password: form.temp_password,
          status: form.status,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create user");
      success("Platform user created successfully.");
      router.push("/platform/users");
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Link
        href="/platform/users"
        className="flex items-center gap-2 text-slate-400 hover:text-violet-600 font-bold text-[13px] transition-colors w-fit"
      >
        <ArrowLeft size={14} />
        Back to Users
      </Link>

      <div>
        <h1 className="text-[26px] font-extrabold text-slate-900 leading-tight">Create Platform User</h1>
        <p className="text-slate-500 text-[14px] font-semibold mt-1">Add a new admin portal account</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.first_name}
                onChange={(e) => set("first_name", e.target.value)}
                placeholder="Kwame"
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.last_name}
                onChange={(e) => set("last_name", e.target.value)}
                placeholder="Mensah"
                className={inputClass}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="kwame@compunerd.com"
              className={inputClass}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+233 24 xxx xxxx"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Position</label>
              <input
                type="text"
                value={form.position}
                onChange={(e) => set("position", e.target.value)}
                placeholder="Senior Support Officer"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Department</label>
              <select
                value={form.department}
                onChange={(e) => set("department", e.target.value)}
                className={inputClass}
              >
                <option value="">Select department</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Role</label>
              <select
                value={form.role}
                onChange={(e) => set("role", e.target.value)}
                className={inputClass}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Username</label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => set("username", e.target.value)}
                placeholder="kwame.mensah"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Status</label>
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                className={inputClass}
              >
                {["active", "inactive", "suspended", "locked"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">
              Temporary Password <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.temp_password}
              onChange={(e) => set("temp_password", e.target.value)}
              placeholder="Temp@123"
              className={inputClass}
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.push("/platform/users")}
              className="flex-1 py-3 rounded-xl text-slate-700 font-bold text-[13px] bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-[13px] transition-all disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
            >
              {loading ? <><Loader2 size={14} className="animate-spin" /> Creating…</> : "Create Platform User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
