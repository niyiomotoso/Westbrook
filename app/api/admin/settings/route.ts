import { settings } from "@/db/schema";
import type { WallSettings } from "@/lib/snapshot-types";
import { requireSession } from "@/server/auth-guard";
import { DEFAULT_SETTINGS, bumpContent, readSettings } from "@/server/content";
import { getDb } from "@/server/db";

export const dynamic = "force-dynamic";

function validTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const MD_RE = /^\d{1,2}-\d{1,2}$/;

function sanitize(input: Partial<WallSettings>): WallSettings | string {
  const s: WallSettings = {
    ...DEFAULT_SETTINGS,
    ...input,
    seasons: { ...DEFAULT_SETTINGS.seasons, ...(input.seasons ?? {}) },
  };
  s.hotelName = String(s.hotelName ?? "").trim().slice(0, 30) || "WestBrook";
  if (s.logoUrl !== null && typeof s.logoUrl === "string") {
    if (!/^\/media\/[a-f0-9]{16,64}\.(png|svg|jpg)$/.test(s.logoUrl)) {
      return "logo URL is not one of ours";
    }
  } else {
    s.logoUrl = null;
  }
  if (!validTimezone(s.timezone)) return "unknown hotel timezone";
  if (!Array.isArray(s.cities) || s.cities.length === 0) return "at least one city";
  if (s.cities.length > 8) return "up to 8 cities (brief §5)";
  for (const c of s.cities) {
    c.label = String(c.label ?? "").trim().slice(0, 24);
    if (!c.label) return "every city needs a label";
    if (!validTimezone(c.timezone)) return `unknown timezone for ${c.label}`;
  }
  s.breakfastLine = String(s.breakfastLine ?? "").trim().slice(0, 30);
  s.checkoutLine = String(s.checkoutLine ?? "").trim().slice(0, 30);
  s.wifiName = String(s.wifiName ?? "").trim().slice(0, 64);
  s.wifiPassword = String(s.wifiPassword ?? "").slice(0, 64);
  const sea = s.seasons;
  if (!MD_RE.test(sea.christmasStart) || !MD_RE.test(sea.christmasEnd)) {
    return "Christmas dates must be MM-DD";
  }
  if (!MD_RE.test(sea.independenceDay)) return "Independence date must be MM-DD";
  sea.christmasEnabled = !!sea.christmasEnabled;
  sea.independenceEnabled = !!sea.independenceEnabled;
  return s;
}

export async function GET() {
  const denied = await requireSession();
  if (denied) return denied;
  return Response.json(await readSettings(getDb()));
}

export async function PUT(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;
  const db = getDb();

  let body: Partial<WallSettings>;
  try {
    body = (await request.json()) as Partial<WallSettings>;
  } catch {
    return new Response("bad request", { status: 400 });
  }
  const result = sanitize(body);
  if (typeof result === "string") return new Response(result, { status: 400 });
  // The logo endpoints own logoUrl: a settings save must not silently
  // revert a logo uploaded after this form loaded (review finding —
  // last-writer-wins on the shared JSON row).
  const stored = await readSettings(db);
  result.logoUrl = stored.logoUrl;

  await db
    .insert(settings)
    .values({ key: "wall", value: JSON.stringify(result) })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: JSON.stringify(result) },
    });
  await bumpContent(db, Date.now());
  return new Response(null, { status: 204 });
}
