import { describe, expect, it } from "vitest";
import { checkRateLimit } from "../../server/rate-limit";

function req(ip?: string): Request {
  return new Request("https://wall.test/api/content", {
    headers: ip ? { "cf-connecting-ip": ip } : {},
  });
}

describe("checkRateLimit", () => {
  it("allows when the binding is absent (plain next dev)", async () => {
    expect(await checkRateLimit(undefined, req("1.2.3.4"))).toBe(true);
  });

  it("passes the client IP as the limit key and honors success", async () => {
    const seen: string[] = [];
    const binding = {
      limit: async ({ key }: { key: string }) => {
        seen.push(key);
        return { success: true };
      },
    };
    expect(await checkRateLimit(binding, req("41.58.0.7"))).toBe(true);
    expect(seen).toEqual(["41.58.0.7"]);
  });

  it("blocks when the binding reports failure", async () => {
    const binding = { limit: async () => ({ success: false }) };
    expect(await checkRateLimit(binding, req("1.1.1.1"))).toBe(false);
  });

  it("fails open when the binding throws (availability over strictness)", async () => {
    const binding = {
      limit: async () => {
        throw new Error("colo hiccup");
      },
    };
    expect(await checkRateLimit(binding, req("1.1.1.1"))).toBe(true);
  });

  it("falls back to 'unknown' with no IP headers", async () => {
    const seen: string[] = [];
    const binding = {
      limit: async ({ key }: { key: string }) => {
        seen.push(key);
        return { success: true };
      },
    };
    await checkRateLimit(binding, req());
    expect(seen).toEqual(["unknown"]);
  });
});
