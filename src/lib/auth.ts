/**
 * Session auth via Web Crypto only (workerd has no Node crypto):
 * token = base64url(payloadJson) + "." + base64url(HMAC-SHA256(secret, payloadJson))
 * Password check: SHA-256 both sides, constant-time byte compare. The
 * password is machine-generated high-entropy, so no KDF work factor is
 * needed (workerd caps PBKDF2 at 100k iterations anyway — plan KTD).
 */

export const SESSION_COOKIE = "westbrook_session";
export const SESSION_MAX_AGE_S = 30 * 24 * 60 * 60; // 30 days

export interface SessionPayload {
  iat: number;
  exp: number;
}

const te = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array | null {
  try {
    const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
    const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    te.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signSession(
  secret: string,
  payload: SessionPayload,
): Promise<string> {
  const body = te.encode(JSON.stringify(payload));
  const key = await hmacKey(secret);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, body));
  return `${b64url(new Uint8Array(body))}.${b64url(mac)}`;
}

export async function verifySession(
  secret: string,
  token: string,
  now: number = Date.now(),
): Promise<SessionPayload | null> {
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const body = b64urlDecode(token.slice(0, dot));
  const mac = b64urlDecode(token.slice(dot + 1));
  if (!body || !mac) return null;
  const key = await hmacKey(secret);
  // crypto.subtle.verify is constant-time
  const ok = await crypto.subtle.verify(
    "HMAC",
    key,
    mac as BufferSource,
    body as BufferSource,
  );
  if (!ok) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(body)) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp <= now) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Constant-time password check via SHA-256 digests (equal length). */
export async function passwordMatches(
  submitted: string,
  expected: string,
): Promise<boolean> {
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", te.encode(submitted)),
    crypto.subtle.digest("SHA-256", te.encode(expected)),
  ]);
  const av = new Uint8Array(a);
  const bv = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < av.length; i++) diff |= av[i] ^ bv[i];
  return diff === 0;
}

export function sessionCookie(token: string, maxAgeS = SESSION_MAX_AGE_S) {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeS}`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
