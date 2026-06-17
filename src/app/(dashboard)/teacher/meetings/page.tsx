"use client";

import { useState } from "react";
import { Users, Calendar, CheckSquare, Clock } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export default function MeetingsView() {
  const { success } = useToast();
  const [rsvps, setRsvps] = useState<Record<string, string>>({});

  const meetings = [
    { id: "1", title: "PTA general committee meeting", type: "PTA Desk", date: "2026-06-20", time: "03:30 PM", venue: "Assembly Hall" },
    { id: "2", title: "Academic Board curriculum alignment", type: "Staff Desk", date: "2026-06-22", time: "02:00 PM", venue: "Conference Room" },
  ];

  function handleRsvp(meetingId: string, status: string) {
    setRsvps(prev => ({ ...prev, [meetingId]: status }));
    success(`RSVP '${status}' logged for this meeting event.`);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-[20px] font-extrabold text-slate-900 leading-tight">Meetings Desk</h1>
        <p className="text-slate-500 text-[12px] font-semibold mt-0.5">View scheduled Staff, PTA and Department academic board meetings and log your RSVP status.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {meetings.map((meet) => {
          const currentRsvp = rsvps[meet.id] || "pending";
          return (
            <div key={meet.id} className="bg-white rounded-2xl border border-[#e8e4f3] p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wide text-violet-600 bg-violet-50 px-2.5 py-0.5 rounded border border-violet-100/50">
                  {meet.type}
                </span>
                <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 font-mono">
                  <Clock size={12} />
                  {meet.time}
                </span>
              </div>

              <div>
                <h4 className="font-extrabold text-slate-900 text-[14px] leading-tight">{meet.title}</h4>
                <p className="text-slate-400 font-semibold text-[11px] mt-1">Venue: {meet.venue} · Date: {meet.date}</p>
              </div>

              {/* RSVP Action */}
              <div className="border-t border-[#f5f3fc] pt-3.5 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400">RSVP Status: <span className="capitalize text-slate-700">{currentRsvp}</span></span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRsvp(meet.id, "Going")}
                    className="px-3 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold border border-emerald-100/50"
                  >
                    Going
                  </button>
                  <button
                    onClick={() => handleRsvp(meet.id, "Declined")}
                    className="px-3 h-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold border border-rose-100/50"
                  >
                    Decline
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
