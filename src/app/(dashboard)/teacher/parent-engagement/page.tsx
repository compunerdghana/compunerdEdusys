"use client";

import { useState } from "react";
import { HeartHandshake, Phone, Mail, Search, MessageSquare } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export default function ParentEngagementView() {
  const { success } = useToast();
  const parents = [
    { name: "Ama Mensah", phone: "+233 24 111 2222", email: "ama.mensah@gmail.com", ward: "Kwame Mensah" },
    { name: "Yaw Boateng", phone: "+233 20 555 7777", email: "yaw.b@yahoo.com", ward: "Adjoa Boateng" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-[20px] font-extrabold text-slate-900 leading-tight">Parent Engagement Portal</h1>
        <p className="text-slate-500 text-[12px] font-semibold mt-0.5">Access parent directories, contact channels and academic collaboration desks.</p>
      </div>

      {/* Parents list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {parents.map((p, idx) => (
          <div key={idx} className="bg-white rounded-2xl border border-[#e8e4f3] p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                <HeartHandshake size={18} />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-[14px] leading-tight">{p.name}</h4>
                <p className="text-slate-400 font-semibold text-[11px] mt-0.5">Ward: {p.ward}</p>
              </div>
            </div>

            <div className="border-t border-[#f5f3fc] pt-3 space-y-1.5 text-[12px] text-slate-600 font-bold">
              <div className="flex items-center gap-2">
                <Phone size={13} className="text-slate-400" />
                <span>{p.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={13} className="text-slate-400" />
                <span>{p.email}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => success(`WhatsApp update sent successfully to ${p.name}!`)}
                className="w-full h-9 rounded-xl border border-violet-100 bg-violet-50 hover:bg-violet-100 text-violet-700 text-[11.5px] font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <MessageSquare size={13} />
                Send WhatsApp Update
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
