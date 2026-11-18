import { screens } from "@/db/schema";
import { getDb } from "@/server/db";

const POSITION_NAMES = ["Left", "Middle", "Right"];
const SILENT_MS = 60_000;

/**
 * Persistent cross-page warning banner (R24): duplicate positions or a
 * screen silent for over a minute. Renders nothing when all is well.
 */
export async function ScreensBanner() {
  let rows: { key: string; position: number; lastSeen: number }[] = [];
  try {
    rows = await getDb().select().from(screens).all();
  } catch {
    return null;
  }
  if (rows.length === 0) return null;

  const now = Date.now();
  const warnings: string[] = [];

  const byPosition = new Map<number, number>();
  for (const r of rows) {
    byPosition.set(r.position, (byPosition.get(r.position) ?? 0) + 1);
  }
  for (const [pos, count] of byPosition) {
    if (count > 1) {
      warnings.push(
        `${count} screens are both set to “${POSITION_NAMES[pos] ?? pos}” — fix one in its setup screen.`,
      );
    }
  }
  for (const r of rows) {
    if (now - r.lastSeen > SILENT_MS) {
      const mins = Math.round((now - r.lastSeen) / 60_000);
      warnings.push(
        `The ${POSITION_NAMES[r.position] ?? r.position} screen (${r.key.slice(0, 8)}…) has been silent for ${mins} min.`,
      );
    }
  }

  if (warnings.length === 0) return null;
  return (
    <div className="ad-warn" role="alert">
      {warnings.map((w, i) => (
        <div key={i}>{w}</div>
      ))}
    </div>
  );
}
