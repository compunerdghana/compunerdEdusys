"use client";

import { useState } from "react";
import { Edit2, Plus, Check, Users, Database, MessageSquare } from "lucide-react";
import { SlidePanel } from "@/components/ui/SlidePanel";
import { useToast } from "@/components/ui/Toast";

const DEFAULT_PLANS = [
  {
    id: "starter",
    name: "starter",
    displayName: "Starter",
    monthlyPrice: 299,
    annualPrice: 2990,
    limits: { students: 200, staff: 20, storageMB: 1024, sms: 500, whatsapp: 0 },
    features: ["Students Management", "Attendance", "Basic Reports", "Email Support"],
    schoolCount: 12,
    gradient: "linear-gradient(135deg, #64748b, #475569)",
    accentColor: "border-l-slate-400",
  },
  {
    id: "standard",
    name: "standard",
    displayName: "Standard",
    monthlyPrice: 599,
    annualPrice: 5990,
    limits: { students: 800, staff: 60, storageMB: 5120, sms: 2000, whatsapp: 500 },
    features: ["All Starter Features", "Finance & Fees", "Exams & Reports", "Admissions", "Priority Email"],
    schoolCount: 38,
    gradient: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
    accentColor: "border-l-blue-500",
  },
  {
    id: "premium",
    name: "premium",
    displayName: "Premium",
    monthlyPrice: 999,
    annualPrice: 9990,
    limits: { students: 2000, staff: 150, storageMB: 20480, sms: 10000, whatsapp: 3000 },
    features: ["All Standard Features", "Payroll", "Communications Hub", "Report Cards", "Phone Support"],
    schoolCount: 21,
    gradient: "linear-gradient(135deg, #7c3aed, #4f46e5)",
    accentColor: "border-l-violet-500",
  },
  {
    id: "enterprise",
    name: "enterprise",
    displayName: "Enterprise",
    monthlyPrice: 1999,
    annualPrice: 19990,
    limits: { students: 999999, staff: 999999, storageMB: 102400, sms: 50000, whatsapp: 15000 },
    features: ["All Premium Features", "Unlimited Students", "Dedicated Account Manager", "Custom Features", "SLA"],
    schoolCount: 5,
    gradient: "linear-gradient(135deg, #4338ca, #312e81)",
    accentColor: "border-l-indigo-600",
  },
];

type Plan = typeof DEFAULT_PLANS[0];

