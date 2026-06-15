"use client";

import { useState } from "react";
import { Edit2, Plus, Check, Users, Database, MessageSquare } from "lucide-react";
import { SlidePanel } from "@/components/ui/SlidePanel";
import { useToast } from "@/components/ui/Toast";

const PLATFORM_GRADIENT = "linear-gradient(135deg, #1a0533, #2d1b69, #6b1f8a)";

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
    color: "from-slate-400 to-slate-600",
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
    color: "from-blue-500 to-blue-700",
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
    color: "from-purple-500 to-purple-800",
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
    color: "from-violet-600 to-indigo-800",
  },
];

type Plan = typeof DEFAULT_PLANS[0];

function PlanCard({ plan, onEdit }: { plan: Plan; onEdit: () => void }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className={`bg-gradient-to-br ${plan.color} p-5 text-white`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-extrabold">{plan.displayName}</h3>
          <span className="text-xs font-bold bg-white/20 px-2.5 py-1 rounded-full">{plan.schoolCount} schools</span>
        </div>
        <p className="text-3xl font-extrabold">GHS {plan.monthlyPrice.toLocaleString()}</p>
        <p className="text-white/70 text-sm font-semibold">per month</p>
        <p className="text-white/60 text-xs font-semibold mt-1">GHS {plan.annualPrice.toLocaleString()} / year</p>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
            <Users size={13} className="text-slate-400" />
            <span className="font-bold text-slate-600">
              {plan.limits.students >= 999999 ? "Unlimited" : plan.limits.students.toLocaleString()} students
            </span>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
            <Users size={13} className="text-slate-400" />
            <span className="font-bold text-slate-600">
              {plan.limits.staff >= 999999 ? "Unlimited" : plan.limits.staff} staff
            </span>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
            <Database size={13} className="text-slate-400" />
            <span className="font-bold text-slate-600">{(plan.limits.storageMB / 1024).toFixed(0)} GB storage</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
            <MessageSquare size={13} className="text-slate-400" />
            <span className="font-bold text-slate-600">
              {plan.limits.sms >= 999999 ? "Unlimited" : plan.limits.sms.toLocaleString()} SMS
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          {plan.features.map(f => (
            <div key={f} className="flex items-center gap-2">
              <Check size={13} className="text-emerald-500 shrink-0" />
              <span className="text-xs font-semibold text-slate-600">{f}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onEdit}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-all"
        >
          <Edit2 size={14} />
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

  return (
    <div className="space-y-6">
      <div className="rounded-2xl px-8 py-6 text-white flex items-center justify-between" style={{ background: PLATFORM_GRADIENT }}>
        <div>
          <h1 className="text-2xl font-extrabold">Subscription Plans</h1>
          <p className="text-white/60 font-semibold mt-1">Manage pricing and limits for each plan tier.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-sm transition-all border border-white/20">
          <Plus size={16} />
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
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Monthly Price (GHS)</label>
              <input
                type="number"
                value={editForm.monthlyPrice}
                onChange={e => setEditForm(f => ({ ...f, monthlyPrice: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold outline-none focus:border-purple-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Annual Price (GHS)</label>
              <input
                type="number"
                value={editForm.annualPrice}
                onChange={e => setEditForm(f => ({ ...f, annualPrice: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold outline-none focus:border-purple-400 transition-colors"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Student Limit</label>
              <input
                type="number"
                value={editForm.students}
                onChange={e => setEditForm(f => ({ ...f, students: e.target.value }))}
                placeholder="Unlimited"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold outline-none focus:border-purple-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Staff Limit</label>
              <input
                type="number"
                value={editForm.staff}
                onChange={e => setEditForm(f => ({ ...f, staff: e.target.value }))}
                placeholder="Unlimited"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold outline-none focus:border-purple-400 transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">SMS Limit</label>
            <input
              type="number"
              value={editForm.sms}
              onChange={e => setEditForm(f => ({ ...f, sms: e.target.value }))}
              placeholder="Unlimited"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold outline-none focus:border-purple-400 transition-colors"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-60"
            style={{ background: PLATFORM_GRADIENT }}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </SlidePanel>
    </div>
  );
}
