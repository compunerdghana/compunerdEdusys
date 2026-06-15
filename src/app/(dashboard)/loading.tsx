"use client";

import { useEffect, useState } from "react";

export default function DashboardLoading() {
  const [pct, setPct] = useState(1);

  useEffect(() => {
    let n = 1;
    const id = setInterval(() => {
      n = Math.min(n + Math.ceil(Math.random() * 4), 99);
      setPct(n);
      if (n >= 99) clearInterval(id);
    }, 30);
    return () => clearInterval(id);
  }, []);

  const circumference = 2 * Math.PI * 34;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-20 h-20">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Track */}
            <circle cx="40" cy="40" r="34" stroke="#e2e8f0" strokeWidth="5" />
            {/* Progress arc */}
            <circle
              cx="40" cy="40" r="34"
              stroke="url(#load-grad)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - pct / 100)}
              style={{ transition: "stroke-dashoffset 0.05s linear" }}
            />
            <defs>
              <linearGradient id="load-grad" x1="0" y1="0" x2="80" y2="80" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#262262" />
                <stop offset="100%" stopColor="#92278F" />
              </linearGradient>
            </defs>
          </svg>
          {/* Number in center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[15px] font-black tabular-nums" style={{ color: "#262262" }}>{pct}</span>
          </div>
        </div>
        <p className="text-[12px] font-semibold tracking-wide" style={{ color: "#26226280" }}>Loading…</p>
      </div>
    </div>
  );
}
