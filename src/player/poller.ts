"use client";

/**
 * The 15-second content poll (SYNC_MODEL "poll contract"):
 * - ETag/If-None-Match → mostly tiny 304s
 * - a new contentVersion stages as `pending` and activates at the first
 *   8s boundary ≥ activateAt AND once every image is in the SW cache —
 *   a not-ready player holds the old snapshot (R27), never blanks
 * - loopEpoch and the message window flow into the live snapshot
 *   immediately — message timing never waits for content activation
 * - a changed buildId schedules the boundary-timed SW update (R17)
 */

import { useEffect, useRef, useState } from "react";
import { snapshotImageUrls } from "@/lib/active-slides";
import { boundaryAtOrAfter } from "@/lib/loop-math";
import type { Snapshot } from "@/lib/snapshot-types";
import { registerPlayerSw, scheduleUpdateReload } from "./sw-registration";
import type { WallClock } from "./wall-clock";

export const POLL_MS = 15_000;
const SNAPSHOT_STORAGE_KEY = "westbrook.snapshot.v1";
const PREFETCH_RETRY_MS = 10_000;

function loadStoredSnapshot(): Snapshot | null {
  try {
    const raw = localStorage.getItem(SNAPSHOT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Snapshot;
  } catch {
    return null;
  }
}

function storeSnapshot(s: Snapshot) {
  try {
    localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(s));
  } catch {
    // best-effort
  }
}

/** Fetch every image through the SW cache; true only when ALL succeeded. */
async function prefetchImages(snapshot: Snapshot): Promise<boolean> {
  const urls = snapshotImageUrls(snapshot);
  const results = await Promise.all(
    urls.map(async (u) => {
      try {
        const res = await fetch(u);
        return res.ok;
      } catch {
        return false;
      }
    }),
  );
  return results.every(Boolean);
}

export function usePolledSnapshot(clock: WallClock): Snapshot | null {
  const [current, setCurrent] = useState<Snapshot | null>(null);
  const currentRef = useRef<Snapshot | null>(null);
  const pendingRef = useRef<Snapshot | null>(null);
  const pendingReadyRef = useRef(false);
  const lastPrefetchRef = useRef(0);
  const etagRef = useRef<string | null>(null);

  useEffect(() => {
    let stopped = false;
    registerPlayerSw();

    function apply(next: Snapshot) {
      currentRef.current = next;
      setCurrent(next);
      storeSnapshot(next);
    }

    function startPrefetch(next: Snapshot) {
      lastPrefetchRef.current = Date.now();
      void prefetchImages(next).then((ok) => {
        if (pendingRef.current?.contentVersion === next.contentVersion) {
          pendingReadyRef.current = ok;
        }
      });
    }

    function maybeScheduleUpdate(next: Snapshot) {
      const ours = process.env.BUILD_ID ?? "dev";
      if (ours === "dev" || next.buildId === "dev") return;
      if (next.buildId !== ours) {
        scheduleUpdateReload(clock.now, next.loopEpoch);
      }
    }

    async function poll() {
      try {
        const headers: Record<string, string> = {};
        if (etagRef.current) headers["If-None-Match"] = etagRef.current;
        const res = await fetch("/api/content", { headers, cache: "no-store" });
        if (stopped) return;
        if (res.status === 304) return;
        if (!res.ok) return;
        etagRef.current = res.headers.get("etag");
        const next = (await res.json()) as Snapshot;
        maybeScheduleUpdate(next);
        const cur = currentRef.current;
        if (!cur) {
          apply(next);
          startPrefetch(next); // warm the cache for offline playback
          return;
        }
        if (next.contentVersion === cur.contentVersion) {
          // Same content; epoch / message window changed — apply now.
          apply(next);
          return;
        }
        // New content: stage it (pre-download gate), but let live-critical
        // timing flow through immediately.
        pendingRef.current = next;
        pendingReadyRef.current = false;
        startPrefetch(next);
        apply({ ...cur, loopEpoch: next.loopEpoch, message: next.message });
      } catch {
        // offline — keep playing the current snapshot (R11)
      }
    }

    // Boot: last stored snapshot first (offline boot, R11), then live.
    const stored = loadStoredSnapshot();
    if (stored) {
      currentRef.current = stored;
      setCurrent(stored);
    }
    void poll();
    const pollTimer = setInterval(() => void poll(), POLL_MS);

    // Activation: first boundary ≥ activateAt AND images ready (R27).
    // An image that keeps failing retries every 10s; the old snapshot
    // holds — brief stale divergence over a blank frame, always.
    const activateTimer = setInterval(() => {
      const pending = pendingRef.current;
      const cur = currentRef.current;
      if (!pending) return;
      if (!pendingReadyRef.current) {
        if (Date.now() - lastPrefetchRef.current > PREFETCH_RETRY_MS) {
          startPrefetch(pending);
        }
        return;
      }
      const epoch = cur?.loopEpoch ?? pending.loopEpoch;
      const t = clock.now();
      if (t >= boundaryAtOrAfter(pending.activateAt, epoch)) {
        pendingRef.current = null;
        pendingReadyRef.current = false;
        apply(pending);
      }
    }, 300);

    return () => {
      stopped = true;
      clearInterval(pollTimer);
      clearInterval(activateTimer);
    };
    // clock is a stable facade of refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return current;
}
