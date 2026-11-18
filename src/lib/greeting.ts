import type { Season } from "./season";

/**
 * Greeting by hotel local time (R9):
 * Good morning 05:00–11:59, Good afternoon 12:00–16:59,
 * Good evening 17:00–04:59. Seasonal themes replace it.
 */
export function greetingFor(hour: number, season: Season): string {
  if (season === "xmas") return "Merry Christmas";
  if (season === "indep") return "Happy Independence Day";
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  return "Good evening";
}
