"use client";

import { FileText, Download } from "lucide-react";

export default function DocumentCenterView() {
  const documents = [
    { title: "Ghana Education Service Code of Conduct.pdf", size: "1.8 MB", category: "Guidelines" },
    { title: "Compunerd Test Academy Teacher Handbook 2026.pdf", size: "3.4 MB", category: "School Policies" },
    { title: "Academic Calendar Term 2 schedules.pdf", size: "950 KB", category: "Circulars" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-[20px] font-extrabold text-slate-900 leading-tight">Document Center</h1>
        <p className="text-slate-500 text-[12px] font-semibold mt-0.5">Access official GES guidelines, staff handbooks, and circular letters.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {documents.map((doc, idx) => (
          <div key={idx} className="bg-white rounded-2xl border border-[#e8e4f3] p-5 shadow-sm flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                <FileText size={18} />
              </div>
              <div className="min-w-0">
                <h4 className="font-extrabold text-slate-900 text-[13.5px] leading-tight truncate">{doc.title}</h4>
                <p className="text-slate-400 font-medium text-[11px] mt-0.5">{doc.category} · {doc.size}</p>
              </div>
            </div>

            <button className="p-2 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors shrink-0">
              <Download size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
