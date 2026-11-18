import type { SeasonSettings } from "./snapshot-types";

export type Season = "none" | "xmas" | "indep";

function toMonthDay(s: string): { month: number; day: number } | null {
  const m = /^(\d{1,2})-(\d{1,2})$/.exec(s);
  if (!m) return null;
  return { month: Number(m[1]), day: Number(m[2]) };
}

function cmp(month: number, day: number, b: { month: number; day: number }) {
  return month * 100 + day - (b.month * 100 + b.day);
}

/**
 * Season for a hotel-local (month, day). Christmas may wrap the year end
 * (1 Dec – 6 Jan). On overlap, the single-day season (Independence Day)
 * wins — decided in the plan after flow analysis.
 */
export function seasonFor(
  month: number,
  day: number,
  settings: SeasonSettings,
): Season {
  if (settings.independenceEnabled) {
    const ind = toMonthDay(settings.independenceDay);
    if (ind && cmp(month, day, ind) === 0) return "indep";
  }
  if (settings.christmasEnabled) {
    const start = toMonthDay(settings.christmasStart);
    const end = toMonthDay(settings.christmasEnd);
    if (start && end) {
      const afterStart = cmp(month, day, start) >= 0;
      const beforeEnd = cmp(month, day, end) <= 0;
      const wraps = cmp(start.month, start.day, end) > 0; // e.g. 12-01 .. 01-06
      const inRange = wraps ? afterStart || beforeEnd : afterStart && beforeEnd;
      if (inRange) return "xmas";
    }
  }
  return "none";
}
