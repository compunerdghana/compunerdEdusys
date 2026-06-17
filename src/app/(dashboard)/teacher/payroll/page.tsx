"use client";

import { Wallet, FileText, Download } from "lucide-react";

export default function MyPayrollView() {
  const payslips = [
    { month: "May 2026", basic: "GHS 3,500.00", allowance: "GHS 450.00", tax: "GHS 520.00", net: "GHS 3,430.00" },
    { month: "April 2026", basic: "GHS 3,500.00", allowance: "GHS 450.00", tax: "GHS 520.00", net: "GHS 3,430.00" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-[20px] font-extrabold text-slate-900 leading-tight">My Payroll & Payslips</h1>
        <p className="text-slate-500 text-[12px] font-semibold mt-0.5">Securely view monthly salary statements, allowances, deductions and download payslips.</p>
      </div>

      <div className="space-y-4">
        {payslips.map((pay, idx) => (
          <div key={idx} className="bg-white rounded-2xl border border-[#e8e4f3] p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#f5f3fc] pb-3">
              <h4 className="font-extrabold text-slate-950 text-[14px] flex items-center gap-2">
                <Wallet size={15} className="text-violet-600" />
                Payslip — {pay.month}
              </h4>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#e0daf0] bg-white text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition-all">
                <Download size={12} />
                Download PDF
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[12.5px] font-bold text-slate-600">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Basic Salary</p>
                <p className="text-slate-900 font-extrabold mt-1">{pay.basic}</p>
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Allowances</p>
                <p className="text-slate-900 font-extrabold mt-1">{pay.allowance}</p>
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Deductions (Tax/SSNIT)</p>
                <p className="text-rose-600 font-extrabold mt-1">-{pay.tax}</p>
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Net Salary Paid</p>
                <p className="text-emerald-600 font-extrabold mt-1">{pay.net}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
