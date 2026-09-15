import { useEffect } from "react";
import { localDateString, msUntilNextLocalMidnight } from "@shared/studentPortal";

async function signOutForNewDay() {
  try {
    await fetch("/api/logout", { method: "POST" });
  } catch {
    // Still send them to login if the session already expired.
  }
  window.location.href = "/";
}

/** Students must sign in again after midnight so they clock in for the new day. */
export function useStudentDailySession(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const startedOn = localDateString();
    const checkDate = () => {
      if (localDateString() !== startedOn) void signOutForNewDay();
    };

    const timeout = window.setTimeout(() => {
      void signOutForNewDay();
    }, msUntilNextLocalMidnight());

    document.addEventListener("visibilitychange", checkDate);
    window.addEventListener("focus", checkDate);
    return () => {
      window.clearTimeout(timeout);
      document.removeEventListener("visibilitychange", checkDate);
      window.removeEventListener("focus", checkDate);
    };
  }, [enabled]);
}
