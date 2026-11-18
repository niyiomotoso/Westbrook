import { describe, expect, it } from "vitest";
import { buildWifiQrPayload, escapeWifiField } from "../wifi-qr";

describe("wifi qr payload", () => {
  it("builds the plain payload", () => {
    expect(buildWifiQrPayload("WestBrook Guest", "welcome2026")).toBe(
      "WIFI:T:WPA;S:WestBrook Guest;P:welcome2026;;",
    );
  });

  it("escapes ; , : \" and backslash in SSID and password", () => {
    expect(escapeWifiField('pass;word,with:every"thing\\here')).toBe(
      'pass\\;word\\,with\\:every\\"thing\\\\here',
    );
    expect(buildWifiQrPayload("Hotel;Guest", "a:b,c")).toBe(
      "WIFI:T:WPA;S:Hotel\\;Guest;P:a\\:b\\,c;;",
    );
  });
});
