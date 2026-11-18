/**
 * NTP-over-fetch clock sync. The corrected clock is anchored to
 * performance.now() (monotonic — immune to OS clock steps) and the latest
 * accepted offset is persisted relative to Date.now() so an offline reboot
 * can seed a best-effort clock from the device RTC. See docs/SYNC_MODEL.md.
 */

export const SAMPLE_COUNT = 5;
export const RESYNC_MS = 5 * 60 * 1000;
/** Corrections below this slew smoothly; at or above they snap at a boundary. */
export const SLEW_THRESHOLD_MS = 250;
export const SLEW_DURATION_MS = 3000;

export interface TimeSample {
  /** performance.now() just before the request */
  sentAt: number;
  /** performance.now() just after the response */
  receivedAt: number;
  /** server's Date.now() from the response body */
  serverNow: number;
  /** Date.now() captured at receivedAt (for persistence math) */
  clientDateNow: number;
}

export interface OffsetEstimate {
  /** serverEpochMs - clientPerfMs: corrected = performance.now() + offset */
  perfOffset: number;
  /** serverEpochMs - clientDateMs: persisted for offline boots */
  dateOffset: number;
  rtt: number;
}

/** One sample's estimate: server time at receive ≈ serverNow + rtt/2. */
export function estimateFromSample(s: TimeSample): OffsetEstimate {
  const rtt = s.receivedAt - s.sentAt;
  const serverAtReceive = s.serverNow + rtt / 2;
  return {
    perfOffset: serverAtReceive - s.receivedAt,
    dateOffset: serverAtReceive - s.clientDateNow,
    rtt,
  };
}

/** Median-by-offset across samples — robust to asymmetric-RTT outliers. */
export function combineSamples(samples: TimeSample[]): OffsetEstimate {
  if (samples.length === 0) throw new Error("no samples");
  const estimates = samples.map(estimateFromSample);
  const sorted = [...estimates].sort((a, b) => a.perfOffset - b.perfOffset);
  return sorted[Math.floor(sorted.length / 2)];
}

export interface PersistedOffset {
  dateOffset: number;
  savedAt: number;
}

export const OFFSET_STORAGE_KEY = "westbrook.clockOffset.v1";

/**
 * The corrected clock. All reads go through now(); corrections are applied
 * per the slew/snap policy by the caller (the engine owns boundary timing).
 */
export class CorrectedClock {
  private perfOffset: number | null = null;
  private slewFrom: number | null = null;
  private slewStartPerf = 0;

  constructor(private perfNow: () => number = () => performance.now()) {}

  /** True once any offset (synced or persisted) has been applied. */
  get ready(): boolean {
    return this.perfOffset !== null;
  }

  get currentPerfOffset(): number | null {
    return this.perfOffset;
  }

  /** Corrected server-epoch milliseconds. */
  now(): number {
    const p = this.perfNow();
    if (this.perfOffset === null) return Date.now();
    let offset = this.perfOffset;
    if (this.slewFrom !== null) {
      const elapsed = p - this.slewStartPerf;
      if (elapsed >= SLEW_DURATION_MS) {
        this.slewFrom = null;
      } else {
        const k = elapsed / SLEW_DURATION_MS;
        offset = this.slewFrom + (this.perfOffset - this.slewFrom) * k;
      }
    }
    return p + offset;
  }

  /**
   * Apply a new offset estimate. Small corrections slew over a few seconds
   * so guests never see a jump; large ones return "snap" so the engine can
   * apply them at an 8-second boundary instead.
   */
  apply(perfOffset: number): "applied" | "slewing" | "snap-requested" {
    if (this.perfOffset === null) {
      this.perfOffset = perfOffset;
      return "applied";
    }
    const delta = Math.abs(perfOffset - this.perfOffset);
    if (delta < SLEW_THRESHOLD_MS) {
      this.slewFrom = this.effectiveOffset();
      this.slewStartPerf = this.perfNow();
      this.perfOffset = perfOffset;
      return "slewing";
    }
    return "snap-requested";
  }

  /** Force-apply (used at boot and at boundary snaps). */
  snap(perfOffset: number): void {
    this.perfOffset = perfOffset;
    this.slewFrom = null;
  }

  private effectiveOffset(): number {
    if (this.perfOffset === null) return 0;
    if (this.slewFrom === null) return this.perfOffset;
    const elapsed = this.perfNow() - this.slewStartPerf;
    if (elapsed >= SLEW_DURATION_MS) return this.perfOffset;
    const k = elapsed / SLEW_DURATION_MS;
    return this.slewFrom + (this.perfOffset - this.slewFrom) * k;
  }
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

/** Collect SAMPLE_COUNT samples against /api/time. Throws if all fail. */
export async function collectSamples(
  fetchFn: FetchLike = fetch,
  count: number = SAMPLE_COUNT,
  perfNow: () => number = () => performance.now(),
  dateNow: () => number = () => Date.now(),
): Promise<TimeSample[]> {
  const samples: TimeSample[] = [];
  for (let i = 0; i < count; i++) {
    try {
      const sentAt = perfNow();
      const res = await fetchFn("/api/time", { cache: "no-store" });
      const receivedAt = perfNow();
      const clientDateNow = dateNow();
      if (!res.ok) continue;
      const body = (await res.json()) as { now: number };
      if (typeof body.now !== "number") continue;
      samples.push({ sentAt, receivedAt, serverNow: body.now, clientDateNow });
    } catch {
      // network error on this sample — keep going with the rest
    }
  }
  if (samples.length === 0) throw new Error("time sync failed: no samples");
  return samples;
}

/** Browser-side persistence of the latest Date.now()-relative offset. */
export function saveOffset(est: OffsetEstimate, dateNow = () => Date.now()) {
  try {
    const record: PersistedOffset = {
      dateOffset: est.dateOffset,
      savedAt: dateNow(),
    };
    localStorage.setItem(OFFSET_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // storage unavailable — persistence is best-effort
  }
}

/** Seed for an offline boot: corrected ≈ Date.now() + persisted dateOffset. */
export function loadPersistedOffset(): PersistedOffset | null {
  try {
    const raw = localStorage.getItem(OFFSET_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedOffset;
    if (typeof parsed.dateOffset !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}
