import { buildSnapshot } from "@/server/content";
import { getDb, getEnv } from "@/server/db";
import { checkRateLimit, tooManyRequests } from "@/server/rate-limit";

export const dynamic = "force-dynamic";

/**
 * The poll contract: one idempotent full snapshot, ETag/304 short-circuit,
 * no-store (edge caching is inert on workers.dev; the 304 path is the
 * operative optimization). Public by design — everything in it shows in
 * the lobby; scheduled messages are gated in visibleMessage().
 */
export async function GET(request: Request) {
  const env = getEnv();
  if (!(await checkRateLimit(env.PUBLIC_RL, request))) {
    return tooManyRequests();
  }

  const db = getDb();
  const { snapshot, etag } = await buildSnapshot(db, Date.now());

  // Cloudflare may rewrite the ETag to its weak form (W/"...") on the way
  // out; normalize both sides or production 304s silently stop happening.
  const normalize = (v: string | null) =>
    v ? v.replace(/^W\//, "") : null;
  if (normalize(request.headers.get("if-none-match")) === etag) {
    return new Response(null, {
      status: 304,
      headers: { ETag: etag, "Cache-Control": "no-store" },
    });
  }

  return Response.json(snapshot, {
    headers: { ETag: etag, "Cache-Control": "no-store" },
  });
}
