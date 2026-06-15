"use client";

import { useEffect, useState } from "react";

export default function PlatformLoading() {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(26,5,51,0.92)", backdropFilter: "blur(6px)" }}>
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-20 h-20">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="40" cy="40" r="34" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
            <circle
              cx="40" cy="40" r="34"
              stroke="url(#platform-load-grad)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - pct / 100)}
              style={{ transition: "stroke-dashoffset 0.05s linear" }}
            />
            <defs>
              <linearGradient id="platform-load-grad" x1="0" y1="0" x2="80" y2="80" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#2d1b69" />
                <stop offset="100%" stopColor="#6b1f8a" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[15px] font-black tabular-nums text-white">{pct}</span>
          </div>
        </div>
        <p className="text-[12px] font-semibold tracking-wide text-white/40">Loading…</p>
      </div>
    </div>
  );
}
