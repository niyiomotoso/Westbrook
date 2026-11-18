import { and, asc, desc, eq, gt } from "drizzle-orm";
import { messages, templates } from "@/db/schema";
import { overlaps } from "@/lib/message-logic";
import { requireSession } from "@/server/auth-guard";
import { SCHEDULE_MIN_LEAD_MS } from "@/server/content";
import { getDb, getEnv } from "@/server/db";
import { hashedKey, validateMediaBytes } from "@/server/media";

export const dynamic = "force-dynamic";

export const POST_NOW_LEAD_MS = 30_000;
export const CANCEL_CUTOFF_MS = 30_000;
const MIN_DURATION_MS = 8_000;
const MAX_DURATION_MS = 30_000;

export async function GET() {
  const denied = await requireSession();
  if (denied) return denied;
  const db = getDb();
  const [tpl, msgs] = await Promise.all([
    db.select().from(templates).orderBy(asc(templates.createdAt)).all(),
    db
      .select()
      .from(messages)
      .orderBy(desc(messages.startAt))
      .limit(20)
      .all(),
  ]);
  return Response.json({ templates: tpl, messages: msgs, now: Date.now() });
}

/**
 * Post or schedule (R22): post-now is stamped startAt = now + 30s so all
 * three screens fire together despite 15s polling; scheduled needs >=30s
 * lead; overlapping windows are rejected with the conflict named.
 * Body: { kicker, name, body, startAt?: number|null, durationS?: number,
 *         imageBase64?: string (data payload, client-resized JPEG) }
 */
export async function POST(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;
  const db = getDb();
  const env = getEnv();

  let body: {
    kicker?: unknown;
    name?: unknown;
    body?: unknown;
    startAt?: unknown;
    durationS?: unknown;
    imageBase64?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return new Response("bad request", { status: 400 });
  }

  const kicker = typeof body.kicker === "string" ? body.kicker.trim().slice(0, 40) : "";
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 60) : "";
  const text = typeof body.body === "string" ? body.body.trim().slice(0, 300) : "";
  if (!kicker || !text) {
    return new Response("kicker and message text are required", { status: 400 });
  }
  // {name} templates require a name (plan decision — no dangling commas).
  if (text.includes("{name}") && !name) {
    return new Response("this message needs the guest's name", { status: 400 });
  }

  const durationS = Number(body.durationS ?? 12);
  const durationMs = Math.round(
    Math.min(MAX_DURATION_MS, Math.max(MIN_DURATION_MS, durationS * 1000)),
  );

  const now = Date.now();
  let startAt: number;
  if (body.startAt === null || body.startAt === undefined) {
    startAt = now + POST_NOW_LEAD_MS;
  } else {
    startAt = Number(body.startAt);
    if (!Number.isFinite(startAt)) {
      return new Response("bad start time", { status: 400 });
    }
    if (startAt - now < SCHEDULE_MIN_LEAD_MS) {
      return new Response(
        "a scheduled message needs at least 30 seconds of lead time",
        { status: 400 },
      );
    }
  }

  const candidate = { startAt, durationMs };
  const upcoming = await db
    .select()
    .from(messages)
    .where(and(eq(messages.canceled, 0), gt(messages.startAt, now - 86_400_000)))
    .all();
  for (const m of upcoming) {
    if (m.startAt + m.durationMs <= now) continue;
    if (overlaps(candidate, m)) {
      const endsAt = new Date(m.startAt + m.durationMs).toISOString();
      return new Response(
        `another message runs until ${endsAt} — schedule after that`,
        { status: 409 },
      );
    }
  }

  let mediaKey: string | null = null;
  if (typeof body.imageBase64 === "string" && body.imageBase64) {
    const bytes = Uint8Array.from(atob(body.imageBase64), (c) => c.charCodeAt(0));
    const validated = validateMediaBytes("photo", bytes);
    if ("error" in validated) return new Response(validated.error, { status: 400 });
    mediaKey = await hashedKey(bytes, validated.ext);
    await env.MEDIA.put(mediaKey, bytes as unknown as ArrayBuffer);
  }

  const substituted = text.replaceAll("{name}", name || "");
  await db.insert(messages).values({
    id: crypto.randomUUID(),
    kicker,
    name,
    body: substituted,
    mediaKey,
    startAt,
    durationMs,
    canceled: 0,
    createdAt: now,
  });
  // No content bump needed: message visibility rides the ETag directly.
  return Response.json({ startAt, durationMs }, { status: 201 });
}

/** Cancel an upcoming message — forbidden within 30s of start (plan). */
export async function DELETE(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;
  const db = getDb();

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return new Response("missing id", { status: 400 });
  const m = await db.select().from(messages).where(eq(messages.id, id)).get();
  if (!m || m.canceled) return new Response("not found", { status: 404 });

  const now = Date.now();
  if (m.startAt - now < CANCEL_CUTOFF_MS) {
    return new Response(
      "too close to start — screens may already have it",
      { status: 409 },
    );
  }
  await db.update(messages).set({ canceled: 1 }).where(eq(messages.id, id));
  return new Response(null, { status: 204 });
}

/** Save a new reusable template (R22). */
export async function PUT(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;
  const db = getDb();

  let body: { kicker?: unknown; body?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return new Response("bad request", { status: 400 });
  }
  const kicker = typeof body.kicker === "string" ? body.kicker.trim().slice(0, 40) : "";
  const text = typeof body.body === "string" ? body.body.trim().slice(0, 300) : "";
  if (!kicker || !text) {
    return new Response("kicker and body are required", { status: 400 });
  }
  await db.insert(templates).values({
    id: crypto.randomUUID(),
    kicker,
    body: text,
    createdAt: Date.now(),
  });
  return new Response(null, { status: 201 });
}
