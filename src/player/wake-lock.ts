"use client";

/**
 * Screen Wake Lock (R14): acquired at start, re-acquired whenever the page
 * becomes visible or the lock is released by the OS. Failures retry — the
 * OS-level backstop is the charger + "stay awake" developer option
 * (documented in the runbook).
 */

export function startWakeLock(): () => void {
  let sentinel: WakeLockSentinel | null = null;
  let stopped = false;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  async function acquire() {
    if (stopped || !("wakeLock" in navigator)) return;
    try {
      sentinel = await navigator.wakeLock.request("screen");
      sentinel.addEventListener("release", () => {
        sentinel = null;
        scheduleRetry(1000);
      });
    } catch {
      scheduleRetry(10_000);
    }
  }

  function scheduleRetry(ms: number) {
    if (stopped || retryTimer) return;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      if (document.visibilityState === "visible") void acquire();
    }, ms);
  }

  function onVisible() {
    if (document.visibilityState === "visible" && !sentinel) void acquire();
  }

  void acquire();
  document.addEventListener("visibilitychange", onVisible);

  return () => {
    stopped = true;
    document.removeEventListener("visibilitychange", onVisible);
    if (retryTimer) clearTimeout(retryTimer);
    sentinel?.release().catch(() => {});
  };
}
