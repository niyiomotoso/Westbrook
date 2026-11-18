import { describe, expect, it } from "vitest";
import {
  clearSessionCookie,
  passwordMatches,
  sessionCookie,
  signSession,
  verifySession,
} from "../auth";

const SECRET = "test-secret";

describe("session tokens", () => {
  it("round-trips a valid session", async () => {
    const now = 1_000_000;
    const token = await signSession(SECRET, { iat: now, exp: now + 1000 });
    const payload = await verifySession(SECRET, token, now + 500);
    expect(payload?.iat).toBe(now);
  });

  it("rejects an expired session", async () => {
    const token = await signSession(SECRET, { iat: 0, exp: 1000 });
    expect(await verifySession(SECRET, token, 1000)).toBeNull();
  });

  it("rejects a tampered payload and a wrong secret", async () => {
    const token = await signSession(SECRET, {
      iat: 0,
      exp: Number.MAX_SAFE_INTEGER,
    });
    const [body, mac] = token.split(".");
    const forged = `${body.slice(0, -2)}xx.${mac}`;
    expect(await verifySession(SECRET, forged, 1)).toBeNull();
    expect(await verifySession("other-secret", token, 1)).toBeNull();
    expect(await verifySession(SECRET, "garbage", 1)).toBeNull();
    expect(await verifySession(SECRET, "", 1)).toBeNull();
  });
});

describe("passwordMatches", () => {
  it("accepts the exact password and rejects everything else", async () => {
    expect(await passwordMatches("hunter2hunter2", "hunter2hunter2")).toBe(true);
    expect(await passwordMatches("hunter2hunter3", "hunter2hunter2")).toBe(false);
    expect(await passwordMatches("", "hunter2hunter2")).toBe(false);
  });
});

describe("cookies", () => {
  it("sets the hardened flags", () => {
    const c = sessionCookie("tok");
    expect(c).toContain("HttpOnly");
    expect(c).toContain("Secure");
    expect(c).toContain("SameSite=Lax");
    expect(c).toContain("Path=/");
    expect(clearSessionCookie()).toContain("Max-Age=0");
  });
});
