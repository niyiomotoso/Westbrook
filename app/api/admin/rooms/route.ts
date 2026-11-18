import { and, asc, eq, isNull } from "drizzle-orm";
import { photos, rooms } from "@/db/schema";
import { requireSession } from "@/server/auth-guard";
import { bumpContent } from "@/server/content";
import { getDb } from "@/server/db";

export const dynamic = "force-dynamic";

async function listRooms(db: ReturnType<typeof getDb>) {
  return db.select().from(rooms).orderBy(asc(rooms.sort), asc(rooms.createdAt)).all();
}

export async function GET() {
  const denied = await requireSession();
  if (denied) return denied;
  const db = getDb();
  return Response.json({ rooms: await listRooms(db) });
}

export async function POST(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;
  const db = getDb();

  let body: { name?: unknown; priceNgn?: unknown; tagText?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return new Response("bad request", { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const price = Number(body.priceNgn);
  const tagText =
    typeof body.tagText === "string" && body.tagText.trim()
      ? body.tagText.trim().slice(0, 40)
      : null;
  if (!name || name.length > 40 || !Number.isFinite(price) || price <= 0) {
    return new Response("name and a positive price are required", { status: 400 });
  }

  const existing = await listRooms(db);
  const now = Date.now();
  await db.insert(rooms).values({
    id: crypto.randomUUID(),
    name,
    priceNgn: Math.round(price),
    tagText,
    enabled: 1,
    sort: (existing.at(-1)?.sort ?? 0) + 1,
    createdAt: now,
  });
  await bumpContent(db, now);
  return new Response(null, { status: 201 });
}

export async function PATCH(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;
  const db = getDb();

  let body: {
    id?: unknown;
    name?: unknown;
    priceNgn?: unknown;
    tagText?: unknown;
    enabled?: unknown;
    move?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return new Response("bad request", { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id : "";
  const room = await db.select().from(rooms).where(eq(rooms.id, id)).get();
  if (!room) return new Response("not found", { status: 404 });

  if (body.move === "up" || body.move === "down") {
    // Up/down buttons are the baseline reorder control (plan UX decision):
    // swap sort values with the neighbor.
    const all = await listRooms(db);
    const idx = all.findIndex((r) => r.id === id);
    const swapWith = body.move === "up" ? all[idx - 1] : all[idx + 1];
    if (swapWith) {
      await db.update(rooms).set({ sort: swapWith.sort }).where(eq(rooms.id, id));
      await db.update(rooms).set({ sort: room.sort }).where(eq(rooms.id, swapWith.id));
    }
  } else {
    const set: Partial<typeof rooms.$inferInsert> = {};
    if (typeof body.name === "string" && body.name.trim()) {
      set.name = body.name.trim().slice(0, 40);
    }
    if (body.priceNgn !== undefined) {
      const price = Number(body.priceNgn);
      if (!Number.isFinite(price) || price <= 0) {
        return new Response("price must be positive", { status: 400 });
      }
      set.priceNgn = Math.round(price);
    }
    if (body.tagText !== undefined) {
      set.tagText =
        typeof body.tagText === "string" && body.tagText.trim()
          ? body.tagText.trim().slice(0, 40)
          : null;
    }
    if (body.enabled !== undefined) set.enabled = body.enabled ? 1 : 0;
    if (Object.keys(set).length === 0) {
      return new Response("nothing to change", { status: 400 });
    }
    await db.update(rooms).set(set).where(eq(rooms.id, id));
  }

  await bumpContent(db, Date.now());
  return new Response(null, { status: 204 });
}

export async function DELETE(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;
  const db = getDb();

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return new Response("missing id", { status: 400 });
  const room = await db.select().from(rooms).where(eq(rooms.id, id)).get();
  if (!room) return new Response("not found", { status: 404 });

  const now = Date.now();
  // Deleting a room soft-deletes its photos (they leave via activateAt and
  // purge after the 24h grace, same as individually deleted photos).
  await db
    .update(photos)
    .set({ deletedAt: now })
    .where(and(eq(photos.roomId, id), isNull(photos.deletedAt)));
  await db.delete(rooms).where(eq(rooms.id, id));
  await bumpContent(db, now);
  return new Response(null, { status: 204 });
}
