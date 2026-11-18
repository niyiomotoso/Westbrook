"use client";

/**
 * Self-healing (R16):
 * - stall watchdog: a 15s interval (intervals fire even when rAF is
 *   throttled) reloads the page if no frame was drawn for 30s
 * - nightly reload at ~04:00 hotel time clears slow leaks
 */

import { localParts } from "@/lib/hotel-time";

const NIGHTLY_KEY = "westbrook.lastNightlyReload";
export const STALL_MS = 30_000;
export const NIGHTLY_HOUR = 4;
export const NIGHTLY_MIN_GAP_MS = 20 * 60 * 60 * 1000;

/** Pure: no frame for STALL_MS while visible → reload (R16). */
export function isStalled(lastFrameAt: number, now: number): boolean {
  return now - lastFrameAt > STALL_MS;
}

/** Pure: 04:00 hotel time, at most once per 20 hours (R16). */
export function shouldNightlyReload(
  hotelHour: number,
  lastReloadAt: number,
  now: number,
): boolean {
  return hotelHour === NIGHTLY_HOUR && now - lastReloadAt > NIGHTLY_MIN_GAP_MS;
}

export function startWatchdog(getTimezone: () => string): () => void {
  let lastFrameAt = performance.now();
  let raf = 0;

  function frame() {
    lastFrameAt = performance.now();
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  const interval = setInterval(() => {
    // Stall: the rAF loop hasn't run for STALL_MS while we're visible.
    if (
      document.visibilityState === "visible" &&
      isStalled(lastFrameAt, performance.now())
    ) {
      window.location.reload();
      return;
    }
    // Nightly reload at 04:00 hotel time, at most once per 20 hours.
    try {
      const { hour } = localParts(Date.now(), getTimezone());
      const last = Number(localStorage.getItem(NIGHTLY_KEY) ?? 0);
      if (shouldNightlyReload(hour, last, Date.now())) {
        localStorage.setItem(NIGHTLY_KEY, String(Date.now()));
        window.location.reload();
      }
    } catch {
      // timezone hiccup — skip this tick
    }
  }, 15_000);

  return () => {
    clearInterval(interval);
    cancelAnimationFrame(raf);
  };
}
