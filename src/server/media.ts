/**
 * Media validation + storage (KV). Kind-parameterized per the plan KTD:
 * photos are client-resized JPEG (magic bytes FF D8 FF, ≤2MB); the logo is
 * PNG (magic bytes) or SVG (XML sniff), ≤512KB, no resize. Keys are
 * content-hashed so /media URLs are immutable.
 */

export const PHOTO_MAX_BYTES = 2 * 1024 * 1024;
export const LOGO_MAX_BYTES = 512 * 1024;

export type MediaKind = "photo" | "logo";

export interface ValidatedMedia {
  ext: "jpg" | "png" | "svg";
  contentType: string;
}

export function validateMediaBytes(
  kind: MediaKind,
  bytes: Uint8Array,
): ValidatedMedia | { error: string } {
  if (bytes.length === 0) return { error: "empty file" };
  if (kind === "photo") {
    if (bytes.length > PHOTO_MAX_BYTES) return { error: "photo over 2 MB" };
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return { ext: "jpg", contentType: "image/jpeg" };
    }
    return { error: "photos must be JPEG" };
  }
  if (bytes.length > LOGO_MAX_BYTES) return { error: "logo over 512 KB" };
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return { ext: "png", contentType: "image/png" };
  }
  const head = new TextDecoder()
    .decode(bytes.slice(0, 512))
    .trimStart()
    .toLowerCase();
  if (head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg"))) {
    return { ext: "svg", contentType: "image/svg+xml" };
  }
  return { error: "logo must be PNG or SVG" };
}

export function contentTypeForKey(key: string): string {
  if (key.endsWith(".png")) return "image/png";
  if (key.endsWith(".svg")) return "image/svg+xml";
  return "image/jpeg";
}

export async function hashedKey(
  bytes: Uint8Array,
  ext: string,
): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  const hex = [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
  return `${hex}.${ext}`;
}
