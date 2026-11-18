import { describe, expect, it } from "vitest";
import {
  NIGHTLY_MIN_GAP_MS,
  STALL_MS,
  isStalled,
  shouldNightlyReload,
} from "../../player/watchdog";

describe("isStalled", () => {
  it("fires only after a 30s frame gap (R16)", () => {
    expect(isStalled(0, STALL_MS)).toBe(false);
    expect(isStalled(0, STALL_MS + 1)).toBe(true);
    expect(isStalled(1000, 1000 + STALL_MS + 1)).toBe(true);
    expect(isStalled(1000, 1000)).toBe(false);
  });
});

describe("shouldNightlyReload", () => {
  const DAY = 24 * 60 * 60 * 1000;

  it("reloads at 04:00 hotel time when the last reload is old", () => {
    expect(shouldNightlyReload(4, 0, DAY)).toBe(true);
  });

  it("never reloads outside the 4am hour", () => {
    for (const h of [0, 3, 5, 12, 23]) {
      expect(shouldNightlyReload(h, 0, DAY)).toBe(false);
    }
  });

  it("fires at most once per 20 hours (the whole 4am hour must not loop)", () => {
    const justReloaded = DAY;
    expect(shouldNightlyReload(4, justReloaded, justReloaded + 15_000)).toBe(false);
    expect(
      shouldNightlyReload(4, justReloaded, justReloaded + NIGHTLY_MIN_GAP_MS + 1),
    ).toBe(true);
  });
});
