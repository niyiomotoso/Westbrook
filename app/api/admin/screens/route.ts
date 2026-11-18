import { screens } from "@/db/schema";
import { requireSession } from "@/server/auth-guard";
import { getDb } from "@/server/db";

export const dynamic = "force-dynamic";

/**
 * Screen-health telemetry as JSON (agent-native parity finding): the same
 * rows the Screens page and banner render, so a script can check wall
 * health before acting.
 */
export async function GET() {
  const denied = await requireSession();
  if (denied) return denied;
  const rows = await getDb().select().from(screens).all();
  const now = Date.now();
  return Response.json({
    now,
    screens: rows.map((r) => ({
      key: r.key,
      position: r.position,
      lastSeen: r.lastSeen,
      silentForMs: now - r.lastSeen,
      buildId: r.buildId,
    })),
  });
}
