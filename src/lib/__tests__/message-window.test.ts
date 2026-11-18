import { describe, expect, it } from "vitest";
import { deriveMessageState } from "../../player/engine";
import { sampleSnapshot } from "../../player/fixtures/sample-content";
import type { Snapshot } from "../snapshot-types";

function withMessage(startAt: number, durationMs: number): Snapshot {
  return {
    ...sampleSnapshot,
    loopEpoch: 1_000_000,
    message: {
      id: "m1",
      kicker: "Welcome back",
      name: "Mr Okafor",
      body: "It is a pleasure to have you with us again.",
      imageUrl: null,
      startAt,
      durationMs,
    },
  };
}

describe("deriveMessageState", () => {
  it("is loop mode before the window, with the snapshot epoch", () => {
    const snap = withMessage(2_000_000, 12_000);
    const s = deriveMessageState(snap, 1_500_000);
    expect(s.message).toBeNull();
    expect(s.epoch).toBe(1_000_000);
  });

  it("is message mode inside the window — including a boot mid-window", () => {
    const snap = withMessage(2_000_000, 12_000);
    expect(deriveMessageState(snap, 2_000_000).message?.id).toBe("m1");
    expect(deriveMessageState(snap, 2_006_000).message?.id).toBe("m1");
    expect(deriveMessageState(snap, 2_011_999).message?.id).toBe("m1");
  });

  it("after the window, the loop restarts from Welcome: epoch = message end", () => {
    const snap = withMessage(2_000_000, 12_000);
    const s = deriveMessageState(snap, 2_012_000);
    expect(s.message).toBeNull();
    expect(s.epoch).toBe(2_012_000);
  });

  it("an old message whose end predates the stored epoch never wins", () => {
    const snap = withMessage(500_000, 12_000); // ended before loopEpoch
    const s = deriveMessageState(snap, 1_500_000);
    expect(s.epoch).toBe(1_000_000);
  });

  it("no message → snapshot epoch", () => {
    const s = deriveMessageState(sampleSnapshot, 123);
    expect(s.message).toBeNull();
    expect(s.epoch).toBe(sampleSnapshot.loopEpoch);
  });
});
