/**
 * Pure loop math — the heart of the stateless render invariant.
 * Everything a screen shows is derived from (t, epoch, snapshot, position).
 * See docs/SYNC_MODEL.md.
 */

export const SLOT_MS = 8000;
export const CITY_MS = 6000;
export const FADE_MS = 600;

/** Floored modulo: result is always in [0, n) even for negative x. */
export function floorMod(x: number, n: number): number {
  return ((x % n) + n) % n;
}

/**
 * The global slot counter. t < epoch clamps to 0 (the Welcome slide):
 * a device whose corrected clock trails a freshly-reset epoch shows the
 * loop start rather than crashing on a negative index.
 */
export function slotAt(t: number, epoch: number): number {
  if (t < epoch) return 0;
  return Math.floor((t - epoch) / SLOT_MS);
}

/** Index into the active slide list for a screen at position 0|1|2. */
export function slideIndexAt(
  t: number,
  epoch: number,
  position: number,
  activeCount: number,
): number {
  if (activeCount <= 0) return 0;
  return floorMod(slotAt(t, epoch) + position, activeCount);
}

/**
 * Review rotation: advances by exactly one per loop pass and can never
 * freeze for any (N, R) — unlike `slot mod R` (freezes when R | N) or
 * `(slot + floor(slot/N)) mod R` (freezes when R | N+1).
 * One review sweeps across the wall per pass.
 */
export function reviewIndexAt(
  t: number,
  epoch: number,
  position: number,
  activeCount: number,
  reviewCount: number,
): number {
  if (reviewCount <= 0) return 0;
  if (activeCount <= 0) return 0;
  const slot = slotAt(t, epoch);
  return floorMod(Math.floor((slot + position) / activeCount), reviewCount);
}

/** Milliseconds into the current slot, in [0, SLOT_MS). */
export function slotPhaseAt(t: number, epoch: number): number {
  if (t < epoch) return 0;
  return floorMod(t - epoch, SLOT_MS);
}

/** Absolute time of the first slot boundary at or after `at`. */
export function boundaryAtOrAfter(at: number, epoch: number): number {
  if (at <= epoch) return epoch;
  return epoch + Math.ceil((at - epoch) / SLOT_MS) * SLOT_MS;
}

/** Time-card city index: 6-second rotation on absolute corrected time. */
export function cityIndexAt(t: number, cityCount: number): number {
  if (cityCount <= 0) return 0;
  return floorMod(Math.floor(t / CITY_MS), cityCount);
}
