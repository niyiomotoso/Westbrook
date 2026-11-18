import { describe, expect, it } from "vitest";
import {
  SLOT_MS,
  boundaryAtOrAfter,
  cityIndexAt,
  floorMod,
  reviewIndexAt,
  slideIndexAt,
  slotAt,
  slotPhaseAt,
} from "../loop-math";

describe("floorMod", () => {
  it("wraps negatives into [0, n)", () => {
    expect(floorMod(-1, 11)).toBe(10);
    expect(floorMod(-12, 11)).toBe(10);
    expect(floorMod(0, 11)).toBe(0);
    expect(floorMod(23, 11)).toBe(1);
  });
});

describe("slotAt", () => {
  it("advances exactly at the 8000ms boundary", () => {
    const E = 1_000_000;
    expect(slotAt(E, E)).toBe(0);
    expect(slotAt(E + SLOT_MS - 1, E)).toBe(0);
    expect(slotAt(E + SLOT_MS, E)).toBe(1);
    expect(slotAt(E + SLOT_MS + 1, E)).toBe(1);
  });

  it("clamps t < epoch to slot 0 (Welcome), never negative", () => {
    const E = 1_000_000;
    expect(slotAt(E - 1, E)).toBe(0);
    expect(slotAt(E - 50 * SLOT_MS, E)).toBe(0);
  });
});

describe("slideIndexAt", () => {
  it("three positions at the same instant show consecutive slides", () => {
    const E = 0;
    const t = 5 * SLOT_MS + 123;
    const n = 11;
    const left = slideIndexAt(t, E, 0, n);
    const mid = slideIndexAt(t, E, 1, n);
    const right = slideIndexAt(t, E, 2, n);
    expect(mid).toBe((left + 1) % n);
    expect(right).toBe((left + 2) % n);
  });

  it("a slide travels right-to-left: left shows at slot s what right showed at s-2", () => {
    const E = 0;
    const n = 7;
    const s = 10;
    expect(slideIndexAt(s * SLOT_MS, E, 2, n)).toBe(
      slideIndexAt((s + 2) * SLOT_MS, E, 0, n),
    );
  });

  it("handles n=2 (only Welcome and Good to know) without crashing", () => {
    expect(slideIndexAt(3 * SLOT_MS, 0, 2, 2)).toBe(1);
  });
});

describe("reviewIndexAt", () => {
  function reviewsSeenBy(
    position: number,
    n: number,
    r: number,
    passes: number,
  ): number[] {
    // The reviews page occupies one index k in the active list; a screen at
    // `position` shows it when (slot + position) mod n === k. Collect the
    // review index shown at each such appearance across `passes` loop passes.
    const k = n - 2; // arbitrary slide position for the reviews page
    const seen: number[] = [];
    for (let slot = 0; slot < n * passes; slot++) {
      if (floorMod(slot + position, n) === k) {
        seen.push(reviewIndexAt(slot * SLOT_MS, 0, position, n, r));
      }
    }
    return seen;
  }

  it("advances exactly once per loop pass (N=10, R=5 — old freeze class R|N)", () => {
    const seen = reviewsSeenBy(1, 10, 5, 10);
    expect(new Set(seen).size).toBe(5);
    for (let i = 1; i < seen.length; i++) {
      expect(seen[i]).toBe((seen[i - 1] + 1) % 5);
    }
  });

  it("advances for N=9, R=5 (freeze class R|N+1 of the per-step variant)", () => {
    const seen = reviewsSeenBy(0, 9, 5, 10);
    expect(new Set(seen).size).toBe(5);
  });

  it("cycles through every review for all three positions", () => {
    for (const p of [0, 1, 2]) {
      const seen = reviewsSeenBy(p, 11, 3, 6);
      expect(new Set(seen).size).toBe(3);
    }
  });

  it("stays at 0 with a single review", () => {
    expect(reviewIndexAt(123 * SLOT_MS, 0, 1, 10, 1)).toBe(0);
  });
});

describe("boundaryAtOrAfter", () => {
  it("returns the next boundary, or the instant itself on a boundary", () => {
    const E = 1000;
    expect(boundaryAtOrAfter(E, E)).toBe(E);
    expect(boundaryAtOrAfter(E + 1, E)).toBe(E + SLOT_MS);
    expect(boundaryAtOrAfter(E + SLOT_MS, E)).toBe(E + SLOT_MS);
    expect(boundaryAtOrAfter(E - 500, E)).toBe(E);
  });
});

describe("slotPhaseAt", () => {
  it("is 0 at a boundary and SLOT_MS-1 just before the next", () => {
    const E = 0;
    expect(slotPhaseAt(E, E)).toBe(0);
    expect(slotPhaseAt(E + SLOT_MS - 1, E)).toBe(SLOT_MS - 1);
    expect(slotPhaseAt(E + SLOT_MS, E)).toBe(0);
  });
});

describe("cityIndexAt", () => {
  it("rotates every 6 seconds over the city count", () => {
    expect(cityIndexAt(0, 5)).toBe(0);
    expect(cityIndexAt(5999, 5)).toBe(0);
    expect(cityIndexAt(6000, 5)).toBe(1);
    expect(cityIndexAt(5 * 6000, 5)).toBe(0);
  });
});
