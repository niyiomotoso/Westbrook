import { asc, eq } from "drizzle-orm";
import { reviews } from "@/db/schema";
import { requireSession } from "@/server/auth-guard";
import { bumpContent } from "@/server/content";
import { getDb } from "@/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireSession();
  if (denied) return denied;
  const db = getDb();
  const rows = await db.select().from(reviews).orderBy(asc(reviews.createdAt)).all();
  return Response.json({ reviews: rows });
}

export async function POST(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;
  const db = getDb();

  let body: {
    firstName?: unknown;
    month?: unknown;
    text?: unknown;
    consented?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return new Response("bad request", { status: 400 });
  }
  const firstName =
    typeof body.firstName === "string" ? body.firstName.trim().slice(0, 30) : "";
  const month = typeof body.month === "string" ? body.month.trim().slice(0, 20) : "";
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!firstName || !month || !text) {
    return new Response("first name, month, and text are required", { status: 400 });
  }
  if (text.length > 140) {
    return new Response("keep the review to about 120 characters", { status: 400 });
  }
  // The consent tick is a hard requirement (R21) — guest agreed to show it.
  if (body.consented !== true) {
    return new Response("the guest-agreed tick is required", { status: 400 });
  }

  const now = Date.now();
  await db.insert(reviews).values({
    id: crypto.randomUUID(),
    firstName,
    month,
    text,
    consented: 1,
    hidden: 0,
    createdAt: now,
  });
  await bumpContent(db, now);
  return new Response(null, { status: 201 });
}

export async function PATCH(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;
  const db = getDb();

  let body: { id?: unknown; hidden?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return new Response("bad request", { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id : "";
  const row = await db.select().from(reviews).where(eq(reviews.id, id)).get();
  if (!row) return new Response("not found", { status: 404 });

  await db
    .update(reviews)
    .set({ hidden: body.hidden ? 1 : 0 })
    .where(eq(reviews.id, id));
  await bumpContent(db, Date.now());
  return new Response(null, { status: 204 });
}

export async function DELETE(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;
  const db = getDb();

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return new Response("missing id", { status: 400 });
  await db.delete(reviews).where(eq(reviews.id, id));
  await bumpContent(db, Date.now());
  return new Response(null, { status: 204 });
}
