import type { Season } from "@/lib/season";

/* Seasonal chrome, verbatim from the reference figures. */

const GARLAND_COLORS = ["#c0392b", "#e6c06f", "#2f8f5b"];

// Exact flake positions from the reference Christmas figure.
const SNOWFLAKES: { left: string; top: number; size: number }[] = [
  { left: "58%", top: 60, size: 4 },
  { left: "61%", top: 110, size: 3 },
  { left: "92%", top: 80, size: 5 },
  { left: "28%", top: 150, size: 3 },
  { left: "45%", top: 100, size: 4 },
  { left: "62%", top: 140, size: 3 },
];

const TRI_COLORS = ["#0b7a3e", "#fff", "#0b7a3e"];

/**
 * Garland + snow (Christmas) or tricolour stripe (Independence Day).
 * Hidden during messages; the theme tint is per-slide, not here.
 */
export function SeasonDecor({ season }: { season: Season }) {
  if (season === "xmas") {
    return (
      <>
        <div className="garland">
          {Array.from({ length: 30 }, (_, i) => (
            <i key={i} style={{ background: GARLAND_COLORS[i % 3] }} />
          ))}
        </div>
        {SNOWFLAKES.map((f, i) => (
          <i
            key={i}
            className="snow"
            style={{
              left: f.left,
              top: f.top,
              width: f.size,
              height: f.size,
            }}
          />
        ))}
      </>
    );
  }
  if (season === "indep") {
    return (
      <div className="tri">
        {TRI_COLORS.map((c, i) => (
          <i key={i} style={{ background: c }} />
        ))}
      </div>
    );
  }
  return null;
}
