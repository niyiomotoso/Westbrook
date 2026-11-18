import { describe, expect, it } from "vitest";
import { planCoverCrop, uploadWarnings } from "../client-resize";

describe("planCoverCrop", () => {
  it("caps a big portrait photo at 1080x1920 with a centered crop", () => {
    const p = planCoverCrop(3000, 4000);
    expect(p.outW).toBe(1080);
    expect(p.outH).toBe(1920);
    expect(p.sw / p.sh).toBeCloseTo(1080 / 1920, 2);
    expect(p.sx).toBe(Math.round((3000 - p.sw) / 2));
  });

  it("crops a landscape photo's sides to reach 9:16", () => {
    const p = planCoverCrop(4000, 3000);
    expect(p.sh).toBe(3000);
    expect(p.sw).toBe(Math.round(3000 * (1080 / 1920)));
    expect(p.outW).toBe(1080);
  });

  it("never upscales a small photo", () => {
    const p = planCoverCrop(540, 960);
    expect(p.outW).toBe(540);
    expect(p.outH).toBe(960);
  });
});

describe("uploadWarnings", () => {
  it("warns on landscape and on narrow sources, silently accepts good ones", () => {
    expect(uploadWarnings(4000, 3000).join(" ")).toMatch(/landscape/);
    expect(uploadWarnings(800, 1400).join(" ")).toMatch(/800px/);
    expect(uploadWarnings(1080, 1920)).toEqual([]);
    expect(uploadWarnings(2000, 3000)).toEqual([]);
  });
});
