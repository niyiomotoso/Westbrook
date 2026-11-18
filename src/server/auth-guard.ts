import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import { getEnv } from "./db";

/** True when the request carries a valid reception session cookie. */
export async function hasValidSession(): Promise<boolean> {
  const secret = getEnv().SESSION_SECRET;
  if (!secret) return false;
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  return (await verifySession(secret, token)) !== null;
}

/** Guard for admin API routes: null when authorized, else a 401. */
export async function requireSession(): Promise<Response | null> {
  if (await hasValidSession()) return null;
  return new Response("Unauthorized", { status: 401 });
}
