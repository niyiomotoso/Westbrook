import type { Snapshot } from "./snapshot-types";

/**
 * Derive the ordered active slide list from a snapshot. All skipping rules
 * (R4) live here so the UI stays a dumb renderer:
 *  - a room or place with no photos is absent
 *  - the reviews page is absent with zero reviews
 *  - Welcome and Good to know always exist (so N >= 2)
 * Order per the brief §5: Welcome, rooms, pool, restaurant, lobby, gym,
 * bar, reviews, good-to-know.
 */

export type Slide =
  | { kind: "welcome" }
  | {
      kind: "room";
      photoUrl: string;
      name: string;
      priceNgn: number;
      tagText: string | null;
    }
  | {
      kind: "place";
      photoUrl: string;
      name: string;
      /** restaurant shows the breakfast line under its name (R5) */
      breakfastLine: string | null;
    }
  | { kind: "reviews" }
  | { kind: "goodToKnow" };

const PLACE_ORDER = ["pool", "restaurant", "lobby", "gym", "bar"] as const;

export function buildActiveSlides(snapshot: Snapshot): Slide[] {
  const slides: Slide[] = [{ kind: "welcome" }];

  for (const room of snapshot.rooms) {
    for (const photoUrl of room.photoUrls) {
      slides.push({
        kind: "room",
        photoUrl,
        name: room.name,
        priceNgn: room.priceNgn,
        tagText: room.tagText,
      });
    }
  }

  for (const tag of PLACE_ORDER) {
    const place = snapshot.places.find((p) => p.tag === tag);
    if (!place) continue;
    for (const photoUrl of place.photoUrls) {
      slides.push({
        kind: "place",
        photoUrl,
        name: place.name,
        breakfastLine:
          tag === "restaurant" ? snapshot.settings.breakfastLine : null,
      });
    }
  }

  if (snapshot.reviews.length > 0) {
    slides.push({ kind: "reviews" });
  }

  slides.push({ kind: "goodToKnow" });
  return slides;
}

/** Every image URL a snapshot can render (for pre-download, R27). */
export function snapshotImageUrls(snapshot: Snapshot): string[] {
  const urls = new Set<string>();
  for (const r of snapshot.rooms) for (const u of r.photoUrls) urls.add(u);
  for (const p of snapshot.places) for (const u of p.photoUrls) urls.add(u);
  if (snapshot.settings.logoUrl) urls.add(snapshot.settings.logoUrl);
  if (snapshot.message?.imageUrl) urls.add(snapshot.message.imageUrl);
  return [...urls];
}
