/**
 * Pure message-window logic shared by the server (snapshot building,
 * admin validation) and tests. Times are epoch ms.
 */

export interface MessageWindow {
  startAt: number;
  durationMs: number;
  canceled?: number | boolean;
}

export const MESSAGE_VISIBILITY_MS = 60_000;

export function isLive(m: MessageWindow, now: number): boolean {
  return !m.canceled && m.startAt <= now && now < m.startAt + m.durationMs;
}

export function isImminent(m: MessageWindow, now: number): boolean {
  return (
    !m.canceled && m.startAt > now && m.startAt - now <= MESSAGE_VISIBILITY_MS
  );
}

/** The one message the public snapshot carries (earliest qualifying). */
export function pickVisibleMessage<T extends MessageWindow>(
  all: T[],
  now: number,
): T | null {
  const sorted = [...all].sort((a, b) => a.startAt - b.startAt);
  for (const m of sorted) {
    if (isLive(m, now) || isImminent(m, now)) return m;
  }
  return null;
}

/** Epoch advanced by every message window that has fully ended (R10). */
export function computeEffectiveEpoch(
  stored: number,
  all: MessageWindow[],
  now: number,
): number {
  let epoch = stored;
  for (const m of all) {
    if (m.canceled) continue;
    const end = m.startAt + m.durationMs;
    if (end <= now && end > epoch) epoch = end;
  }
  return epoch;
}

/** Overlap check for scheduling (R22): [start, end) intervals. */
export function overlaps(
  a: MessageWindow,
  b: MessageWindow,
): boolean {
  const aEnd = a.startAt + a.durationMs;
  const bEnd = b.startAt + b.durationMs;
  return a.startAt < bEnd && b.startAt < aEnd;
}

export const MIN_DURATION_MS = 8_000;
export const MAX_DURATION_MS = 30_000;
/** Back-to-back windows starve the second message's poll lead. */
export const WINDOW_GAP_MS = 45_000;

/** R22: duration clamped to 8–30s; invalid input falls back to 12s. */
export function clampDurationMs(seconds: unknown): number {
  const n = Number(seconds ?? 12);
  const safe = Number.isFinite(n) ? n : 12;
  return Math.round(
    Math.min(MAX_DURATION_MS, Math.max(MIN_DURATION_MS, safe * 1000)),
  );
}

/** A {name} template posted without a name renders a dangling comma. */
export function needsGuestName(text: string, name: string): boolean {
  return text.includes("{name}") && !name;
}

/** The padded window used for overlap checks (gap on both sides). */
export function paddedWindow(startAt: number, durationMs: number): MessageWindow {
  return {
    startAt: startAt - WINDOW_GAP_MS,
    durationMs: durationMs + 2 * WINDOW_GAP_MS,
  };
}
