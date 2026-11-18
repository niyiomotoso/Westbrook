import { settings } from "@/db/schema";
import { requireSession } from "@/server/auth-guard";
import { bumpContent, readSettings } from "@/server/content";
import { getDb, getEnv } from "@/server/db";
import { hashedKey, putMedia, validateMediaBytes } from "@/server/media";

export const dynamic = "force-dynamic";

/** Logo upload (R23): PNG or SVG via the U8 pipeline, no resize. */
export async function POST(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;
  const db = getDb();
  const env = getEnv();

  const bytes = new Uint8Array(await request.arrayBuffer());
  const validated = validateMediaBytes("logo", bytes);
  if ("error" in validated) {
    return new Response(validated.error, { status: 400 });
  }

  const key = await hashedKey(bytes, validated.ext);
  await putMedia(env.MEDIA, key, bytes);

  const current = await readSettings(db);
  const next = { ...current, logoUrl: `/media/${key}` };
  await db
    .insert(settings)
    .values({ key: "wall", value: JSON.stringify(next) })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: JSON.stringify(next) },
    });
  await bumpContent(db, Date.now());
  return Response.json({ logoUrl: next.logoUrl }, { status: 201 });
}

/** Remove the logo → text fallback everywhere (R23). */
export async function DELETE() {
  const denied = await requireSession();
  if (denied) return denied;
  const db = getDb();

  const current = await readSettings(db);
  const next = { ...current, logoUrl: null };
  await db
    .insert(settings)
    .values({ key: "wall", value: JSON.stringify(next) })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: JSON.stringify(next) },
    });
  await bumpContent(db, Date.now());
  return new Response(null, { status: 204 });
}
