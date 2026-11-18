import { describe, expect, it } from "vitest";
import {
  computeEffectiveEpoch,
  overlaps,
  pickVisibleMessage,
} from "../message-logic";

const MIN = 60_000;

describe("pickVisibleMessage", () => {
  it("carries a live message", () => {
    const m = { startAt: 1000, durationMs: 12_000, id: "a" };
    expect(pickVisibleMessage([m], 5000)?.id).toBe("a");
  });

  it("includes a scheduled message only within 60s of start (privacy gate)", () => {
    const m = { startAt: 10 * MIN, durationMs: 12_000, id: "a" };
    expect(pickVisibleMessage([m], 0)).toBeNull(); // 10 minutes out — hidden
    expect(pickVisibleMessage([m], 9 * MIN)?.id).toBe("a"); // 60s out — visible
  });

  it("skips canceled and fully-ended messages", () => {
    const ended = { startAt: 0, durationMs: 1000, id: "ended" };
    const canceled = {
      startAt: 5000,
      durationMs: 1000,
      id: "c",
      canceled: 1,
    };
    expect(pickVisibleMessage([ended, canceled], 4950)).toBeNull();
  });

  it("prefers the earliest qualifying window", () => {
    const a = { startAt: 2000, durationMs: 8000, id: "a" };
    const b = { startAt: 30_000, durationMs: 8000, id: "b" };
    expect(pickVisibleMessage([b, a], 2500)?.id).toBe("a");
  });
});

describe("computeEffectiveEpoch", () => {
  it("advances to the latest ended message end", () => {
    const msgs = [
      { startAt: 1000, durationMs: 1000 }, // end 2000
      { startAt: 5000, durationMs: 2000 }, // end 7000
    ];
    expect(computeEffectiveEpoch(0, msgs, 10_000)).toBe(7000);
  });

  it("ignores live, future, and canceled windows", () => {
    const msgs = [
      { startAt: 5000, durationMs: 10_000 }, // live at t=6000
      { startAt: 50_000, durationMs: 1000 }, // future
      { startAt: 100, durationMs: 100, canceled: 1 },
    ];
    expect(computeEffectiveEpoch(42, msgs, 6000)).toBe(42);
  });

  it("never moves the epoch backwards", () => {
    expect(
      computeEffectiveEpoch(9999, [{ startAt: 0, durationMs: 100 }], 5000),
    ).toBe(9999);
  });
});

describe("overlaps", () => {
  it("detects overlapping windows and allows adjacent ones", () => {
    const a = { startAt: 0, durationMs: 10_000 };
    expect(overlaps(a, { startAt: 5000, durationMs: 10_000 })).toBe(true);
    expect(overlaps(a, { startAt: 10_000, durationMs: 10_000 })).toBe(false);
    expect(overlaps({ startAt: 5000, durationMs: 1000 }, a)).toBe(true);
  });
});
