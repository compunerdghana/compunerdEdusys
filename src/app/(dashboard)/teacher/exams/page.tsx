"use client";

import { useState } from "react";
import { GraduationCap, ShieldCheck, Lock, Unlock, FileSpreadsheet, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export default function ExamCenterView() {
  const { success, error: toastError } = useToast();
  const [isFinalized, setIsFinalized] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleFinalize() {
    setSaving(true);
    setTimeout(() => {
      setIsFinalized(true);
      setSaving(false);
      success("Exam marks finalized and locked. Editing is now restricted.");
    }, 1000);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-[20px] font-extrabold text-slate-900 leading-tight">Examination Center</h1>
        <p className="text-slate-500 text-[12px] font-semibold mt-0.5">Submit exam marks sheets to the administration desk for approval.</p>
      </div>

      <div className="bg-white rounded-2xl border border-[#e8e4f3] p-6 shadow-sm max-w-2xl space-y-5">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
            isFinalized ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-violet-50 text-violet-600 border border-violet-100"
          }`}>
            {isFinalized ? <Lock size={20} /> : <Unlock size={20} />}
          </div>
          <div className="space-y-1">
            <h3 className="font-extrabold text-slate-950 text-[14px]">
              End of Term 2 Examination Sheet (2026/2027)
            </h3>
            <p className="text-[12px] text-slate-500 font-semibold leading-relaxed">
              Subject: **Mathematics** · Classes: **JHS 1, JHS 2**
            </p>
          </div>
        </div>

        {isFinalized ? (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex gap-3 text-emerald-800">
            <ShieldCheck size={18} className="shrink-0 text-emerald-600 mt-0.5" />
            <p className="text-[12px] font-semibold leading-relaxed">
              <strong>Marks Sheet Finalized & Locked:</strong> This exam marksheet has been submitted and approved by the academic officer. Changes and editing are restricted unless reopened by an administrator.
            </p>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3 text-amber-800">
            <AlertCircle size={18} className="shrink-0 text-amber-600 mt-0.5" />
            <p className="text-[12px] font-semibold leading-relaxed">
              <strong>Review Marks:</strong> Ensure all marks are completely entered before finalization. Once finalized, you will lose the ability to edit.
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleFinalize}
            disabled={isFinalized || saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-[12.5px] font-bold transition-all disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
          >
            <Lock size={13} />
            {isFinalized ? "Locked" : "Finalize & Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
