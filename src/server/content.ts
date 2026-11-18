import { and, asc, eq, gt, isNull, lte } from "drizzle-orm";
import {
  meta,
  messages,
  photos,
  reviews,
  rooms,
  settings,
} from "@/db/schema";
import type {
  MessageContent,
  PlaceTag,
  Snapshot,
  WallSettings,
} from "@/lib/snapshot-types";
import { PLACE_TAGS } from "@/lib/snapshot-types";
import type { Db } from "./db";

import { computeEffectiveEpoch, pickVisibleMessage } from "@/lib/message-logic";

export const ACTIVATE_LEAD_MS = 30_000;
export const SCHEDULE_MIN_LEAD_MS = 30_000;

/** Fixed display names for the five place tags (brief §5). */
export const PLACE_NAMES: Record<PlaceTag, string> = {
  pool: "Pool terrace",
  restaurant: "Terrace restaurant",
  lobby: "Lobby",
  gym: "Gym",
  bar: "Bar",
};

export const DEFAULT_SETTINGS: WallSettings = {
  hotelName: "WestBrook",
  logoUrl: null,
  timezone: "Africa/Lagos",
  cities: [
    { label: "Lagos · local", timezone: "Africa/Lagos" },
    { label: "London", timezone: "Europe/London" },
    { label: "New York", timezone: "America/New_York" },
    { label: "Dubai", timezone: "Asia/Dubai" },
    { label: "Tokyo", timezone: "Asia/Tokyo" },
  ],
  breakfastLine: "7 – 10 am",
  checkoutLine: "12 noon",
  wifiName: "",
  wifiPassword: "",
  seasons: {
    christmasStart: "12-01",
    christmasEnd: "01-06",
    christmasEnabled: true,
    independenceDay: "10-01",
    independenceEnabled: true,
  },
};

export function buildIdentifier(): string {
  return process.env.BUILD_ID || "dev";
}

async function readMetaNumber(db: Db, key: string, fallback: number) {
  const row = await db.select().from(meta).where(eq(meta.key, key)).get();
  const n = row ? Number(row.value) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

async function writeMeta(db: Db, key: string, value: string) {
  await db
    .insert(meta)
    .values({ key, value })
    .onConflictDoUpdate({ target: meta.key, set: { value } });
}

/** Admin writes call this: bump version, stamp activateAt (edits coalesce). */
export async function bumpContent(db: Db, now: number) {
  const version = (await readMetaNumber(db, "content_version", 1)) + 1;
  await writeMeta(db, "content_version", String(version));
  await writeMeta(db, "activate_at", String(now + ACTIVATE_LEAD_MS));
}

/**
 * The loop epoch: the stored value, advanced by any message window that has
 * ended since (message end = loop restart on Welcome, R10). Persisted only
 * when it changes — one write per message, not per poll.
 */
export async function effectiveEpoch(db: Db, now: number): Promise<number> {
  const stored = await readMetaNumber(db, "loop_epoch", 0);
  const rows = await db
    .select()
    .from(messages)
    .where(and(eq(messages.canceled, 0), lte(messages.startAt, now)))
    .all();
  const epoch = computeEffectiveEpoch(stored, rows, now);
  if (epoch !== stored) await writeMeta(db, "loop_epoch", String(epoch));
  return epoch;
}

/**
 * The message the public snapshot carries: live now, or starting within
 * MESSAGE_VISIBILITY_MS. Scheduled messages further out stay admin-only so
 * guest names never leak hours before display (plan privacy decision).
 */
export async function visibleMessage(
  db: Db,
  now: number,
): Promise<MessageContent | null> {
  const rows = await db
    .select()
    .from(messages)
    .where(and(eq(messages.canceled, 0), gt(messages.startAt, now - 86_400_000)))
    .orderBy(asc(messages.startAt))
    .all();
  const m = pickVisibleMessage(rows, now);
  if (!m) return null;
  return {
    id: m.id,
    kicker: m.kicker,
    name: m.name,
    body: m.body,
    imageUrl: m.mediaKey ? `/media/${m.mediaKey}` : null,
    startAt: m.startAt,
    durationMs: m.durationMs,
  };
}

export async function readSettings(db: Db): Promise<WallSettings> {
  const row = await db
    .select()
    .from(settings)
    .where(eq(settings.key, "wall"))
    .get();
  if (!row) return DEFAULT_SETTINGS;
  try {
    const parsed = JSON.parse(row.value) as Partial<WallSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      seasons: { ...DEFAULT_SETTINGS.seasons, ...(parsed.seasons ?? {}) },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export interface SnapshotWithEtag {
  snapshot: Snapshot;
  etag: string;
}

export async function buildSnapshot(
  db: Db,
  now: number,
): Promise<SnapshotWithEtag> {
  const [version, activateAt, epoch, message, wall] = await Promise.all([
    readMetaNumber(db, "content_version", 1),
    readMetaNumber(db, "activate_at", 0),
    effectiveEpoch(db, now),
    visibleMessage(db, now),
    readSettings(db),
  ]);

  const [roomRows, photoRows, reviewRows] = await Promise.all([
    db
      .select()
      .from(rooms)
      .where(eq(rooms.enabled, 1))
      .orderBy(asc(rooms.sort), asc(rooms.createdAt))
      .all(),
    db
      .select()
      .from(photos)
      .where(isNull(photos.deletedAt))
      .orderBy(asc(photos.sort), asc(photos.createdAt))
      .all(),
    db
      .select()
      .from(reviews)
      .where(and(eq(reviews.hidden, 0), eq(reviews.consented, 1)))
      .orderBy(asc(reviews.createdAt))
      .all(),
  ]);

  const snapshot: Snapshot = {
    contentVersion: version,
    activateAt,
    loopEpoch: epoch,
    buildId: buildIdentifier(),
    settings: wall,
    rooms: roomRows.map((r) => ({
      id: r.id,
      name: r.name,
      priceNgn: r.priceNgn,
      tagText: r.tagText,
      photoUrls: photoRows
        .filter((p) => p.roomId === r.id)
        .map((p) => `/media/${p.mediaKey}`),
    })),
    places: PLACE_TAGS.map((tag) => ({
      tag,
      name: PLACE_NAMES[tag],
      photoUrls: photoRows
        .filter((p) => p.placeTag === tag)
        .map((p) => `/media/${p.mediaKey}`),
    })),
    reviews: reviewRows.map((r) => ({
      firstName: r.firstName,
      month: r.month,
      text: r.text,
    })),
    message,
  };

  // The ETag covers everything that can change what a player renders
  // without a version bump: epoch resets and message window visibility.
  const etag = `"v${version}.${epoch}.${message ? `${message.id}:${message.startAt}` : "none"}"`;
  return { snapshot, etag };
}
