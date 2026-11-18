import { screens } from "@/db/schema";
import { getDb, getEnv } from "@/server/db";
import { checkRateLimit, tooManyRequests } from "@/server/rate-limit";

export const dynamic = "force-dynamic";

const KEY_RE = /^[a-z0-9][a-z0-9-]{3,63}$/i;

/**
 * Players report position + screen key every 60s. Feeds the back-office
 * screens strip (R24): duplicate-position and silent-screen warnings.
 * Malformed input → 400, never a 5xx.
 */
export async function POST(request: Request) {
  const env = getEnv();
  if (!(await checkRateLimit(env.PUBLIC_RL, request))) {
    return tooManyRequests();
  }

  let body: { key?: unknown; position?: unknown; buildId?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return new Response("bad request", { status: 400 });
  }

  const key = typeof body.key === "string" ? body.key : "";
  const position = Number(body.position);
  const buildId =
    typeof body.buildId === "string" ? body.buildId.slice(0, 64) : null;
  if (!KEY_RE.test(key) || ![0, 1, 2].includes(position)) {
    return new Response("bad request", { status: 400 });
  }

  const db = getDb();
  await db
    .insert(screens)
    .values({ key, position, lastSeen: Date.now(), buildId })
    .onConflictDoUpdate({
      target: screens.key,
      set: { position, lastSeen: Date.now(), buildId },
    });

  return new Response(null, { status: 204 });
}
