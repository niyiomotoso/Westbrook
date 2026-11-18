"use client";

/**
 * The shared corrected clock: boot sync (with persisted-offset offline
 * fallback), 5-minute resyncs, visibility-change resync. Large corrections
 * park in pendingSnapRef for the engine to apply at a slide boundary.
 */

import { useEffect, useRef } from "react";
import {
  CorrectedClock,
  RESYNC_MS,
  collectSamples,
  combineSamples,
  loadPersistedOffset,
  saveOffset,
} from "@/lib/clock-sync";

export interface WallClock {
  clockRef: React.RefObject<CorrectedClock | null>;
  pendingSnapRef: React.RefObject<number | null>;
  /** Corrected now, falling back to device time before first sync. */
  now: () => number;
}

export function useWallClock(): WallClock {
  const clockRef = useRef<CorrectedClock | null>(null);
  const pendingSnapRef = useRef<number | null>(null);

  useEffect(() => {
    const clock = new CorrectedClock();
    clockRef.current = clock;

    async function sync(first: boolean) {
      try {
        const samples = await collectSamples();
        const est = combineSamples(samples);
        if (first || !clock.ready) {
          clock.snap(est.perfOffset);
        } else if (clock.apply(est.perfOffset) === "snap-requested") {
          pendingSnapRef.current = est.perfOffset;
        }
        saveOffset(est);
      } catch {
        if (first && !clock.ready) {
          const persisted = loadPersistedOffset();
          // Offline boot: best-effort on the device RTC (R11's exception),
          // re-anchored at the first successful sync.
          clock.snap(
            (persisted?.dateOffset ?? 0) + Date.now() - performance.now(),
          );
        }
      }
    }

    void sync(true);
    const resync = setInterval(() => void sync(false), RESYNC_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void sync(false);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(resync);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return {
    clockRef,
    pendingSnapRef,
    now: () => clockRef.current?.now() ?? Date.now(),
  };
}
