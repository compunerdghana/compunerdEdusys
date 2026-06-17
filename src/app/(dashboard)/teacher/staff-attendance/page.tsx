"use client";

import { useState } from "react";
import { Clock, ClipboardCheck, Play, Square, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export default function StaffAttendanceView() {
  const { success } = useToast();
  const [clockedIn, setClockedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([
    { date: "2026-06-16", clockIn: "08:14 AM", clockOut: "04:05 PM", status: "Present" },
    { date: "2026-06-15", clockIn: "08:29 AM", clockOut: "04:10 PM", status: "Late Entry" },
  ]);

  function handleClockAction() {
    setLoading(true);
    setTimeout(() => {
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (!clockedIn) {
        setClockedIn(true);
        // Add clock in log
        setLogs(prev => [
          { date: new Date().toISOString().split("T")[0], clockIn: time, clockOut: "—", status: "Active" },
          ...prev
        ]);
        success("Clocked in successfully! Have a great teaching day!");
      } else {
        setClockedIn(false);
        // Update clock out
        setLogs(prev => {
          const updated = [...prev];
          if (updated[0]) updated[0].clockOut = time;
          return updated;
        });
        success("Clocked out successfully! Rest well!");
      }
      setLoading(false);
    }, 1000);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-[20px] font-extrabold text-slate-900 leading-tight">Staff Attendance Desk</h1>
        <p className="text-slate-500 text-[12px] font-semibold mt-0.5">Clock in when arriving at school premises and clock out at close of day.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Clock Card */}
        <div className="bg-white rounded-2xl border border-[#e8e4f3] p-6 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
            <Clock size={24} />
          </div>

          <div>
            <h3 className="font-extrabold text-slate-950 text-[14.5px]">Daily Time Card</h3>
            <p className="text-[12px] text-slate-500 font-semibold mt-0.5">
              Status: <span className={clockedIn ? "text-emerald-600 font-bold" : "text-slate-400 font-bold"}>
                {clockedIn ? "Clocked In" : "Off Duty"}
              </span>
            </p>
          </div>

          <button
            onClick={handleClockAction}
            disabled={loading}
            className={`w-full h-11 flex items-center justify-center gap-1.5 rounded-xl text-white font-bold text-[12.5px] shadow-sm transition-all ${
              clockedIn ? "bg-rose-600 hover:bg-rose-700" : "bg-violet-600 hover:bg-violet-700"
            }`}
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : clockedIn ? <Square size={13} /> : <Play size={13} />}
            {clockedIn ? "Clock Out" : "Clock In"}
          </button>
        </div>

        {/* History table */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-[#e8e4f3] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#f0edf8]">
            <h4 className="font-extrabold text-slate-950 text-[14px]">Clock Logs History</h4>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#faf9ff] border-b border-[#f0edf8] text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Clock In</th>
                  <th className="px-5 py-3.5">Clock Out</th>
                  <th className="px-5 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5f3fc]">
                {logs.map((log, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors text-[13px] text-slate-700 font-semibold">
                    <td className="px-5 py-3 font-mono">{log.date}</td>
                    <td className="px-5 py-3">{log.clockIn}</td>
                    <td className="px-5 py-3">{log.clockOut}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.status === "Present" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-amber-50 text-amber-700 border border-amber-100"
                      }`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
