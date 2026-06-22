"use client";

import { useEffect, useState, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function LoaderContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (loading) {
      setProgress(100);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(() => setLoading(false), 150);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    let progressInterval: NodeJS.Timeout;

    const startLoading = () => {
      // Defer updates to next tick to avoid scheduling during useInsertionEffect layout phases
      setTimeout(() => {
        setLoading(true);
        setVisible(true);
        setProgress(0);

        if (progressInterval) clearInterval(progressInterval);
        // Simulate a smooth, natural-looking progress percentage increase
        progressInterval = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 90) {
              return prev; // Hold at 90% until page load finishes
            }
            // Increments are larger at first, then slow down
            const increment = Math.max(1, (100 - prev) * 0.2 * Math.random());
            return Math.min(prev + increment, 90);
          });
        }, 100);
      }, 0);
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
          console.error("Loader error resolving URL:", err);
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

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-[9999] h-[3px] bg-transparent pointer-events-none transition-opacity duration-150"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div
        className="h-full transition-all duration-300 ease-out"
        style={{
          width: `${progress}%`,
          background: "linear-gradient(90deg, #262262 0%, #92278F 50%, #92278F 100%)",
          boxShadow: "0 0 8px #92278F, 0 0 4px #262262"
        }}
      />
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
