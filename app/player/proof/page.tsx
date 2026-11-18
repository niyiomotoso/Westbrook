"use client";

/**
 * Phase 0 device-proof page (temporary — removed once the real player ships).
 * Shows a big global slot counter that flashes and cross-fades at every
 * 8-second boundary. Run on all three tablets side by side and film: they
 * must change within 0.3s of each other.
 */

import { useEffect, useRef, useState } from "react";
import {
  CorrectedClock,
  RESYNC_MS,
  collectSamples,
  combineSamples,
  loadPersistedOffset,
  saveOffset,
} from "@/lib/clock-sync";
import { FADE_MS, SLOT_MS } from "@/lib/loop-math";

export default function ProofPage() {
  const [slot, setSlot] = useState<number | null>(null);
  const [fade, setFade] = useState(1);
  const [diag, setDiag] = useState("syncing…");
  const clockRef = useRef<CorrectedClock | null>(null);

  useEffect(() => {
    const clock = new CorrectedClock();
    clockRef.current = clock;
    let stopped = false;
    let pendingSnap: number | null = null;

    async function sync(first: boolean) {
      try {
        const samples = await collectSamples();
        const est = combineSamples(samples);
        if (first || !clock.ready) {
          clock.snap(est.perfOffset);
        } else {
          const r = clock.apply(est.perfOffset);
          if (r === "snap-requested") pendingSnap = est.perfOffset;
        }
        saveOffset(est);
        setDiag(
          `offset ${est.dateOffset.toFixed(0)}ms vs device · rtt ${est.rtt.toFixed(0)}ms`,
        );
      } catch {
        if (first && !clock.ready) {
          const persisted = loadPersistedOffset();
          if (persisted) {
            clock.snap(persisted.dateOffset + Date.now() - performance.now());
            setDiag("offline — using persisted offset");
          } else {
            setDiag("offline — using device clock");
          }
        }
      }
    }

    void sync(true);
    const resync = setInterval(() => void sync(false), RESYNC_MS);

    let lastSlot = -1;
    function frame() {
      if (stopped) return;
      if (clock.ready) {
        const t = clock.now();
        const s = Math.floor(t / SLOT_MS); // epoch 0: absolute global slots
        const phase = t % SLOT_MS;
        if (s !== lastSlot) {
          if (pendingSnap !== null && phase < 100) {
            clock.snap(pendingSnap);
            pendingSnap = null;
          }
          lastSlot = s;
          setSlot(s);
        }
        // Cross-fade: ramp opacity down over the last FADE_MS of the slot,
        // snap back to 1 at the boundary — a visible, filmable pulse.
        const remaining = SLOT_MS - phase;
        setFade(remaining < FADE_MS ? remaining / FADE_MS : 1);
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    return () => {
      stopped = true;
      clearInterval(resync);
    };
  }, []);

  const flashing = fade < 1;
  return (
    <main
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: flashing ? "#1d2433" : "#121722",
        transition: "background 120ms",
        fontFamily: "'DM Sans', system-ui, sans-serif",
        color: "#f3ede2",
      }}
    >
      <div
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: "18vw",
          fontWeight: 600,
          lineHeight: 1,
          color: "#d6ab6a",
          opacity: slot === null ? 0.2 : fade,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {slot ?? "—"}
      </div>
      <div style={{ marginTop: 24, fontSize: 14, color: "#a2abbb" }}>
        {diag}
      </div>
      <div style={{ marginTop: 6, fontSize: 12, color: "#5b6676" }}>
        WestBrook sync proof · slot = floor(t / 8000)
      </div>
    </main>
  );
}
