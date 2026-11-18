"use client";

/**
 * The player engine: a requestAnimationFrame loop that derives everything
 * from (t, E, snapshot, position) — the stateless render invariant
 * (docs/SYNC_MODEL.md). No setInterval ever drives visuals.
 */

import { useEffect, useState } from "react";
import {
  FADE_MS,
  SLOT_MS,
  cityIndexAt,
  floorMod,
  slotAt,
  slotPhaseAt,
} from "@/lib/loop-math";
import { buildActiveSlides, type Slide } from "@/lib/active-slides";
import { greetingFor } from "@/lib/greeting";
import { localParts } from "@/lib/hotel-time";
import { seasonFor, type Season } from "@/lib/season";
import type { MessageContent, Snapshot } from "@/lib/snapshot-types";
import type { WallClock } from "./wall-clock";

export interface EngineState {
  ready: boolean;
  t: number;
  slideIndex: number;
  incomingIndex: number;
  /** opacity of the incoming layer, 0 outside the cross-fade */
  incomingOpacity: number;
  reviewIndex: number;
  incomingReviewIndex: number;
  cityIndex: number;
  greeting: string;
  season: Season;
  activeSlides: Slide[];
  /** non-null while a message window is live (R10) */
  message: MessageContent | null;
}

function reviewIndexForSlot(
  slot: number,
  position: number,
  n: number,
  r: number,
): number {
  if (r <= 0 || n <= 0) return 0;
  return floorMod(Math.floor((slot + position) / n), r);
}

/**
 * Message mode and the effective epoch are derived, not event-driven: the
 * window is live when startAt <= t < startAt+duration, and after it ends
 * the local epoch is the message end until the next poll confirms it.
 */
export function deriveMessageState(
  snapshot: Snapshot,
  t: number,
): { message: MessageContent | null; epoch: number } {
  const m = snapshot.message;
  if (!m) return { message: null, epoch: snapshot.loopEpoch };
  const end = m.startAt + m.durationMs;
  if (t >= m.startAt && t < end) return { message: m, epoch: snapshot.loopEpoch };
  if (t >= end && end > snapshot.loopEpoch) return { message: null, epoch: end };
  return { message: null, epoch: snapshot.loopEpoch };
}

export function usePlayerEngine(
  snapshot: Snapshot,
  position: number,
  clock: WallClock,
  seasonOverride?: Season,
): EngineState {
  const [state, setState] = useState<EngineState>(() => ({
    ready: false,
    t: 0,
    slideIndex: 0,
    incomingIndex: 0,
    incomingOpacity: 0,
    reviewIndex: 0,
    incomingReviewIndex: 0,
    cityIndex: 0,
    greeting: "Good evening",
    season: seasonOverride ?? "none",
    activeSlides: buildActiveSlides(snapshot),
    message: null,
  }));

  useEffect(() => {
    let raf = 0;
    let lastKey = "";
    const activeSlides = buildActiveSlides(snapshot);
    const n = activeSlides.length;
    const r = snapshot.reviews.length;

    function frame() {
      const corrected = clock.clockRef.current;
      if (corrected && corrected.ready) {
        const tRaw = corrected.now();
        const { message, epoch } = deriveMessageState(snapshot, tRaw);
        const slot = slotAt(tRaw, epoch);
        const phase = slotPhaseAt(tRaw, epoch);

        // Large clock corrections snap only at a boundary (SYNC_MODEL).
        if (clock.pendingSnapRef.current !== null && phase < 120) {
          corrected.snap(clock.pendingSnapRef.current);
          clock.pendingSnapRef.current = null;
        }

        const t = corrected.now();
        const slideIndex = floorMod(slot + position, n);
        const incomingIndex = floorMod(slot + 1 + position, n);
        const remaining = SLOT_MS - phase;
        const fade = remaining < FADE_MS ? 1 - remaining / FADE_MS : 0;
        const incomingOpacity = Math.round(fade * 50) / 50;

        const hotel = localParts(t, snapshot.settings.timezone);
        const season =
          seasonOverride ??
          seasonFor(hotel.month, hotel.day, snapshot.settings.seasons);

        const next: EngineState = {
          ready: true,
          t,
          slideIndex,
          incomingIndex,
          incomingOpacity,
          reviewIndex: reviewIndexForSlot(slot, position, n, r),
          incomingReviewIndex: reviewIndexForSlot(slot + 1, position, n, r),
          cityIndex: cityIndexAt(t, snapshot.settings.cities.length),
          greeting: greetingFor(hotel.hour, season),
          season,
          activeSlides,
          message,
        };

        const key = [
          next.slideIndex,
          next.incomingOpacity,
          next.cityIndex,
          next.greeting,
          next.season,
          next.message?.id ?? "",
          Math.floor(t / 1000),
        ].join("|");
        if (key !== lastKey) {
          lastKey = key;
          setState(next);
        }
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // clock is a stable facade of refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot, position, seasonOverride]);

  return state;
}
