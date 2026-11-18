/**
 * The poll contract (docs/SYNC_MODEL.md): one idempotent full snapshot.
 * Shared by the player, the API (U6), and fixtures.
 */

export const PLACE_TAGS = ["pool", "restaurant", "lobby", "gym", "bar"] as const;
export type PlaceTag = (typeof PLACE_TAGS)[number];

export interface CityConfig {
  /** Display label, e.g. "Lagos · local" or "London" */
  label: string;
  /** IANA timezone, e.g. "Africa/Lagos" */
  timezone: string;
}

export interface SeasonSettings {
  /** "MM-DD" inclusive bounds; range may wrap the year end */
  christmasStart: string;
  christmasEnd: string;
  christmasEnabled: boolean;
  /** "MM-DD", single day */
  independenceDay: string;
  independenceEnabled: boolean;
}

export interface WallSettings {
  hotelName: string;
  /** /media URL of the uploaded logo, or null → text fallback */
  logoUrl: string | null;
  timezone: string;
  cities: CityConfig[];
  breakfastLine: string; // e.g. "7 – 10 am"
  checkoutLine: string; // e.g. "12 noon"
  wifiName: string;
  wifiPassword: string;
  seasons: SeasonSettings;
}

export interface RoomContent {
  id: string;
  name: string;
  priceNgn: number;
  tagText: string | null;
  photoUrls: string[];
}

export interface PlaceContent {
  tag: PlaceTag;
  name: string;
  photoUrls: string[];
}

export interface ReviewContent {
  firstName: string;
  /** e.g. "October" — rendered as "Tunde, stayed in October" */
  month: string;
  text: string;
}

export interface MessageContent {
  id: string;
  /** e.g. "Welcome back" */
  kicker: string;
  /** guest name(s), already substituted into nothing — rendered big */
  name: string;
  body: string;
  imageUrl: string | null;
  /** corrected-epoch ms */
  startAt: number;
  durationMs: number;
}

export interface Snapshot {
  contentVersion: number;
  /** corrected-epoch ms; switch at first boundary ≥ this AND images ready */
  activateAt: number;
  loopEpoch: number;
  buildId: string;
  settings: WallSettings;
  rooms: RoomContent[];
  places: PlaceContent[];
  reviews: ReviewContent[];
  /** active or imminent (≤60s) message, else null */
  message: MessageContent | null;
}
