import { describe, expect, it } from "vitest";
import { greetingFor } from "../greeting";
import { seasonFor } from "../season";
import type { SeasonSettings } from "../snapshot-types";

const defaults: SeasonSettings = {
  christmasStart: "12-01",
  christmasEnd: "01-06",
  christmasEnabled: true,
  independenceDay: "10-01",
  independenceEnabled: true,
};

describe("seasonFor", () => {
  it("Christmas wraps the year end: Jan 3 in, Jan 7 out, Dec 1 in, Nov 30 out", () => {
    expect(seasonFor(1, 3, defaults)).toBe("xmas");
    expect(seasonFor(1, 6, defaults)).toBe("xmas");
    expect(seasonFor(1, 7, defaults)).toBe("none");
    expect(seasonFor(12, 1, defaults)).toBe("xmas");
    expect(seasonFor(11, 30, defaults)).toBe("none");
    expect(seasonFor(12, 25, defaults)).toBe("xmas");
  });

  it("Independence Day fires on 1 October only", () => {
    expect(seasonFor(10, 1, defaults)).toBe("indep");
    expect(seasonFor(10, 2, defaults)).toBe("none");
    expect(seasonFor(9, 30, defaults)).toBe("none");
  });

  it("single-day season wins when ranges are edited to overlap", () => {
    const overlapping: SeasonSettings = {
      ...defaults,
      christmasStart: "09-15",
      christmasEnd: "10-15",
    };
    expect(seasonFor(10, 1, overlapping)).toBe("indep");
    expect(seasonFor(10, 2, overlapping)).toBe("xmas");
  });

  it("disabled switches turn a season off", () => {
    expect(
      seasonFor(12, 25, { ...defaults, christmasEnabled: false }),
    ).toBe("none");
    expect(
      seasonFor(10, 1, { ...defaults, independenceEnabled: false }),
    ).toBe("none");
  });

  it("a non-wrapping range behaves plainly", () => {
    const summer: SeasonSettings = {
      ...defaults,
      christmasStart: "06-01",
      christmasEnd: "06-30",
    };
    expect(seasonFor(6, 15, summer)).toBe("xmas");
    expect(seasonFor(7, 1, summer)).toBe("none");
  });
});

describe("greetingFor", () => {
  it("follows the brief's hour bands exactly (R9)", () => {
    expect(greetingFor(4, "none")).toBe("Good evening");
    expect(greetingFor(5, "none")).toBe("Good morning");
    expect(greetingFor(11, "none")).toBe("Good morning");
    expect(greetingFor(12, "none")).toBe("Good afternoon");
    expect(greetingFor(16, "none")).toBe("Good afternoon");
    expect(greetingFor(17, "none")).toBe("Good evening");
    expect(greetingFor(0, "none")).toBe("Good evening");
  });

  it("seasonal greetings replace the time-based one", () => {
    expect(greetingFor(9, "xmas")).toBe("Merry Christmas");
    expect(greetingFor(9, "indep")).toBe("Happy Independence Day");
  });
});
