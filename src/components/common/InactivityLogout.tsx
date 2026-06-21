"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function InactivityLogout() {
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    // Exclude authentication pages
    if (
      pathname === "/login" ||
      pathname === "/platform/login" ||
      pathname === "/signup" ||
      pathname === "/platform/signup"
    ) {
      return;
    }

    let timeoutId: NodeJS.Timeout;
    const INACTIVITY_LIMIT = 20 * 60 * 1000; // 20 minutes in milliseconds

    const handleLogout = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.auth.signOut();
        window.location.href = "/login?reason=inactivity";
      }
    };

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(handleLogout, INACTIVITY_LIMIT);
    };

    // Track common user interactions
    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
      "click",
    ];

    // Initialize timer
    resetTimer();

    // Attach activity listeners
    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    // Cleanup listeners and timer
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [pathname, supabase]);

  return null;
}
