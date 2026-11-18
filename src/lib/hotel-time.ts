/**
 * Timezone-aware helpers built on Intl (available in browsers and workerd).
 * All take a corrected-epoch `t` and an IANA timezone.
 */

export interface LocalParts {
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number;
}

const partsCache = new Map<string, Intl.DateTimeFormat>();

function formatter(timezone: string): Intl.DateTimeFormat {
  let f = partsCache.get(timezone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    });
    partsCache.set(timezone, f);
  }
  return f;
}

export function localParts(t: number, timezone: string): LocalParts {
  const parts = formatter(timezone).formatToParts(new Date(t));
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  // Intl can report hour 24 for midnight with hour12:false in some engines
  const hour = get("hour") % 24;
  return { month: get("month"), day: get("day"), hour, minute: get("minute") };
}

/** "7:50 PM" — the reference time-card format (no leading zero, AM/PM). */
export function formatCityTime(t: number, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(t));
}

/** Daytime is 06:00–17:59 in that city (brief §5): gold dot vs grey. */
export function isDaytime(t: number, timezone: string): boolean {
  const { hour } = localParts(t, timezone);
  return hour >= 6 && hour < 18;
}
