"use client";

/**
 * Service worker lifecycle for the player (R17): register, detect new
 * deploys via the snapshot's buildId, and swap versions only at an
 * 8-second boundary so the reload hides inside a themed cross-fade.
 */

import { boundaryAtOrAfter } from "@/lib/loop-math";

let registered = false;

export function registerPlayerSw() {
  if (registered || typeof navigator === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  if (process.env.NODE_ENV === "development") return;
  registered = true;
  navigator.serviceWorker.register("/sw.js").catch(() => {
    registered = false;
  });
  // Installed PWAs get storage persistence auto-granted; asking is free.
  navigator.storage?.persist?.().catch(() => {});
}

let updateScheduled = false;
// If no reload happened within this window, release the latch so later
// polls can retry — a failed SW install must never strand the device on a
// stale build (review P1).
const UPDATE_RETRY_MS = 120_000;

function armRetryRelease() {
  setTimeout(() => {
    updateScheduled = false;
  }, UPDATE_RETRY_MS);
}

/**
 * Called by the poller when the server's buildId differs from ours.
 * Flow: update the registration → SKIP_WAITING the fresh worker → reload
 * at the next slide boundary (the manifest/body background masks the gap).
 * Every failure path releases the latch so the next poll retries.
 */
export function scheduleUpdateReload(
  now: () => number,
  epoch: number,
): void {
  if (updateScheduled) return;
  updateScheduled = true;
  armRetryRelease();

  const reloadAtBoundary = () => {
    const t = now();
    const boundary = boundaryAtOrAfter(t + 500, epoch);
    const delay = Math.max(0, boundary - t);
    setTimeout(() => window.location.reload(), delay);
  };

  if (!("serviceWorker" in navigator) || !navigator.serviceWorker.controller) {
    // No SW (dev / first load): a boundary reload alone fetches new assets.
    reloadAtBoundary();
    return;
  }

  const activateWaiting = (reg: ServiceWorkerRegistration) => {
    if (!reg.waiting) return false;
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      reloadAtBoundary,
      { once: true },
    );
    reg.waiting.postMessage({ type: "SKIP_WAITING" });
    return true;
  };

  navigator.serviceWorker
    .getRegistration()
    .then(async (reg) => {
      if (!reg) return reloadAtBoundary();
      await reg.update().catch(() => {});
      if (activateWaiting(reg)) return;
      const fresh = reg.installing;
      if (!fresh) return reloadAtBoundary();
      fresh.addEventListener("statechange", () => {
        if (fresh.state === "redundant") {
          // Install failed — release the latch so the next poll retries.
          updateScheduled = false;
          return;
        }
        activateWaiting(reg);
      });
    })
    .catch(reloadAtBoundary);
}
