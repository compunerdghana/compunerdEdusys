"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, UserPlus, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface SchoolRole {
  id: string;
  name: string;
  display_name: string;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  admission_number: string;
}

const inputClass =
  "w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white";

export default function CreateUserPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [roles, setRoles] = useState<SchoolRole[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    username: "",
    phone: "",
    password: "",
    role: "teacher", // default to teacher template role
    role_id: "", // school custom/system role ID
    student_id: "", // parent/student target student ID
    relationship: "Father", // parent relationship
  });

  useEffect(() => {
    // Fetch school roles and students
    async function loadData() {
      try {
        const [rolesRes, studentsRes] = await Promise.all([
          fetch("/api/school/user-management/roles").then((r) => r.json()),
          fetch("/api/admin/setup-students?q=").then((r) => r.json()).catch(() => ({ students: [] })) // fallback
        ]);

        setRoles(rolesRes.roles ?? []);
        // Seed first matching role_id if possible
        const matched = (rolesRes.roles ?? []).find((r: any) => r.name === "teacher");
        if (matched) setForm((f) => ({ ...f, role_id: matched.id }));
        
        // Fetch students if fallback failed
        if (studentsRes.students) {
          setStudents(studentsRes.students);
        } else {
          // fetch from normal students endpoint
          const res = await fetch("/api/school/user-management/users"); // fetches directory, but let's query students directly if needed
        }
      } catch {
        toastError("Failed to initialize user creation wizard.");
      }
    }
    loadData();
  }, [toastError]);

  // When high-level role changes, sync default role_id
  function handleRoleChange(selectedRole: string) {
    const matched = roles.find((r) => r.name === selectedRole);
    setForm((f) => ({
      ...f,
      role: selectedRole,
      role_id: matched ? matched.id : f.role_id,
      student_id: "",
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name || !form.username || !form.password) {
      toastError("Full name, username, and password are required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/school/user-management/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create user.");
      success("User account created successfully.");
      router.push("/user-management");
    } catch (err: any) {
      toastError(err.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Back button */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/user-management")}
          className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Directory
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#e8e4f3] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#f0edf8] flex items-center gap-3 bg-[#faf9ff]">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white bg-violet-600 shadow-md">
            <UserPlus size={14} />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-[14px]">Create New User Account</h3>
            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Logs in with username + password only — no email or extra verification needed</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* User Type & School Role */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-bold text-slate-700 mb-1.5">User Type (Template)</label>
              <select
                value={form.role}
                onChange={(e) => handleRoleChange(e.target.value)}
                className={inputClass}
              >
                <option value="school_admin">School Admin</option>
                <option value="headmaster">Headmaster</option>
                <option value="accountant">Accountant</option>
                <option value="teacher">Teacher</option>
                <option value="librarian">Librarian</option>
                <option value="parent">Parent</option>
                <option value="student">Student</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Assigned Role Matrix</label>
              <select
                value={form.role_id}
                onChange={(e) => setForm((f) => ({ ...f, role_id: e.target.value }))}
                className={inputClass}
              >
                {roles
                  .filter((r) => r.name === form.role || form.role === "school_admin") // filter relevant roles
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.display_name}
                    </option>
                  ))}
                {roles.filter((r) => r.name === form.role).length === 0 &&
                  roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.display_name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Full Name & Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Full Name</label>
              <input
                type="text"
                placeholder="John Mensah"
                required
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Username (Unique)</label>
              <input
                type="text"
                placeholder="john.mensah"
                required
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>

          {/* Email (optional) & Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Email (Optional)</label>
              <input
                type="email"
                placeholder="Leave blank — not required to log in"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Phone Number</label>
              <input
                type="text"
                placeholder="e.g. +233 24 123 4567"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Login Password</label>
            <input
              type="password"
              placeholder="Minimum 6 characters..."
              required
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className={inputClass}
            />
          </div>

          {/* Conditional Parent/Student Link Fields */}
          {form.role === "parent" && (
            <div className="bg-violet-50/30 rounded-xl border border-violet-100 p-4 space-y-4">
              <p className="text-[12px] font-bold text-violet-700">Link Wards (Students)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Select Student</label>
                  <select
                    value={form.student_id}
                    onChange={(e) => setForm((f) => ({ ...f, student_id: e.target.value }))}
                    className={inputClass}
                  >
                    <option value="">Choose Student...</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.first_name} {s.last_name} ({s.admission_number})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Relationship</label>
                  <select
                    value={form.relationship}
                    onChange={(e) => setForm((f) => ({ ...f, relationship: e.target.value }))}
                    className={inputClass}
                  >
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Guardian">Guardian</option>
                    <option value="Uncle/Aunt">Uncle / Aunt</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {form.role === "student" && (
            <div className="bg-violet-50/30 rounded-xl border border-violet-100 p-4">
              <p className="text-[12px] font-bold text-violet-700 mb-3">Link to Student Profile</p>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Select Student Record</label>
                <select
                  value={form.student_id}
                  onChange={(e) => setForm((f) => ({ ...f, student_id: e.target.value }))}
                  className={inputClass}
                >
                  <option value="">Choose Student Record...</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.first_name} {s.last_name} ({s.admission_number})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-[13px] transition-all disabled:opacity-60 shadow-sm"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : null}
            Register User Account
          </button>
        </form>
      </div>
    </div>
  );
}
