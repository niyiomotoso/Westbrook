import { describe, expect, it } from "vitest";
import {
  MAX_DURATION_MS,
  MIN_DURATION_MS,
  WINDOW_GAP_MS,
  clampDurationMs,
  needsGuestName,
  overlaps,
  paddedWindow,
} from "../message-logic";

describe("clampDurationMs (R22: 8-30s)", () => {
  it("clamps the boundaries and passes the range through", () => {
    expect(clampDurationMs(12)).toBe(12_000);
    expect(clampDurationMs(8)).toBe(MIN_DURATION_MS);
    expect(clampDurationMs(7)).toBe(MIN_DURATION_MS);
    expect(clampDurationMs(30)).toBe(MAX_DURATION_MS);
    expect(clampDurationMs(31)).toBe(MAX_DURATION_MS);
    expect(clampDurationMs(0)).toBe(MIN_DURATION_MS);
  });

  it("falls back to 12s on garbage input", () => {
    expect(clampDurationMs(undefined)).toBe(12_000);
    expect(clampDurationMs("abc")).toBe(12_000);
    expect(clampDurationMs(NaN)).toBe(12_000);
  });
});

describe("needsGuestName", () => {
  it("requires a name only when the template uses {name}", () => {
    expect(needsGuestName("Welcome back, {name}.", "")).toBe(true);
    expect(needsGuestName("Welcome back, {name}.", "Mr Okafor")).toBe(false);
    expect(needsGuestName("Happy holidays to all our guests.", "")).toBe(false);
  });
});

describe("paddedWindow + overlaps (the back-to-back lead guard)", () => {
  it("rejects a schedule starting within the gap after another window", () => {
    const existing = { startAt: 100_000, durationMs: 12_000 }; // ends 112s
    const tooClose = paddedWindow(existing.startAt + 12_000 + 30_000, 12_000);
    expect(overlaps(tooClose, existing)).toBe(true); // 30s gap < 45s → reject
    const farEnough = paddedWindow(existing.startAt + 12_000 + 46_000, 12_000);
    expect(overlaps(farEnough, existing)).toBe(false);
  });

  it("still rejects plain overlaps", () => {
    const existing = { startAt: 100_000, durationMs: 12_000 };
    expect(overlaps(paddedWindow(105_000, 12_000), existing)).toBe(true);
  });
});
