import { and, eq, inArray, isNotNull, isNull, lt } from "drizzle-orm";
import { messages, photos, rooms } from "@/db/schema";
import { PLACE_TAGS, type PlaceTag } from "@/lib/snapshot-types";
import { requireSession } from "@/server/auth-guard";
import { PLACE_NAMES, bumpContent, readSettings } from "@/server/content";
import { getDb, getEnv } from "@/server/db";
import { hashedKey, putMedia, validateMediaBytes } from "@/server/media";

export const dynamic = "force-dynamic";

const PURGE_GRACE_MS = 24 * 60 * 60 * 1000;

/**
 * Opportunistic purge of KV objects for photos soft-deleted >24h ago.
 * Batched (review finding: the per-row version was N+1), runs from write
 * handlers rather than GET (mutations do not belong in GET), and never
 * deletes a key still referenced by a live photo, an IN-GRACE soft-deleted
 * photo, a message image, or the current logo (content hashes are shared
 * across tables — review finding).
 */
async function purgeExpired(db: ReturnType<typeof getDb>, env: CloudflareEnv) {
  const cutoff = Date.now() - PURGE_GRACE_MS;
  const expired = await db
    .select({ id: photos.id, mediaKey: photos.mediaKey })
    .from(photos)
    .where(and(isNotNull(photos.deletedAt), lt(photos.deletedAt, cutoff)))
    .all();
  if (expired.length === 0) return;

  const expiredKeys = [...new Set(expired.map((p) => p.mediaKey))];
  const [keepPhotos, keepMessages, wall] = await Promise.all([
    db
      .select({ mediaKey: photos.mediaKey })
      .from(photos)
      .where(
        and(
          inArray(photos.mediaKey, expiredKeys),
          // live, or soft-deleted but still inside the grace window
          isNull(photos.deletedAt),
        ),
      )
      .all(),
    db
      .select({ mediaKey: messages.mediaKey })
      .from(messages)
      .where(isNotNull(messages.mediaKey))
      .all(),
    readSettings(db),
  ]);
  const protectedKeys = new Set<string>([
    ...keepPhotos.map((r) => r.mediaKey),
    ...keepMessages.map((r) => r.mediaKey ?? ""),
  ]);
  const logoKey = wall.logoUrl?.replace("/media/", "");
  if (logoKey) protectedKeys.add(logoKey);
  // Soft-deleted rows still inside the grace window share their key's
  // protection: anything deleted-but-not-expired is not in expiredIds.
  const expiredIds = new Set(expired.map((p) => p.id));
  const graceRows = await db
    .select({ id: photos.id, mediaKey: photos.mediaKey })
    .from(photos)
    .where(and(isNotNull(photos.deletedAt), inArray(photos.mediaKey, expiredKeys)))
    .all();
  for (const r of graceRows) {
    if (!expiredIds.has(r.id)) protectedKeys.add(r.mediaKey);
  }

  for (const key of expiredKeys) {
    if (!protectedKeys.has(key)) {
      await env.MEDIA.delete(key).catch(() => {});
    }
  }
  await db.delete(photos).where(inArray(photos.id, [...expiredIds]));
}

export async function GET() {
  const denied = await requireSession();
  if (denied) return denied;
  const db = getDb();

  const [roomRows, photoRows] = await Promise.all([
    db.select().from(rooms).orderBy(rooms.sort).all(),
    db.select().from(photos).where(isNull(photos.deletedAt)).all(),
  ]);

  return Response.json({
    rooms: roomRows.map((r) => ({
      id: r.id,
      name: r.name,
      enabled: r.enabled === 1,
      photoCount: photoRows.filter((p) => p.roomId === r.id).length,
    })),
    tags: PLACE_TAGS.map((tag) => ({
      tag,
      name: PLACE_NAMES[tag],
      photoCount: photoRows.filter((p) => p.placeTag === tag).length,
    })),
    photos: photoRows.map((p) => ({
      id: p.id,
      roomId: p.roomId,
      placeTag: p.placeTag,
      url: `/media/${p.mediaKey}`,
      createdAt: p.createdAt,
    })),
  });
}

/**
 * Upload: raw JPEG body (already client-resized), target in the query:
 * ?room=<id> XOR ?tag=<placeTag>. Validated by magic bytes + size (R19).
 */
export async function POST(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;
  const db = getDb();
  const env = getEnv();

  const url = new URL(request.url);
  const roomId = url.searchParams.get("room");
  const tag = url.searchParams.get("tag");
  if ((roomId ? 1 : 0) + (tag ? 1 : 0) !== 1) {
    return new Response("choose exactly one room or tag", { status: 400 });
  }
  if (tag && !PLACE_TAGS.includes(tag as PlaceTag)) {
    return new Response("unknown tag", { status: 400 });
  }
  if (roomId) {
    const room = await db.select().from(rooms).where(eq(rooms.id, roomId)).get();
    if (!room) return new Response("unknown room", { status: 400 });
  }

  const bytes = new Uint8Array(await request.arrayBuffer());
  const validated = validateMediaBytes("photo", bytes);
  if ("error" in validated) {
    return new Response(validated.error, { status: 400 });
  }

  const key = await hashedKey(bytes, validated.ext);
  await putMedia(env.MEDIA, key, bytes);
  await purgeExpired(db, env).catch(() => {});

  const now = Date.now();
  await db.insert(photos).values({
    id: crypto.randomUUID(),
    roomId: roomId ?? null,
    placeTag: tag ?? null,
    mediaKey: key,
    sort: now,
    createdAt: now,
  });
  await bumpContent(db, now);

  return Response.json({ url: `/media/${key}` }, { status: 201 });
}

/** Soft delete (R19): leaves via the activateAt flow; KV purges after 24h. */
export async function DELETE(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;
  const db = getDb();

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return new Response("missing id", { status: 400 });
  const row = await db.select().from(photos).where(eq(photos.id, id)).get();
  if (!row || row.deletedAt) return new Response("not found", { status: 404 });

  const now = Date.now();
  await db.update(photos).set({ deletedAt: now }).where(eq(photos.id, id));
  await bumpContent(db, now);
  await purgeExpired(db, getEnv()).catch(() => {});
  return new Response(null, { status: 204 });
}
