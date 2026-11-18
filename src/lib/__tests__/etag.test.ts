import { describe, expect, it } from "vitest";
import { composeEtag, normalizeEtag } from "../etag";

describe("composeEtag", () => {
  const msg = { id: "m1", startAt: 123 };

  it("changes when ONLY the buildId changes (the deploy-propagation P1)", () => {
    const a = composeEtag(1, 0, null, "aaaa");
    const b = composeEtag(1, 0, null, "bbbb");
    expect(a).not.toBe(b);
  });

  it("changes with version, epoch, and message window", () => {
    const base = composeEtag(1, 0, null, "x");
    expect(composeEtag(2, 0, null, "x")).not.toBe(base);
    expect(composeEtag(1, 999, null, "x")).not.toBe(base);
    expect(composeEtag(1, 0, msg, "x")).not.toBe(base);
    expect(composeEtag(1, 0, { ...msg, startAt: 456 }, "x")).not.toBe(
      composeEtag(1, 0, msg, "x"),
    );
  });

  it("is a quoted strong ETag", () => {
    expect(composeEtag(1, 0, null, "x")).toMatch(/^".+"$/);
  });
});

describe("normalizeEtag", () => {
  it("strips Cloudflare's weak prefix and passes strong tags through", () => {
    expect(normalizeEtag('W/"v1.0.none.x"')).toBe('"v1.0.none.x"');
    expect(normalizeEtag('"v1.0.none.x"')).toBe('"v1.0.none.x"');
    expect(normalizeEtag(null)).toBeNull();
  });
});
