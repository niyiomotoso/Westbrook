import { and, eq, isNotNull, isNull, lt } from "drizzle-orm";
import { photos, rooms } from "@/db/schema";
import { PLACE_TAGS, type PlaceTag } from "@/lib/snapshot-types";
import { requireSession } from "@/server/auth-guard";
import { PLACE_NAMES, bumpContent } from "@/server/content";
import { getDb, getEnv } from "@/server/db";
import { hashedKey, validateMediaBytes } from "@/server/media";

export const dynamic = "force-dynamic";

const PURGE_GRACE_MS = 24 * 60 * 60 * 1000;

/** Opportunistic purge: KV objects for photos soft-deleted >24h ago. */
async function purgeExpired(db: ReturnType<typeof getDb>, env: CloudflareEnv) {
  const cutoff = Date.now() - PURGE_GRACE_MS;
  const expired = await db
    .select()
    .from(photos)
    .where(and(isNotNull(photos.deletedAt), lt(photos.deletedAt, cutoff)))
    .all();
  for (const p of expired) {
    const stillUsed = await db
      .select({ id: photos.id })
      .from(photos)
      .where(and(eq(photos.mediaKey, p.mediaKey), isNull(photos.deletedAt)))
      .get();
    if (!stillUsed) {
      await env.MEDIA.delete(p.mediaKey);
    }
    await db.delete(photos).where(eq(photos.id, p.id));
  }
}

export async function GET() {
  const denied = await requireSession();
  if (denied) return denied;
  const db = getDb();
  const env = getEnv();
  await purgeExpired(db, env).catch(() => {});

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
  await env.MEDIA.put(key, bytes as unknown as ArrayBuffer);

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
  return new Response(null, { status: 204 });
}
