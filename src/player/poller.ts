"use client";

/**
 * The 15-second content poll (SYNC_MODEL "poll contract"):
 * - ETag/If-None-Match → mostly tiny 304s
 * - a new contentVersion stages as `pending` and activates at the first
 *   8s boundary ≥ activateAt (image pre-download gating arrives with the
 *   service worker in U10)
 * - loopEpoch and the message window flow into the live snapshot
 *   immediately — message timing never waits for content activation
 */

import { useEffect, useRef, useState } from "react";
import { boundaryAtOrAfter } from "@/lib/loop-math";
import type { Snapshot } from "@/lib/snapshot-types";
import type { WallClock } from "./wall-clock";

export const POLL_MS = 15_000;
const SNAPSHOT_STORAGE_KEY = "westbrook.snapshot.v1";

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

export function usePolledSnapshot(clock: WallClock): Snapshot | null {
  const [current, setCurrent] = useState<Snapshot | null>(null);
  const currentRef = useRef<Snapshot | null>(null);
  const pendingRef = useRef<Snapshot | null>(null);
  const etagRef = useRef<string | null>(null);

  useEffect(() => {
    let stopped = false;

    function apply(next: Snapshot) {
      currentRef.current = next;
      setCurrent(next);
      storeSnapshot(next);
    }

    async function poll() {
      try {
        const headers: Record<string, string> = {};
        if (etagRef.current) headers["If-None-Match"] = etagRef.current;
        const res = await fetch("/api/content", {
          headers,
          cache: "no-store",
        });
        if (stopped) return;
        if (res.status === 304) return;
        if (!res.ok) return;
        etagRef.current = res.headers.get("etag");
        const next = (await res.json()) as Snapshot;
        const cur = currentRef.current;
        if (!cur) {
          apply(next);
          return;
        }
        if (next.contentVersion === cur.contentVersion) {
          // Same content; epoch / message window changed — apply now.
          apply(next);
          return;
        }
        // New content: stage it, but let live-critical timing flow through
        // immediately (a message must fire even if images are still coming).
        pendingRef.current = next;
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

    // Activation check: swap pending at the first boundary ≥ activateAt.
    const activateTimer = setInterval(() => {
      const pending = pendingRef.current;
      const cur = currentRef.current;
      if (!pending) return;
      const epoch = cur?.loopEpoch ?? pending.loopEpoch;
      const t = clock.now();
      if (t >= boundaryAtOrAfter(pending.activateAt, epoch)) {
        pendingRef.current = null;
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
