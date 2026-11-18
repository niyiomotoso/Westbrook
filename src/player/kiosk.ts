"use client";

/**
 * Kiosk chrome (R14/R15/R16): wake lock, watchdog, 60s heartbeats, the
 * hidden 5s top-left press, and total touch consumption elsewhere.
 */

import { useEffect, useRef, useState } from "react";
import type { PlayerConfig } from "./config";
import { startWakeLock } from "./wake-lock";
import { startWatchdog } from "./watchdog";

export const HEARTBEAT_MS = 60_000;
const CORNER_PX = 90;
const HOLD_MS = 5_000;

export function useKiosk(
  config: PlayerConfig | null,
  getTimezone: () => string,
): { gestureFired: boolean; resetGesture: () => void } {
  const [gestureFired, setGestureFired] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Wake lock + watchdog + heartbeats run only in kiosk (configured) mode.
  useEffect(() => {
    if (!config) return;
    const stopWake = startWakeLock();
    const stopDog = startWatchdog(getTimezone);

    async function beat() {
      try {
        await fetch("/api/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: config!.screenKey,
            position: config!.position,
            buildId: process.env.BUILD_ID ?? "dev",
          }),
        });
      } catch {
        // offline — the screens page will show "silent"
      }
    }
    void beat();
    const beatTimer = setInterval(() => void beat(), HEARTBEAT_MS);

    return () => {
      stopWake();
      stopDog();
      clearInterval(beatTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.screenKey, config?.position]);

  // Touch consumption + the hidden gesture (R15): a 5s uninterrupted
  // pointer-down inside the top-left corner opens the PIN gate; every
  // other interaction is swallowed.
  useEffect(() => {
    if (!config) return;

    function onPointerDown(e: PointerEvent) {
      // A second pointer while holding must not orphan the first timer
      // (review finding: the overwritten timer could pop the gate alone).
      if (holdTimer.current) return;
      if (e.clientX <= CORNER_PX && e.clientY <= CORNER_PX) {
        holdTimer.current = setTimeout(() => setGestureFired(true), HOLD_MS);
      }
    }
    function cancelHold() {
      if (holdTimer.current) {
        clearTimeout(holdTimer.current);
        holdTimer.current = null;
      }
    }
    function swallow(e: Event) {
      e.preventDefault();
    }

    function onPointerMove(e: PointerEvent) {
      if (
        holdTimer.current &&
        (e.clientX > CORNER_PX || e.clientY > CORNER_PX)
      ) {
        cancelHold();
      }
    }

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", cancelHold);
    window.addEventListener("pointercancel", cancelHold);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("contextmenu", swallow);
    document.documentElement.style.touchAction = "none";
    document.documentElement.style.userSelect = "none";
    document.documentElement.style.cursor = "none";

    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", cancelHold);
      window.removeEventListener("pointercancel", cancelHold);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("contextmenu", swallow);
      document.documentElement.style.touchAction = "";
      document.documentElement.style.userSelect = "";
      document.documentElement.style.cursor = "";
      cancelHold();
    };
  }, [config]);

  return { gestureFired, resetGesture: () => setGestureFired(false) };
}
