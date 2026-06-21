"use client";

import { useEffect, useState, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function LoaderContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Hide the loader whenever the pathname or search parameters change
    setLoading(false);
    setProgress(0);
  }, [pathname, searchParams]);

  useEffect(() => {
    let progressInterval: NodeJS.Timeout;

    const startLoading = () => {
      setLoading(true);
      setProgress(0);

      // Simulate a smooth, natural-looking progress percentage increase
      progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 92) {
            return prev; // Hold at 92% until page load finishes
          }
          // Increments are larger at first, then slow down
          const increment = Math.max(1, (100 - prev) * 0.15 * Math.random());
          return Math.min(prev + increment, 92);
        });
      }, 120);
    };

    // Override pushState and replaceState to intercept client-side router triggers
    const originalPush = window.history.pushState;
    const originalReplace = window.history.replaceState;

    window.history.pushState = function (...args) {
      startLoading();
      return originalPush.apply(window.history, args);
    };

    window.history.replaceState = function (...args) {
      startLoading();
      return originalReplace.apply(window.history, args);
    };

    // Capture standard anchor clicks for navigation routing
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");

      if (
        anchor &&
        anchor.href &&
        anchor.target !== "_blank" &&
        !e.defaultPrevented &&
        e.button === 0 && // Left-click only
        !e.metaKey &&
        !e.ctrlKey &&
        !e.shiftKey &&
        !e.altKey
      ) {
        try {
          const url = new URL(anchor.href);
          // Only trigger load animation if it's an internal route that differs from the current page
          if (
            url.origin === window.location.origin &&
            url.pathname !== window.location.pathname
          ) {
            startLoading();
          }
        } catch (err) {
          console.error("Circular loader error resolving URL:", err);
        }
      }
    };

    window.addEventListener("click", handleAnchorClick);

    return () => {
      window.history.pushState = originalPush;
      window.history.replaceState = originalReplace;
      window.removeEventListener("click", handleAnchorClick);
      if (progressInterval) clearInterval(progressInterval);
    };
  }, []);

  if (!loading) return null;

  // Circle dimensions: diameter=80, stroke=6, radius=37. Circumference = 2 * PI * r = 232.5
  const strokeDashoffset = 232.5 - (232.5 * progress) / 100;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-md transition-all duration-300">
      <div className="bg-white p-7 rounded-3xl shadow-2xl flex flex-col items-center gap-4 border border-[#e8e4f3] max-w-[240px] w-full text-center animate-scale-up">
        {/* SVG Circular Loader */}
        <div className="relative w-20 h-20">
          <svg className="w-full h-full transform -rotate-90">
            {/* Background Track Circle */}
            <circle
              cx="40"
              cy="40"
              r="37"
              className="stroke-slate-100"
              strokeWidth="6"
              fill="transparent"
            />
            {/* Main Progress Stroke Circle */}
            <circle
              cx="40"
              cy="40"
              r="37"
              className="stroke-violet-600 transition-all duration-100 ease-out"
              strokeWidth="6"
              fill="transparent"
              strokeDasharray="232.5"
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          {/* Progress Percent Label */}
          <div className="absolute inset-0 flex items-center justify-center font-extrabold text-[16px] text-slate-800 font-sans">
            {Math.round(progress)}%
          </div>
        </div>

        <div className="space-y-0.5">
          <h4 className="font-extrabold text-slate-950 text-[13px]">Loading Workspace</h4>
          <p className="text-slate-400 text-[10.5px] font-semibold">Please wait a moment...</p>
        </div>
      </div>
    </div>
  );
}

export default function CircularPageLoader() {
  return (
    <Suspense fallback={null}>
      <LoaderContent />
    </Suspense>
  );
}