function PlanCard({ plan, onEdit }: { plan: Plan; onEdit: () => void }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-[#e8e4f3] border-l-4 ${plan.accentColor} overflow-hidden`}>
      {/* Gradient header */}
      <div className="p-6 text-white" style={{ background: plan.gradient }}>
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-xl font-extrabold">{plan.displayName}</h3>
          <span className="text-[11px] font-extrabold bg-white/20 px-2.5 py-1 rounded-full">
            {plan.schoolCount} schools
          </span>
        </div>
        <p className="text-3xl font-extrabold leading-tight">GHS {plan.monthlyPrice.toLocaleString()}</p>
        <p className="text-white/70 text-[12px] font-semibold mt-0.5">per month</p>
        <p className="text-white/50 text-[11px] font-semibold mt-1">GHS {plan.annualPrice.toLocaleString()} / year</p>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4">
        {/* Limits grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 bg-[#faf9ff] rounded-xl px-3 py-2 border border-[#f0edf8]">
            <Users size={12} className="text-slate-400 shrink-0" />
            <span className="text-[11px] font-bold text-slate-600">
              {plan.limits.students >= 999999 ? "Unlimited" : plan.limits.students.toLocaleString()} students
            </span>
          </div>
          <div className="flex items-center gap-2 bg-[#faf9ff] rounded-xl px-3 py-2 border border-[#f0edf8]">
            <Users size={12} className="text-slate-400 shrink-0" />
            <span className="text-[11px] font-bold text-slate-600">
              {plan.limits.staff >= 999999 ? "Unlimited" : plan.limits.staff} staff
            </span>
          </div>
          <div className="flex items-center gap-2 bg-[#faf9ff] rounded-xl px-3 py-2 border border-[#f0edf8]">
            <Database size={12} className="text-slate-400 shrink-0" />
            <span className="text-[11px] font-bold text-slate-600">{(plan.limits.storageMB / 1024).toFixed(0)} GB storage</span>
          </div>
          <div className="flex items-center gap-2 bg-[#faf9ff] rounded-xl px-3 py-2 border border-[#f0edf8]">
            <MessageSquare size={12} className="text-slate-400 shrink-0" />
            <span className="text-[11px] font-bold text-slate-600">
              {plan.limits.sms >= 999999 ? "Unlimited" : plan.limits.sms.toLocaleString()} SMS
            </span>
          </div>
        </div>

        {/* Features */}
        <div className="space-y-1.5">
          {plan.features.map(f => (
            <div key={f} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full flex items-center justify-center bg-emerald-100 shrink-0">
                <Check size={10} className="text-emerald-600" />
              </div>
              <span className="text-[12px] font-semibold text-slate-600">{f}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onEdit}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#e0daf0] text-slate-700 text-[13px] font-bold hover:bg-slate-50 transition-all"
        >
          <Edit2 size={13} />
          Edit Plan
        </button>
      </div>
    </div>
  );
}

export default function PlansPage() {
  const { success } = useToast();
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({ monthlyPrice: "", annualPrice: "", students: "", staff: "", sms: "" });

  function openEdit(plan: Plan) {
    setEditPlan(plan);
    setEditForm({
      monthlyPrice: String(plan.monthlyPrice),
      annualPrice: String(plan.annualPrice),
      students: plan.limits.students >= 999999 ? "" : String(plan.limits.students),
      staff: plan.limits.staff >= 999999 ? "" : String(plan.limits.staff),
      sms: plan.limits.sms >= 999999 ? "" : String(plan.limits.sms),
    });
  }

  async function handleSave() {
    setSaving(true);
    await new Promise(r => setTimeout(r, 800));
    setSaving(false);
    setEditPlan(null);
    success("Plan updated successfully.");
  }

  const inputClass = "w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold text-slate-900 leading-tight">Subscription Plans</h1>
          <p className="text-slate-500 text-[13px] font-semibold mt-1">Manage pricing and limits for each plan tier.</p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-bold transition-all shadow-sm"
          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
        >
          <Plus size={15} />
          Create Plan
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {DEFAULT_PLANS.map(plan => (
          <PlanCard key={plan.id} plan={plan} onEdit={() => openEdit(plan)} />
        ))}
      </div>

      <SlidePanel
        open={!!editPlan}
        onClose={() => setEditPlan(null)}
        title={`Edit ${editPlan?.displayName ?? ""} Plan`}
      >
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Monthly Price (GHS)</label>
              <input type="number" value={editForm.monthlyPrice} onChange={e => setEditForm(f => ({ ...f, monthlyPrice: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Annual Price (GHS)</label>
              <input type="number" value={editForm.annualPrice} onChange={e => setEditForm(f => ({ ...f, annualPrice: e.target.value }))} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Student Limit</label>
              <input type="number" value={editForm.students} onChange={e => setEditForm(f => ({ ...f, students: e.target.value }))} placeholder="Unlimited" className={inputClass} />
            </div>
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Staff Limit</label>
              <input type="number" value={editForm.staff} onChange={e => setEditForm(f => ({ ...f, staff: e.target.value }))} placeholder="Unlimited" className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">SMS Limit</label>
            <input type="number" value={editForm.sms} onChange={e => setEditForm(f => ({ ...f, sms: e.target.value }))} placeholder="Unlimited" className={inputClass} />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-xl text-white font-bold text-[13px] transition-all disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </SlidePanel>
    </div>
  );
}
