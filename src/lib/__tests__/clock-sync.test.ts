import { describe, expect, it } from "vitest";
import {
  CorrectedClock,
  SLEW_DURATION_MS,
  collectSamples,
  combineSamples,
  estimateFromSample,
  type TimeSample,
} from "../clock-sync";

function sample(
  sentAt: number,
  rtt: number,
  serverNow: number,
  clientDateNow = 0,
): TimeSample {
  return { sentAt, receivedAt: sentAt + rtt, serverNow, clientDateNow };
}

describe("estimateFromSample", () => {
  it("computes offset with symmetric-RTT assumption", () => {
    // client perf 100 → 140 (rtt 40); server said 1_000_000 mid-flight.
    const est = estimateFromSample(sample(100, 40, 1_000_000));
    // server at receive ≈ 1_000_000 + 20; perf at receive = 140
    expect(est.perfOffset).toBe(1_000_020 - 140);
    expect(est.rtt).toBe(40);
  });
});

describe("combineSamples", () => {
  it("uses the median, so one huge-RTT outlier cannot skew it", () => {
    const truthOffset = 500_000;
    const good = [10, 20, 30, 40].map((rtt, i) => {
      const sentAt = 1000 * i;
      const receivedAt = sentAt + rtt;
      return sample(sentAt, rtt, truthOffset + receivedAt - rtt / 2);
    });
    // Outlier: wildly asymmetric 5s round trip skews its estimate by ~2.4s
    const outlier = sample(9000, 5000, truthOffset + 9000 + 100);
    const est = combineSamples([...good, outlier]);
    expect(Math.abs(est.perfOffset - truthOffset)).toBeLessThan(5);
  });

  it("throws on empty input", () => {
    expect(() => combineSamples([])).toThrow();
  });
});

describe("CorrectedClock", () => {
  it("reports corrected time from the applied offset", () => {
    let perf = 1000;
    const clock = new CorrectedClock(() => perf);
    clock.snap(2_000_000);
    expect(clock.now()).toBe(1000 + 2_000_000);
    perf = 1500;
    expect(clock.now()).toBe(1500 + 2_000_000);
  });

  it("slews small corrections instead of jumping", () => {
    let perf = 0;
    const clock = new CorrectedClock(() => perf);
    clock.snap(1_000_000);
    const result = clock.apply(1_000_100); // +100ms: below threshold
    expect(result).toBe("slewing");
    // immediately after: still near the old offset
    expect(clock.now() - (perf + 1_000_000)).toBeLessThan(10);
    // after the slew window: fully at the new offset
    perf = SLEW_DURATION_MS + 1;
    expect(clock.now()).toBe(perf + 1_000_100);
  });

  it("requests a snap for large corrections and does not apply them", () => {
    const clock = new CorrectedClock(() => 0);
    clock.snap(1_000_000);
    const result = clock.apply(1_005_000); // +5s
    expect(result).toBe("snap-requested");
    expect(clock.now()).toBe(1_000_000);
    clock.snap(1_005_000);
    expect(clock.now()).toBe(1_005_000);
  });
});

describe("collectSamples", () => {
  it("keeps the previous behavior on total failure: throws", async () => {
    const failingFetch = async () => {
      throw new Error("offline");
    };
    await expect(
      collectSamples(failingFetch as never, 3),
    ).rejects.toThrow(/no samples/);
  });

  it("survives partial failures", async () => {
    let call = 0;
    const flakyFetch = async () => {
      call++;
      if (call % 2 === 0) throw new Error("drop");
      return new Response(JSON.stringify({ now: 42 }), { status: 200 });
    };
    const samples = await collectSamples(
      flakyFetch as never,
      4,
      () => 0,
      () => 0,
    );
    expect(samples.length).toBe(2);
    expect(samples[0].serverNow).toBe(42);
  });
});
