/**
 * Per-IP rate limiting via the free Workers Rate Limiting binding.
 * Best-effort (per-colo counting) — a brake against abuse of the hard
 * 100k req/day budget, not a security wall. Absent binding (plain
 * `next dev`) → allow.
 */
export async function checkRateLimit(
  binding: { limit(o: { key: string }): Promise<{ success: boolean }> } | undefined,
  request: Request,
): Promise<boolean> {
  if (!binding || typeof binding.limit !== "function") return true;
  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for") ??
    "unknown";
  try {
    const { success } = await binding.limit({ key: ip });
    return success;
  } catch {
    return true;
  }
}

export function tooManyRequests(): Response {
  return new Response("Too many requests", { status: 429 });
}
