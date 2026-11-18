/**
 * Snapshot ETag composition. The ETag must cover EVERYTHING that changes
 * what a player renders or does — content version, loop epoch, the visible
 * message window, and the deploy buildId. Review finding (P1): omitting
 * buildId made deploys invisible behind 304s, so the boundary-timed SW
 * update (R17) never fired until an unrelated content edit.
 */

export function composeEtag(
  version: number,
  epoch: number,
  message: { id: string; startAt: number } | null,
  buildId: string,
): string {
  const msg = message ? `${message.id}:${message.startAt}` : "none";
  return `"v${version}.${epoch}.${msg}.${buildId}"`;
}

/** Cloudflare may rewrite ETags to weak form (W/"..."); normalize both sides. */
export function normalizeEtag(value: string | null): string | null {
  return value ? value.replace(/^W\//, "") : null;
}
