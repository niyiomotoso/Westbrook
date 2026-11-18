import { contentTypeForKey } from "@/server/media";
import { getEnv } from "@/server/db";
import { checkRateLimit, tooManyRequests } from "@/server/rate-limit";

export const dynamic = "force-dynamic";

const KEY_RE = /^[a-f0-9]{16,64}\.(jpg|png|svg)$/;

/**
 * Serves KV media under content-hashed immutable URLs (R28). Each tablet
 * fetches each image once; the SW cache makes repeats local.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const env = getEnv();
  if (!(await checkRateLimit(env.PUBLIC_RL, request))) {
    return tooManyRequests();
  }
  const { key } = await params;
  if (!KEY_RE.test(key)) return new Response("not found", { status: 404 });

  const body = await env.MEDIA.get(key, "arrayBuffer");
  if (!body) return new Response("not found", { status: 404 });

  return new Response(body, {
    headers: {
      "Content-Type": contentTypeForKey(key),
      "Cache-Control": "public, max-age=31536000, immutable",
      // SVG is only ever rendered via <img>, but belt-and-braces:
      "Content-Security-Policy": "script-src 'none'",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
